export { Puzzle };
export type { Clue, ClueList, ClueListIdentifier, ClueListKind, PuzzleType };
type Clue = {
    text: string;
    label: string;
    clue_index: number;
};
type ClueListKind = 'band' | 'row';
type ClueListIdentifier = {
    readonly index: number;
    readonly kind: ClueListKind;
};
type ClueList = ClueListIdentifier & {
    readonly clues: Clue[];
};
type PuzzleType = {
    band_clues: ClueList[];
    original_text: string;
    row_clues: ClueList[];
    size: number;
};
declare class Puzzle implements PuzzleType {
    band_clues: ClueList[];
    original_text: string;
    row_clues: ClueList[];
    size: number;
    constructor(text: string);
}
