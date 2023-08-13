import { Puzzle, loadPuzzleFromJson } from '@chrisrude/drumline-lib';
import redisSearch from '@redis/search';
import { RedisClientType, SchemaFieldTypes, createClient } from 'redis';

const RESULT_OK = 'OK';

const AUTHOR_INDEX = 'idx:author';
const SIZE_INDEX = 'idx:size';

const PUZZLE_KEY_PREFIX = "puzzle";
const PUZZLE_INPUT_SUBKEY = 'input';
const PUZZLE_AUTHOR_SUBKEY = 'author_uuid';
const PUZZLE_SIZE_SUBKEY = 'size';
const PUZZLE_CREATED_AT_SUBKEY = 'created_at';


export { PuzzleRedisClient };
export type { PuzzleListInfo };

// todo: move to lib?
type PuzzleListInfo = {
    puzzle_id: string,
    size: number,
    your_puzzle: boolean,
};

type PuzzleSearchResult = {
    PUZZLE_INPUT_SUBKEY: string,
    PUZZLE_AUTHOR_SUBKEY: string,
    PUZZLE_SIZE_SUBKEY: number,
}

const modules = {
    redisSearch
};

class PuzzleRedisClient {
    private readonly _client: RedisClientType<typeof modules>;

    constructor(
        url: string | undefined,
    ) {
        console.log(`using redis url: `, url);
        this._client = createClient({
            url,
            socket: {
                connectTimeout: 50000,
            },
            modules,
        });
    }

    _create_index = async (): Promise<void> => {
        const modules = await this._client.moduleList();
        console.log(`modules: `, modules);
        const index_names = await this._client.redisSearch._list();
        if (index_names.includes(AUTHOR_INDEX)) {
            console.log(`index ${AUTHOR_INDEX} already exists`);
        } else {
            console.log(`creating index ${AUTHOR_INDEX}`);
            const result1 = await this._client.redisSearch.create(
                AUTHOR_INDEX,
                {
                    PUZZLE_AUTHOR_SUBKEY: {
                        type: SchemaFieldTypes.TAG,
                    }
                },
                {
                    ON: 'HASH',
                    PREFIX: PUZZLE_KEY_PREFIX
                }
            );
            if (result1 !== RESULT_OK) {
                throw new Error(`create index returned ${result1}`);
            }
        }
        if (index_names.includes(SIZE_INDEX)) {
            console.log(`index ${SIZE_INDEX} already exists`);
        } else {
            console.log(`creating index ${SIZE_INDEX}`);
            const result = await this._client.redisSearch.create(
                SIZE_INDEX,
                {
                    PUZZLE_SIZE_SUBKEY: {
                        type: SchemaFieldTypes.NUMERIC,
                        SORTABLE: true,
                    }
                },
                {
                    ON: 'HASH',
                    PREFIX: PUZZLE_KEY_PREFIX
                });
            if (result !== RESULT_OK) {
                throw new Error(`create index returned ${result}`);
            }
        };
    }

    connect = async (): Promise<void> => {
        console.log(`connecting to redis...`);
        const result = this._client.connect();
        this._create_index();
        return result;
    };

    disconnect = async (): Promise<void> => {
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
        const puzzle = loadPuzzleFromJson(results);
        if (null === puzzle) {
            throw new Error(`stored puzzle could not be parsed`);
        }
        return puzzle;
    };

    listMyPuzzles = async (author_uuid: string): Promise<PuzzleListInfo[]> => {
        const results = await this._client.redisSearch.search(
            AUTHOR_INDEX,
            `@${PUZZLE_AUTHOR_SUBKEY}:{${author_uuid}}`,
        )
        if (!results) {
            throw new Error(`search for author ${author_uuid} returned null`);
        }

        // results should look like:
        // {
        //   total: 2,
        //   documents: [
        //     {
        //       id: 'noderedis:animals:4',
        //       value: {
        //         name: 'Fido',
        //         species: 'dog',
        //         age: '7'
        //       }
        //     },
        //     {
        //       id: 'noderedis:animals:3',
        //       value: {
        //         name: 'Rover',
        //         species: 'dog',
        //         age: '9'
        //       }
        //     }
        //   ]
        // }
        return results.documents.map((result) => {
            const puzzle_id = this._puzzleIdFromKey(result.id);
            const search_result = result.value as PuzzleSearchResult;
            return {
                puzzle_id,
                size: search_result.PUZZLE_SIZE_SUBKEY,
                your_puzzle: (search_result.PUZZLE_AUTHOR_SUBKEY === author_uuid),
            };
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
