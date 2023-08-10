import { GameState, type GameActions } from 'drumline-lib';
import { ReconnectWsClient, type ConnectionInfo } from './reconnect_ws_client';
import { SolveClient, type SolveClientCallback } from './solve_client';
export { NetworkedGameState };

// todo: set from config
const CONNECTION_INFO: ConnectionInfo = {
    use_tls: false,
    host: 'localhost',
    port: 8081
};

class NetworkedGameState extends GameState {
    readonly solve_client: SolveClient;
    readonly ws_client: ReconnectWsClient;

    constructor(size: number, solve_id: string, fn_handle_received_action: SolveClientCallback) {
        super(size, solve_id);
        this.ws_client = new ReconnectWsClient(CONNECTION_INFO);
        this.solve_client = new SolveClient(solve_id, this.ws_client, fn_handle_received_action);
    }
    connect = () => {
        this.solve_client.connect();
    };
    close = () => {
        this.solve_client.close();
    };
    apply_from_ui = (action: GameActions) => {
        this.apply(action);
        this.solve_client.apply(action);
    };
}
