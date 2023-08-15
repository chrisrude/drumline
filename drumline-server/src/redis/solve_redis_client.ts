import { GameActions, actionToString } from '@chrisrude/drumline-lib';
import { RedisClientType } from 'redis';

export { SolveRedisClient };

const ACTION_LIST_KEY_SUFFIX = 'actions';

// const CURRENT_STATE_SUBKEY = 'state';
// const CURRENT_STATE_SUBKEY = 'solved';

class SolveRedisClient {

    private readonly _client: RedisClientType;

    constructor(client: RedisClientType) {
        this._client = client;
    }

    connect = async (): Promise<void> => {
        await this._client.connect();
    };

    disconnect = (): Promise<void> => {
        return this._client.disconnect();
    };

    get_solve_actions = async (
        solve_id: string,
        start_offset: number,
        end_offset: number = -1,
    ): Promise<string[]> => {
        const list_key = this._action_list_key(solve_id);
        return (await this._client.lRange(
            list_key, start_offset, end_offset
        )).map((str_action: string, idx: number) => {
            const action = JSON.parse(str_action);
            action.change_count = idx + start_offset;
            return JSON.stringify(action);
        });
    };

    // takes an action and appends it to the list of actions for the given solve
    // note that we may have already seen this action before, so we need to
    // check for that and ignore it if we have
    // when we do store it, we do not set the change_count.  Instead,
    // we just let it to in at whatever place it winds up, and then
    // set the change_count value when we retrieve it.
    add_solve_action = async (solve_id: string, action: GameActions): Promise<number> => {

        if (action.change_count !== -1) {
            // the client is claiming that this has already been
            // stored by the server.  In the future we might handle
            // this to help the server recover from a data loss, but
            // for now just ignore it.
            return -1;
        }

        const list_key = this._action_list_key(solve_id);
        const str_action = actionToString(action);
        return await this._client.rPush(
            list_key,
            str_action,
        );
    };

    _solve_id_key = (solve_id: string): string => `solve:${solve_id}`;

    _action_list_key = (solve_id: string): string => `${this._solve_id_key(solve_id)}:${ACTION_LIST_KEY_SUFFIX}`;
}
