const NO_BREAK_SPACE = ' ';
/** A space before a standalone numeral, Arabic (1, 10) or Roman (I, IV), maybe with : , . or ; */
const SPACE_BEFORE_NUMERAL = / (?=(?:\d+|[IVXLC]+)[:,.;]?(?:\s|$))/g;

/**
 * Joins each standalone numeral to the word before it with a no-break space, so a wrapped
 * heading never strands "1" or "I" at the start of a line ("Fórmula 1", "Física I").
 */
export function bindNumerals(text: string): string {
  return text.replace(SPACE_BEFORE_NUMERAL, NO_BREAK_SPACE);
}
