export { GridLocation, Puzzle, clueListId };
export type {
    Band,
    Clue,
    ClueList,
    ClueListIdentifier,
    ClueListKind,
    GridLocationType,
    PuzzleType,
    Row
};

import { BAND_IDENTIFIERS, ROW_IDENTIFIERS, parse_clues } from './clue_parser';

type GridLocationType = {
    row: number;
    col: number;
};

class GridLocation implements GridLocationType {
    static readonly NONE = new GridLocation(-1, -1);

    row: number;
    col: number;

    constructor(row: number, col: number) {
        this.row = row;
        this.col = col;
    }
    is_none(): boolean {
        return this.row === GridLocation.NONE.row && this.col === GridLocation.NONE.col;
    }
}

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

function clueListId(id: ClueListIdentifier): string {
    return `${id.kind}-${id.index}`;
}

type ClueList = ClueListIdentifier & {
    readonly clues: Clue[];
    readonly locations: GridLocationType[];
    readonly heading: string;

    indexAt(row: number, col: number): number;
    indexAtLocation(x: GridLocationType): number;
    nextCell(x: GridLocationType): GridLocation;
    prevCell(x: GridLocationType): GridLocation;
};

function locationsForBand(size: number, band_index: number): GridLocation[] {
    // we have a size*size grid, and we want to return the locations for the nth band,
    // in clockwise order, starting from the top left corner

    const locations: GridLocation[] = [];
    for (let col = band_index; col < size - band_index; col++) {
        locations.push(new GridLocation(band_index, col));
    }
    for (let row = band_index + 1; row < size - band_index - 1; row++) {
        locations.push(new GridLocation(row, size - band_index - 1));
    }
    for (let col = size - band_index - 1; col >= band_index + 1; col--) {
        locations.push(new GridLocation(size - band_index - 1, col));
    }
    for (let row = size - band_index - 1; row >= band_index + 1; row--) {
        locations.push(new GridLocation(row, band_index));
    }
    return locations;
}

abstract class ClueListBase implements ClueList {
    readonly kind: ClueListKind;
    readonly heading: string;
    readonly index: number;
    readonly clues: Clue[];
    readonly locations: GridLocation[];

    constructor(
        kind: ClueListKind,
        heading: string,
        index: number,
        clues: Clue[],
        locations: GridLocation[]
    ) {
        this.kind = kind;
        this.heading = heading;
        this.index = index;
        this.clues = clues;
        this.locations = locations;
    }

    indexAtLocation = (location: GridLocationType): number => {
        return this.indexAt(location.row, location.col);
    };

    indexAt = (row: number, col: number): number => {
        const result = this.locations.findIndex((loc) => loc.row === row && loc.col === col);
        if (result === -1) {
            throw new Error(
                `indexOfLocation: location (${row},${col}) not found in ${this.kind} ${this.index}`
            );
        }
        return result;
    };

    abstract nextCell(x: GridLocationType): GridLocation;
    abstract prevCell(x: GridLocationType): GridLocation;
}

class Band extends ClueListBase {
    readonly center: number;
    constructor(band_index: number, clues: Clue[], size: number) {
        const heading = BAND_IDENTIFIERS[band_index];
        const locations = locationsForBand(size, band_index);
        super('band', heading, band_index, clues, locations);
        this.center = Math.floor(size / 2);
    }

    // for bands, nextCell when called at the end of the band
    // wraps around to the beginning of the band.  Same with
    // prevCell at the beginning.
    nextCell = (x: GridLocation): GridLocation => {
        if (x.is_none()) {
            return this.locations[0];
        }
        if (x.col === this.center && x.row === this.center) {
            // we're in the middle, don't move
            return x;
        }
        const idx = this.indexAtLocation(x);
        return this.locations[(idx + 1) % this.locations.length];
    };

    prevCell = (x: GridLocation): GridLocation => {
        if (x.col === this.center && x.row === this.center) {
            // we're in the middle, don't move
            return x;
        }
        const idx = this.indexAtLocation(x);
        const nextLoc = (idx + this.locations.length - 1) % this.locations.length;
        return this.locations[nextLoc];
    };
}

function locationsForRow(num_rows: number, row_index: number): GridLocation[] {
    // we have a row, and want to return the locations for the idx'th row.
    // this is easy.
    return Array.from({ length: num_rows }, (_, i) => new GridLocation(row_index, i));
}

class Row extends ClueListBase {
    readonly center: number;

    constructor(row_index: number, clues: Clue[], size: number) {
        const heading = ROW_IDENTIFIERS[row_index];
        const locations = locationsForRow(size, row_index);
        super('row', heading, row_index, clues, locations);
        this.center = Math.floor(size / 2);
    }

    // for rows, nextCell when called at the end of the row
    // just stays there.  Same with prevCell at the beginning.
    nextCell = (x: GridLocation): GridLocation => {
        if (x.is_none()) {
            return this.locations[0];
        }
        if (x.row !== this.index) {
            throw new Error(`nextCell: location ${x} not in row ${this.index}`);
        }
        let nextCol = Math.min(x.col + 1, this.locations.length - 1);
        // one exception: skip the center square
        if (this.index === this.center && nextCol === this.center) {
            nextCol += 1;
        }
        return new GridLocation(this.index, nextCol);
    };

    prevCell = (x: GridLocation): GridLocation => {
        if (x.row !== this.index) {
            throw new Error(`nextCell: location ${x} not in row ${this.index}`);
        }
        let prevCol = Math.max(x.col - 1, 0);
        // one exception: skip the center square
        if (this.index === this.center && prevCol === this.center) {
            prevCol -= 1;
        }
        return new GridLocation(this.index, prevCol);
    };
}

/////////////////////////////////////////
// puzzle
//
// all static information, not related to a solve attempt
//
type PuzzleType = {
    bands: Band[];
    original_text: string;
    rows: Row[];
    size: number;
};

const getBandNumberFromCoords = (i: number, j: number, size: number) => {
    const rowOffset = Math.min(i, size - i - 1);
    const colOffset = Math.min(j, size - j - 1);
    const band = Math.min(rowOffset, colOffset);
    return band;
};

class Puzzle implements PuzzleType {
    bands: Band[];
    original_text: string;
    rows: Row[];
    size: number;

    constructor(text: string) {
        this.original_text = text;
        const [row_clues, band_clues] = parse_clues(text);
        this.size = row_clues.length;
        this.rows = row_clues.map((clues, i) => new Row(i, clues, this.size));
        this.bands = band_clues.map((clues, i) => new Band(i, clues, this.size));
    }

    getBandNumberAt(row: number, col: number): number {
        return getBandNumberFromCoords(row, col, this.size);
    }

    getBandNumberAtLocation(location: GridLocation): number {
        return getBandNumberFromCoords(location.row, location.col, this.size);
    }

    getClueListAt(row: number, col: number, use_band: boolean): ClueList {
        if (use_band) {
            // we're using bands, so we need to figure out which band we're in
            // and then return that band's identifier
            const band_index = getBandNumberFromCoords(row, col, this.size);
            return this.bands[band_index];
        }
        // we're using rows, which is easy, just pick the right row
        return this.rows[row];
    }

    getClueListAtLocation(location: GridLocation, use_band: boolean): ClueList {
        if (use_band) {
            // we're using bands, so we need to figure out which band we're in
            // and then return that band's identifier
            const band_index = getBandNumberFromCoords(location.row, location.col, this.size);
            const clamped_index = Math.min(band_index, this.bands.length - 1);
            return this.bands[clamped_index];
        }
        // we're using rows, which is easy, just pick the right row
        return this.rows[location.row];
    }
}
