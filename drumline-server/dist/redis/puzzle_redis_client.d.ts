import { Puzzle } from '@chrisrude/drumline-lib';
import { RedisClientType } from 'redis';
export { PuzzleRedisClient };
declare const modules: {
    redisJson: {
        ARRAPPEND: typeof import("@redis/json/dist/commands/ARRAPPEND");
        arrAppend: typeof import("@redis/json/dist/commands/ARRAPPEND");
        ARRINDEX: typeof import("@redis/json/dist/commands/ARRINDEX");
        arrIndex: typeof import("@redis/json/dist/commands/ARRINDEX");
        ARRINSERT: typeof import("@redis/json/dist/commands/ARRINSERT");
        arrInsert: typeof import("@redis/json/dist/commands/ARRINSERT");
        ARRLEN: typeof import("@redis/json/dist/commands/ARRLEN");
        arrLen: typeof import("@redis/json/dist/commands/ARRLEN");
        ARRPOP: typeof import("@redis/json/dist/commands/ARRPOP");
        arrPop: typeof import("@redis/json/dist/commands/ARRPOP");
        ARRTRIM: typeof import("@redis/json/dist/commands/ARRTRIM");
        arrTrim: typeof import("@redis/json/dist/commands/ARRTRIM");
        DEBUG_MEMORY: typeof import("@redis/json/dist/commands/DEBUG_MEMORY");
        debugMemory: typeof import("@redis/json/dist/commands/DEBUG_MEMORY");
        DEL: typeof import("@redis/json/dist/commands/DEL");
        del: typeof import("@redis/json/dist/commands/DEL");
        FORGET: typeof import("@redis/json/dist/commands/FORGET");
        forget: typeof import("@redis/json/dist/commands/FORGET");
        GET: typeof import("@redis/json/dist/commands/GET");
        get: typeof import("@redis/json/dist/commands/GET");
        MGET: typeof import("@redis/json/dist/commands/MGET");
        mGet: typeof import("@redis/json/dist/commands/MGET");
        NUMINCRBY: typeof import("@redis/json/dist/commands/NUMINCRBY");
        numIncrBy: typeof import("@redis/json/dist/commands/NUMINCRBY");
        NUMMULTBY: typeof import("@redis/json/dist/commands/NUMMULTBY");
        numMultBy: typeof import("@redis/json/dist/commands/NUMMULTBY");
        OBJKEYS: typeof import("@redis/json/dist/commands/OBJKEYS");
        objKeys: typeof import("@redis/json/dist/commands/OBJKEYS");
        OBJLEN: typeof import("@redis/json/dist/commands/OBJLEN");
        objLen: typeof import("@redis/json/dist/commands/OBJLEN");
        RESP: typeof import("@redis/json/dist/commands/RESP");
        resp: typeof import("@redis/json/dist/commands/RESP");
        SET: typeof import("@redis/json/dist/commands/SET");
        set: typeof import("@redis/json/dist/commands/SET");
        STRAPPEND: typeof import("@redis/json/dist/commands/STRAPPEND");
        strAppend: typeof import("@redis/json/dist/commands/STRAPPEND");
        STRLEN: typeof import("@redis/json/dist/commands/STRLEN");
        strLen: typeof import("@redis/json/dist/commands/STRLEN");
        TYPE: typeof import("@redis/json/dist/commands/TYPE");
        type: typeof import("@redis/json/dist/commands/TYPE");
    };
};
export type JsonRedisClient = RedisClientType<typeof modules>;
declare class PuzzleRedisClient {
    private readonly client;
    constructor(url: string | undefined, username: string | undefined, password: string | undefined);
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    savePuzzle: (puzzle: Puzzle) => Promise<string>;
    loadPuzzle: (hmac_key: string) => Promise<Puzzle | null>;
    solvePuzzleKey: (hmac_key: string) => string;
}
