import { Puzzle, UserId, loadPuzzleFromJson, savePuzzleToJson } from 'drumline-lib';
import { RedisClientType, createClient } from 'redis';
import { puzzleHmacName } from '../crypto';

import redisJson from '@redis/json';

const RESULT_OK = 'OK';

export { PuzzleRedisClient };

// this was a pain in the butt to figure out!
const modules = {
    redisJson
};
export type JsonRedisClient = RedisClientType<typeof modules>;

class PuzzleRedisClient {
    private readonly client: JsonRedisClient;

    constructor(
        url: string | undefined,
        username: string | undefined,
        password: string | undefined
    ) {
        this.client = createClient({
            url,
            username,
            password,
            modules
        });
    }

    connect = async (): Promise<void> => {
        return this.client.connect();
    };

    disconnect = async (): Promise<void> => {
        return this.client.disconnect();
    };

    // saves the puzzle to redis as a new solve attempt, and returns
    // the key to use to retrieve the solve attempt later.
    // This solve attempt is deterministically tied to the puzzle
    // text and the user_id.
    savePuzzle = async (puzzle: Puzzle, user_id: UserId): Promise<string> => {
        const puzzle_json = savePuzzleToJson(puzzle);
        return puzzleHmacName(puzzle, user_id.private_uuid).then(async (hmac_key) => {
            return this.client.redisJson
                .set(this.solvePuzzleKey(hmac_key), '$', puzzle_json)
                .then((result) => {
                    if (RESULT_OK !== result) {
                        throw new Error(`result of set for puzzle is ${result}`);
                    }
                    return hmac_key;
                });
        });
    };

    loadPuzzle = async (hmac_key: string): Promise<Puzzle | null> => {
        const solve_puzzle_key = this.solvePuzzleKey(hmac_key);
        return this.client.redisJson.get(solve_puzzle_key).then((get_result) => {
            if (null == get_result) {
                console.log(`no get_result found for ${solve_puzzle_key};`);
                return null;
            }
            if (!Array.isArray(get_result)) {
                console.log(`get_result is not an array for ${solve_puzzle_key};`);
                return null;
            }
            const json = get_result[0];
            if (typeof json !== 'string') {
                console.log(`get_result[0] is not a string for ${solve_puzzle_key};`);
                return null;
            }
            return loadPuzzleFromJson(json);
        });
    };

    solvePuzzleKey = (hmac_key: string): string => {
        return `solve:${hmac_key}:puzzle`;
    };

    solveStepsKey = (hmac_key: string): string => {
        return `solve:${hmac_key}:steps`;
    };
}
