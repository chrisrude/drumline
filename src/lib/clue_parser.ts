import type { Clue } from './puzzle';
export { parse_clues };

// shouldn't be more than 26, or we'll run out of letters
const MAX_LENGTH = 26;
// numbers 1-26, as strings
export const ROW_IDENTIFIERS = Array.from({ length: MAX_LENGTH }, (_, i) => (i + 1).toString());
// upper-case letters A-Z
export const BAND_IDENTIFIERS = Array.from({ length: MAX_LENGTH }, (_, i) =>
    String.fromCharCode(i + 65)
);
// lower case a-z
export const CLUE_IDENTIFIERS = BAND_IDENTIFIERS.map((letter) => letter.toLowerCase());

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
        let [letter, text] = sane_split(line, ' ');
        if (letter === next_group_identifier) {
            // let's start a new group
            groups.push([]);

            next_group_identifier = group_identifiers.shift();

            // since the outer letter went with the group, the next letter is the clue identifier
            [letter, text] = sane_split(text, ' ');
        }
        if (groups.length === 0) {
            // we haven't started a group yet, so we can't add this clue to
            // a group.  Let's just skip it.
            continue;
        }

        const current_group = groups[groups.length - 1];
        const clue_index = current_group.length;
        const label = CLUE_IDENTIFIERS[clue_index];
        if (letter === label) {
            // we are starting a new clue, and clue_text is the clue text
            current_group.push({
                clue_index,
                label,
                text
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

function read_into_rowClues_and_bandClues(lines: string[]): [Clue[][], Clue[][]] {
    // takes a list of lines, and returns a list of lists of lines
    // a line becomes part of a new group when it starts with the next expected identifier

    const row_clue_lines: string[] = [];
    const band_clue_lines: string[] = [];
    let found_rowClues = false;
    let found_bandClues = false;
    let current_group = null;

    for (const raw_line of lines) {
        const line = raw_line.trim();

        if (line.length === 0) {
            continue;
        }
        if (!found_rowClues && line === ROWS_HEADER) {
            found_rowClues = true;
            current_group = row_clue_lines;
            continue;
        }
        if (!found_bandClues && line === BANDS_HEADER) {
            found_bandClues = true;
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

    return [row_clues, band_clues];
}

function parse_clues(input_text: string): [Clue[][], Clue[][]] {
    const lines = input_text.split('\n');
    const [rowClues, bandClues] = read_into_rowClues_and_bandClues(lines);

    if (rowClues.length === 0) {
        throw new Error('No rowClues found');
    }
    if (bandClues.length === 0) {
        throw new Error('No bandClues found');
    }
    const expected_row_count = bandClues.length * 2 + 1;
    // rowClues and bandClues should be the same length
    if (rowClues.length !== expected_row_count) {
        throw new Error(
            `Expected ${expected_row_count} row(s), because we had ${bandClues.length} band(s) but found ${rowClues.length} row(s) instead`
        );
    }

    // if there are any blank rowClues or bandClues, raise an error
    for (let i = 0; i < rowClues.length; i++) {
        if (rowClues[i].length === 0) {
            throw new Error(`Row ${i + 1} contains no clues`);
        }
    }
    for (let i = 0; i < bandClues.length; i++) {
        if (bandClues[i].length === 0) {
            throw new Error(`Band ${i + 1} contains no clues`);
        }
    }

    return [rowClues, bandClues];
}
