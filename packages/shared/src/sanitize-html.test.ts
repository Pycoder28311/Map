import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setRichTextImageBase } from './rich-text-policy'
import { sanitizeRichText } from './sanitize-html'

describe('sanitizeRichText', () => {
  it('keeps what the editor writes', () => {
    const html = '<p><strong>a</strong> <em>b</em> <u>c</u> <s>d</s></p><h2>t</h2><ul><li><p>x</p></li></ul><ol><li>y</li></ol><blockquote><p>q</p></blockquote>'
    expect(sanitizeRichText(html)).toBe(html)
  })

  it('drops scripts together with their content', () => {
    expect(sanitizeRichText('<p>hi</p><script>alert(1)</script><style>p{}</style>')).toBe('<p>hi</p>')
  })

  it('removes event handlers and unknown attributes', () => {
    expect(sanitizeRichText('<p onclick="x()" class="y" id="z">hi</p>')).toBe('<p>hi</p>')
  })

  it('drops images and other unlisted tags but keeps their words', () => {
    expect(sanitizeRichText('<p>a<img src=x onerror=alert(1)><font color="red">b</font><iframe src="//evil">no</iframe></p>')).toBe('<p>ab</p>')
  })

  it('turns text outside any tag, and plain text, into escaped paragraphs', () => {
    expect(sanitizeRichText('a <script>x</script>\nb')).toBe('<p>a &lt;script&gt;x&lt;/script&gt;</p><p>b</p>')
  })

  it('escapes text so nothing becomes a tag', () => {
    expect(sanitizeRichText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  describe('links', () => {
    it('keeps http, https and mailto and adds rel', () => {
      expect(sanitizeRichText('<p><a href="https://a.com/?x=1&y=2">l</a></p>')).toBe(
        '<p><a href="https://a.com/?x=1&amp;y=2" target="_blank" rel="noopener noreferrer nofollow">l</a></p>',
      )
      expect(sanitizeRichText('<a href="mailto:a@b.c">m</a>')).toContain('href="mailto:a@b.c"')
    })
    it.each(['javascript:alert(1)', ' JaVa\tScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '//evil.com', 'file:///etc/passwd'])(
      'drops the href %j',
      (href) => {
        const out = sanitizeRichText(`<p><a href="${href}">l</a></p>`)
        expect(out).toBe('<p><a>l</a></p>')
      },
    )
  })

  describe('span style', () => {
    it('keeps a size and a colour', () => {
      expect(sanitizeRichText('<p><span style="font-size: 20px; color: #ff0000">x</span></p>')).toBe(
        '<p><span style="font-size: 20px; color: #ff0000">x</span></p>',
      )
    })
    it('drops anything else in style', () => {
      expect(sanitizeRichText('<p><span style="position:fixed; inset:0; background:url(//evil); font-size: 9px">x</span></p>')).toBe(
        '<p><span style="font-size: 9px">x</span></p>',
      )
    })
    it('drops values that smuggle more CSS', () => {
      expect(sanitizeRichText('<span style="font-size: 1px; color: red;background:url(x)">x</span>')).toBe('<span style="font-size: 1px; color: red">x</span>')
      expect(sanitizeRichText('<span style="color: expression(alert(1))">x</span>')).toBe('<span>x</span>')
      expect(sanitizeRichText('<span style="font-size: 10px !important">x</span>')).toBe('<span>x</span>')
    })
  })

  it('closes tags left open', () => {
    expect(sanitizeRichText('<p><strong>a')).toBe('<p><strong>a</strong></p>')
  })

  it('keeps line breaks and rules', () => {
    expect(sanitizeRichText('<p>a<br>b</p><hr>')).toBe('<p>a<br>b</p><hr>')
  })

  it('gives nothing for text without words', () => {
    expect(sanitizeRichText('')).toBe('')
    expect(sanitizeRichText('  \n ')).toBe('')
    expect(sanitizeRichText('<p></p><p> </p>')).toBe('')
  })

  describe('images', () => {
    const base = 'https://img.test/map/img/'
    const file = '0b9f6e3c-1a2b-4c3d-8e4f-5a6b7c8d9e0f.webp'
    beforeEach(() => setRichTextImageBase(base))
    afterEach(() => setRichTextImageBase(null))

    it('keeps an image the app stored, with its alt text only', () => {
      expect(sanitizeRichText(`<p><img src="${base}${file}" alt="a cat" onerror="x()" width="9999" style="position:fixed"></p>`)).toBe(
        `<p><img src="${base}${file}" alt="a cat"></p>`,
      )
    })
    it.each([
      'https://evil.com/x.png',
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
      `${base}${file}?track=1`,
      `${base}${file}#x`,
      `${base}../other/${file}`,
      `${base}not-a-uuid.png`,
      `https://img.test/map/img.evil.com/${file}`,
    ])('drops the image %j', (src) => {
      expect(sanitizeRichText(`<p>a<img src="${src}">b</p>`)).toBe('<p>ab</p>')
    })
    it('drops every image while no base is set', () => {
      setRichTextImageBase(null)
      expect(sanitizeRichText(`<p>a<img src="${base}${file}"></p>`)).toBe('<p>a</p>')
    })
    it('counts a picture alone as content', () => {
      expect(sanitizeRichText(`<p><img src="${base}${file}"></p>`)).not.toBe('')
    })
  })
})
