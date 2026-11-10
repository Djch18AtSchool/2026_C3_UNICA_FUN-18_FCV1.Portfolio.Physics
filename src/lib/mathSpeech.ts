/**
 * How a screen reader should say the characters of a figure label that are not plain text:
 * Greek letters and math symbols by their Spanish names. Used by mathTextToString.
 */

const GREEK_NAMES: Readonly<Record<string, string>> = {
  α: 'alfa',
  β: 'beta',
  γ: 'gamma',
  δ: 'delta',
  ε: 'épsilon',
  ϵ: 'épsilon',
  ζ: 'zeta',
  η: 'eta',
  θ: 'theta',
  ϑ: 'theta',
  ι: 'iota',
  κ: 'kappa',
  λ: 'lambda',
  μ: 'mu',
  ν: 'nu',
  ξ: 'xi',
  ο: 'ómicron',
  π: 'pi',
  ϖ: 'pi',
  ρ: 'ro',
  ϱ: 'ro',
  σ: 'sigma',
  ς: 'sigma',
  τ: 'tau',
  υ: 'ípsilon',
  φ: 'fi',
  ϕ: 'fi',
  χ: 'ji',
  ψ: 'psi',
  ω: 'omega',
  // Δ is read as physics reads it, the change in what follows: «delta v».
  Δ: 'delta',
  Γ: 'gamma mayúscula',
  Θ: 'theta mayúscula',
  Λ: 'lambda mayúscula',
  Ξ: 'xi mayúscula',
  Π: 'pi mayúscula',
  Σ: 'sigma mayúscula',
  Υ: 'ípsilon mayúscula',
  Φ: 'fi mayúscula',
  Ψ: 'psi mayúscula',
  Ω: 'omega mayúscula',
};

const SYMBOL_NAMES: Readonly<Record<string, string>> = {
  '∞': 'infinito',
  '≈': 'aproximadamente',
  '≤': 'menor o igual que',
  '≥': 'mayor o igual que',
  '≠': 'distinto de',
  '→': 'flecha',
  '←': 'flecha a la izquierda',
  '↔': 'flecha doble',
  '⇒': 'implica',
  '√': 'raíz de',
  '∫': 'integral de',
  '⊥': 'perpendicular',
  '☉': 'Sol',
  '⊙': 'punto en círculo',
  '∂': 'derivada parcial de',
  '∇': 'nabla',
  '∝': 'proporcional a',
  '≡': 'idéntico a',
  '∼': 'del orden de',
  '⋅': 'por',
  '∓': 'menos más',
  '≪': 'mucho menor que',
  '≫': 'mucho mayor que',
  '∥': 'paralelo a',
  '∠': 'ángulo',
};

/** The Spanish name of a Greek letter or math symbol, or undefined for plain text. */
export function spokenName(char: string): string | undefined {
  return GREEK_NAMES[char] ?? SYMBOL_NAMES[char];
}
