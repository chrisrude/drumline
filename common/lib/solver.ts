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

const DEFAULT_CURSOR: CursorType = {
  i: 0,
  j: 0,
  use_band: false,
};

class Solver implements SolverType {
  cursor: CursorType;
  name: string;

  constructor(name: string) {
    this.name = name;
    this.cursor = { ...DEFAULT_CURSOR };
  }
}
