export { GameState };
export type { AnswerSegment, AnswerSegments, Cell, CellType, GameStateType };
import type {
    ClearActionType,
    ClearSegmentActionType,
    GameActionType,
    MarkSegmentActionType,
    SetActionType
} from './game_actions';
import type { ClueList, Puzzle } from './puzzle';
import { GridLocation, clueListId } from './puzzle';

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
    clue_list: ClueList;
    segments: AnswerSegment[];

    constructor(clue_list: ClueList) {
        this.clue_list = clue_list;
        this.segments = [];
    }

    removeOverlappingSegments(remove: AnswerSegment): void {
        // given the new range [idxStart, idxEnd], removes all elements from
        // wordGroups which overlap with that range
        this.segments = this.segments.filter((segment) => {
            if (segment.idx_start < remove.idx_start) {
                return segment.idx_end < remove.idx_start;
            } else {
                return remove.idx_end < segment.idx_start;
            }
        });
    }

    markSegment(segment: AnswerSegment): void {
        // clear all segments that overlap with this one
        this.removeOverlappingSegments(segment);
        this.segments.push(segment);
        this.segments.sort((a, b) => {
            return a.idx_start - b.idx_start;
        });
    }

    clearSegment(idx_cell: number): void {
        this.removeOverlappingSegments({ idx_start: idx_cell, idx_end: idx_cell });
    }

    isComplete(): boolean {
        // the segments cover all the cells in the clue list
        const coverage = this.segments.reduce((acc, segment) => {
            return acc + segment.idx_end - segment.idx_start + 1;
        }, 0);
        return coverage === this.clue_list.locations.length;
    }

    in_answer_at(row: number, col: number): [boolean, boolean, boolean] {
        // find offset within clue_list
        const offset = this.clue_list.locations.findIndex((location) => {
            return location.row === row && location.col === col;
        });
        if (offset === -1) {
            throw new Error(
                `is_in_word: location (${row},${col}) not in clue list ${this.clue_list}`
            );
        }
        return this.in_answer_at_offset(offset);
    }

    // returns: [is_in_answer, is_start_of_answer, is_end_of_answer]
    in_answer_at_location(cursorLocation: GridLocation): [boolean, boolean, boolean] {
        return this.in_answer_at(cursorLocation.row, cursorLocation.col);
    }

    in_answer_at_offset(offset: number): [boolean, boolean, boolean] {
        for (const segment of this.segments) {
            if (segment.idx_start <= offset && offset <= segment.idx_end) {
                return [true, segment.idx_start === offset, segment.idx_end === offset];
            }
        }
        return [false, false, false];
    }
}

type SegmentMap = Map<string, AnswerSegments>;

type GameStateType = {
    grid: Cell[][];
    answer_segments: SegmentMap;
    is_solved: boolean;
};

class GameState implements GameStateType {
    readonly answer_segments: SegmentMap;
    readonly center: GridLocation;
    readonly puzzle: Puzzle;
    readonly grid: Cell[][];
    is_solved: boolean;

    constructor(puzzle: Puzzle) {
        this.answer_segments = new Map<string, AnswerSegments>();
        for (const row of puzzle.rows) {
            this.answer_segments.set(clueListId(row), new AnswerSegments(row));
        }
        for (const band of puzzle.bands) {
            this.answer_segments.set(clueListId(band), new AnswerSegments(band));
        }
        const center = Math.floor(puzzle.size / 2);
        this.center = new GridLocation(center, center);
        this.puzzle = puzzle;
        this.grid = Array.from({ length: puzzle.size }, () =>
            Array.from({ length: puzzle.size }, () => new Cell())
        );
        this.is_solved = false;
    }

    apply(action: GameActionType): void {
        switch (action.action) {
            case 'set': {
                const set_action = action as SetActionType;
                this.grid[set_action.row][set_action.col].set(set_action.text);
                this.updateIsSolved();
                break;
            }
            case 'clear': {
                const clear_action = action as ClearActionType;
                this.grid[clear_action.row][clear_action.col].clear();
                if (this.is_solved) {
                    this.is_solved = false;
                }
                break;
            }
            case 'markSegment': {
                const mark_segment_action = action as MarkSegmentActionType;
                const list_id = clueListId(mark_segment_action);
                const answer_segments = this.answer_segments.get(list_id);
                if (!answer_segments) {
                    throw new Error(
                        `markSegment: no answer segments for clue list ${mark_segment_action}`
                    );
                }
                answer_segments.markSegment({
                    idx_start: mark_segment_action.idx_cell_start,
                    idx_end: mark_segment_action.idx_cell_end
                });
                break;
            }
            case 'clearSegment': {
                const clear_segment_action = action as ClearSegmentActionType;
                const list_id = clueListId(clear_segment_action);
                const answer_segments = this.answer_segments.get(list_id);
                if (!answer_segments) {
                    throw new Error(
                        `clearSegment: no answer segments for clue list ${clear_segment_action}`
                    );
                }
                answer_segments.clearSegment(clear_segment_action.idx_cell);
                break;
            }
        }
    }
    getAnswerSegments(clue_list: ClueList): AnswerSegments {
        return this.answer_segments.get(clueListId(clue_list)) as AnswerSegments;
    }
    getAnswerSegmentsAt(row: number, col: number, use_band: boolean): AnswerSegments {
        const clue_list = this.puzzle.getClueListAt(row, col, use_band);
        return this.getAnswerSegments(clue_list);
    }
    getAnswerSegmentsAtLocation(cursorLocation: GridLocation, use_band: boolean): AnswerSegments {
        const clue_list = this.puzzle.getClueListAtLocation(cursorLocation, use_band);
        return this.getAnswerSegments(clue_list);
    }
    // cursor handling functions
    firstEmptyCell(clue_list: ClueList): GridLocation {
        return this.nextEmptyCellInternal(GridLocation.NONE, clue_list.nextCell);
    }
    nextEmptyCell(location: GridLocation, use_band: boolean): GridLocation {
        const clue_list = this.puzzle.getClueListAtLocation(location, use_band);
        return this.nextEmptyCellInternal(location, clue_list.nextCell);
    }
    prevEmptyCell(location: GridLocation, use_band: boolean): GridLocation {
        const clue_list = this.puzzle.getClueListAtLocation(location, use_band);
        return this.nextEmptyCellInternal(location, clue_list.prevCell);
    }
    getCell(location: GridLocation): Cell {
        return this.grid[location.row][location.col];
    }
    isEmpty(location: GridLocation): boolean {
        return !this.grid[location.row][location.col].is_filled();
    }
    nextEmptyCellInternal(
        location: GridLocation,
        fnNext: (arg0: GridLocation) => GridLocation
    ): GridLocation {
        const num_cells = this.puzzle.size * this.puzzle.size;
        let last_cell = location;
        let next_cell = location;
        let loop_count = 0;
        while ((next_cell = fnNext(next_cell))) {
            if (!this.grid[next_cell.row][next_cell.col].is_filled()) {
                // we found an answer
                return next_cell;
            }
            // if we didn't move, we're stuck, so just return the last cell
            if (next_cell === last_cell) {
                return last_cell;
            }
            // if we wound up at the starting cell, we wrapped around without
            // finding a suitable place to stop, so just return the start cell
            // also, if we've looked at more cells than are in the grid, we're
            // probably looping indefinitely, so just return the start cell
            if (next_cell === location || loop_count > num_cells) {
                break;
            }
            last_cell = next_cell;
            loop_count += 1;
        }
        return location;
    }

    findWordBoundsAtLocation(
        groupNexus: GridLocation,
        answerSegments: AnswerSegments
    ): [number, number] {
        return this.findWordBoundsAt(groupNexus.row, groupNexus.col, answerSegments);
    }

    findWordBoundsAt(i: number, j: number, segments: AnswerSegments): [number, number] {
        const idxOrigin = segments.clue_list.indexAt(i, j);

        const is_suitable_for_word = (idx: number): boolean => {
            if (idx < 0 || idx >= segments.clue_list.locations.length) {
                return false;
            }
            const coord = segments.clue_list.locations[idx];
            if (!this.grid[coord.row][coord.col].is_filled()) {
                return false;
            }
            if (segments.in_answer_at_offset(idx)[0]) {
                return false;
            }
            return true;
        };

        // look backwards for a square that has a letter in it and is not
        // part of an existing word
        let idxStart = idxOrigin;
        while (idxStart > 0) {
            const idxStartNext = idxStart - 1;
            if (!is_suitable_for_word(idxStartNext)) {
                break;
            }
            idxStart = idxStartNext;
        }
        // look forwards for the same thing
        let idxEnd = idxOrigin;
        while (idxEnd < segments.clue_list.locations.length - 1) {
            const idxEndNext = idxEnd + 1;
            if (!is_suitable_for_word(idxEndNext)) {
                break;
            }
            idxEnd = idxEndNext;
        }
        return [idxStart, idxEnd];
    }

    updateIsSolved(): void {
        // try to find a cell that isn't filled
        for (const [row_idx, row] of this.grid.entries()) {
            for (const [col_idx, cell] of row.entries()) {
                if (row_idx === this.center.row && col_idx === this.center.col) {
                    continue;
                }
                if (!cell.is_filled()) {
                    this.is_solved = false;
                    return;
                }
            }
        }
        // if we got here, all cells are filled
        this.is_solved = true;
    }
}
