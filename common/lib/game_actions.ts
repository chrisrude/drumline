export type {
    ClearActionType,
    ClearSegmentActionType,
    ClueListActionType,
    GameActionKinds,
    GameActionType,
    GameActions,
    GridActionType,
    MarkSegmentActionType,
    SetActionType
};
import type { ClueListIdentifier, GridLocationType } from './puzzle';

export {
    GAME_ACTIONS,
    actionToString,
    areActionsEqual,
    clear,
    clearSegment,
    markSegment,
    set,
    stringToAction
};
// these actions change the game state

type GameActions = SetActionType | ClearActionType | MarkSegmentActionType | ClearSegmentActionType;

const GAME_ACTIONS = ['set', 'clear', 'markSegment', 'clearSegment'] as const;

type GameActionKinds = (typeof GAME_ACTIONS)[number];
type GameActionType = {
    action: GameActionKinds;
    user_id: string;
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
        user_id: '',
        change_count: -1,
        row: at.row,
        col: at.col,
        text
    };
}

function clear(at: GridLocationType): ClearActionType {
    return {
        action: 'clear',
        user_id: '',
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
        user_id: '',
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
        user_id: '',
        change_count: -1,
        index: clue_list.index,
        kind: clue_list.kind,
        idx_cell
    };
}

function validateProperties(
    obj: { [s: string]: unknown },
    numProperties: string[],
    strProperties: string[]
) {
    if (obj === null) {
        throw new Error('Invalid action: (null)');
    }
    for (const [key, value] of Object.entries(obj)) {
        if (numProperties.includes(key)) {
            if (typeof value !== 'number') {
                throw new Error(`Invalid action: ${key} is not a number`);
            }
        }
        if (strProperties.includes(key)) {
            if (typeof value !== 'string') {
                throw new Error(`Invalid action: ${key} is not a string`);
            }
        }
    }
}

function stringToAction(str: string): GameActions {
    if (str === null) {
        throw new Error('Invalid action: (null)');
    }
    const numProperties = [];
    const strProperties = [];

    const obj = JSON.parse(str);

    // it should have an "action" property.  Check this early
    // so we know what other properties to look for.
    validateProperties(obj, [], ['action']);
    switch (obj.action) {
        case 'set':
        case 'clear':
            numProperties.push('col');
            numProperties.push('row');
            strProperties.push('text');
            break;
        case 'markSegment':
        case 'clearSegment':
            numProperties.push('index');
            strProperties.push('kind');
            numProperties.push('idx_cell_start');
            numProperties.push('idx_cell_end');
            break;
        default:
            throw new Error('Invalid action: ' + str);
    }
    numProperties.push('user_id');
    numProperties.push('change_count');

    validateProperties(obj, numProperties, strProperties);

    // check "kind" enumeration if it should exist
    if ('kind' in strProperties) {
        if (obj.kind !== 'across' && obj.kind !== 'down') {
            throw new Error('Invalid action: ' + str);
        }
    }
    return obj;
}

function actionToString(action: GameActions): string {
    return JSON.stringify(action);
}

function areActionsEqual(a: GameActions, b: GameActions): boolean {
    if (a.user_id !== b.user_id) {
        return false;
    }
    if (a.action !== b.action) {
        return false;
    }
    if (a.change_count !== b.change_count) {
        // the change_count of -1 will match anything
        if (a.change_count !== -1 && b.change_count !== -1) {
            return false;
        }
    }
    switch (a.action) {
        case 'set':
            const set_a = a as SetActionType;
            const set_b = b as SetActionType;
            if (set_a.text !== set_b.text) {
                return false;
            }
        // fall through on purpose
        case 'clear':
            const grid_a = a as GridActionType;
            const grid_b = b as GridActionType;
            if (grid_a.row !== grid_b.row) {
                return false;
            }
            if (grid_a.col !== grid_b.col) {
                return false;
            }
            break;

        case 'markSegment':
            const mark_a = a as MarkSegmentActionType;
            const mark_b = b as MarkSegmentActionType;
            if (mark_a.idx_cell_start !== mark_b.idx_cell_start) {
                return false;
            }
        // fall through
        case 'clearSegment':
            const clue_a = a as ClueListActionType;
            const clue_b = b as ClueListActionType;
            if (clue_a.index !== clue_b.index) {
                return false;
            }
            if (clue_a.kind !== clue_b.kind) {
                return false;
            }
            if ('clearSegment' == a.action) {
                const clear_a = a as ClearSegmentActionType;
                const clear_b = b as ClearSegmentActionType;
                if (clear_a.idx_cell !== clear_b.idx_cell) {
                    return false;
                }
            }
            break;
    }

    return true;
}
