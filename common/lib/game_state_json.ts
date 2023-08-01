export { set_from_json, to_json };

import type { GameState } from './game_state';
import { clueListId, type ClueList } from './puzzle';

function to_json(gameState: GameState): string {
    const num_rows = gameState.puzzle.size;
    const num_bands = gameState.answer_segments.size - num_rows;

    // store grid and answer_segments, but not puzzle
    const grid = gameState.grid.map((row) => {
        return row.map((cell) => {
            return cell.text;
        });
    });
    const row_segments: [number, number][][] = Array.from({ length: num_rows }, () => []);
    const band_segments: [number, number][][] = Array.from({ length: num_bands }, () => []);

    for (const value of gameState.answer_segments.values()) {
        const segments: [number, number][] = value.segments.map((segment) => [
            segment.idx_start,
            segment.idx_end
        ]);

        if (value.clue_list.kind == 'row') {
            row_segments[value.clue_list.index] = segments;
        } else {
            band_segments[value.clue_list.index] = segments;
        }
    }

    const result = JSON.stringify({
        grid,
        row_segments,
        band_segments
    });
    return result;
}

function set_clue_lists(
    gameState: GameState,
    clue_lists: ClueList[],
    segment_values: [number, number][][]
) {
    if (clue_lists.length !== segment_values.length) {
        throw new Error(
            `set_from_json: clue_lists has ${clue_lists.length} rows, expected ${segment_values.length}`
        );
    }
    // iterate arrays in parallel
    for (let i = 0; i < clue_lists.length; i++) {
        const segments = segment_values[i];
        const clue_list = clue_lists[i];
        for (const segment of segments) {
            const id = clueListId(clue_list);
            const answer_segments = gameState.answer_segments.get(id);
            if (!answer_segments) {
                throw new Error(`set_from_json: no answer_segments for row ${i}`);
            }
            answer_segments.markSegment({
                idx_start: segment[0],
                idx_end: segment[1]
            });
        }
    }
}

function set_from_json(json: string, gameState: GameState): void {
    const simple_json = JSON.parse(json);

    // verify sizes line up
    if (simple_json.grid.length !== gameState.puzzle.size) {
        throw new Error(
            `set_from_json: grid has ${simple_json.grid.length} rows, expected ${gameState.puzzle.size}`
        );
    }
    if (simple_json.grid[0].length !== gameState.puzzle.size) {
        throw new Error(
            `set_from_json: grid has ${simple_json.grid[0].length} columns, expected ${gameState.puzzle.size}`
        );
    }
    const row_segments: [number, number][][] = simple_json.row_segments;
    if (row_segments.length !== gameState.puzzle.size) {
        throw new Error(
            `set_from_json: row_segments has ${row_segments.length} rows, expected ${gameState.puzzle.size}`
        );
    }
    const band_segments: [number, number][][] = simple_json.band_segments;
    const num_bands = gameState.answer_segments.size - gameState.puzzle.size;
    if (band_segments.length !== num_bands) {
        throw new Error(
            `set_from_json: band_segments has ${band_segments.length} rows, expected ${num_bands}`
        );
    }

    // set grid
    const json_grid = simple_json.grid;
    for (let i = 0; i < gameState.puzzle.size; i++) {
        for (let j = 0; j < gameState.puzzle.size; j++) {
            gameState.grid[i][j].set(json_grid[i][j]);
        }
    }

    // set answer_segments
    set_clue_lists(gameState, gameState.puzzle.rows, row_segments);
    set_clue_lists(gameState, gameState.puzzle.bands, band_segments);
}
