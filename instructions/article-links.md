# Article links

The article page's links row (Link, Attach Content, Jump link, Follow, Message, Autolinker), the hover card over a link,
Public / Private and Search in article. The row is smaller than the toolbar's, with its name (Types of Links) at its left, in a box of its own
`--spacing-sm` under the bar, floating over the text (it never pushes it down). It shows while some words are selected, or while row 2's
**Link types** (right of the Ω, shown with nothing selected) is pressed; it stays while one of its popouts is open. Typing **`@`** (at a row's
start or after a space) opens the same row **above the caret's row** instead, with an X: a link picked there is written at the `@` as words of
its own (the target's name; Message needs words already written). While it floats there it is not under the bar. The plans are
`docs/plans/31-article-links-and-privacy.md` and `docs/plans/36-article-sections-and-lazy-editing.md`.

Everything here works on the whole text, edited or not (`ArticleText`, `article-page.md`): links are followed and hovered in the static
text too, Search highlights it with the browser's CSS Custom Highlight API, and the Autolinker changes all of it.

A link is never a record: everything it knows is written in the article's HTML (`content`), except a **message**, which is a row of the
server's `messages` table: its link keeps only its id (docs/plans/34). Privacy (who can read or edit) is on the server too
(`object_rights`, `features/sharing/`). People to follow are still a mock store on this device (`mockPeople.ts`).

## Where things are

```
app/src/features/articles/links/
├── linkHref.ts          re-exports THE format (packages/shared/src/link-href.ts: ArticleLink ⇄ href, toHref / fromHref; the server reads it too)
├── docLinks.ts          the links of a document, each once (linkRanges, linkAt)
├── autolink.ts          autolinkers: occurrences, applyRule, removeRule, rulesFrom
├── jumpTargets.ts       sections and marked places; resolveJump
├── find.ts              Search in article's matches
├── objectSearch.ts      the Article link picker's pages (ObjectPages, nextToLoad)   ← server search goes here
├── useObjectSearch.ts   the picker's hook (one shared ObjectPages, fresh after 5 min)
├── linkExtensions.ts    editor: clicks, the autolinker while typing, find highlights, Ctrl/⌘+F; setArticleLink / removeArticleLink / goTo
├── LinkRow.tsx          the links row and its popouts (docked under the bar, or floating at an `@`: insertAt)
├── LinkForms.tsx        Real link and Message forms
├── ObjectPicker.tsx · JumpPicker.tsx · FollowPicker.tsx · AutolinkPanel.tsx
├── LinkPreview.tsx      what a link shows of its target (useLinkInfo)                ← URL previews go here
├── LinkHoverCard.tsx · MessagePanel.tsx · JumpGutter.tsx · FindBar.tsx
app/src/features/articles/messages/  messagesStore.ts (messages read on click, kept for the page) · MessageLinkForm.tsx · useLegacyMessages.ts
app/src/features/sharing/            sharing.ts (the switches' rules, useSharing) · PrivacyButton.tsx · PrivacyPanel.tsx (every shared table)
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
| `msg` | `id` (the message's row) | the message panel at the right of the text; the message is read now (once) |
| `jump` | `to`: `a:<anchor id>` or `h:<heading index>:<slug>` | scrolls there |
| `anchor` | `id` | (a jump's target: a soft mark on the words) |
| `person` | `p` | the person's card (Follow) |
| `project-url` | `u` | someone's project, in a new tab |

`a` and `t`: the autolinker that made it (its id and words). Unknown keys are ignored. `linkHref.test.ts` checks that every kind
survives `sanitizeRichText` unchanged: a new key or kind needs a case there.

## Autolinkers (docs/plans/35)

The article's autolinkers are its `autolinkers` field (JSON, `packages/shared/src/autolinkers.ts`): `{ id, phrases, link, by }`, the link as an `#mapl:`
href without its rule. They come with the article (an editor's and owner's copy; a reader's has none, and lists leave the field out) and are saved
**with the text in the same request**: the page keeps all the values in one object (`field(name, value)` in `ArticlePanel`), so a rule and the links it
made change together. A link in the text still carries its rule's id and phrase (`a`, `t`): they are what "Go there" and the hover card read, and the
rule's `id` here is that `a`. Limits: 50 autolinkers, 20 phrases each, a phrase in one autolinker only (the server refuses otherwise).

- The Autolinker while typing reads the page's rules (`handlers.current.rules()`), not the document.
- A rule stays until it is deleted in the panel: its phrases written nowhere are linked when they are written; a link taken out by hand is linked again when
  the phrase is typed again. Undo undoes the links in the text, not the rule.
- An article made before the field: when an editor opens it, the rules found in its links are added to the field once (`adoptRules`) and saved.
- Import from other article reads that article's `autolinkers`, or its text when it has none yet.

## Messages (docs/plans/34)

- **Written by the article's editors and owner only** (Message in the link row): `POST /api/messages`, then the selected words get
  `#mapl:k=msg&id=<id>` and the autosave saves the text. Readers only read them.
- **Read only when the words are clicked** (`GET /api/messages/:id`, one query: the message, its article's access, its author), then kept
  in `messagesStore` until the page closes. The hover card and the side list never read: they show a message only once it was read.
- **Done**: its author, the editors and the owner (`PATCH { done }`); its text: its author only, while they can edit the article.
- **Removing the words does not delete the message.** Editors find it under Messages → "Not in the text" (read only when pressed,
  `GET /api/messages?articleId=&exclude=<ids in the text>`), to delete it or place it on selected words. Cut and paste, and Undo, keep it.
- **A link to another article's message** opens "This message was deleted" (the panel checks `articleId`); a deleted message's link can
  be taken out from its panel.
- **Old messages** (`k=msg&ti=…&c=…`, from before) still open from their link. The first time an editor opens the article they are made
  rows (`POST /api/messages/import`, 50 at a time) and their links rewritten to ids, saved at once (`useLegacyMessages`).

## Who can read or edit (docs/plans/34)

The server answers each shared row with `access` (`owner`, `editor`, `reader`): `useArticleRole` reads it. The owner has Private / Public
and the people (`PrivacyButton`, which reads the people only when it opens and sends Apply as one request); an editor gets the editor's
page without the owner's ⋯ actions; a reader gets the page read-only (no toolbar, the Info box and banner only shown).

## Connecting the backend later

- **People / followers**: replace `usePeople`, `personById` and the follow store in `mockPeople.ts`; keep their shapes.
- **Search of objects**: `ObjectSource.list` gets the query, and `ObjectPages.results` stops filtering.
- **URL previews** (picture and text of an outside page): `useLinkInfo`'s `url` / `project-url` case.
- **More link records**, if wanted: as messages did (a table, the id in the href, read on click).
