import { ClueListIdentifier } from "./puzzle";

export { memoizedGenerateGridAttributes, memoizedGetBandNumberFromCoords, memoizedLocationsForBand, memoizedLocationsForRow, nextIndexWithWrap, nextIndexWithoutWrap, prevIndexWithWrap, prevIndexWithoutWrap };
export type { BandGroup, BandSides, CellAttributes, CellGroup, CellGroupLocations, GridAttributes, RowGroup };

/***
 * This module contains functions for generating the attributes for each cell in the grid.
 * 
 * Attributes are stored in a 2D array of CellAttributes objects, mirroring
 * the grid of cells in the puzzle.
 * 
 * The attributes include:
 * - row: the row number of the cell
 * - band_number: the band number of the cell
 * - band_prev: the coordinates of the previous cell in the band
 * - band_next: the coordinates of the next cell in the band
 * - band_offset: the offset of this cell cell in the band, counting
 *   from the top left corner of the band
 * - band_side: the side of the band that this cell is on (top, left, etc.)
 * - row_prev: the coordinates of the previous cell in the row
 * - row_next: the coordinates of the next cell in the row
 * - row_offset: the offset of this cell in the row, counting from the
 *   left edge of the row, and skipping any cells which can't contain answers
 * - is_corner: whether this cell is a corner cell within its band
 * 
 * The purpose of this is to pre-compute the static attributes needed to render
 * the grid.  Here, static attributes are those only based on the size of the grid.
 *
 * As a result, this module is heavily memoized, such that its calculations will
 * be reused whenever we render another grid of the same size.
 ***/

type BandSides = 'top' | 'right' | 'bottom' | 'left';

function memoize<A extends unknown[], T>(func: (...args: A) => T): (...args: A) => T {
    const cache: Map<string, T> = new Map();
    return (...args: A): T => {
        const key = args.join('-');
        if (!cache.has(key)) {
            cache.set(key, func(...args));
        }
        return cache.get(key)!;
    }
}

const _locationsForBand = (size: number, band_index: number): CellGroupLocations => {
    // we have a size*size grid, and we want to return the locations for the nth band,
    // in clockwise order, starting from the top left corner

    const locations: CellGroupLocations = [];
    for (let col = band_index; col < size - band_index; col++) {
        locations.push([band_index, col]);
    }
    for (let row = band_index + 1; row < size - band_index - 1; row++) {
        locations.push([row, size - band_index - 1]);
    }
    for (let col = size - band_index - 1; col >= band_index + 1; col--) {
        locations.push([size - band_index - 1, col]);
    }
    for (let row = size - band_index - 1; row >= band_index + 1; row--) {
        locations.push([row, band_index]);
    }
    return locations;
}
const memoizedLocationsForBand = memoize(_locationsForBand);

const _locationsForRow = (size: number, row_index: number): CellGroupLocations => {
    const center = Math.floor(size / 2);
    if (row_index !== center) {
        return Array.from({ length: size }, (_, col) => [row_index, col]);
    }
    // if we're in the center row, skip the center cell
    const locations: CellGroupLocations = [];
    for (let col = 0; col < size; col++) {
        if (col === center) {
            continue;
        }
        locations.push([row_index, col]);
    }
    return locations;
}
const memoizedLocationsForRow = memoize(_locationsForRow);


const _getBandNumberFromCoords = (size: number, i: number, j: number): number => {
    const rowOffset = Math.min(i, size - i - 1);
    const colOffset = Math.min(j, size - j - 1);
    const band = Math.min(rowOffset, colOffset);
    return band;
};
const memoizedGetBandNumberFromCoords = memoize(_getBandNumberFromCoords);


const _clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

// returns the index'ed value of the list, clamping to the
// first or last element if an out of bounds index is given
const _clampListIndex = <T>(list: T[], idx: number): number =>
    _clamp(idx, 0, list.length - 1);

// for rows, nextCell when called at the end of the row
// just stays there.  Same with prevCell at the beginning.
const nextIndexWithoutWrap = (locations: [number, number][], idx: number): number =>
    _clampListIndex(locations, idx + 1);

const prevIndexWithoutWrap = (locations: [number, number][], idx: number): number =>
    _clampListIndex(locations, idx - 1);

const nextIndexWithWrap = (locations: [number, number][], idx: number): number =>
    (idx + 1) % locations.length;

const prevIndexWithWrap = (locations: [number, number][], idx: number): number =>
    (idx + locations.length - 1) % locations.length;


/////////

// returns a tuple of:
//  - the number of the band that this cell is in
//  - if this cell is a corner
const _getBandSide = (size: number, i: number, j: number): [BandSides, boolean] => {
    const band = memoizedGetBandNumberFromCoords(size, i, j);
    const backSide = size - 1 - band;
    if (i === band && j !== backSide) {
        return ['top', j === band];
    }
    if (j === backSide && i !== backSide) {
        return ['right', i === band];
    }
    if (i === backSide && j !== band) {
        return ['bottom', j === backSide];
    }
    if (j === band) {
        return ['left', i === backSide];
    }
    // this is the center cell
    return ['top', true]
};

////

type CellGroupLocations = [number, number][];
type CellGroup = ClueListIdentifier & {
    readonly offset: number;
    readonly prev: [number, number];
    readonly next: [number, number];
}

type RowGroup = CellGroup & {
    kind: 'row';
}

type BandGroup = CellGroup & {
    kind: 'band';
    readonly side: BandSides;
    readonly is_corner: boolean;
}

type CellAttributes = {
    readonly band_group: BandGroup;
    readonly row_group: RowGroup;
    readonly is_center: boolean;
}

type GridAttributes = {
    readonly cells: CellAttributes[][];
    readonly center: number;
    readonly num_bands: number;
    readonly locations_for_band: CellGroupLocations[];
    readonly locations_for_row: CellGroupLocations[];
    readonly size: number;
}

const _generateGridAttributes = (size: number): GridAttributes => {
    // unlike other places, this includes the center cell as a "band"
    const cells: CellAttributes[][] = [];
    const center = Math.floor(size / 2);
    const num_bands = Math.floor((size - 1) / 2) + 1;
    const locations_for_band = Array.from({ length: num_bands }, (_, i) => memoizedLocationsForBand(size, i));
    const locations_for_row = Array.from({ length: size }, (_, i) => memoizedLocationsForRow(size, i));
    for (let i = 0; i < size; i++) {
        const row: CellAttributes[] = [];
        for (let j = 0; j < size; j++) {
            const band_number = memoizedGetBandNumberFromCoords(size, i, j);
            const band_locations = memoizedLocationsForBand(size, band_number);
            const band_offset = band_locations.indexOf([i, j]);
            const [band_side, is_corner] = _getBandSide(size, i, j);
            const band_group: BandGroup = {
                kind: 'band',
                index: band_number,
                offset: band_offset,
                prev: band_locations[prevIndexWithWrap(band_locations, band_offset)],
                next: band_locations[nextIndexWithWrap(band_locations, band_offset)],
                side: band_side,
                is_corner: is_corner
            }

            const row_locations = memoizedLocationsForRow(size, i);
            const row_offset = row_locations.indexOf([i, j]);
            const row_group: RowGroup = {
                kind: 'row',
                index: i,
                offset: row_offset,
                prev: row_locations[prevIndexWithoutWrap(row_locations, row_offset)],
                next: row_locations[nextIndexWithoutWrap(row_locations, row_offset)]
            }

            const is_center = i === center && j === center;
            row.push({ is_center, band_group, row_group });
        }
        cells.push(row);
    }
    return {
        cells,
        center,
        num_bands,
        locations_for_band,
        locations_for_row,
        size
    };
};
const memoizedGenerateGridAttributes = memoize(_generateGridAttributes);