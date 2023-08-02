import { toUtf8 } from 'base-emoji';
import { Puzzle, UserId, loadPuzzleFromJson, savePuzzleToJson } from 'drumline-lib';
import { subtle } from 'node:crypto';
import { RedisClientType, createClient } from 'redis';

import redisJson from '@redis/json';

const HASH_ALGORITHM = 'sha512';
const RESULT_OK = 'OK';

export { PuzzleRedisClient };

// this was a pain in the butt to figure out!
const modules = {
    redisJson
};
export type JsonRedisClient = RedisClientType<typeof modules>;


class PuzzleRedisClient {
    private readonly client: JsonRedisClient;

    constructor() {
        this.client = createClient({
            modules,
        });
    }

    connect = async (): Promise<void> => {
        return this.client.connect();
    }

    disconnect = async (): Promise<void> => {
        return this.client.disconnect();
    }

    // saves the puzzle to redis as a new solve attempt, and returns
    // the key to use to retrieve the solve attempt later.
    // This solve attempt is deterministically tied to the puzzle
    // text and the user_id.
    savePuzzle = async (puzzle: Puzzle, user_id: UserId): Promise<string> => {
        const puzzle_json = savePuzzleToJson(puzzle);
        return this.puzzleHmacName(puzzle, user_id).then(async (hmac_key) => {
            return this.client.redisJson.set(this.solvePuzzleKey(hmac_key), '$', puzzle_json).then((result) => {
                if (RESULT_OK !== result) {
                    throw new Error(`result of set for puzzle is ${result}`);
                }
                return hmac_key;
            });
        });
    }

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
    }

    // input text should be the json encoding of the puzzle, with the private user_id appended
    // output should be the sha512 hash of the input text
    puzzleHmac = (puzzle: Puzzle, user_id: UserId): Promise<ArrayBuffer> => {
        const inputText = JSON.stringify(puzzle) + user_id.private_uuid;

        const ec = new TextEncoder();
        const data = ec.encode(inputText);
        return subtle.digest(HASH_ALGORITHM, data);
    }

    // returns a string representation of the hash
    puzzleHmacName = async (puzzle: Puzzle, user_id: UserId): Promise<string> => {
        return this.puzzleHmac(puzzle, user_id).then((hash) => { return toUtf8(hash) });
    }

    solvePuzzleKey = (hmac_key: string): string => {
        return `solve:${hmac_key}:puzzle`;
    }

    solveStepsKey = (hmac_key: string): string => {
        return `solve:${hmac_key}:steps`;
    }
}
