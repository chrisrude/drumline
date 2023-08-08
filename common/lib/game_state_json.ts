export { set_from_json, to_json };

import type { AnswerSegments, GameState } from './game_state';

function to_json(gameState: GameState): string {
    // store grid and answer_segments, but not puzzle
    const grid = gameState.grid.map((row) => {
        return row.map((cell) => {
            return cell.text;
        });
    });
    const row_segments = gameState.row_answer_segments;
    const band_segments = gameState.band_answer_segments;

    const result = JSON.stringify({
        grid,
        row_segments,
        band_segments
    });
    return result;
}

function set_clue_lists(
    answer_segments: AnswerSegments[],
    segment_values_list: [number, number][][]
) {
    if (answer_segments.length !== segment_values_list.length) {
        throw new Error(
            `set_from_json: clue_lists has ${answer_segments.length} rows, expected ${segment_values_list.length}`
        );
    }
    // iterate arrays in parallel
    for (let i = 0; i < answer_segments.length; i++) {
        const segment_values: [number, number][] = segment_values_list[i];
        const gamestate_segments = answer_segments[i];
        for (const segment of segment_values) {
            gamestate_segments.markSegment({
                idx_start: segment[0],
                idx_end: segment[1]
            });
        }
    }
}

function set_from_json(json: string, gameState: GameState): void {
    const simple_json = JSON.parse(json);

    // verify sizes line up
    if (simple_json.grid.length !== gameState.size) {
        throw new Error(
            `set_from_json: grid has ${simple_json.grid.length} rows, expected ${gameState.size}`
        );
    }
    if (simple_json.grid[0].length !== gameState.size) {
        throw new Error(
            `set_from_json: grid has ${simple_json.grid[0].length} columns, expected ${gameState.size}`
        );
    }
    const row_segments: [number, number][][] = simple_json.row_segments;
    if (row_segments.length !== gameState.size) {
        throw new Error(
            `set_from_json: row_segments has ${row_segments.length} rows, expected ${gameState.size}`
        );
    }
    const band_segments: [number, number][][] = simple_json.band_segments;
    const num_bands = gameState.band_answer_segments.length;
    if (band_segments.length !== num_bands) {
        throw new Error(
            `set_from_json: band_segments has ${band_segments.length} rows, expected ${num_bands}`
        );
    }

    // set grid
    const json_grid = simple_json.grid;
    for (let i = 0; i < gameState.grid.length; i++) {
        for (let j = 0; j < gameState.grid.length; j++) {
            gameState.grid[i][j].set(json_grid[i][j]);
        }
    }

    // set answer_segments
    set_clue_lists(gameState.row_answer_segments, row_segments);
    set_clue_lists(gameState.band_answer_segments, band_segments);
}
