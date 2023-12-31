import { Puzzle, UserId } from '@chrisrude/drumline-lib';
import { subtle } from 'node:crypto';
import { to_emojis } from './emoji-encode/encode-emoji';

export { puzzleHmac, solveHmac };

const SECRET_HASH_ALGORITHM = 'SHA-512';

// returns a string representation of the hash
const puzzleHmac = async (puzzle: Puzzle, salt: string): Promise<string> => {
    const ec = new TextEncoder();
    const data = ec.encode(puzzle.original_text + salt);
    return await subtle
        .digest(SECRET_HASH_ALGORITHM, data)
        .then((hash) => to_emojis(new Uint8Array(hash)));
};

const solveHmac = async (puzzle: Puzzle, creator: UserId, salt: string): Promise<string> => {
    const ec = new TextEncoder();
    const puzzle_data = ec.encode(puzzle.original_text + salt);
    const creator_data = ec.encode(creator.private_uuid + salt);

    const combined_data = new Uint8Array(puzzle_data.length + creator_data.length);
    combined_data.set(puzzle_data);
    combined_data.set(creator_data, puzzle_data.length);

    return await subtle
        .digest(SECRET_HASH_ALGORITHM, combined_data)
        .then((hash) => to_emojis(new Uint8Array(hash)));
};
