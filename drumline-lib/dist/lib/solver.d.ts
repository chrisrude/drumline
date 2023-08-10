export { Solver };
export type { CursorType, SolverType };
type CursorType = {
    i: number;
    j: number;
    use_band: boolean;
};
type SolverType = {
    cursor: CursorType;
    name: string;
};
declare class Solver implements SolverType {
    cursor: CursorType;
    name: string;
    constructor(name: string);
}
