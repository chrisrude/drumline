export { Puzzle };
export type {
    Clue,
    ClueList,
    ClueListIdentifier,
    ClueListKind,
    PuzzleType
};

import { parse_clues } from './clue_parser';

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

/////////////////////////////////////////
// puzzle
//
// all static information, not related to a solve attempt
//
type ClueList = ClueListIdentifier & {
    readonly clues: Clue[];
};

type PuzzleType = {
    band_clues: ClueList[];
    original_text: string;
    row_clues: ClueList[];
    size: number;
};

class Puzzle implements PuzzleType {
    band_clues: ClueList[];
    original_text: string;
    row_clues: ClueList[];
    size: number;

    constructor(text: string) {
        this.original_text = text;
        const [row_clues, band_clues] = parse_clues(text);
        this.band_clues = band_clues.map(
            (clues, i) => {
                return {
                    index: i,
                    kind: 'band',
                    clues,
                }
            }
        );
        this.row_clues = row_clues.map(
            (clues, i) => {
                return {
                    index: i,
                    kind: 'row',
                    clues,
                }
            }
        );
        this.size = row_clues.length;
    }
}
