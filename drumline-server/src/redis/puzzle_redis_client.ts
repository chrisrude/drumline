import { Puzzle, loadPuzzleFromJson } from '@chrisrude/drumline-lib';
import { RedisClientType, createClient } from 'redis';

const RESULT_OK = 'OK';

export { PuzzleRedisClient };

class PuzzleRedisClient {
    private readonly _client: RedisClientType;

    constructor(
        url: string | undefined,
    ) {
        console.log(`using redis url: `, url);
        this._client = createClient({
            url,
        });
    }

    connect = async (): Promise<void> => {
        console.log(`connecting to redis...`);
        return this._client.connect();
    };

    disconnect = async (): Promise<void> => {
        return this._client.disconnect();
    };

    // saves the puzzle to redis as a new solve attempt, and returns
    // the key to use to retrieve it later.
    savePuzzle = async (puzzle: Puzzle, puzzle_id: string, creator_uuid: string): Promise<void> => {
        const puzzle_key = this._puzzleKey(puzzle_id);
        const puzzle_author_key = this._puzzleAuthorKey(puzzle_id);

        const results = await this._client.multi().set(puzzle_key, puzzle.original_text).set(puzzle_author_key, creator_uuid).exec();
        if (!results || !results.length || results.length !== 2 || results[0] !== RESULT_OK || results[1] !== RESULT_OK) {
            throw new Error(`results of multi set for puzzle is ${results}`);
        }
    };

    loadPuzzle = async (puzzle_id: string): Promise<[Puzzle, string] | null> => {
        const puzzle_key = this._puzzleKey(puzzle_id);
        const puzzle_author_key = this._puzzleAuthorKey(puzzle_id);

        const results = await this._client.multi().get(puzzle_key).get(puzzle_author_key).exec();
        if (!results || !results.length || results.length !== 2) {
            throw new Error(`results of multi get for puzzle is ${results}`);
        }

        if (!results[0] || !results[1]) {
            // puzzle not found
            return null;
        }

        const puzzle_text = results[0] as string;
        const puzzle_author = results[1] as string;
        const puzzle = loadPuzzleFromJson(puzzle_text);
        if (null === puzzle) {
            throw new Error(`puzzle is null`);
        }
        return [puzzle, puzzle_author];
    };

    listPuzzles = async (): Promise<string[]> => {
        return (await this._client.keys('puzzle:*:input_text')).map((key) => {
            const match = key.match(/^puzzle:(.+):input_text$/);
            if (null === match) {
                console.error(`key ${key} did not match regex`);
                // filter these out later
                return '';
            }
            return match[1];
        }).filter((key) => {
            return key.length > 0;
        });
    };

    // returns true if delete key existed and was deleted,
    // false if it did not exist
    deletePuzzle = async (puzzle_id: string, user_id: string): Promise<boolean> => {
        // test that the puzzle author is the same as the user_id
        // and if so delete both the puzzle and the author entry
        const puzzle_author_key = this._puzzleAuthorKey(puzzle_id);
        const solve_puzzle_key = this._puzzleKey(puzzle_id);

        await this._client.watch(puzzle_author_key);
        const results = await this._client.multi().get(puzzle_author_key).exec();
        if (!results || !results.length || results.length !== 1) {
            throw new Error(`results of multi get for puzzle author is ${results}`);
        }
        if (!results[0]) {
            // key did not exist, must have been deleted already
            // or just was never created
            return false;
        }
        const puzzle_author = results[0] as string;
        if (puzzle_author !== user_id) {
            throw new Error(`user ${user_id} is not the author of puzzle ${puzzle_id}`);
        }
        await this._client.multi().del(puzzle_author_key).del(solve_puzzle_key).exec();

        return true;
    };

    _puzzleKey = (puzzle_id: string): string => {
        return `puzzle:${puzzle_id}:input_text`;
    };
    _puzzleAuthorKey = (puzzle_id: string): string => {
        return `puzzle:${puzzle_id}:author`;
    };
}
