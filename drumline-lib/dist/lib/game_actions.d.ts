export { GAME_ACTIONS, actionToString, areActionsEqual, clear, clearSegment, joinPuzzle, leavePuzzle, markSegment, set, stringToAction };
export type { ClearActionType, ClearSegmentActionType, ClueListActionType, CreatePuzzleActionType, GameActionKinds, GameActionType, GameActions, GridActionType, GridLocationType, JoinPuzzleActionType, LeavePuzzleActionType, MarkSegmentActionType, SetActionType, SolveIdActionType };
import type { ClueListIdentifier } from './puzzle';
type GameActions = JoinPuzzleActionType | LeavePuzzleActionType | SetActionType | ClearActionType | MarkSegmentActionType | ClearSegmentActionType;
declare const GAME_ACTIONS: readonly ["joinPuzzle", "leavePuzzle", "set", "clear", "markSegment", "clearSegment"];
type GameActionKinds = (typeof GAME_ACTIONS)[number];
type GameActionType = {
    action: GameActionKinds;
    user_id: string;
    change_count: number;
};
type CreatePuzzleActionType = GameActionType & {
    action: 'createPuzzle';
    change_count: -1;
    puzzle_input: string;
};
type SolveIdActionType = GameActionType & {
    solve_id: string;
};
type JoinPuzzleActionType = SolveIdActionType & {
    action: 'joinPuzzle';
};
type LeavePuzzleActionType = GameActionType & {
    action: 'leavePuzzle';
};
type GridLocationType = {
    row: number;
    col: number;
};
type GridActionType = GameActionType & GridLocationType;
type ClueListActionType = GameActionType & ClueListIdentifier;
type SetActionType = GridActionType & {
    action: 'set';
    text: string;
};
type ClearActionType = GridActionType & {
    action: 'clear';
};
type MarkSegmentActionType = ClueListActionType & {
    action: 'markSegment';
    idx_cell_start: number;
    idx_cell_end: number;
};
type ClearSegmentActionType = ClueListActionType & {
    action: 'clearSegment';
    idx_cell: number;
};
declare function set(at: GridLocationType, text: string): SetActionType;
declare function clear(at: GridLocationType): ClearActionType;
declare function markSegment(clue_list: ClueListIdentifier, idx_cell_start: number, idx_cell_end: number): MarkSegmentActionType;
declare function clearSegment(clue_list: ClueListIdentifier, idx_cell: number): ClearSegmentActionType;
declare function joinPuzzle(solve_id: string): JoinPuzzleActionType;
declare function leavePuzzle(): LeavePuzzleActionType;
declare function stringToAction(str: string): GameActions;
declare function actionToString(action: GameActions): string;
declare function areActionsEqual(a: GameActions, b: GameActions): boolean;
