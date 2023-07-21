export { addPuzzleWordBand, addPuzzleWordRow, clearPuzzleWordBand, clearPuzzleWordRow, createWordAtLocation, isInWord };
export type { Band, Cell, Clue, Puzzle, Row };

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


export const getBandNumberFromCoords = (i: number, j: number, size: number) => {
    const rowOffset = Math.min(i, size - i - 1);
    const colOffset = Math.min(j, size - j - 1);
    const band = Math.min(rowOffset, colOffset);
    if (band >= Math.floor(size / 2)) {
        return band - 1;
    }
    return band;
}

export const nextCellInRow = (size: number, i: number, j: number, backwards: boolean): [number, number] => {
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

// go to next empty cell in row, or stay at current cell if there is no next empty cell
export const nextEmptyCellInRow = (puzzle: Puzzle, i: number, j: number, backwards: boolean): [number, number] => {
    let newCol = j;

    const step = backwards ? -1 : 1;
    const fnDone = backwards ? (idx: number) => idx <= 0 : (idx: number) => idx >= puzzle.size - 1;

    while (!fnDone(newCol)) {
        newCol = newCol + step;
        if (puzzle.grid[i][newCol].text === ' ') {
            return [i, newCol];
        }
    }

    // no empty cells in the row, so go to the first cell
    return [i, j];
}

// go to next empty cell in band, or stay at current cell if there is no next empty cell
export const nextEmptyCellInBand = (puzzle: Puzzle, i: number, j: number, backwards: boolean): [number, number] => {
    let newIdx = offsetWithinBand(i, j, puzzle.size);
    const bandCoords = getBandCoords(puzzle.size, getBandNumberFromCoords(i, j, puzzle.size));
    const step = backwards ? -1 : 1;

    while (true) {
        newIdx = (newIdx + bandCoords.length + step) % bandCoords.length;
        if (bandCoords[newIdx][0] === i && bandCoords[newIdx][1] === j) {
            break;
        }
        const [newRow, newCol] = bandCoords[newIdx];
        if (puzzle.grid[newRow][newCol].text === ' ') {
            return [newRow, newCol];
        }
    }

    // no empty cells in the row, so go to the first cell
    return [i, j];
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
    for (let i = bandIdx + 1; i < size - bandIdx - 1; i++) {
        coords.push([i, size - bandIdx - 1]);
    }
    for (let i = size - bandIdx - 1; i >= bandIdx + 1; i--) {
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

export const firstEmptyRowCell = (puzzle: Puzzle, rowNumber: number): [number, number] => {
    return nextEmptyCellInRow(puzzle, rowNumber, 0, false);
}

export const firstEmptyBandCell = (puzzle: Puzzle, bandNumber: number): [number, number] => {
    const bandCoords = getBandCoords(puzzle.size, bandNumber);
    return nextEmptyCellInBand(puzzle, bandCoords[0][0], bandCoords[0][1], false);
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

