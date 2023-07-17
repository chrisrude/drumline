export { addPuzzleWordBand, addPuzzleWordRow, clearPuzzleWordBand, clearPuzzleWordRow, createWordAtLocation, isInWord, loadPuzzleFromJson, load_puzzle };
export type { Band, Clue, Puzzle, Row };

type Clue = {
    // a single letter, starting with 'a'
    identifier: string,
    text: string,
}

// Row, is a type of ClueList
type Row = {
    clues: Clue[],

    // start, end offset (inclusive)
    words: [number, number][],
}

type Band = {
    start_offset: number,
    clues: Clue[],

    // start, end offset (inclusive)
    // todo: how to handle wraps?
    words: [number, number][],
}

type Cell = {
    text: string,
}

type Puzzle = {
    input_text: string,
    size: number,

    rows: Row[],
    bands: Band[],

    grid: Cell[][],
}

const loadPuzzleFromJson = (storedString: string) => {
    const result = JSON.parse(storedString)
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
// take input like the following and return a Puzzle object

// ROWS
// 1 a first row clue
// b second row clue
// 2 a first row clue
// of the second row
// b second row clue of the second row
// 3 a first row clue.  it's ok for there just to be one
//
//
// BANDS
// A a first band clue
// of the outermost band
// b if we had a second band,
// it would start with a capital B
// but we don't since we only have 3
// rows.  Instead this clue is just
// very long.

// shouldn't be more than 26, or we'll run out of letters
const MAX_LENGTH = 26;
// numbers 1-26, as strings
const ROW_IDENTIFIERS = Array.from({ length: MAX_LENGTH }, (_, i) => (i + 1).toString());
// upper-case letters A-Z
const BAND_IDENTIFIERS = Array.from({ length: MAX_LENGTH }, (_, i) => String.fromCharCode(i + 65));
// lower case a-z
const CLUE_IDENTIFIERS = BAND_IDENTIFIERS.map(letter => letter.toLowerCase());

const ROWS_HEADER = "ROWS";
const BANDS_HEADER = "BANDS";

// split a string into two parts, at the first occurrence of the separator
// if the separator isn't found, the second part is an empty string
function sane_split(input: string, separator: string): [string, string] {
    const [first] = input.split(separator, 1);
    const rest = input.slice(first.length + separator.length);
    return [first, rest];
}

function read_nested_clues(raw_lines: string[], group_identifiers_orig: readonly string[]): Clue[][] {
    let groups: Clue[][] = [];
    let group_identifiers = [...group_identifiers_orig];
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

        let current_group = groups[groups.length - 1];
        let clue_letter = CLUE_IDENTIFIERS[current_group.length];
        if (letter === clue_letter) {
            // we are starting a new clue, and clue_text is the clue text
            current_group.push({
                identifier: clue_letter,
                text: clue_text,
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

    let row_clue_lines: string[] = [];
    let band_clue_lines: string[] = [];
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

    let row_clues = read_nested_clues(row_clue_lines, ROW_IDENTIFIERS);
    let band_clues = read_nested_clues(band_clue_lines, BAND_IDENTIFIERS);
    return [
        row_clues.map(clues => ({ clues, words: [] })),
        band_clues.map(clues => ({ clues, words: [], start_offset: 0 })),
    ]
}

export var isPuzzleComplete = (puzzle: Puzzle): boolean => {
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

export const getBandNumberFromCoords = (i: number, j: number, size: number) => {
    const rowOffset = Math.min(i, size - i - 1);
    const colOffset = Math.min(j, size - j - 1);
    const band = Math.min(rowOffset, colOffset);
    if (band >= Math.floor(size / 2)) {
        return band - 1;
    }
    return band;
}

export const nextCellInRow = (size: number, i: number, j: number, backwards: boolean) => {
    let newCol = j;
    if (backwards) {
        if (j > 0) {
            newCol = newCol - 1;
        }
    } else {
        const center = Math.floor(size / 2);
        if (j < size - 1) {
            newCol = newCol + 1;
            // don't stop on center cell
            if (newCol === center && i === center) {
                newCol = newCol + 1;
            }
        }
    }
    return [i, newCol];
}

function isInGrid(size: number, i: number, j: number) {
    return i >= 0 && i < size && j >= 0 && j < size;
}

export const nextCellInBand = (size: number, i: number, j: number, backwards: boolean) => {
    const RIGHT = [0, 1];
    const DOWN = [1, 0];
    const LEFT = [0, -1];
    const UP = [-1, 0];

    // look right, down, left, up for the next cell in the band
    const bandNumber = getBandNumberFromCoords(i, j, size);
    // if in min column, look up and right
    // if in max column, look down and left
    // if in min row, look right and down
    // if in max row, look left and up
    let directions: number[][] = [];
    if (i === bandNumber) {
        directions.push(RIGHT);
    }
    if (i === size - bandNumber - 1) {
        directions.push(LEFT);
    }
    if (j === bandNumber) {
        directions.push(UP);
    }
    if (j === size - bandNumber - 1) {
        directions.push(DOWN);
    }

    for (const [rowOffset, colOffset] of directions) {
        const newRow = i + (backwards ? -rowOffset : rowOffset);
        const newCol = j + (backwards ? -colOffset : colOffset);
        if (
            isInGrid(size, newRow, newCol) &&
            getBandNumberFromCoords(newRow, newCol, size) === bandNumber
        ) {
            return [newRow, newCol];
        }
    }
    throw new Error('Could not find next cell in band');
}

export const getBandCoords = (size: number, bandIdx: number): [number, number][] => {
    let coords: [number, number][] = [];
    for (let i = bandIdx; i < size - bandIdx; i++) {
        coords.push([bandIdx, i]);
    }
    for (let i = bandIdx + 1; i < size - bandIdx; i++) {
        coords.push([i, size - bandIdx - 1]);
    }
    for (let i = size - bandIdx - 1; i >= bandIdx; i--) {
        coords.push([size - bandIdx - 1, i]);
    }
    for (let i = size - bandIdx - 1; i >= bandIdx; i--) {
        coords.push([i, bandIdx]);
    }
    return coords;
}

export const offsetWithinBand = (i: number, j: number, size: number): number => {
    const bandIdx = getBandNumberFromCoords(i, j, size);
    const badCoords = getBandCoords(size, bandIdx);
    for (let k = 0; k < badCoords.length; k++) {
        if (badCoords[k][0] === i && badCoords[k][1] === j) {
            return k;
        }
    }
    throw new Error("offset not within band");
}


export const firstEmptyBandCell = (puzzle: Puzzle, bandNumber: number): [number, number] => {
    const bandCoords = getBandCoords(puzzle.size, bandNumber);
    for (let i = 0; i < bandCoords.length; i++) {
        const [row, col] = bandCoords[i];
        if (puzzle.grid[row][col].text === ' ') {
            return [row, col];
        }
    }
    // no empty cells in the band, so go to the first cell
    // in the band
    return [bandNumber, bandNumber];
}

export const isClueDone = (puzzle: Puzzle, isBand: boolean, clueIdx: number): boolean => {
    // is puzzle undefined
    if (puzzle === undefined) {
        return false;
    }
    if (isBand) {
        const coords = getBandCoords(puzzle.size, clueIdx);
        for (const [i, j] of coords) {
            if (puzzle.grid[i][j].text === ' ') {
                return false;
            }
        }
        return true;
    }
    let row: number = clueIdx;
    const middle = Math.floor(puzzle.size / 2);
    // check to see if all the squares in this row are filled in
    for (let i = 0; i < puzzle.size; i++) {
        if (puzzle.grid[row][i].text === ' ') {
            if (row === middle && i === middle) {
                // middle square is allowed to be empty
                continue;
            }
            return false;
        }
    }
    return true;
};

function removeOverlappingWords(wordGroups: [number, number][], idxStart: number, idxEnd: number) {
    // given the new range [idxStart, idxEnd], removes all elements from
    // wordGroups which overlap with that range
    return wordGroups.filter(
        group => {
            if (group[0] < idxStart) {
                return group[1] < idxStart;
            } else {
                return idxEnd < group[0];
            }
        }
    )
}

function clearPuzzleWordRow(puzzle: Puzzle, rowIdx: number, colIdx: number) {
    puzzle.rows[rowIdx].words = removeOverlappingWords(puzzle.rows[rowIdx].words, colIdx, colIdx);
}

function clearPuzzleWordBand(puzzle: Puzzle, bandIdx: number, bandOffset: number) {
    puzzle.bands[bandIdx].words = removeOverlappingWords(puzzle.bands[bandIdx].words, bandOffset, bandOffset);
}

function addPuzzleWordGroup(words: [number, number][], idxStart: number, idxEnd: number) {
    words = removeOverlappingWords(words, idxStart, idxEnd);
    words.push(
        [idxStart, idxEnd]
    );
    // sort words by idxStart
    words.sort((a: [number, number], b: [number, number]) => {
        return a[0] - b[0];
    });
    return words;
}

function addPuzzleWordBand(puzzle: Puzzle, bandIdx: number, startIdx: number, endIdx: number) {
    puzzle.bands[bandIdx].words = addPuzzleWordGroup(puzzle.bands[bandIdx].words, startIdx, endIdx);
}

function addPuzzleWordRow(puzzle: Puzzle, rowIdx: number, startCol: number, endCol: number) {
    puzzle.rows[rowIdx].words = addPuzzleWordGroup(puzzle.rows[rowIdx].words, startCol, endCol);
}


function isInWordList(words: [number, number][], offset: number) {
    for (const [start, end] of words) {
        if (start <= offset && offset <= end) {
            return true;
        }
    }
    return false;
}

function createWordAtLocation(puzzle: Puzzle, i: number, j: number, useBand: boolean) {
    if (useBand) {
        const bandNumber = getBandNumberFromCoords(i, j, puzzle.size);
        const bandOffset = offsetWithinBand(i, j, puzzle.size);
        const bandCoords = getBandCoords(puzzle.size, bandNumber);

        // look backwards for a square that has a letter in it and is not 
        // part of an existing word
        let startIdx = bandOffset;
        for (let k = bandOffset - 1; k >= 0; k--) {
            const [row, col] = bandCoords[k];
            if (puzzle.grid[row][col].text === ' ') {
                break;
            }
            if (isInWordList(puzzle.bands[bandNumber].words, k)) {
                break;
            }
            startIdx = k;
        }

        // look forwards for the same thing
        let endIdx = bandOffset;
        for (let k = bandOffset + 1; k < bandCoords.length; k++) {
            const [row, col] = bandCoords[k];
            if (puzzle.grid[row][col].text === ' ') {
                break;
            }
            if (isInWordList(puzzle.bands[bandNumber].words, k)) {
                break;
            }
            endIdx = k;
        }
        if (startIdx == endIdx) {
            // don't add a single letter word
            return;
        }
        addPuzzleWordBand(puzzle, bandNumber, startIdx, endIdx);
    } else {
        // look backwards for a square that has a letter in it and is not
        // part of an existing word
        let startIdx = j;
        for (let k = j - 1; k >= 0; k--) {
            if (puzzle.grid[i][k].text === ' ') {
                break;
            }
            if (isInWordList(puzzle.rows[i].words, k)) {
                break;
            }
            startIdx = k;
        }
        // look forwards for the same thing
        let endIdx = j;
        for (let k = j + 1; k < puzzle.size; k++) {
            if (puzzle.grid[i][k].text === ' ') {
                break;
            }
            if (isInWordList(puzzle.rows[i].words, k)) {
                break;
            }
            endIdx = k;
        }
        // don't add a single letter word
        if (startIdx == endIdx) {
            return;
        }
        addPuzzleWordRow(puzzle, i, startIdx, endIdx);
    }
}

function isInWord(puzzle: Puzzle, i: number, j: number, useBand: boolean) {
    if (useBand) {
        const bandNumber = getBandNumberFromCoords(i, j, puzzle.size);
        const bandOffset = offsetWithinBand(i, j, puzzle.size);

        return isInWordList(puzzle.bands[bandNumber].words, bandOffset);
    }
    const wordList = puzzle.rows[i].words;
    return isInWordList(wordList, j);
}

function load_puzzle(input_text: string): Puzzle {
    const lines = input_text.split('\n');
    const [rows, bands] = read_into_rows_and_bands(lines);

    if (rows.length === 0) {
        throw new Error("No rows found");
    }
    if (bands.length === 0) {
        throw new Error("No bands found");
    }
    const expected_row_count = bands.length * 2 + 1;
    // rows and bands should be the same length
    if (rows.length !== expected_row_count) {
        throw new Error(`Expected ${expected_row_count} row(s), because we had ${bands.length} band(s) but found ${rows.length} row(s) instead`);
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
    let grid: Cell[][] = [];
    for (let i = 0; i < size; i++) {
        grid[i] = [];
        for (let j = 0; j < size; j++) {
            grid[i][j] = {
                text: ' ',
            }
        }
    }

    return {
        input_text,
        size: rows.length,
        rows,
        bands,
        grid,
    }
}