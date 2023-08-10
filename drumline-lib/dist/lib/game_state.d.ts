export { AnswerSegments, Cell, GameState };
export type { AnswerSegment, CellType, GameStateType, Grid };
import type { ClueListActionType, GameActionType, GridActionType } from './game_actions';
import type { ClueListKind } from './puzzle';
type CellType = {
    text: string;
};
declare class Cell implements CellType {
    text: string;
    constructor();
    clear(): void;
    set(text: string): void;
    is_filled(): boolean;
}
type AnswerSegment = {
    idx_start: number;
    idx_end: number;
};
declare class AnswerSegments {
    segments: AnswerSegment[];
    constructor();
    removeOverlappingSegments: (remove: AnswerSegment) => void;
    markSegment: (segment: AnswerSegment) => void;
    clearSegment: (idx_cell: number) => void;
    numAnsweredCells: () => number;
    in_answer_at_offset: (offset: number) => [boolean, boolean, boolean];
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
declare class GameState implements GameStateType {
    readonly band_answer_segments: AnswerSegments[];
    readonly center: number;
    readonly grid: Grid;
    is_solved: boolean;
    readonly row_answer_segments: AnswerSegments[];
    readonly size: number;
    readonly solve_id: string;
    constructor(size: number, solve_id: string);
    apply: (action: GameActionType) => void;
    applyClueListAction: (action: ClueListActionType) => void;
    applyGridAction: (action: GridActionType) => void;
    getAnswerSegments: (kind: ClueListKind, index: number) => AnswerSegments;
    updateIsSolved: () => void;
    cell: (location: [number, number]) => Cell;
}
