import { Puzzle, PuzzleListInfo } from '@chrisrude/drumline-lib';
import { RedisClientType } from 'redis';
import { ADMIN_USER_UUIDS } from '../secrets';

const RESULT_OK = 'OK';

const PUZZLE_KEY_PREFIX = "puzzle";
const PUZZLE_INPUT_SUBKEY = 'input';
const PUZZLE_AUTHOR_SUBKEY = 'author_uuid';
const PUZZLE_SIZE_SUBKEY = 'size';
const PUZZLE_CREATED_AT_SUBKEY = 'created_at';


export { PuzzleRedisClient };


class PuzzleRedisClient {
    private readonly _client: RedisClientType;

    constructor(client: RedisClientType) {
        this._client = client
    }

    connect = async (): Promise<void> => {
        console.log(`connecting to redis...`);
        await this._client.connect();
        console.log(`connected!`);
    };

    disconnect = (): Promise<void> => {
        return this._client.disconnect();
    };

    // saves the puzzle to redis as a new solve attempt, and returns
    // the key to use to retrieve it later.
    savePuzzle = async (puzzle: Puzzle, puzzle_id: string, author_uuid: string): Promise<void> => {
        const puzzle_key = this._puzzleKey(puzzle_id);

        const results = await this._client.multi()
            .hSet(puzzle_key, PUZZLE_INPUT_SUBKEY, puzzle.original_text)
            .hSet(puzzle_key, PUZZLE_AUTHOR_SUBKEY, author_uuid)
            .hSet(puzzle_key, PUZZLE_SIZE_SUBKEY, puzzle.size)
            .hSet(puzzle_key, PUZZLE_CREATED_AT_SUBKEY, Date.now())
            .exec();

        // result value will be 1 if the key didn't exist before,
        // and 0 if it did.  Either is ok.
        if (!results ||
            !results.length ||
            results.length !== 4 ||
            (results[0] !== 0 && results[0] !== 1) ||
            (results[1] !== 0 && results[1] !== 1) ||
            (results[2] !== 0 && results[2] !== 1) ||
            (results[3] !== 0 && results[3] !== 1)) {
            throw new Error(`results of multi set for puzzle is ${results} `);
        }
    };

    loadPuzzle = async (puzzle_id: string): Promise<Puzzle | null> => {
        const results = await this._client.hGet(
            this._puzzleKey(puzzle_id),
            PUZZLE_INPUT_SUBKEY,
        );
        if (!results) {
            // puzzle not found
            return null;
        }
        const puzzle = new Puzzle(results);
        if (null === puzzle) {
            throw new Error(`stored puzzle could not be parsed`);
        }
        return puzzle;
    };

    _get_puzzle_metadata = async (puzzle_id: string): Promise<[string, number]> => {
        const results = await this._client.hmGet(
            this._puzzleKey(puzzle_id),
            [PUZZLE_AUTHOR_SUBKEY, PUZZLE_SIZE_SUBKEY]
        );
        if (!results || results.length !== 2 || !results[0] || !results[1]) {
            throw new Error(`results of multi set for puzzle is ${results} `);
        }
        return [results[0], parseInt(results[1])];
    }

    _listAllPuzzlesInternal = async (author_uuid: string): Promise<PuzzleListInfo[]> => {
        const puzzle_keys = await this._client.keys(`${PUZZLE_KEY_PREFIX}:*`);
        if (!puzzle_keys) {
            throw new Error(`keys returned null`);
        }
        const results = Array<PuzzleListInfo>();
        for (const puzzle_key of puzzle_keys) {
            const puzzle_id = this._puzzleIdFromKey(puzzle_key);
            const [puzzle_author, puzzle_size] = await this._get_puzzle_metadata(puzzle_id);
            results.push({
                puzzle_id,
                size: puzzle_size,
                your_puzzle: (puzzle_author === author_uuid),
            } as PuzzleListInfo);
        }
        return results;
    }

    listAllPuzzles = async (author_uuid: string): Promise<PuzzleListInfo[]> => {
        // check if author_uuid is in the list of ADMIN_USER_UUIDS
        // and if so, return all puzzles
        if (ADMIN_USER_UUIDS.has(author_uuid)) {
            return await this._listAllPuzzlesInternal(author_uuid);
        }
        return [];
    }

    listPuzzles = async (author_uuid: string): Promise<PuzzleListInfo[]> => {
        return this._listAllPuzzlesInternal(author_uuid).then((results) => {
            return results.filter((puzzle) => puzzle.your_puzzle);
        });
    }

    // returns true if delete key existed and was deleted,
    // false if it did not exist
    deletePuzzle = async (puzzle_id: string, requester_uuid: string): Promise<boolean> => {
        // test that the puzzle author is the same as the user_id who
        // wants to delete the puzzle, 
        // and if so delete both the puzzle and the author entry
        const puzzle_key = this._puzzleKey(puzzle_id);

        await this._client.watch(puzzle_key);
        const author_uuid = await this._client.hGet(puzzle_key, PUZZLE_AUTHOR_SUBKEY);

        if (author_uuid !== requester_uuid) {
            // either puzzle did not exist or requester is not the author
            await this._client.unwatch();
            return false;
        }

        const del_result = await this._client.multi().del(puzzle_key).exec();
        if (!del_result || del_result.length !== 1 || del_result[0] !== RESULT_OK) {
            throw new Error(`delete returned unexpected: ${del_result}`);
        }

        return true;
    };

    _puzzleKey = (puzzle_id: string): string =>
        `${PUZZLE_KEY_PREFIX}:${puzzle_id}`;

    _puzzleIdFromKey = (puzzle_key: string): string =>
        puzzle_key.substring(PUZZLE_KEY_PREFIX.length + 1);

}
