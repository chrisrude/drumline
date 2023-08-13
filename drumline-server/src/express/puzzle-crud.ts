import { Puzzle, UserId } from '@chrisrude/drumline-lib';
import { Express, Request, Response, json } from 'express';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { puzzleHmac } from '../crypto';
import { PuzzleRedisClient } from '../redis';
import { SECRET_PUZZLE_ID_SALT } from '../secrets';

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
        app.get('/puzzles', this.list_puzzles);
        app.get('/puzzles/:id', this.read_puzzle);
        app.delete('/puzzles/:id', this.delete_puzzle);
    }

    _try_create_user = (uuid: string): UserId | null => {
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

        const user = this._try_create_user(req.body.private_uuid);
        if (!user) {
            res.status(401).send(`No user ID`);
            return;
        }
        const puzzle_list = await this._redis_client.listPuzzles(user.private_uuid);
        res.status(200).send({
            result: 'OK',
            puzzle_list
        });
    };

    read_puzzle = async (req: Request, res: Response) => {
        const id = req.params.id;
        console.log(`read_puzzle: ${id}`);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const puzzle = await this._redis_client.loadPuzzle(id);
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
        const user = this._try_create_user(req.body.private_uuid);
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

        this._redis_client.savePuzzle(puzzle, puzzle_id, requester_private_uuid);

        res.status(201).location(`/puzzles/${puzzle_id}`).send({
            result: 'OK',
            puzzle_id: puzzle_id
        });
    };

    delete_puzzle = async (req: Request, res: Response) => {
        console.log(`delete_puzzle`);

        // need to be logged in to delete a puzzle
        const user = this._try_create_user(req.body.private_uuid);
        if (!user) {
            res.status(401).send(`No user ID`);
            return;
        }

        const requester_private_uuid = user.private_uuid;
        const id = req.params.id;

        // delete the puzzle. This will throw if the creator
        // is not the same as the requester.
        const deleted = await this._redis_client.deletePuzzle(id, requester_private_uuid);
        if (!deleted) {
            res.status(404).send(`Puzzle not found`);
            return;
        }

        res.status(204).send({
            result: 'OK'
        });
    };

    health_check = async (_req: Request, res: Response) => {
        console.log(`health_check`);
        if (!this.load_completed) {
            res.status(418).send({
                result: 'I\'m a teapot'
            });

        }
        res.status(200).send({
            result: 'OK'
        });
    }
}
