export { AnswerSegments, Cell, GameState };
export type { AnswerSegment, CellType, GameStateType, Grid };
import type {
    ClearSegmentActionType,
    ClueListActionType,
    GameActionType,
    GridActionType,
    MarkSegmentActionType,
    SetActionType
} from './game_actions';
import type { ClueListKind } from './puzzle';

///////////////////////////////////////
// game_state
//
// all information about a solve attempt
//
const EMPTY_CELL_TEXT = ' ';

type CellType = {
    text: string;
};

class Cell implements CellType {
    text: string;
    constructor() {
        this.text = EMPTY_CELL_TEXT;
    }
    clear(): void {
        this.text = EMPTY_CELL_TEXT;
    }
    set(text: string): void {
        this.text = text;
    }
    is_filled(): boolean {
        return this.text !== EMPTY_CELL_TEXT;
    }
}

type AnswerSegment = {
    idx_start: number;
    idx_end: number;
};

class AnswerSegments {
    segments: AnswerSegment[];

    constructor() {
        this.segments = [];
    }

    removeOverlappingSegments = (remove: AnswerSegment): void => {
        // given the new range [idxStart, idxEnd], removes all elements from
        // wordGroups which overlap with that range
        this.segments = this.segments.filter((segment) => {
            if (segment.idx_start < remove.idx_start) {
                return segment.idx_end < remove.idx_start;
            } else {
                return remove.idx_end < segment.idx_start;
            }
        });
    };

    markSegment = (segment: AnswerSegment): void => {
        // clear all segments that overlap with this one
        this.removeOverlappingSegments(segment);
        this.segments.push(segment);
        this.segments.sort((a, b) => {
            return a.idx_start - b.idx_start;
        });
    };

    clearSegment = (idx_cell: number): void => {
        this.removeOverlappingSegments({ idx_start: idx_cell, idx_end: idx_cell });
    };

    // total number of cells covered by a segment
    numAnsweredCells = (): number => {
        // the segments cover all the cells in the clue list
        return this.segments.reduce((acc, segment) => {
            return acc + segment.idx_end - segment.idx_start + 1;
        }, 0);
    };

    // returns: [is_in_answer, is_start_of_answer, is_end_of_answer]
    in_answer_at_offset = (offset: number): [boolean, boolean, boolean] => {
        for (const segment of this.segments) {
            if (segment.idx_start <= offset && offset <= segment.idx_end) {
                return [true, segment.idx_start === offset, segment.idx_end === offset];
            }
        }
        return [false, false, false];
    };
}

type Grid = Cell[][];

type GameStateType = {
    row_answer_segments: AnswerSegments[];
    band_answer_segments: AnswerSegments[];
    grid: Grid;
    is_solved: boolean;
    size: number;
    solve_id: string;
};

class GameState implements GameStateType {
    readonly band_answer_segments: AnswerSegments[];
    readonly center: number;
    readonly grid: Grid;
    is_solved: boolean;
    readonly row_answer_segments: AnswerSegments[];
    readonly size: number;
    readonly solve_id: string;

    constructor(size: number, solve_id: string) {
        const num_bands = Math.floor((size - 1) / 2);

        this.band_answer_segments = Array.from({ length: num_bands }, () => new AnswerSegments());
        this.center = Math.floor(size / 2);
        this.grid = Array.from({ length: size }, () =>
            Array.from({ length: size }, () => new Cell())
        );
        this.is_solved = false;
        this.row_answer_segments = Array.from({ length: size }, () => new AnswerSegments());
        this.size = size;
        this.solve_id = solve_id;
    }

    apply = (action: GameActionType): void => {
        switch (action.action) {
            case 'clearSegment':
            case 'markSegment':
                const clue_list_action = action as ClueListActionType;
                this.applyClueListAction(clue_list_action);
                break;
            case 'set':
            case 'clear':
                const grid_action = action as GridActionType;
                this.applyGridAction(grid_action);
                break;
        }
    };

    applyClueListAction = (action: ClueListActionType): void => {
        const answer_segments = this.getAnswerSegments(action.kind, action.index);
        switch (action.action) {
            case 'markSegment': {
                const mark_segment_action = action as MarkSegmentActionType;
                answer_segments.markSegment({
                    idx_start: mark_segment_action.idx_cell_start,
                    idx_end: mark_segment_action.idx_cell_end
                });
                break;
            }
            case 'clearSegment': {
                const clear_segment_action = action as ClearSegmentActionType;
                answer_segments.clearSegment(clear_segment_action.idx_cell);
                break;
            }
        }
    };

    applyGridAction = (action: GridActionType): void => {
        const cell = this.grid[action.row][action.col];
        switch (action.action) {
            case 'set': {
                const set_action = action as SetActionType;
                cell.set(set_action.text);
                this.updateIsSolved();
                break;
            }
            case 'clear': {
                cell.clear();
                this.is_solved = false;
                break;
            }
        }
    };

    getAnswerSegments = (kind: ClueListKind, index: number): AnswerSegments => {
        const is_row = 'row' === kind;
        if (!is_row && 'band' !== kind) {
            throw new Error(`get_answer_segments: invalid kind ${kind}`);
        }
        const answer_segments_list = is_row ? this.row_answer_segments : this.band_answer_segments;
        if (index < 0 || index >= answer_segments_list.length) {
            throw new Error(`get_answer_list: invalid index ${index} for ${kind}`);
        }
        return answer_segments_list[index];
    };

    updateIsSolved = (): void => {
        // count number of cells with something filled in
        const num_filled = this.grid.reduce((acc, row) => {
            return (
                acc +
                row.reduce((acc, cell) => {
                    return acc + (cell.is_filled() ? 1 : 0);
                }, 0)
            );
        }, 0);
        this.is_solved = num_filled === this.size * this.size - 1;
    };

    cell = (location: [number, number]): Cell => this.grid[location[0]][location[1]];
}
