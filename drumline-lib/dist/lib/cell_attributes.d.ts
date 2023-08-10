import { ClueListIdentifier } from './puzzle';
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
declare const memoizedLocationsForBand: (size: number, band_index: number) => CellGroupLocations;
declare const memoizedLocationsForRow: (size: number, row_index: number) => CellGroupLocations;
declare const memoizedGetBandNumberFromCoords: (size: number, i: number, j: number) => number;
declare const nextIndexWithoutWrap: (locations: [number, number][], idx: number) => number;
declare const prevIndexWithoutWrap: (locations: [number, number][], idx: number) => number;
declare const nextIndexWithWrap: (locations: [number, number][], idx: number) => number;
declare const prevIndexWithWrap: (locations: [number, number][], idx: number) => number;
type CellGroupLocations = [number, number][];
type CellGroup = ClueListIdentifier & {
    readonly offset: number;
    readonly prev: [number, number];
    readonly next: [number, number];
};
type RowGroup = CellGroup & {
    kind: 'row';
};
type BandGroup = CellGroup & {
    kind: 'band';
    readonly side: BandSides;
    readonly is_corner: boolean;
};
type CellAttributes = {
    readonly band_group: BandGroup;
    readonly row_group: RowGroup;
    readonly is_center: boolean;
};
type GridAttributes = {
    readonly cells: CellAttributes[][];
    readonly center: number;
    readonly num_bands: number;
    readonly locations_for_band: CellGroupLocations[];
    readonly locations_for_row: CellGroupLocations[];
    readonly size: number;
};
declare const memoizedGenerateGridAttributes: (size: number) => GridAttributes;
