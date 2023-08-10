export { set_from_json, to_json };
import type { GameState } from './game_state';
declare function to_json(gameState: GameState): string;
declare function set_from_json(json: string, gameState: GameState): void;
