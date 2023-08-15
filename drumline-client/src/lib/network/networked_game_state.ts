import { GameState, type GameActions } from '@chrisrude/drumline-lib';
import { ReconnectWsClient } from './reconnect_ws_client';
import { SolveClient, type SolveClientCallback } from './solve_client';
export { NetworkedGameState };

// todo: this class is poorly defined and probably shouldn't exist,
// but it's good enough for now.  It should be folded into SolveClient.
class NetworkedGameState extends GameState {
    readonly solve_client: SolveClient;
    readonly ws_client: ReconnectWsClient;

    constructor(size: number, solve_id: string, fn_handle_received_action: SolveClientCallback) {
        super(size, solve_id);
        this.ws_client = new ReconnectWsClient();
        this.solve_client = new SolveClient(solve_id, this.ws_client, fn_handle_received_action);
    }
    connect = () => {
        this.solve_client.connect();
    };
    close = () => {
        this.solve_client.close();
    };
    apply_from_ui = (action: GameActions) => {
        this.solve_client.apply(action);
    };
}
