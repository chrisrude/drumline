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
            socket: {
                connectTimeout: 50000,
            },
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
        const puzzle_author_key = this._puzzleCreatorKey(creator_uuid);

        const results = await this._client.multi().set(
            puzzle_key, puzzle.original_text
        ).sAdd(
            puzzle_author_key, puzzle_key
        ).exec();

        // second value will be 1 if we added the key, 0 if it already existed,
        // which is ok either way
        if (!results ||
            !results.length ||
            results.length !== 2 ||
            results[0] !== RESULT_OK ||
            (results[1] !== 1 && results[1] !== 0)
        ) {
            throw new Error(`results of multi set for puzzle is ${results} `);
        }
    };

    loadPuzzle = async (puzzle_id: string): Promise<Puzzle | null> => {
        const results = await this._client.get(
            this._puzzleKey(puzzle_id)
        );
        if (!results) {
            // puzzle not found
            return null;
        }
        const puzzle = loadPuzzleFromJson(results);
        if (null === puzzle) {
            throw new Error(`stored puzzle could not be parsed`);
        }
        return puzzle;
    };

    listMyPuzzles = async (creator_uuid: string): Promise<string[]> => {
        const puzzle_author_key = this._puzzleCreatorKey(creator_uuid);
        const results = await this._client.sMembers(puzzle_author_key);
        return results ?? [];
    };

    // returns true if delete key existed and was deleted,
    // false if it did not exist
    deletePuzzle = async (puzzle_id: string, requester_uuid: string): Promise<boolean> => {
        // test that the puzzle author is the same as the user_id who
        // wants to delete the puzzle, 
        // and if so delete both the puzzle and the author entry
        const puzzle_author_key = this._puzzleCreatorKey(requester_uuid);
        const puzzle_key = this._puzzleKey(puzzle_id);

        await this._client.watch(puzzle_author_key);
        const author_id_matches = await this._client.sIsMember(puzzle_author_key, puzzle_key);
        if (!author_id_matches) {
            // key did not exist, must have been deleted already
            // or just was never created
            await this._client.unwatch();
            return false;
        }

        const results = await this._client.multi().del(
            puzzle_key
        ).sRem(
            puzzle_author_key, puzzle_key
        ).exec();
        if (!results || !results.length || results.length !== 2 || results[0] !== RESULT_OK || results[1] !== 1) {
            throw new Error(`delete returned unexpected: ${results}`);
        }

        return true;
    };

    _puzzleKey = (puzzle_id: string): string => {
        return `puzzle:${puzzle_id}:input_text`;
    };
    _puzzleCreatorKey = (creator_private_uuid: string): string => {
        return `author:${creator_private_uuid}:puzzles`;
    };
}
