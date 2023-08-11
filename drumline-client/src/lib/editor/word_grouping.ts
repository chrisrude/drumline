import type { AnswerSegments, CellGroup, GameState, Grid, GridAttributes } from '@chrisrude/drumline-lib';

export { canGroupIntoAnswer, canUngroupAnswer, findWordBounds };

/**
 * A series of functions to help with grouping squares into answers.
 *
 * Each takes a single grid coordinate, along with the partially-filled
 * grid, and returns:
 * - whether that cell can be added to a new answer
 * - whether a cell can be removed from an answer
 * - which adjacent cells should be included in a new answer
 *   centered on that cell
 */

const _cellGroupAndSegments = (
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): [CellGroup, AnswerSegments] => {
    const cell_attributes = grid_attributes.cells[location[0]][location[1]];
    const answer_segments_list = use_band
        ? gamestate.band_answer_segments
        : gamestate.row_answer_segments;
    const cell_group = use_band ? cell_attributes.band_group : cell_attributes.row_group;
    return [cell_group, answer_segments_list[cell_group.index]];
};

const isInAnswer = (
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): boolean => {
    const [cell_group, answer_segments] = _cellGroupAndSegments(
        gamestate,
        grid_attributes,
        location,
        use_band
    );
    if (!answer_segments) {
        return false;
    }
    return answer_segments.in_answer_at_offset(cell_group.offset)[0];
};

const isEmptyOrInAnswer = (
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): boolean => {
    return (
        !gamestate.cell(location).is_filled() ||
        isInAnswer(gamestate, grid_attributes, location, use_band)
    );
};

// returns the location of the square which can be added to an answer, after
// inspecting both the cursor's square and then the previous square.
// If neither square is valid, returns null.
// A square can be added to an answer if it has text in it, and is not already
// part of an answer.
const findSquareToGroup = (
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): [number, number] | null => {
    const cell_attributes = grid_attributes.cells[location[0]][location[1]];
    if (cell_attributes.is_center) {
        return null;
    }
    if (!isEmptyOrInAnswer(gamestate, grid_attributes, location, use_band)) {
        return location;
    }
    const cell_group = use_band ? cell_attributes.band_group : cell_attributes.row_group;
    if (!isEmptyOrInAnswer(gamestate, grid_attributes, cell_group.prev, use_band)) {
        return cell_group.prev;
    }
    return null;
};

const canGroupIntoAnswer = (
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): boolean => null !== findSquareToGroup(gamestate, grid_attributes, location, use_band);

const canUngroupAnswer = (
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): boolean => isInAnswer(gamestate, grid_attributes, location, use_band);

// returns the bounds of the largest contiguous group in the row/band
// which:
//  - includes this cell
//  - contains only filled cells
//  - contains only cells not part of another answer
// at a minimum, this will be the cell itself, as it is assumed that
// this won't be called on a cell already part of an answer.
// maximally, this could span from index 0 to n-1, where n is the number
// of cells in the row or band.
const findWordBounds = (
    grid: Grid,
    gamestate: GameState,
    grid_attributes: GridAttributes,
    location: [number, number],
    use_band: boolean
): [number, number] => {
    const [cell_group, answer_segments] = _cellGroupAndSegments(
        gamestate,
        grid_attributes,
        location,
        use_band
    );
    const locations = (
        use_band ? grid_attributes.locations_for_band : grid_attributes.locations_for_row
    )[cell_group.index];

    const fn_is_suitable_for_word = (idx: number): boolean => {
        const [row_next, col_next] = locations[idx];
        return grid[row_next][col_next].is_filled() && !answer_segments.in_answer_at_offset(idx)[0];
    };

    // look backwards for a square that has a letter in it and is not
    // part of an existing word
    let idxStart = cell_group.offset;
    while (idxStart > 0) {
        const idxStartNext = idxStart - 1;
        if (!fn_is_suitable_for_word(idxStartNext)) {
            break;
        }
        idxStart = idxStartNext;
    }

    // look forwards for the same thing, but start at the
    // square before the cursor, in case the cursor square
    // is empty
    let idxEnd = Math.max(cell_group.offset - 1, 0);
    while (idxEnd < locations.length - 1) {
        const idxEndNext = idxEnd + 1;
        if (!fn_is_suitable_for_word(idxEndNext)) {
            break;
        }
        idxEnd = idxEndNext;
    }
    return [idxStart, idxEnd];
};
