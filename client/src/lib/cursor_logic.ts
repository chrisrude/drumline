/***
 * This file contains the logic for moving the cursor after filling in a cell.
 * 
 * The inspiration for his is the NYT crossword app, which is something most
 * users are likely to be familiar with.
 * 
 * The state here is based on:
 * - the size of the grid (aka the )
 */

import { nextIndexWithWrap, prevIndexWithWrap, type CellGroupLocations, type Grid } from 'drumline-lib';

export { firstEmptyCell, isEmpty, nextEmptyCell };

const isEmpty = (grid: Grid, location: [number, number]): boolean =>
    !grid[location[0]][location[1]].is_filled();

// cursor handling functions
const firstEmptyCell = (
    grid: Grid, locations: CellGroupLocations, use_band: boolean
): [number, number] =>
    nextEmptyCell(grid, locations, 0, use_band);

const nextEmptyCell = (
    grid: Grid, locations: CellGroupLocations, location_offset: number, use_band: boolean
): [number, number] => {
    const fn_next_idx = use_band ? nextIndexWithWrap : prevIndexWithWrap;
    return _findEmptyCell(grid, locations, location_offset, fn_next_idx);
}

const _findEmptyCell = (
    grid: Grid,
    locations: CellGroupLocations,
    location_offset: number,
    fn_next_idx: (locations: CellGroupLocations, index: number) => number
): [number, number] => {
    const num_cells = grid.length * grid.length;
    let last_cell_idx = location_offset;
    let next_cell_idx = location_offset;
    let loop_count = 0;
    while (next_cell_idx = fn_next_idx(locations, last_cell_idx)) {
        const next_cell = locations[next_cell_idx];
        if (isEmpty(grid, next_cell)) {
            // we found an answer
            return next_cell;
        }
        // if we didn't move, we're stuck, so just return the last cell
        if (next_cell_idx === last_cell_idx) {
            return locations[last_cell_idx];
        }
        // if we wound up at the starting cell, we wrapped around without
        // finding a suitable place to stop, so just return the start cell
        // also, if we've looked at more cells than are in the grid, we're
        // probably looping indefinitely, so just return the start cell
        if (next_cell_idx === location_offset || loop_count > num_cells) {
            break;
        }
        last_cell_idx = next_cell_idx;
        loop_count += 1;
    }
    // all the cells are filled, so just return the next cell, as if
    // none were filled
    const original_next_cell = fn_next_idx(locations, location_offset);
    return locations[original_next_cell];
}
