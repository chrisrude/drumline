import { Puzzle, UserId } from '@chrisrude/drumline-lib';
import { Express, Request, Response } from 'express';
export { PuzzleCrudder };
declare class PuzzleCrudder {
    readonly _app: Express;
    readonly _map_puzzle_id_to_creator_uuid: Map<string, string>;
    readonly _map_puzzle_id_to_puzzle: Map<string, Puzzle>;
    constructor(app: Express);
    try_create_user: (uuid: string) => UserId | null;
    list_puzzles: (req: Request, res: Response) => Promise<void>;
    read_puzzle: (req: Request, res: Response) => void;
    create_puzzle: (req: Request, res: Response) => Promise<void>;
    delete_puzzle: (req: Request, res: Response) => Promise<void>;
}
