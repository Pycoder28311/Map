// The strange characters the article toolbar's Ω button offers, in sections, and the most common ones that show in its row. Pure data (symbols.test.ts).

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

/** The five most common ones, shown in the toolbar's row before the Ω button is pressed (one character each, separated by spaces) */
export const COMMON_SYMBOLS = '© ° • → ✓'
