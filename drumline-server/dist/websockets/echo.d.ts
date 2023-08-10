import { GameActions, JoinPuzzleActionType, LeavePuzzleActionType, UserId } from '@chrisrude/drumline-lib';
import { RawData, WebSocket, WebSocketServer } from 'ws';
export { EchoServer };
declare enum ClientStatus {
    WAITING_FOR_HELLO = 0,
    LISTENING = 1
}
declare class ClientState {
    last_update: number;
    solve_id: string | null;
    status: ClientStatus;
    user_id: UserId | null;
    constructor();
}
declare class EchoServer extends WebSocketServer {
    readonly connected_clients: Map<WebSocket, ClientState>;
    readonly solve_actions: Map<string, GameActions[]>;
    constructor();
    get_client_state: (ws: WebSocket) => ClientState;
    has_solve_id: (solve_id: string) => boolean;
    get_solve_actions: (solve_id: string) => GameActions[];
    on_connection: (ws: WebSocket) => void;
    on_disconnect: (ws: WebSocket) => void;
    set_user_id: (client_state: ClientState, uuid: string) => void;
    on_join_puzzle: (ws: WebSocket, joinPuzzle: JoinPuzzleActionType) => void;
    on_leave_puzzle: (ws: WebSocket, leavePuzzle: LeavePuzzleActionType) => void;
    send_updates_to_client(ws: WebSocket, solve_id: string): void;
    on_puzzle_action_message: (ws: WebSocket, action: GameActions) => void;
    on_incoming_message: (ws: WebSocket, data: RawData, isBinary: boolean) => Promise<void>;
}
