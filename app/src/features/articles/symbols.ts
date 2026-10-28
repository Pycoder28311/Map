// The characters the article toolbar's Ω popout offers, in sections, and the sections in its four groups. Pure data (symbols.test.ts).

/** A section of characters: its name, and the characters (each put in the text where the caret is when it is pressed) */
export type SymbolSection = { title: string; symbols: string }

/** The characters of the Ω button's panel, in sections */
export const SYMBOLS: SymbolSection[] = [
  { title: 'Marks', symbols: '© ® ™ § ¶ † ‡ • ◦ ‣ ° ′ ″ ‰ № ℗ ℠' },
  { title: 'Quotes and dashes', symbols: '“ ” ‘ ’ « » ‹ › „ ‚ – — ― ‐ … ·' },
  { title: 'Arrows', symbols: '← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇒ ⇑ ⇓ ⇔ ↩ ↪ ↺ ↻ ➜ ➔' },
  { title: 'Currency', symbols: '$ € £ ¥ ¢ ₹ ₽ ₩ ₺ ₪ ₫ ₴ ₿ ¤' },
  { title: 'Fractions and numbers', symbols: '½ ⅓ ⅔ ¼ ¾ ⅕ ⅖ ⅗ ⅘ ⅙ ⅛ ⅜ ⅝ ⅞ ¹ ² ³ ⁴ ₁ ₂ ₃ ₄' },
  { title: 'Greek letters', symbols: 'α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω Α Β Γ Δ Ε Ζ Η Θ Λ Ξ Π Σ Φ Ψ Ω' },
  { title: 'Latin letters', symbols: 'à á â ã ä å æ ç è é ê ë ì í î ï ñ ò ó ô õ ö ø œ ß ù ú û ü ý ÿ Æ Ø Œ' },
  { title: 'Operators', symbols: '± ∓ × ÷ − ∗ ∘ ∙ √ ∛ ∜ ∑ ∏ ∐ ∫ ∬ ∭ ∮ ∂ ∇ ∆ ∞ ∝ ⊕ ⊖ ⊗ ⊘' },
  { title: 'Relations', symbols: '= ≠ ≈ ≉ ≡ ≢ ≤ ≥ ≪ ≫ < > ≺ ≻ ∼ ≃ ≅ ∥ ⊥ ∠ ∡' },
  { title: 'Sets and logic', symbols: '∈ ∉ ∋ ⊂ ⊃ ⊆ ⊇ ⊄ ∪ ∩ ∅ ∖ ∀ ∃ ∄ ¬ ∧ ∨ ⊻ ⇒ ⇔ ⊢ ⊨ ∴ ∵ ∎' },
  { title: 'Number sets', symbols: 'ℕ ℤ ℚ ℝ ℂ ℙ ℍ ℵ ℶ ℏ ℓ ℜ ℑ' },
  { title: 'Powers and indexes', symbols: '⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻ ⁼ ⁿ ⁱ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ₊ ₋ ₌ ₙ ₓ' },
  { title: 'Brackets and marks', symbols: '⟨ ⟩ ⌈ ⌉ ⌊ ⌋ ‖ ∣ ′ ″ ‴ ⁗ ∕ ⁄ ⋅ ⋯ ⋮ ⋱' },
  { title: 'Shapes and signs', symbols: '★ ☆ ♠ ♣ ♥ ♦ ♪ ♫ ✓ ✔ ✗ ✘ ☐ ☑ ☒ ● ○ ■ □ ▲ △ ▼ ▽ ◆ ◇ ☀ ☁ ☂ ☎ ✉ ⚑ ⚐ ☮ ☯ ☠' },
]

const section = (title: string) => SYMBOLS.find((s) => s.title === title)!

/**
 * The Ω popout's groups after Basics (the structures, MoreFormats.tsx): SVGs (shapes, signs and arrows, each shown big like a little
 * picture: characters, so the server keeps them), Mathematical, and Others. Every character of SYMBOLS is in one of them
 */
export const SYMBOL_GROUPS: { title: 'SVGs' | 'Mathematical' | 'Others'; big?: boolean; sections: SymbolSection[] }[] = [
  {
    title: 'SVGs',
    big: true,
    sections: [
      { title: 'Shapes', symbols: '★ ☆ ● ○ ■ □ ▲ △ ▼ ▽ ◆ ◇' },
      { title: 'Signs', symbols: '♥ ♦ ♣ ♠ ☀ ☁ ☂ ☎ ✉ ⚑ ⚐ ✓ ✔ ✗ ✘ ☐ ☑ ☒ ☮ ☯ ☠ ♪ ♫' },
      section('Arrows'),
    ],
  },
  {
    title: 'Mathematical',
    sections: ['Operators', 'Relations', 'Sets and logic', 'Number sets', 'Fractions and numbers', 'Powers and indexes', 'Greek letters'].map(section),
  },
  {
    title: 'Others',
    sections: ['Marks', 'Quotes and dashes', 'Currency', 'Latin letters', 'Brackets and marks'].map(section),
  },
]
