export { initialValue, isPuzzleComplete, loadPuzzle, storedPuzzle };

import { browser } from '$app/environment';

import {
    BAND_IDENTIFIERS,
    CLUE_IDENTIFIERS,
    ROW_IDENTIFIERS,
    initBand,
    type Band,
    type Cell,
    type Clue,
    type Puzzle,
    type Row
} from '$lib/puzzle';
import { writable } from 'svelte/store';

const PUZZLE_STORE = 'drumline-puzzle';

const storedString = browser ? window.localStorage.getItem(PUZZLE_STORE) ?? null : null;
const initialValue = storedString ? loadPuzzleFromJson(storedString) : null;
const storedPuzzle = writable<Puzzle | null>(initialValue);

storedPuzzle.subscribe((value) => {
    if (browser) {
        if (value) {
            window.localStorage.setItem(PUZZLE_STORE, JSON.stringify(value));
        } else {
            window.localStorage.removeItem(PUZZLE_STORE);
        }
    }
});

const ROWS_HEADER = 'ROWS';
const BANDS_HEADER = 'BANDS';

// split a string into two parts, at the first occurrence of the separator
// if the separator isn't found, the second part is an empty string
function sane_split(input: string, separator: string): [string, string] {
    const [first] = input.split(separator, 1);
    const rest = input.slice(first.length + separator.length);
    return [first, rest];
}

function read_nested_clues(
    raw_lines: string[],
    group_identifiers_orig: readonly string[]
): Clue[][] {
    const groups: Clue[][] = [];
    const group_identifiers = [...group_identifiers_orig];
    let next_group_identifier = group_identifiers.shift();

    for (const line of raw_lines) {
        // is this line part of the previous group, or a new one?
        let [letter, clue_text] = sane_split(line, ' ');
        if (letter === next_group_identifier) {
            // let's start a new group
            groups.push([]);

            next_group_identifier = group_identifiers.shift();

            // since the outer letter went with the group, the next letter is the clue identifier
            [letter, clue_text] = sane_split(clue_text, ' ');
        }
        if (groups.length === 0) {
            // we haven't started a group yet, so we can't add this clue to
            // a group.  Let's just skip it.
            continue;
        }

        const current_group = groups[groups.length - 1];
        const clue_letter = CLUE_IDENTIFIERS[current_group.length];
        if (letter === clue_letter) {
            // we are starting a new clue, and clue_text is the clue text
            current_group.push({
                identifier: clue_letter,
                text: clue_text
            });
        } else {
            if (current_group.length === 0) {
                // we haven't started a clue yet, so we can't add this text to
                // a clue.  Let's just skip it.
                continue;
            }
            // we aren't starting a new clue, so the full line gets added
            // to the previous clue, if it exists
            current_group[current_group.length - 1].text += ' ' + line;
        }
    }
    return groups;
}

function read_into_rows_and_bands(lines: string[]): [Row[], Band[]] {
    // takes a list of lines, and returns a list of lists of lines
    // a line becomes part of a new group when it starts with the next expected identifier

    const row_clue_lines: string[] = [];
    const band_clue_lines: string[] = [];
    let found_rows = false;
    let found_bands = false;
    let current_group = null;

    for (const raw_line of lines) {
        const line = raw_line.trim();

        if (line.length === 0) {
            continue;
        }
        if (!found_rows && line === ROWS_HEADER) {
            found_rows = true;
            current_group = row_clue_lines;
            continue;
        }
        if (!found_bands && line === BANDS_HEADER) {
            found_bands = true;
            current_group = band_clue_lines;
            continue;
        }
        if (current_group === null) {
            // we haven't found the first group yet, so we can't add this line to
            // a group.  Let's just skip it.
            continue;
        }
        current_group.push(line);
    }

    const row_clues = read_nested_clues(row_clue_lines, ROW_IDENTIFIERS);
    const band_clues = read_nested_clues(band_clue_lines, BAND_IDENTIFIERS);

    return [
        row_clues.map((clues) => ({ clues, words: [] })),
        band_clues.map((clues, idx) => (initBand(row_clues.length, idx, clues))),
    ];
}

function isPuzzleComplete(puzzle: Puzzle): boolean {
    // is puzzle undefined
    if (puzzle === undefined) {
        return false;
    }
    const middle = Math.floor(puzzle.size / 2);

    // is the grid full
    for (let i = 0; i < puzzle.size; i++) {
        for (let j = 0; j < puzzle.size; j++) {
            if (i === middle && j === middle) {
                continue;
            }
            if (puzzle.grid[i][j].text === ' ') {
                return false;
            }
        }
    }
    return true;
}

function loadPuzzle(input_text: string): Puzzle {
    const lines = input_text.split('\n');
    const [rows, bands] = read_into_rows_and_bands(lines);

    if (rows.length === 0) {
        throw new Error('No rows found');
    }
    if (bands.length === 0) {
        throw new Error('No bands found');
    }
    const expected_row_count = bands.length * 2 + 1;
    // rows and bands should be the same length
    if (rows.length !== expected_row_count) {
        throw new Error(
            `Expected ${expected_row_count} row(s), because we had ${bands.length} band(s) but found ${rows.length} row(s) instead`
        );
    }

    // if there are any blank rows or bands, raise an error
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].clues.length === 0) {
            throw new Error(`Row ${i + 1} contains no clues`);
        }
    }
    for (let i = 0; i < bands.length; i++) {
        if (bands[i].clues.length === 0) {
            throw new Error(`Band ${i + 1} contains no clues`);
        }
    }
    const size = rows.length;
    const grid: Cell[][] = [];
    for (let i = 0; i < size; i++) {
        grid[i] = [];
        for (let j = 0; j < size; j++) {
            grid[i][j] = {
                text: ' '
            };
        }
    }

    return {
        input_text,
        size: rows.length,
        rows,
        bands,
        grid
    };
}

function loadPuzzleFromJson(storedString: string): Puzzle {
    const result = JSON.parse(storedString);
    // add this in, as migration
    for (const row of result.rows) {
        if (row.words === undefined) {
            row.words = [];
        }
    }
    for (const band of result.bands) {
        if (band.words === undefined) {
            band.words = [];
        }
    }
    return result;
}
