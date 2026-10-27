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

  describe('article formats', () => {
    it('keeps a background colour and a font list on a span', () => {
      const html = '<p><span style="color: red; background-color: #ffee00; font-family: &quot;Trebuchet MS&quot;, sans-serif">x</span></p>'
      expect(sanitizeRichText(html)).toBe(html)
    })
    it('drops a font list that tries to load something', () => {
      expect(sanitizeRichText('<span style="font-family: url(//evil)">x</span>')).toBe('<span>x</span>')
    })
    it('keeps an underline colour, and nothing else on an underline', () => {
      expect(sanitizeRichText('<p><u style="text-decoration-color: #00f; color: red">x</u></p>')).toBe('<p><u style="text-decoration-color: #00f">x</u></p>')
    })
    it('keeps the paragraph look on paragraphs and headings', () => {
      const html = '<p style="text-align: center; padding: 8px; letter-spacing: 1.5px; line-height: 1.6; border: 2px solid #333333">x</p><h2 style="text-align: right">t</h2>'
      expect(sanitizeRichText(html)).toBe(html)
    })
    it('drops a paragraph look with other values', () => {
      expect(sanitizeRichText('<p style="text-align: start; border: 2px dashed red; padding: 9999px; position: fixed">x</p>')).toBe('<p>x</p>')
      expect(sanitizeRichText('<span style="text-align: center">x</span>')).toBe('<span>x</span>')
    })
    it('keeps superscript and subscript', () => {
      expect(sanitizeRichText('<p>x<sup>2</sup>H<sub>2</sub>O</p>')).toBe('<p>x<sup>2</sup>H<sub>2</sub>O</p>')
    })
    it('keeps a table with its cell spans only', () => {
      expect(
        sanitizeRichText('<table style="min-width: 50px"><colgroup><col style="min-width: 25px"></colgroup><tbody><tr><th colspan="2" rowspan="1" style="x"><p>h</p></th></tr><tr><td colspan="999"><p>c</p></td></tr></tbody></table>'),
      ).toBe('<table><colgroup><col></colgroup><tbody><tr><th colspan="2" rowspan="1"><p>h</p></th></tr><tr><td><p>c</p></td></tr></tbody></table>')
    })
    it('counts an empty table as content', () => {
      expect(sanitizeRichText('<table><tbody><tr><td><p></p></td></tr></tbody></table>')).not.toBe('')
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

describe('sanitizeRichText: the checklist', () => {
  // Tiptap's TaskList / TaskItem output (@tiptap/extension-list), one open and one ticked item
  const checklist =
    '<ul data-type="taskList">' +
    '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Bread</p></div></li>' +
    '<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Milk</p></div></li>' +
    '</ul>'

  it('keeps what the editor writes', () => {
    expect(sanitizeRichText(checklist)).toBe(checklist)
  })

  it('normalizes data-checked and drops other attributes of the pieces', () => {
    const dirty =
      '<ul data-type="taskList" onclick="x()" class="y"><li data-type="taskItem" data-checked="maybe" id="z"><label for="q"><input type="checkbox" checked name="n" onfocus="x()"><span class="s"></span></label><div class="d"><p>Item</p></div></li></ul>'
    expect(sanitizeRichText(dirty)).toBe(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Item</p></div></li></ul>',
    )
  })

  it('drops label, input and div outside a checklist item', () => {
    expect(sanitizeRichText('<p>a</p><label>l<input type="checkbox"></label><div>d</div><input type="text" value="x">')).toBe('<p>a</p>ld')
  })

  it('does not take another input type, even in its place', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="text" value="x"><span></span></label><div><p>t</p></div></li></ul>'
    expect(sanitizeRichText(html)).not.toContain('<input type="text"')
    expect(sanitizeRichText(html)).not.toContain('value=')
  })

  it('does not take a task item outside a task list', () => {
    expect(sanitizeRichText('<ul><li data-type="taskItem" data-checked="true"><label><input type="checkbox"></label><div><p>t</p></div></li></ul>')).toBe('<ul><li><p>t</p></li></ul>')
  })

  it('keeps nothing of the markup that is not the checklist: any other data-type goes', () => {
    expect(sanitizeRichText('<ul data-type="evil"><li data-type="x">a</li></ul>')).toBe('<ul><li>a</li></ul>')
  })
})
