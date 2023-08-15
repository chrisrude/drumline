import {
    CursorActionType,
    GameActions,
    JoinPuzzleActionType,
    LeavePuzzleActionType,
    UserId,
    actionToString,
    removeCursor,
    stringToAction
} from '@chrisrude/drumline-lib';
import { AddressInfo } from 'net';
import { RedisClientType } from 'redis';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { SolveRedisClient } from '../redis/solve_redis_client';
import { ClientStateStore } from './client_state_store';
export { AsyncSolveStore, EchoServer };

interface AsyncSolveStore {
    add_solve_action: (solve_id: string, action: GameActions) => Promise<number>;
    get_solve_actions: (solve_id: string) => Promise<GameActions[]>;
}

const validate_user_id = (uuid: string): UserId => {
    // make sure uuid is valid and a v5 uuid
    if (!uuid || !uuidValidate(uuid) || uuidVersion(uuid) !== 4) {
        console.error('Invalid user_id: ' + uuid);
        throw new Error('Invalid user_id');
    }
    return new UserId(uuid);
};

class EchoServer extends WebSocketServer {
    private readonly _client_state: ClientStateStore;

    _store: SolveRedisClient;

    constructor(_redis_client: RedisClientType) {
        super({ noServer: true });

        this._client_state = new ClientStateStore();

        // this._store = new MemorySolveStore();
        this._store = new SolveRedisClient(_redis_client);

        this.on('error', console.error);

        this.on('listening', () => {
            const addr = this.address();
            if (addr instanceof String) {
                console.log('Listening on %d', addr);
            } else {
                const addrInfo = addr as AddressInfo;
                console.log('Listening on %s:%d', addrInfo.address, addrInfo.port);
            }
        });

        this.on('connection', this.on_connection);

        this.on('close', () => {
            console.log('Closed');
        });
    }

    on_connection = (ws: WebSocket) => {
        console.log('Connected: %d clients', this._client_state.num_clients() + 1);

        ws.on('error', console.error);
        ws.on('message', this.on_incoming_message.bind(this, ws));
        ws.on('close', this.on_disconnect.bind(this, ws));

        // add to list of connected clients
        this._client_state.add_client(ws);
    };

    on_disconnect = (ws: WebSocket) => {
        console.log('Disconnected: %d clients', this._client_state.num_clients() - 1);
        const [maybe_solve_id, maybe_public_uuid] = this._client_state.remove_client(ws);
        if (!maybe_public_uuid || !maybe_solve_id) {
            return;
        }
        this.send_remove_cursor(maybe_public_uuid, maybe_solve_id);
    };

    send_remove_cursor = (public_uuid: string, solve_id: string) => {
        // send the other clients are removeCursor message
        const remove_cursor_action = removeCursor();
        remove_cursor_action.user_id = public_uuid;
        const actionString = actionToString(remove_cursor_action);
        const other_clients = this._client_state.get_clients_for_solve(solve_id);
        for (const client of other_clients) {
            client.send(actionString, { binary: false });
        }
    }

    on_join_puzzle = (ws: WebSocket, joinPuzzle: JoinPuzzleActionType) => {
        const client_state = this._client_state.get_client_state(ws);

        // make sure user_id is valid first before we set other values
        client_state.user_id = validate_user_id(joinPuzzle.user_id);

        this._client_state.add_to_solve(ws, joinPuzzle.solve_id);

        const last_update = joinPuzzle.change_count;
        this.backfill_client(ws, joinPuzzle.solve_id, last_update);
    };

    // send all updates for the given solve ID to the client,
    // starting with last_update+1
    backfill_client = async (ws: WebSocket, solve_id: string, last_update: number) => {
        if (ws.readyState !== WebSocket.OPEN) {
            console.log('Client is not open');
            return;
        }
        const client_state = this._client_state.get_client_state(ws);
        if (client_state.solve_id !== solve_id) {
            console.error('Client is not part of this solve');
            return;
        }
        const old_updates = await this._store.get_solve_actions(solve_id, last_update + 1);
        for (let i = 0; i < old_updates.length; i++) {
            const strData = old_updates[i];
            ws.send(strData, { binary: false });
        }

        if (!client_state.user_id) {
            console.error('Client does not have a user_id');
            return;
        }

        // finally, send all cursor locations to the client
        const other_clients = this._client_state.get_clients_for_solve(solve_id);
        other_clients.forEach((client: WebSocket) => {
            const [other_private_uuid, cursor] = this._client_state.get_cursor(client);
            if (other_private_uuid == client_state.user_id?.private_uuid) {
                return;
            }
            if (cursor) {
                ws.send(cursor, { binary: false });
            }
        });
    }

    on_leave_puzzle = (ws: WebSocket, _leavePuzzle: LeavePuzzleActionType) => {
        const [solve_id, public_uuid] = this._client_state.remove_from_solve(ws);
        if (!solve_id || !public_uuid) {
            return;
        }
        this.send_remove_cursor(public_uuid, solve_id);
    };

    on_puzzle_action_message = async (ws: WebSocket, action: GameActions) => {

        const client_state = this._client_state.get_client_state(ws);

        const solve_id = client_state.solve_id;
        if (!solve_id) {
            console.error('Client is not part of a solve, ignoring message');
            return;
        }

        // make sure user_id is valid first before we set other values
        const user_id = validate_user_id(action.user_id);
        if (!client_state.user_id || user_id.private_uuid !== client_state.user_id.private_uuid) {
            console.error('user_id does not match, ignoring message');
            return;
        }

        // change from private to public uuid
        action.user_id = client_state.user_id.public_uuid;

        // add to store, unless it's a cursor update
        if (action.action === 'cursor' || action.action === 'removeCursor') {
            this._client_state.update_cursor(ws, action as CursorActionType);
        } else {
            await this._store.add_solve_action(solve_id, action);
        }

        // find clients to update
        const solve_clients = this._client_state.get_clients_for_solve(solve_id);
        const strData = actionToString(action);

        // echo back to all clients, including the one
        // that sent it.  This might also send older actions.
        solve_clients.forEach((client: WebSocket) => {
            client.send(strData, { binary: false });
        });
    };

    on_incoming_message = async (ws: WebSocket, data: RawData, isBinary: boolean) => {
        // todo: rate-limit incoming messages?

        // decode message
        if (isBinary) {
            console.error('Received binary message, ignoring');
            return;
        }

        const strData = data.toString('utf8');
        const action = stringToAction(strData);
        switch (action.action) {
            case 'joinPuzzle':
                this.on_join_puzzle(ws, action);
                break;
            case 'leavePuzzle':
                this.on_leave_puzzle(ws, action);
                break;
            default:
                await this.on_puzzle_action_message(ws, action);
        }
    };
}
