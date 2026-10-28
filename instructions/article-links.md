# Article links

The article page's third toolbar row (Link, Attach Content, Jump link, Follow, Message, Autolinker), the hover card over a link,
Public / Private and Search in article. The row is smaller than the other two and centred, and shows only while some words are selected
or the toolbar's ⋯ (on its right edge) has its rows open; it stays while one of its popouts is open. The plan is `docs/plans/31-article-links-and-privacy.md`.

**Frontend only for now.** A link is never a record: everything it knows is written in the article's HTML (`content`). People and
privacy are mock stores on this device.

## Where things are

```
app/src/features/articles/links/
├── linkHref.ts          THE format: ArticleLink ⇄ href (toHref / fromHref)
├── docLinks.ts          the links of a document, each once (linkRanges, linkAt)
├── autolink.ts          autolinkers: occurrences, applyRule, removeRule, rulesFrom
├── jumpTargets.ts       sections and marked places; resolveJump
├── find.ts              Search in article's matches
├── objectSearch.ts      the Article link picker's pages (ObjectPages, nextToLoad)   ← server search goes here
├── useObjectSearch.ts   the picker's hook (one shared ObjectPages, fresh after 5 min)
├── linkExtensions.ts    editor: clicks, the autolinker while typing, find highlights, Ctrl/⌘+F; setArticleLink / removeArticleLink / goTo
├── LinkRow.tsx          the third row and its popouts
├── LinkForms.tsx        Real link and Message forms
├── ObjectPicker.tsx · JumpPicker.tsx · FollowPicker.tsx · AutolinkPanel.tsx
├── LinkPreview.tsx      what a link shows of its target (useLinkInfo)                ← URL previews go here
├── LinkHoverCard.tsx · MessagePanel.tsx · JumpGutter.tsx · FindBar.tsx
app/src/features/articles/privacy/   privacyStore.ts (ArticlePrivacy, on this device) · PrivacyButton.tsx · PrivacyModal.tsx
app/src/features/people/             mockPeople.ts (people, whom you follow) · PersonCard.tsx
app/src/styles/articleLinks.css      each kind's look, read from the href
```

## The format

The server's sanitizer (`packages/shared/src/sanitize-html.ts`) keeps an `<a>`'s `href` and drops every other attribute (no `data-*`, no
`class`). So a link is `<a href="#mapl:k=<kind>&…">`, URL-encoded:

| Kind | Keys | Click |
|---|---|---|
| `url` | `u` (http/https) | opens it in a new tab |
| `object` | `ty` (article, map, object, folder, project), `id` | opens it beside the article |
| `msg` | `ti` (≤ 100), `c` (≤ 2000) | the message panel at the right of the text |
| `jump` | `to`: `a:<anchor id>` or `h:<heading index>:<slug>` | scrolls there |
| `anchor` | `id` | (a jump's target: a soft mark on the words) |
| `person` | `p` | the person's card (Follow) |
| `project-url` | `u` | someone's project, in a new tab |

`a` and `t`: the autolinker that made it (its id and words). Unknown keys are ignored. `linkHref.test.ts` checks that every kind
survives `sanitizeRichText` unchanged: a new key or kind needs a case there.

An autolinker is kept only in the links it made: the list is `rulesFrom(doc)`. One whose words are written nowhere has no link, so it is
not kept (the panel says so).

## Connecting the backend later

- **People / followers**: replace `usePeople`, `personById` and the follow store in `mockPeople.ts`; keep their shapes.
- **Privacy**: `privacyStore.ts` → a field of `articles` with the `ArticlePrivacy` shape (`data.config.ts`, a migration). `useArticlePrivacy`
  keeps its signature.
- **Search of objects**: `ObjectSource.list` gets the query, and `ObjectPages.results` stops filtering.
- **URL previews** (picture and text of an outside page): `useLinkInfo`'s `url` / `project-url` case.
- **Link records**, if wanted: read every `#mapl:` link with `linkRanges` / `fromHref` (the same parser works on the server: it has no
  browser imports) and migrate.
