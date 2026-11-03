# Starters

A new user finds three cards in the Dashboard's Orphans row: **My world map**, **My main character** and **My fantasy world**. They are
not in the database. Each one becomes a real map or article the first time the user changes something in it.

## Where things are

```
app/src/features/starters/
├── starterItems.ts      THE starters: titles, text, Info box rows, pictures; their ids (`starter-map`, `starter-character`, `starter-world`)
├── startersStore.ts     which ones this user still has (localStorage, per user and device)
├── makeStarter.ts       makes one in the database (pictures uploaded first, then the article; the map and its board file)
├── StarterArticle.tsx   a starter article's page: ArticlePage with `onStarterChange`
└── StarterMap.tsx       the starter map's page: BoardEditor on an empty board kept only in memory
app/src/assets/starters/ the four pictures (public-domain paintings from Wikimedia Commons)
```

## How it works

- **When they show:** the first time the Dashboard has read a user's lists on a device, the starters are turned on if the user has
  nothing at all, and off for good otherwise. Once on, a starter stays until it is deleted (its card's ⋯ → Delete) or made.
- **Sidebar:** the starters are also rows in the Projects section, after the orphans (ResourceRows), with only Delete in their ⋯.
- **Card picture:** an article's card shows its Info box picture, or else its banner (`cardFaces.tsx`), so the starters and the
  articles made from them show their pictures.
- **Sidebar:** maps are orphans too (they have no parent), so every map is a row in the Projects section, among the projects.
- **Opening:** a card opens its panel with the starter's id (`article:starter-character`, `map:starter-map`). ArticlePanel and
  MapPanel show the starter's page for those ids. Recent history skips them.
- **Article:** the page is the normal article page, without what needs a saved article (Share, ⋯, folders, notes, comments, the save
  status). Its first change (text, title, Info box, banner) calls `onStarterChange` instead of the autosave. The starter's pictures are
  the app's own files, and an article keeps only pictures the app stored (`isSafeImageSrc`), so they are uploaded as the user's first.
  The article is created with everything on the page, and the panel switches to the new article's id.
- **Map:** the first thing drawn, or a rename, makes the map, saves its board as its file and switches the panel to the new id.
- **Changing a starter:** edit `STARTERS` in `starterItems.ts`. The Info box rows must be valid rows (`packages/shared/src/infobox.ts`).

The pictures: *Sir Galahad* (George Frederic Watts) as the character, *Morning in the Riesengebirge* (Caspar David Friedrich), *The
Titan's Goblet* and *The Course of Empire: The Arcadian or Pastoral State* (Thomas Cole). All are in the public domain.
