export { NetworkedGameState, storedGameState };

import { browser } from '$app/environment';
import { storedPuzzle } from '$lib/puzzle_store';
import {
    GameState,
    Puzzle,
    UserId,
    actionToString,
    areActionsEqual,
    set_from_json,
    stringToAction,
    to_json,
    type GameActions
} from 'drumline-lib';
import { writable } from 'svelte/store';
import {
    NetworkClient,
    type ConnectionInfo,
    type NetworkClientEvent,
    type NetworkClientStatus
} from './client';

const UUID_STORE = 'drumline-uuid';

const GAME_STATE_STORE = 'drumline-game-state';

const storedGameState = writable<GameState | null>(null);

export const gameState: GameState | null = null;
let user_id: UserId | null = null;

class NetworkedGameState extends GameState {
    // actions which the server has sent to us
    _applied_actions: GameActions[];

    // actions that we want to the server, but haven't gotten
    // a response for yet.  These are all locally-generated.
    _pending_actions: GameActions[];

    _status: NetworkClientStatus;
    _user_id: UserId;
    _ws_client: NetworkClient;

    constructor(puzzle: Puzzle, user_id: UserId) {
        super(puzzle);

        // todo: set from config
        const CONNECTION_INFO: ConnectionInfo = {
            use_tls: false,
            host: 'localhost',
            port: 8080
        };

        this._applied_actions = [];
        this._pending_actions = [];
        this._status = 'disconnected';
        this._user_id = user_id;
        this._ws_client = new NetworkClient(CONNECTION_INFO, this.callback);
        this._ws_client.connect();
    }

    apply = (action: GameActions): NetworkedGameState => {
        if (action.user_id !== '') {
            throw new Error('Cannot apply action with user_id');
        }
        super.apply(action);

        // add to our pending actions.  Do this first
        // in case the server fails to respond, or the
        // callback is called super fast.
        this._pending_actions.push(action);

        // send it to the server using our private UUID
        action.user_id = this._user_id.private_uuid;
        this._sendActionToServer(action);

        // change user_id to public so that we can match
        // it up with the server's response later
        action.user_id = this._user_id.public_uuid;

        return this;
    };

    get status(): NetworkClientStatus {
        return this._status;
    }

    callback = (msg: NetworkClientEvent) => {
        if ('data' === msg.type) {
            if (msg.message === undefined || msg.message === null) {
                throw new Error('No message in data event');
            }
            const action = stringToAction(msg.message);

            // was this an action that we sent and are waiting for acknowledgement of?
            const was_pending = this.maybeCompletePendingAction(action);
            if (was_pending) {
                // we had already applied this action, so we don't need to
                // apply it again.
                return;
            }
            console.log('New action: ', action);
            super.apply(action);

            // directly reapply all our pending actions...
            // todo: I think this is always ok to do without "undoing"
            // anything.  But is that correct?
            for (const pending_action of this._pending_actions) {
                super.apply(pending_action);
            }

            // add to our received actions
            this._applied_actions.push(action);

            // todo: is this a good way to do this?
            storedGameState.set(this);

            return;
        }

        this._status = msg.type;
        if (this._status == 'connected') {
            this.on_connected();
        }
        // todo: trigger a re-render somehow?
    };

    on_connected = () => {
        // todo: send confirmed actions too?
        for (const action of this._pending_actions) {
            const probably_sent = this._sendActionToServer(action);
            if (!probably_sent) {
                return;
            }
        }
    };

    // returns true if the action was in _pending_actions and was removed
    maybeCompletePendingAction = (action: GameActions): boolean => {
        // was this action from our user_id?
        if (action.user_id !== this._user_id.public_uuid) {
            return false;
        }
        // do we have any pending actions?
        if (this._pending_actions.length === 0) {
            return false;
        }
        // peek at first element in _pending_actions
        const pending_action = this._pending_actions[0];
        const matches = areActionsEqual(pending_action, action);
        if (!matches) {
            console.log('Action did not match pending action: ', action, pending_action);
            return false;
        }
        // let's take it out of _pending_actions
        this._pending_actions.shift();
        return true;
    };

    _sendActionToServer(action: GameActions): boolean {
        const msg = actionToString(action);
        const probably_sent = this._ws_client.send(msg);
        if (!probably_sent) {
            console.log('Action not sent to server: ', msg);
        }
        return probably_sent;
    }
}

storedPuzzle.subscribe((puzzle) => {
    if (!puzzle) {
        storedGameState.set(null);
        return;
    }
    if (!browser) {
        return;
    }

    const storedPrivateUuid = window.localStorage.getItem(UUID_STORE) ?? null;
    user_id = new UserId(storedPrivateUuid);

    const puzzleState = new NetworkedGameState(puzzle, user_id);

    const storedString = window.localStorage.getItem(GAME_STATE_STORE) ?? null;
    if (storedString && storedString.length > 0) {
        set_from_json(storedString, puzzleState);
    }

    storedGameState.set(puzzleState);
});

storedGameState.subscribe((value) => {
    if (browser) {
        if (value) {
            const json = to_json(value);
            window.localStorage.setItem(GAME_STATE_STORE, json);
        } else {
            window.localStorage.removeItem(GAME_STATE_STORE);
        }
    }
});
