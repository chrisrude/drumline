import { Puzzle, UserId } from '@chrisrude/drumline-lib';
import { Express, Request, Response, json } from 'express';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { puzzleHmac } from '../crypto';
import { PuzzleRedisClient } from '../redis';
import { ADMIN_USER_UUIDS, SECRET_PUZZLE_ID_SALT } from '../secrets';

export { PuzzleCrudder };

class PuzzleCrudder {
    readonly _app: Express;
    readonly _redis_client: PuzzleRedisClient;

    load_completed: boolean;

    constructor(app: Express, redis_client: PuzzleRedisClient) {
        this._app = app;
        this._redis_client = redis_client;
        this.load_completed = false;

        app.use(json());

        app.get('/health', this.health_check);

        app.post('/puzzles', this.create_puzzle);
        // todo: this should be private, not good to put in a url
        app.get('/puzzles/list/:user_uuid', this.list_puzzles);
        app.get('/puzzles/:id', this.read_puzzle);
        app.delete('/puzzles/:id', this.delete_puzzle);
    }

    _try_create_user = (uuid: string): UserId | null => {
        // make sure uuid is valid and a v4 uuid (private user ids are v4;
        // the derived public ids are v5)
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
        const user_uuid = req.params.user_uuid;
        const user = this._try_create_user(user_uuid);
        if (!user) {
            res.status(401).send(`No user ID`);
            return;
        }
        const uuid = user.private_uuid;
        const puzzle_list = ADMIN_USER_UUIDS.has(uuid)
            ? await this._redis_client.listAllPuzzles(uuid)
            : await this._redis_client.listPuzzles(uuid);
        res.status(200).send({
            result: 'OK',
            puzzle_list
        });
    };

    read_puzzle = async (req: Request, res: Response) => {
        const id = req.params.id;
        console.log(`read_puzzle: ${id}`);

        const puzzle = await this._redis_client.loadPuzzle(id);
        if (null === puzzle) {
            res.status(404).send(`Puzzle not found`);
            return;
        }
        res.status(200).send({
            result: 'OK',
            puzzle
        });
    };

    create_puzzle = async (req: Request, res: Response) => {
        console.log(`create_puzzle`);

        // note: don't log the request body here.  It contains the
        // user's private uuid, and the client promises not to log activity.
        const input_text = req.body?.input_text;
        const user = this._try_create_user(req.body?.private_uuid);
        if (null === user) {
            res.status(400).send(`Invalid private_uuid`);
            return;
        }
        if (typeof input_text !== 'string') {
            res.status(400).send('Invalid puzzle_input');
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

        try {
            await this._redis_client.savePuzzle(puzzle, puzzle_id, requester_private_uuid);
        } catch (err) {
            console.error('create_puzzle: could not save puzzle', err);
            res.status(500).send('Could not save puzzle');
            return;
        }

        res.status(201).location(`/puzzles/${puzzle_id}`).send({
            result: 'OK',
            puzzle_id: puzzle_id
        });
    };

    delete_puzzle = async (req: Request, res: Response) => {
        console.log(`delete_puzzle`);

        // need to be logged in to delete a puzzle
        const user = this._try_create_user(req.body?.private_uuid);
        if (!user) {
            res.status(401).send(`No user ID`);
            return;
        }

        const requester_private_uuid = user.private_uuid;
        const id = req.params.id;

        // delete the puzzle.  This returns false if the puzzle does not
        // exist, or if the creator is not the same as the requester.
        const deleted = await this._redis_client.deletePuzzle(id, requester_private_uuid);
        if (!deleted) {
            res.status(404).send(`Puzzle not found`);
            return;
        }

        // 204 responses have no body
        res.status(204).end();
    };

    health_check = async (_req: Request, res: Response) => {
        if (!this.load_completed) {
            res.status(418).send({
                result: "I'm a teapot"
            });
            return;
        }
        res.status(200).send({
            result: 'OK'
        });
    };
}
