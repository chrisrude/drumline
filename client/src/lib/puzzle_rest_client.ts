import { Puzzle } from 'drumline-lib';

export {
    puzzles_create,
    puzzles_delete,
    puzzles_list,
    puzzles_login,
    puzzles_logout,
    puzzles_read
};
export type { PuzzleListResponse };

const HEADERS = {
    'Content-Type': 'application/json'
};

// login and logout

// POST /login
// body is json, {private_uuid: string}
// response: 200 - ok
//   json: {result: 'OK'}
// response: 400 - bad input
const puzzles_login = async (private_uuid: string, base_url?: string): Promise<void> => {
    const url = (base_url ?? '') + '/login';
    const response = await fetch(url, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ private_uuid })
    });
    if (!response.ok) {
        throw new Error(`login: ${response.status} ${response.statusText}`);
    }
};

// POST /logout
// response: 200 - ok
//   json: {result: 'OK}
const puzzles_logout = async (base_url?: string): Promise<void> => {
    const url = (base_url ?? '') + '/logout';
    const response = await fetch(url, { method: 'POST', headers: HEADERS });
    if (!response.ok) {
        throw new Error(`logout: ${response.status} ${response.statusText}`);
    }
};

//////

// app.get('/puzzles', this.list_puzzles);
// 200 - ok
// res.send({
//     result: 'OK',
//     puzzle_ids,
//     my_puzzle_ids
// });
type PuzzleListResponse = {
    result: 'OK';
    puzzle_ids: string[];
    my_puzzle_ids: string[];
};
const puzzles_list = async (base_url?: string): Promise<PuzzleListResponse> => {
    const url = (base_url ?? '') + '/puzzles';
    const response = await fetch(url, { method: 'GET', headers: HEADERS });
    if (!response.ok) {
        throw new Error(`list: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as PuzzleListResponse;
};

// puzzle crud
// app.post('/puzzles', this.create_puzzle);
// 201 - ok with body & location header
// 400 - bad input
// 401 - not logged in
//
// body is json, {input_text: string}
// res.send({
//     result: 'OK',
//     puzzle_id: puzzle_id
// });
const puzzles_create = async (input_text: string, base_url?: string): Promise<string> => {
    const url = (base_url ?? '') + '/puzzles';
    const response = await fetch(url, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ input_text })
    });
    if (!response.ok) {
        throw new Error(`create: ${response.status} ${response.statusText}`);
    }
    return (await response.json()).puzzle_id;
};

// app.get('/puzzles/:id', this.read_puzzle);
// 200 - ok
// 404 - not found
// res.send({
//     result: 'OK',
//     puzzle: puzzle
// });
const puzzles_read = async (id: string, base_url?: string): Promise<Puzzle> => {
    const url = (base_url ?? '') + `/puzzles/${id}`;
    const response = await fetch(url, { method: 'GET', headers: HEADERS });
    if (!response.ok) {
        throw new Error(`read: ${response.status} ${response.statusText}`);
    }
    const puzzle_json = (await response.json()).puzzle;
    const puzzle = new Puzzle(puzzle_json.input_text);
    return puzzle;
};

// app.delete('/puzzles/:id', this.delete_puzzle);
// 200 - ok
// 401 - not logged in
// 401 - not owner of puzzle / puzzle doesn't exist
// res.send({
//     result: 'OK'
// });
const puzzles_delete = async (id: string, base_url?: string): Promise<void> => {
    const url = (base_url ?? '') + `/puzzles/${id}`;
    const response = await fetch(url, { method: 'DELETE', headers: HEADERS });
    if (!response.ok) {
        throw new Error(`delete: ${response.status} ${response.statusText}`);
    }
    return;
};
