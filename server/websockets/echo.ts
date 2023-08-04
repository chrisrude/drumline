import { GameActions, JoinPuzzleActionType, LeavePuzzleActionType, UserId, actionToString, areActionsEqual, stringToAction } from 'drumline-lib';
import { AddressInfo } from 'net';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { RawData, ServerOptions, WebSocket, WebSocketServer } from 'ws';
export { EchoServer };

enum ClientStatus {
    WAITING_FOR_HELLO,
    LISTENING,
}

class ClientState {
    last_update: number;
    solve_id: string | null;
    status: ClientStatus;
    user_id: UserId | null;

    constructor() {
        this.last_update = -1;
        this.solve_id = null;
        this.status = ClientStatus.WAITING_FOR_HELLO;
        this.user_id = null;
    }
}

// todo: refactor to use LoginManager

class EchoServer extends WebSocketServer {
    readonly connected_clients: Map<WebSocket, ClientState> = new Map();
    readonly solve_actions: Map<string, GameActions[]>;

    // todo: sore actions in Redis

    constructor(options: ServerOptions) {
        super(options);

        this.connected_clients = new Map();
        this.solve_actions = new Map();

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

    get_client_state = (ws: WebSocket): ClientState => {
        const client_state = this.connected_clients.get(ws);
        if (!client_state) {
            throw new Error('Client state not found');
        }
        return client_state;
    }

    has_solve_id = (solve_id: string): boolean => {
        return this.solve_actions.has(solve_id);
    }

    get_solve_actions = (solve_id: string): GameActions[] => {
        const solve_actions = this.solve_actions.get(solve_id);
        if (!solve_actions) {
            throw new Error('Solve actions not found');
        }
        return solve_actions;
    }

    on_connection = (ws: WebSocket) => {
        console.log('Connected: %d clients', this.connected_clients.size + 1);

        ws.on('error', console.error);
        ws.on('message', this.on_incoming_message.bind(this, ws));
        ws.on('close', this.on_disconnect.bind(this, ws));

        // add to list of connected clients
        this.connected_clients.set(ws, new ClientState());
    };

    on_disconnect = (ws: WebSocket) => {
        console.log('Disconnected: %d clients', this.connected_clients.size - 1);
        const removed = this.connected_clients.delete(ws);
        if (!removed) {
            console.error('Failed to remove client: ', ws);
            console.log('map is now: ', this.connected_clients);
        }
    };

    set_user_id = (client_state: ClientState, uuid: string) => {
        // make sure uuid is valid and a v5 uuid
        if (!uuid || !uuidValidate(uuid) || uuidVersion(uuid) !== 4) {
            console.error('Invalid user_id: ' + uuid);
            throw new Error('Invalid user_id');
        }
        client_state.user_id = new UserId(uuid);
    }

    on_join_puzzle = (ws: WebSocket, joinPuzzle: JoinPuzzleActionType) => {
        const client_state = this.get_client_state(ws);

        if (!this.has_solve_id(joinPuzzle.solve_id)) {
            console.log('Solve not found: ' + joinPuzzle.solve_id);
            return;
        }

        client_state.last_update = joinPuzzle.change_count;
        client_state.solve_id = joinPuzzle.solve_id;
        client_state.status = ClientStatus.LISTENING;

        this.set_user_id(client_state, joinPuzzle.user_id);

        this.send_updates_to_client(ws, client_state.solve_id);
    };

    on_leave_puzzle = (ws: WebSocket, leavePuzzle: LeavePuzzleActionType) => {
        const client_state = this.get_client_state(ws);
        this.set_user_id(client_state, leavePuzzle.user_id);
        client_state.last_update = -1;
        client_state.solve_id = null;
        client_state.status = ClientStatus.WAITING_FOR_HELLO;
    };

    send_updates_to_client(ws: WebSocket, solve_id: string) {
        if (ws.readyState !== WebSocket.OPEN) {
            console.log('Client is not open');
            return;
        }
        const client_state = this.get_client_state(ws);
        if (client_state.solve_id !== solve_id) {
            // client is not part of this solve
            return;
        }
        if (client_state.status !== ClientStatus.LISTENING) {
            // client is not ready for updates yet
            return;
        }
        if (!this.has_solve_id(solve_id)) {
            console.log('Solve not found, not sending updates: ' + solve_id);
            return;
        }

        const actions = this.get_solve_actions(solve_id);
        // send new actions to client
        for (let i = client_state.last_update + 1; i < actions.length; i++) {
            const action = actions[i];
            const strData = actionToString(action);

            ws.send(strData, { binary: false });
        }
        client_state.last_update = actions.length - 1;
    }

    on_puzzle_action_message = (ws: WebSocket, action: GameActions) => {
        console.log('Received action: ', action);

        const client_state = this.get_client_state(ws);

        if (client_state.status !== ClientStatus.LISTENING) {
            console.error('Client should not be sending updates yet.');
            return;
        }

        this.set_user_id(client_state, action.user_id);
        // change from private to public uuid
        action.user_id = client_state.user_id!.public_uuid;

        const solve_actions = this.get_solve_actions(client_state.solve_id!);
        // do we already know about this action?
        const already_known =
            action.change_count !== -1 &&
            action.change_count > 0 &&
            action.change_count < solve_actions.length &&
            areActionsEqual(action, solve_actions[action.change_count]);
        if (already_known) {
            // ignore it
            return;
        }

        // assign it the next available id
        action.change_count = solve_actions.length;

        // save to list of actions
        solve_actions.push(action);

        // echo back to all clients, including the one
        // that sent it.  This might also send older actions.
        this.clients.forEach((client: WebSocket) => {
            this.send_updates_to_client(client, client_state.solve_id!);
        });
    };

    on_incoming_message = async (ws: WebSocket, data: RawData, isBinary: boolean) => {
        // decode message
        if (isBinary) {
            console.error('Received binary message, ignoring');
            return;
        }

        const strData = data.toString('utf8');
        console.log('Received message: ', strData);
        const action = stringToAction(strData);
        switch (action.action) {
            case 'joinPuzzle':
                this.on_join_puzzle(ws, action);
                break;
            case 'leavePuzzle':
                this.on_leave_puzzle(ws, action);
                break;
            default:
                this.on_puzzle_action_message(ws, action);
        }
    }
}
