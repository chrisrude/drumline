import { Puzzle } from 'drumline-lib';
import { Express, Request, Response, json } from 'express';
import { puzzleHmac } from '../crypto';
import { SECRET_PUZZLE_ID_SALT } from '../secrets';
import { LoginManager } from './login-manager';

export { PuzzleCrudder };

// TODO: will we have a proxy in prod?
// app.set('trust proxy', 1) // trust first proxy

class PuzzleCrudder {
    // todo: use redis to store solve puzzles

    readonly _app: Express;
    readonly _login_manager: LoginManager;
    readonly _map_puzzle_id_to_creator_uuid: Map<string, string>;
    readonly _map_puzzle_id_to_puzzle: Map<string, Puzzle>;

    constructor(app: Express, login_manager: LoginManager) {
        this._app = app;
        this._login_manager = login_manager;
        this._map_puzzle_id_to_creator_uuid = new Map<string, string>();
        this._map_puzzle_id_to_puzzle = new Map<string, Puzzle>();

        // json middleware will parse json bodies
        app.use(json());

        app.post('/puzzles', this.create_puzzle);
        app.get('/puzzles', this.list_puzzles);
        app.get('/puzzles/:id', this.read_puzzle);
        app.delete('/puzzles/:id', this.delete_puzzle);
    }

    list_puzzles = async (req: Request, res: Response) => {
        console.log(`list_puzzles`);
        const private_uuid = this._login_manager.get_private_uuid_maybe(req);

        // you can list puzzles when logged out, I think this is ok

        const puzzle_ids = Array.from(this._map_puzzle_id_to_creator_uuid.keys());
        const my_puzzle_ids = puzzle_ids.filter((puzzle_id) => {
            return (
                null !== private_uuid &&
                private_uuid === this._map_puzzle_id_to_creator_uuid.get(puzzle_id)
            );
        });

        // todo: should we send other puzzle_ids?
        res.status(200).send({
            result: 'OK',
            puzzle_ids,
            my_puzzle_ids
        });
    };

    read_puzzle = (req: Request, res: Response) => {
        const id = req.params.id;
        console.log(`read_puzzle: ${id}`);

        // you can read puzzles when logged out, I think this is ok

        const puzzle: Puzzle | null = this._map_puzzle_id_to_puzzle.get(id) || null;
        if (null === puzzle) {
            res.status(404).send(`Puzzle ${id} not found`);
            return;
        }
        res.status(200).send({
            result: 'OK',
            puzzle: puzzle
        });
    };

    create_puzzle = async (req: Request, res: Response) => {
        console.log(`create_puzzle`);

        // need to be logged in to create a puzzle
        if (!this._login_manager.is_logged_in(req)) {
            res.status(401).send(`Not logged in`);
            return;
        }

        const input_text = req.body.input_text;

        let puzzle: Puzzle;
        try {
            puzzle = new Puzzle(input_text);
        } catch (err) {
            res.status(400).send(`Invalid puzzle_input: ${err}`);
            return;
        }

        const requester_private_uuid = this._login_manager.get_private_uuid_fo_sho(req);

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
        if (!this._login_manager.is_logged_in(req)) {
            res.status(401).send(`Not logged in`);
            return;
        }

        const requester_private_uuid = this._login_manager.get_private_uuid_fo_sho(req);
        const id = req.params.id;

        // are we the creator of this puzzle?
        // we intentionally check this rather than checking if the puzzle exists
        // so that we don't leak the existence of a puzzle.
        // of course at the moment we'll list all puzzles, but we can fix that later.
        const creator_uuid = this._map_puzzle_id_to_creator_uuid.get(id);
        if (creator_uuid !== requester_private_uuid) {
            res.status(401).send(`Not the creator of puzzle ${id}`);
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
