import { storedGameState } from '$lib/stores/game_state_store';
import { userStore } from '$lib/stores/user_id_store';
import {
    actionToString,
    areActionsEqual,
    joinPuzzle,
    leavePuzzle,
    stringToAction,
    type GameActions
} from 'drumline-lib';
import { get } from 'svelte/store';
import type { ReconnectWsClient, WSClientEvent } from './reconnect_ws_client';

export { SolveClient };
export type { SolveClientCallback };

type SolveClientCallback = (action: GameActions, pending_actions: GameActions[]) => void;

class SolveClient {
    // actions which the server has sent to us
    readonly _applied_actions: GameActions[];

    readonly _handleActionCallback: SolveClientCallback;

    // actions that we want to the server, but haven't gotten
    // a response for yet.  These are all locally-generated.
    readonly _pending_actions: GameActions[];

    readonly _solve_id: string;

    readonly _ws_client: ReconnectWsClient;

    constructor(solve_id: string, ws_client: ReconnectWsClient, handleActionCallback: SolveClientCallback) {

        this._solve_id = solve_id;
        this._ws_client = ws_client;

        this._applied_actions = [];
        this._pending_actions = [];

        this._handleActionCallback = handleActionCallback.bind(this);
        ws_client.set_callback(this.callback);
    }

    connect = () => {
        this._ws_client.connect();
    };

    close(): void {
        // todo: do we need to send this?
        const leave_action = leavePuzzle();
        this._sendActionToServer(leave_action);

        this._ws_client.close();
    }

    apply = (action: GameActions): void => {
        if (action.user_id !== '') {
            throw new Error('Cannot apply action with user_id');
        }
        // we expect that we have a game state, as the rest of the
        // app is asking us to update it.
        storedGameState.update((game_state) => {
            if (null === game_state) {
                throw new Error('No game state');
            }
            game_state.apply(action);
            return game_state;
        });

        // add to our pending actions.  Do this first
        // in case the server fails to respond, or the
        // callback is called super fast.
        this._pending_actions.push(action);

        this._sendActionToServer(action);
    };

    callback = (msg: WSClientEvent) => {
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

            // add to our received actions
            this._applied_actions.push(action);
            this._handleActionCallback(action, this._pending_actions);

            return;
        }

        if (msg.type == 'connected') {
            this.on_connected();
        }
    };

    on_connected = () => {
        // send join message
        const join_message = joinPuzzle(this._solve_id);
        this._sendActionToServer(join_message);

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
        if (action.user_id !== get(userStore).public_uuid) {
            return false;
        }
        // if it was our public one, translate it back to private
        // so we can compare it to the pending actions
        action.user_id = get(userStore).private_uuid;
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
        // send it to the server using our private UUID
        action.user_id = get(userStore).private_uuid;

        const msg = actionToString(action);
        const probably_sent = this._ws_client.send(msg);
        if (!probably_sent) {
            console.log('Action not sent to server: ', msg);
        }
        return probably_sent;
    }
}
