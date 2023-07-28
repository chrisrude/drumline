export type {
    ClearActionType,
    ClearSegmentActionType,
    ClueListActionType,
    GameActionKinds,
    GameActionType,
    GridActionType,
    MarkSegmentActionType,
    SetActionType
};
import type { ClueListIdentifier, GridLocationType } from './puzzle';

export { clear, clearSegment, markSegment, set };
// these actions change the game state

type GameActionKinds = 'set' | 'clear' | 'markSegment' | 'clearSegment';
type GameActionType = {
    action: GameActionKinds;
    user_id: number;
    change_count: number;
};

// takes an i,j location on the grid
type GridActionType = GameActionType & GridLocationType;

// takes a clue list identifier
type ClueListActionType = GameActionType & ClueListIdentifier;

// grid actions
type SetActionType = GridActionType & {
    action: 'set';
    text: string;
};

type ClearActionType = GridActionType & {
    action: 'clear';
};

// clue list actions
type MarkSegmentActionType = ClueListActionType & {
    action: 'markSegment';
    idx_cell_start: number;
    idx_cell_end: number;
};

type ClearSegmentActionType = ClueListActionType & {
    action: 'clearSegment';
    idx_cell: number;
};

function set(at: GridLocationType, text: string): SetActionType {
    return {
        action: 'set',
        user_id: -1,
        change_count: -1,
        row: at.row,
        col: at.col,
        text
    };
}

function clear(at: GridLocationType): ClearActionType {
    return {
        action: 'clear',
        user_id: -1,
        change_count: -1,
        row: at.row,
        col: at.col
    };
}

function markSegment(
    clue_list: ClueListIdentifier,
    idx_cell_start: number,
    idx_cell_end: number
): MarkSegmentActionType {
    return {
        action: 'markSegment',
        user_id: -1,
        change_count: -1,
        index: clue_list.index,
        kind: clue_list.kind,
        idx_cell_start,
        idx_cell_end
    };
}

function clearSegment(clue_list: ClueListIdentifier, idx_cell: number): ClearSegmentActionType {
    return {
        action: 'clearSegment',
        user_id: -1,
        change_count: -1,
        index: clue_list.index,
        kind: clue_list.kind,
        idx_cell
    };
}
