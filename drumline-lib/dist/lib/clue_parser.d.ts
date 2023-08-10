import type { Clue } from './puzzle';
export { parse_clues };
export declare const ROW_IDENTIFIERS: string[];
export declare const BAND_IDENTIFIERS: string[];
export declare const CLUE_IDENTIFIERS: string[];
declare function parse_clues(input_text: string): [Clue[][], Clue[][]];
