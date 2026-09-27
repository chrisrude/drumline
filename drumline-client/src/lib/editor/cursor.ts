/***
 * This file contains the logic for moving the cursor after filling in a cell.
 *
 * The inspiration for this is the NYT crossword app, which is something most
 * users are likely to be familiar with.
 *
 * After a letter is typed, the cursor advances to the next *empty* cell in
 * the current row or band.  Rows stop at their end, bands wrap around.  If
 * every other cell is already filled, the cursor just advances by one.
 */

import {
    nextIndexWithWrap,
    nextIndexWithoutWrap,
    type CellGroupLocations,
    type Grid
} from '@chrisrude/drumline-lib';

export { firstEmptyCell, isEmpty, nextEmptyCell };

const isEmpty = (grid: Grid, location: [number, number]): boolean =>
    !grid[location[0]][location[1]].is_filled();

// cursor handling functions
const firstEmptyCell = (
    grid: Grid,
    locations: CellGroupLocations,
    use_band: boolean
): [number, number] => nextEmptyCell(grid, locations, 0, use_band);

const nextEmptyCell = (
    grid: Grid,
    locations: CellGroupLocations,
    location_offset: number,
    use_band: boolean
): [number, number] => {
    const fn_next_idx = use_band ? nextIndexWithWrap : nextIndexWithoutWrap;
    return _findEmptyCell(grid, locations, location_offset, fn_next_idx);
};

const _findEmptyCell = (
    grid: Grid,
    locations: CellGroupLocations,
    location_offset: number,
    fn_next_idx: (locations: CellGroupLocations, index: number) => number
): [number, number] => {
    // walk forward from the starting cell, at most once around the group.
    // note that the cell at location_offset itself is only considered if
    // we wrap all the way back around to it.
    let last_cell_idx = location_offset;
    for (let loop_count = 0; loop_count < locations.length; loop_count++) {
        const next_cell_idx = fn_next_idx(locations, last_cell_idx);
        if (next_cell_idx === last_cell_idx) {
            // we didn't move (end of a non-wrapping group), so we're stuck
            break;
        }
        if (isEmpty(grid, locations[next_cell_idx])) {
            return locations[next_cell_idx];
        }
        last_cell_idx = next_cell_idx;
    }
    // no empty cell was found, so just return the next cell, as if
    // none were filled
    return locations[fn_next_idx(locations, location_offset)];
};
