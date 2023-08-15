import { storedGameState } from '$lib/stores/game_state_store';
import { GameState, UserId, actionToString, areActionsEqual, joinPuzzle, leavePuzzle, set_from_json_struct, stringToAction, to_json_struct, type GameActions, type SimpleJsonGameState } from '@chrisrude/drumline-lib';
import { get } from 'svelte/store';
import { ReconnectWsClient, type WSClientEvent } from './reconnect_ws_client';

export { NetworkedGameState };
export type { StoredGameState };

type StoredGameState = {
    game_state_json: SimpleJsonGameState,
    pending_actions: GameActions[],
    server_update_count: number,
}

// todo: this class is poorly defined and probably shouldn't exist,
// but it's good enough for now.  It should be folded into SolveClient.
class NetworkedGameState extends GameState {

    // actions that we want to the server, but haven't gotten
    // a response for yet.  These are all locally-generated.
    _pending_actions: GameActions[];

    // the game state that the server has told us about
    readonly _server_game_state: GameState;

    // count of actions we've received from the server
    _server_update_count: number;

    // puzzle that we're currently solving
    readonly _solve_id: string;

    readonly _user_id: UserId;

    // our connection to the server
    readonly _ws_client: ReconnectWsClient;


    constructor(
        size: number,
        solve_id: string,
        user_id: UserId,
    ) {
        super(size, solve_id);
        this._pending_actions = [];
        this._server_game_state = new GameState(size, solve_id);
        this._server_update_count = -1;
        this._solve_id = solve_id;
        this._user_id = user_id;
        this._ws_client = new ReconnectWsClient();

        this._ws_client.set_callback(this._server_msg_callback);
    }

    connect = (): void => {
        this._ws_client.connect();
    };

    close = (): void => {
        const leave_action = leavePuzzle();
        this._sendActionToServer(leave_action);

        this._ws_client.close();
    };

    to_json = (): StoredGameState => {
        return {
            game_state_json: to_json_struct(this._server_game_state),
            pending_actions: this._pending_actions,
            server_update_count: this._server_update_count,
        };
    };

    update_from_json(storedGameState: StoredGameState) {
        set_from_json_struct(
            storedGameState.game_state_json,
            this._server_game_state,
        )
        this._pending_actions = [...storedGameState.pending_actions];
        this._server_update_count = storedGameState.server_update_count;

        this.copy_from(this._server_game_state);

        // now, apply the pending actions we haven't yet
        // sent to the server
        for (const pending_action of this._pending_actions) {
            this.apply(pending_action);
        }
    }

    apply_from_ui = (action: GameActions): void => {
        if (action.user_id !== '') {
            throw new Error('Cannot apply action with user_id');
        }
        // we expect that we have a game state, as the rest of the
        // app is asking us to update it.
        if (action.action !== 'cursor') {
            const game_state = get(storedGameState);
            if (null === game_state) {
                throw new Error('No game state');
            }
            game_state.apply(action);
            storedGameState.set(game_state);

            // add to our pending actions.  Do this first
            // in case the server fails to respond, or the
            // callback is called super fast.
            this._pending_actions.push(action);
        }

        this._sendActionToServer(action);
    };

    _server_msg_callback = (msg: WSClientEvent) => {
        if (msg.type == 'connected') {
            this._on_connected();
            return;
        }

        if ('data' === msg.type) {
            this._on_server_data(msg);
            return;
        }
    };

    _on_connected = () => {
        // send join message
        const join_message = joinPuzzle(this._solve_id, this._server_update_count);
        this._sendActionToServer(join_message);

        for (const action of this._pending_actions) {
            const probably_sent = this._sendActionToServer(action);
            if (!probably_sent) {
                return;
            }
        }
    };

    _on_server_data = (msg: WSClientEvent) => {
        if (msg.message === undefined || msg.message === null) {
            throw new Error('No message in data event');
        }
        const action = stringToAction(msg.message);

        // cursor updates will have a change_count of -1 and are
        // not counted as server updates
        if (action.change_count !== -1) {
            if ((this._server_update_count + 1) !== action.change_count) {
                throw new Error('Server update count mismatch: ' + this._server_update_count + ' ' + action.change_count);
            }
            this._server_update_count += 1;
        }
        if (action.action === 'cursor' || action.action === 'removeCursor') {
            // ignore cursor updates about ourselves
            if (action.user_id === this._user_id.public_uuid) {
                return;
            }
        }

        // apply this to the server game state, no matter what
        this._server_game_state.apply(action);

        // was this an action that we sent and are waiting for acknowledgement of?
        // note: this has the side-effect of changing the user_id to the private
        // uuid, if it was from our public_uuid.
        const was_pending = this._maybeCompletePendingAction(action);
        if (was_pending) {
            // we had already applied this action, so we don't need to
            // apply it again.
            return;
        }

        // this is a new action from the server, so we need to:
        // 1. copy the server game state to our local game state
        // 2. re-apply all pending actions
        // 3. publish our new game state to storedGameState
        this.copy_from(this._server_game_state);

        for (const pending_action of this._pending_actions) {
            this.apply(pending_action);
        }
        storedGameState.set(this);
    }

    // returns true if the action was in _pending_actions and was removed
    _maybeCompletePendingAction = (action: GameActions): boolean => {
        // was this action from our user_id?
        if (action.user_id !== this._user_id.public_uuid) {
            return false;
        }
        // translate it back to private so we can compare it to the pending actions
        action.user_id = this._user_id.private_uuid;

        if (this._pending_actions.length === 0) {
            return false;
        }
        const pending_action = this._pending_actions[0];
        if (!areActionsEqual(pending_action, action)) {
            return false;
        }
        // let's take it out of _pending_actions
        this._pending_actions.shift();
        return true;
    };

    _sendActionToServer(action: GameActions): boolean {
        // send it to the server using our private UUID
        action.user_id = this._user_id.private_uuid;

        const msg = actionToString(action);
        const probably_sent = this._ws_client.send(msg);
        if (!probably_sent) {
            console.log('Action not sent to server: ', msg);
        }
        return probably_sent;
    }
}
