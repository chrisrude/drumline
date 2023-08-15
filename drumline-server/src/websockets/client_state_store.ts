import { CursorActionType, UserId, actionToString } from '@chrisrude/drumline-lib';
import { WebSocket } from 'ws';

export { ClientStateStore };

class ClientsBySolve {
    private readonly _clients_by_solve: Map<string, Set<WebSocket>>;

    constructor() {
        this._clients_by_solve = new Map();
    }

    add = (ws: WebSocket, solve_id: string) => {
        const clients = this._clients_by_solve.get(solve_id);
        if (clients) {
            clients.add(ws);
        } else {
            this._clients_by_solve.set(solve_id, new Set([ws]));
        }
    };

    remove = (ws: WebSocket, solve_id: string) => {
        const clients = this._clients_by_solve.get(solve_id);
        if (clients) {
            clients.delete(ws);
            if (clients.size === 0) {
                this._clients_by_solve.delete(solve_id);
            }
        }
    };

    get = (solve_id: string): Set<WebSocket> => {
        return this._clients_by_solve.get(solve_id) || new Set();
    };
}

class ClientState {
    solve_id: string | null;
    user_id: UserId | null;
    last_cursor_update: string | null;

    constructor() {
        this.solve_id = null;
        this.user_id = null;
        this.last_cursor_update = null;
    }
}

class ClientStateStore {
    readonly client_states: Map<WebSocket, ClientState>;
    readonly clients_by_solve: ClientsBySolve;

    constructor() {
        this.client_states = new Map();
        this.clients_by_solve = new ClientsBySolve();
    }

    num_clients = (): number => {
        return this.client_states.size;
    };

    add_client = (ws: WebSocket): void => {
        if (this.client_states.has(ws)) {
            throw new Error('Client already exists');
        }
        this.client_states.set(ws, new ClientState());
    };

    add_to_solve = (ws: WebSocket, solve_id: string): void => {
        const client_state = this.client_states.get(ws);
        if (!client_state) {
            throw new Error('Client does not exist');
        }
        client_state.solve_id = solve_id;
        this.clients_by_solve.add(ws, solve_id);
    };

    remove_from_solve = (ws: WebSocket): [string | null, string | null] => {
        const client_state = this.client_states.get(ws);
        if (!client_state) {
            throw new Error('Client does not exist');
        }
        if (client_state.solve_id) {
            this.clients_by_solve.remove(ws, client_state.solve_id);
        }
        const old_solve_id = client_state.solve_id;
        const old_public_uuid = client_state.user_id?.public_uuid ?? null;
        client_state.solve_id = null;
        return [old_solve_id, old_public_uuid];
    };

    remove_client = (ws: WebSocket): [string | null, string | null] => {
        const current_state = this.client_states.get(ws);
        if (!current_state) {
            throw new Error('Client does not exist');
        }
        const result = this.remove_from_solve(ws);
        this.client_states.delete(ws);
        return result;
    };

    get_client_state = (ws: WebSocket): ClientState => {
        const client_state = this.client_states.get(ws);
        if (!client_state) {
            throw new Error('Client does not exist');
        }
        return client_state;
    };

    get_clients_for_solve = (solve_id: string): Set<WebSocket> => {
        return this.clients_by_solve.get(solve_id);
    };

    update_cursor = (ws: WebSocket, cursor: CursorActionType): void => {
        const client_state = this.get_client_state(ws);
        if (!client_state.user_id) {
            throw new Error('Client does not have a user id');
        }
        cursor.user_id = client_state.user_id.public_uuid;
        const str = actionToString(cursor);
        this.get_client_state(ws).last_cursor_update = str;
    };

    get_cursor = (ws: WebSocket): [string | null, string | null] => {
        const client_state = this.get_client_state(ws);
        return [client_state.user_id?.private_uuid ?? null, client_state.last_cursor_update];
    };
}
