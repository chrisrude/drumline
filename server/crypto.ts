import { toUtf8 } from 'base-emoji';
import { Puzzle } from 'drumline-lib';
import { subtle } from 'node:crypto';
import { SECRET_HASH_ALGORITHM, SECRET_PUZZLE_ID_SALT } from './secrets';

export { puzzleHmacName };

// input text should be the json encoding of the puzzle, with the private user_id appended
// output should be the sha512 hash of the input text
const puzzleHmac = (puzzle: Puzzle, private_uuid: string): Promise<ArrayBuffer> => {
    const inputText = JSON.stringify(puzzle) + private_uuid + SECRET_PUZZLE_ID_SALT;

    const ec = new TextEncoder();
    const data = ec.encode(inputText);
    return subtle.digest(SECRET_HASH_ALGORITHM, data);
}

// returns a string representation of the hash
const puzzleHmacName = async (puzzle: Puzzle, private_uuid: string): Promise<string> => {
    return puzzleHmac(puzzle, private_uuid).then((hash) => { return toUtf8(hash) });
}
