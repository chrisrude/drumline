import { Puzzle, UserId } from 'drumline-lib';
import { Express, Request, Response, json } from 'express';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { puzzleHmac } from '../crypto';
import { SECRET_PUZZLE_ID_SALT } from '../secrets';

export { PuzzleCrudder };

class PuzzleCrudder {
    // todo: use redis to store solve puzzles

    readonly _app: Express;
    readonly _map_puzzle_id_to_creator_uuid: Map<string, string>;
    readonly _map_puzzle_id_to_puzzle: Map<string, Puzzle>;

    constructor(app: Express) {
        this._app = app;
        this._map_puzzle_id_to_creator_uuid = new Map<string, string>();
        this._map_puzzle_id_to_puzzle = new Map<string, Puzzle>();

        app.use(json());

        app.post('/puzzles', this.create_puzzle);
        app.get('/puzzles', this.list_puzzles);
        app.get('/puzzles/:id', this.read_puzzle);
        app.delete('/puzzles/:id', this.delete_puzzle);
    }

    try_create_user = (uuid: string): UserId | null => {
        // make sure uuid is valid and a v5 uuid
        if (!uuid || !uuidValidate(uuid) || uuidVersion(uuid) !== 4) {
            return null;
        }
        try {
            // create a UserId if we can
            return new UserId(uuid);
        } catch {
            return null;
        }
    };

    list_puzzles = async (req: Request, res: Response) => {
        console.log(`list_puzzles`);

        const puzzle_ids = Array.from(this._map_puzzle_id_to_creator_uuid.keys());
        res.status(200).send({
            result: 'OK',
            puzzle_ids
        });
    };

    read_puzzle = (req: Request, res: Response) => {
        const id = req.params.id;
        console.log(`read_puzzle: ${id}`);

        // you can read puzzles when logged out, I think this is ok

        const puzzle: Puzzle | null = this._map_puzzle_id_to_puzzle.get(id) || null;
        if (null === puzzle) {
            res.status(404).send(`Puzzle not found`);
            return;
        }
        res.status(200).send({
            result: 'OK',
            puzzle: puzzle
        });
    };

    create_puzzle = async (req: Request, res: Response) => {
        console.log(`create_puzzle`);
        console.log(`input_text: ${req.body.input_text}`);
        console.log(`user: ${req.body.private_uuid}`);

        const input_text = req.body.input_text;
        const user = this.try_create_user(req.body.private_uuid);
        console.log(`body: ${JSON.stringify(req.body)}`);
        if (null === user) {
            res.status(400).send(`Invalid private_uuid`).end();
            return;
        }
        let puzzle: Puzzle;
        try {
            puzzle = new Puzzle(input_text);
        } catch (err) {
            res.status(400).send('Invalid puzzle_input');
            return;
        }
        const requester_private_uuid = user.private_uuid;

        // make ID for puzzle, userId
        const puzzle_id = await puzzleHmac(puzzle, SECRET_PUZZLE_ID_SALT);
        this._map_puzzle_id_to_creator_uuid.set(puzzle_id, requester_private_uuid);
        this._map_puzzle_id_to_puzzle.set(puzzle_id, puzzle);

        res.status(201).location(`/puzzles/${puzzle_id}`).send({
            result: 'OK',
            puzzle_id: puzzle_id
        });
    };

    delete_puzzle = async (req: Request, res: Response) => {
        console.log(`delete_puzzle`);

        // need to be logged in to delete a puzzle
        const user = this.try_create_user(req.body.private_uuid);
        if (!user) {
            res.status(401).send(`No user ID`);
            return;
        }

        const requester_private_uuid = user.private_uuid;
        const id = req.params.id;

        // are we the creator of this puzzle?
        // we intentionally check this rather than checking if the puzzle exists
        // so that we don't leak the existence of a puzzle.
        // of course at the moment we'll list all puzzles, but we can fix that later.
        const creator_uuid = this._map_puzzle_id_to_creator_uuid.get(id);
        if (creator_uuid !== requester_private_uuid) {
            res.status(401).send(`Not the creator of puzzle`);
            return;
        }

        // delete the puzzle
        this._map_puzzle_id_to_creator_uuid.delete(id);
        this._map_puzzle_id_to_puzzle.delete(id);

        res.status(200).send({
            result: 'OK'
        });
    };
}
