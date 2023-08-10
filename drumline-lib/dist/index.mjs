function memoize(func) {
    const cache = new Map;
    return (...args) => {
        const key = args.join("-");
        if (!cache.has(key)) {
            cache.set(key, func(...args));
        }
        return cache.get(key);
    };
}

const _locationsForBand = (size, band_index) => {
    const locations = [];
    for (let col = band_index; col < size - band_index; col++) {
        locations.push([ band_index, col ]);
    }
    for (let row = band_index + 1; row < size - band_index - 1; row++) {
        locations.push([ row, size - band_index - 1 ]);
    }
    for (let col = size - band_index - 1; col >= band_index + 1; col--) {
        locations.push([ size - band_index - 1, col ]);
    }
    for (let row = size - band_index - 1; row >= band_index + 1; row--) {
        locations.push([ row, band_index ]);
    }
    return locations;
};

const memoizedLocationsForBand = memoize(_locationsForBand);

const _locationsForRow = (size, row_index) => {
    const center = Math.floor(size / 2);
    if (row_index !== center) {
        return Array.from({
            length: size
        }, ((_, col) => [ row_index, col ]));
    }
    const locations = [];
    for (let col = 0; col < size; col++) {
        if (col === center) {
            continue;
        }
        locations.push([ row_index, col ]);
    }
    return locations;
};

const memoizedLocationsForRow = memoize(_locationsForRow);

const _getBandNumberFromCoords = (size, i, j) => {
    const rowOffset = Math.min(i, size - i - 1);
    const colOffset = Math.min(j, size - j - 1);
    const band = Math.min(rowOffset, colOffset);
    return band;
};

const memoizedGetBandNumberFromCoords = memoize(_getBandNumberFromCoords);

const _clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const _clampListIndex = (list, idx) => _clamp(idx, 0, list.length - 1);

const nextIndexWithoutWrap = (locations, idx) => _clampListIndex(locations, idx + 1);

const prevIndexWithoutWrap = (locations, idx) => _clampListIndex(locations, idx - 1);

const nextIndexWithWrap = (locations, idx) => (idx + 1) % locations.length;

const prevIndexWithWrap = (locations, idx) => (idx + locations.length - 1) % locations.length;

const _getBandSide = (size, i, j) => {
    const band = memoizedGetBandNumberFromCoords(size, i, j);
    const backSide = size - 1 - band;
    if (i === band && j !== backSide) {
        return [ "top", j === band ];
    }
    if (j === backSide && i !== backSide) {
        return [ "right", i === band ];
    }
    if (i === backSide && j !== band) {
        return [ "bottom", j === backSide ];
    }
    if (j === band) {
        return [ "left", i === backSide ];
    }
    return [ "top", true ];
};

const _generateGridAttributes = size => {
    const cells = [];
    const center = Math.floor(size / 2);
    const num_bands = Math.floor((size - 1) / 2) + 1;
    const locations_for_band = Array.from({
        length: num_bands
    }, ((_, i) => memoizedLocationsForBand(size, i)));
    const locations_for_row = Array.from({
        length: size
    }, ((_, i) => memoizedLocationsForRow(size, i)));
    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
            const band_number = memoizedGetBandNumberFromCoords(size, i, j);
            const band_locations = memoizedLocationsForBand(size, band_number);
            const band_offset = band_locations.findIndex((([x, y]) => x == i && y == j));
            if (-1 === band_offset) {
                throw new Error(`row_offset is -1 for ${i}, ${j}`);
            }
            const [band_side, is_corner] = _getBandSide(size, i, j);
            const band_group = {
                kind: "band",
                index: band_number,
                offset: band_offset,
                prev: band_locations[prevIndexWithWrap(band_locations, band_offset)],
                next: band_locations[nextIndexWithWrap(band_locations, band_offset)],
                side: band_side,
                is_corner
            };
            const row_locations = memoizedLocationsForRow(size, i);
            const row_offset = row_locations.findIndex((([x, y]) => x == i && y == j));
            if (-1 === row_offset && !(i == center && j == center)) {
                throw new Error(`row_offset is -1 for ${i}, ${j}`);
            }
            const row_group = {
                kind: "row",
                index: i,
                offset: row_offset,
                prev: row_locations[prevIndexWithoutWrap(row_locations, row_offset)],
                next: row_locations[nextIndexWithoutWrap(row_locations, row_offset)]
            };
            const is_center = i === center && j === center;
            row.push({
                is_center,
                band_group,
                row_group
            });
        }
        cells.push(row);
    }
    return {
        cells,
        center,
        num_bands,
        locations_for_band,
        locations_for_row,
        size
    };
};

const memoizedGenerateGridAttributes = memoize(_generateGridAttributes);

const validateProperties = (obj, numProperties, strProperties) => {
    if (obj === null) {
        throw new Error("Invalid action: (null)");
    }
    for (const [key, value] of Object.entries(obj)) {
        if (numProperties.includes(key)) {
            if (typeof value !== "number") {
                throw new Error(`Invalid action: ${key} is not a number`);
            }
        }
        if (strProperties.includes(key)) {
            if (typeof value !== "string") {
                throw new Error(`Invalid action: ${key} is not a string`);
            }
        }
    }
};

const GAME_ACTIONS = [ "joinPuzzle", "leavePuzzle", "set", "clear", "markSegment", "clearSegment" ];

function set(at, text) {
    return {
        action: "set",
        user_id: "",
        change_count: -1,
        row: at.row,
        col: at.col,
        text
    };
}

function clear(at) {
    return {
        action: "clear",
        user_id: "",
        change_count: -1,
        row: at.row,
        col: at.col
    };
}

function markSegment(clue_list, idx_cell_start, idx_cell_end) {
    return {
        action: "markSegment",
        user_id: "",
        change_count: -1,
        index: clue_list.index,
        kind: clue_list.kind,
        idx_cell_start,
        idx_cell_end
    };
}

function clearSegment(clue_list, idx_cell) {
    return {
        action: "clearSegment",
        user_id: "",
        change_count: -1,
        index: clue_list.index,
        kind: clue_list.kind,
        idx_cell
    };
}

function joinPuzzle(solve_id) {
    return {
        action: "joinPuzzle",
        user_id: "",
        change_count: -1,
        solve_id
    };
}

function leavePuzzle() {
    return {
        action: "leavePuzzle",
        user_id: "",
        change_count: -1
    };
}

function stringToAction(str) {
    if (str === null) {
        throw new Error("Invalid action: (null)");
    }
    const numProperties = [];
    const strProperties = [];
    const obj = JSON.parse(str);
    validateProperties(obj, [], [ "action" ]);
    switch (obj.action) {
      case "set":
      case "clear":
        numProperties.push("col");
        numProperties.push("row");
        strProperties.push("text");
        break;

      case "markSegment":
      case "clearSegment":
        numProperties.push("index");
        strProperties.push("kind");
        numProperties.push("idx_cell_start");
        numProperties.push("idx_cell_end");
        break;

      case "joinPuzzle":
        strProperties.push("solve_id");
        break;

      case "leavePuzzle":
        break;

      default:
        throw new Error("Invalid action: " + str);
    }
    strProperties.push("user_id");
    numProperties.push("change_count");
    validateProperties(obj, numProperties, strProperties);
    if ("kind" in strProperties) {
        if (obj.kind !== "across" && obj.kind !== "down") {
            throw new Error("Invalid action: " + str);
        }
    }
    return obj;
}

function actionToString(action) {
    return JSON.stringify(action);
}

function areActionsEqual(a, b) {
    if (a.user_id !== b.user_id) {
        return false;
    }
    if (a.action !== b.action) {
        return false;
    }
    if (a.change_count !== b.change_count) {
        if (a.change_count !== -1 && b.change_count !== -1) {
            return false;
        }
    }
    switch (a.action) {
      case "set":
        const set_a = a;
        const set_b = b;
        if (set_a.text !== set_b.text) {
            return false;
        }

      case "clear":
        const grid_a = a;
        const grid_b = b;
        if (grid_a.row !== grid_b.row) {
            return false;
        }
        if (grid_a.col !== grid_b.col) {
            return false;
        }
        break;

      case "markSegment":
        const mark_a = a;
        const mark_b = b;
        if (mark_a.idx_cell_start !== mark_b.idx_cell_start) {
            return false;
        }

      case "clearSegment":
        const clue_a = a;
        const clue_b = b;
        if (clue_a.index !== clue_b.index) {
            return false;
        }
        if (clue_a.kind !== clue_b.kind) {
            return false;
        }
        if ("clearSegment" == a.action) {
            const clear_a = a;
            const clear_b = b;
            if (clear_a.idx_cell !== clear_b.idx_cell) {
                return false;
            }
        }
        break;

      case "joinPuzzle":
        const solve_id_a = a;
        const solve_id_b = b;
        if (solve_id_a.solve_id !== solve_id_b.solve_id) {
            return false;
        }
        break;
    }
    return true;
}

const EMPTY_CELL_TEXT = " ";

class Cell {
    constructor() {
        this.text = EMPTY_CELL_TEXT;
    }
    clear() {
        this.text = EMPTY_CELL_TEXT;
    }
    set(text) {
        this.text = text;
    }
    is_filled() {
        return this.text !== EMPTY_CELL_TEXT;
    }
}

class AnswerSegments {
    constructor() {
        this.removeOverlappingSegments = remove => {
            this.segments = this.segments.filter((segment => {
                if (segment.idx_start < remove.idx_start) {
                    return segment.idx_end < remove.idx_start;
                } else {
                    return remove.idx_end < segment.idx_start;
                }
            }));
        };
        this.markSegment = segment => {
            this.removeOverlappingSegments(segment);
            this.segments.push(segment);
            this.segments.sort(((a, b) => a.idx_start - b.idx_start));
        };
        this.clearSegment = idx_cell => {
            this.removeOverlappingSegments({
                idx_start: idx_cell,
                idx_end: idx_cell
            });
        };
        this.numAnsweredCells = () => this.segments.reduce(((acc, segment) => acc + segment.idx_end - segment.idx_start + 1), 0);
        this.in_answer_at_offset = offset => {
            for (const segment of this.segments) {
                if (segment.idx_start <= offset && offset <= segment.idx_end) {
                    return [ true, segment.idx_start === offset, segment.idx_end === offset ];
                }
            }
            return [ false, false, false ];
        };
        this.segments = [];
    }
}

class GameState {
    constructor(size, solve_id) {
        this.apply = action => {
            switch (action.action) {
              case "clearSegment":
              case "markSegment":
                const clue_list_action = action;
                this.applyClueListAction(clue_list_action);
                break;

              case "set":
              case "clear":
                const grid_action = action;
                this.applyGridAction(grid_action);
                break;
            }
        };
        this.applyClueListAction = action => {
            const answer_segments = this.getAnswerSegments(action.kind, action.index);
            switch (action.action) {
              case "markSegment":
                {
                    const mark_segment_action = action;
                    answer_segments.markSegment({
                        idx_start: mark_segment_action.idx_cell_start,
                        idx_end: mark_segment_action.idx_cell_end
                    });
                    break;
                }

              case "clearSegment":
                {
                    const clear_segment_action = action;
                    answer_segments.clearSegment(clear_segment_action.idx_cell);
                    break;
                }
            }
        };
        this.applyGridAction = action => {
            const cell = this.grid[action.row][action.col];
            switch (action.action) {
              case "set":
                {
                    const set_action = action;
                    cell.set(set_action.text);
                    this.updateIsSolved();
                    break;
                }

              case "clear":
                {
                    cell.clear();
                    this.is_solved = false;
                    break;
                }
            }
        };
        this.getAnswerSegments = (kind, index) => {
            const is_row = "row" === kind;
            if (!is_row && "band" !== kind) {
                throw new Error(`get_answer_segments: invalid kind ${kind}`);
            }
            const answer_segments_list = is_row ? this.row_answer_segments : this.band_answer_segments;
            if (index < 0 || index >= answer_segments_list.length) {
                throw new Error(`get_answer_list: invalid index ${index} for ${kind}`);
            }
            return answer_segments_list[index];
        };
        this.updateIsSolved = () => {
            const num_filled = this.grid.reduce(((acc, row) => acc + row.reduce(((acc, cell) => acc + (cell.is_filled() ? 1 : 0)), 0)), 0);
            this.is_solved = num_filled === this.size * this.size - 1;
        };
        this.cell = location => this.grid[location[0]][location[1]];
        const num_bands = Math.floor((size - 1) / 2);
        this.band_answer_segments = Array.from({
            length: num_bands
        }, (() => new AnswerSegments));
        this.center = Math.floor(size / 2);
        this.grid = Array.from({
            length: size
        }, (() => Array.from({
            length: size
        }, (() => new Cell))));
        this.is_solved = false;
        this.row_answer_segments = Array.from({
            length: size
        }, (() => new AnswerSegments));
        this.size = size;
        this.solve_id = solve_id;
    }
}

function to_json(gameState) {
    const grid = gameState.grid.map((row => row.map((cell => cell.text))));
    const fn_segments_only = answer_segments => answer_segments.segments;
    const row_segments = gameState.row_answer_segments.map(fn_segments_only);
    const band_segments = gameState.band_answer_segments.map(fn_segments_only);
    const result = JSON.stringify({
        grid,
        row_segments,
        band_segments
    });
    return result;
}

function set_clue_lists(answer_segments, segment_values_list) {
    if (answer_segments.length != segment_values_list.length) {
        throw new Error(`set_from_json: clue_lists has ${answer_segments.length} rows, expected ${segment_values_list.length}`);
    }
    for (let i = 0; i < answer_segments.length; i++) {
        const segment_values = segment_values_list[i];
        const gamestate_segments = answer_segments[i];
        for (const segment of segment_values) {
            gamestate_segments.markSegment({
                idx_start: segment.idx_start,
                idx_end: segment.idx_end
            });
        }
    }
}

function set_from_json(json, gameState) {
    const simple_json = JSON.parse(json);
    if (simple_json.grid.length != gameState.size) {
        throw new Error(`set_from_json: grid has ${simple_json.grid.length} rows, expected ${gameState.size}`);
    }
    if (simple_json.grid[0].length != gameState.size) {
        throw new Error(`set_from_json: grid has ${simple_json.grid[0].length} columns, expected ${gameState.size}`);
    }
    const row_segments = simple_json.row_segments;
    if (row_segments.length != gameState.size) {
        throw new Error(`set_from_json: row_segments has ${row_segments.length} rows, expected ${gameState.size}`);
    }
    const band_segments = simple_json.band_segments;
    const num_bands = gameState.band_answer_segments.length;
    if (band_segments.length != num_bands) {
        throw new Error(`set_from_json: band_segments has ${band_segments.length} rows, expected ${num_bands}`);
    }
    const json_grid = simple_json.grid;
    for (let i = 0; i < gameState.grid.length; i++) {
        for (let j = 0; j < gameState.grid.length; j++) {
            gameState.grid[i][j].set(json_grid[i][j]);
        }
    }
    set_clue_lists(gameState.row_answer_segments, row_segments);
    set_clue_lists(gameState.band_answer_segments, band_segments);
}

const MAX_LENGTH = 26;

const ROW_IDENTIFIERS = Array.from({
    length: MAX_LENGTH
}, ((_, i) => (i + 1).toString()));

const BAND_IDENTIFIERS = Array.from({
    length: MAX_LENGTH
}, ((_, i) => String.fromCharCode(i + 65)));

const CLUE_IDENTIFIERS = BAND_IDENTIFIERS.map((letter => letter.toLowerCase()));

const ROWS_HEADER = "ROWS";

const BANDS_HEADER = "BANDS";

function sane_split(input, separator) {
    const [first] = input.split(separator, 1);
    const rest = input.slice(first.length + separator.length);
    return [ first, rest ];
}

function read_nested_clues(raw_lines, group_identifiers_orig) {
    const groups = [];
    const group_identifiers = [ ...group_identifiers_orig ];
    let next_group_identifier = group_identifiers.shift();
    for (const line of raw_lines) {
        let [letter, text] = sane_split(line, " ");
        if (letter === next_group_identifier) {
            groups.push([]);
            next_group_identifier = group_identifiers.shift();
            [letter, text] = sane_split(text, " ");
        }
        if (groups.length === 0) {
            continue;
        }
        const current_group = groups[groups.length - 1];
        const clue_index = current_group.length;
        const label = CLUE_IDENTIFIERS[clue_index];
        if (letter === label) {
            current_group.push({
                clue_index,
                label,
                text
            });
        } else {
            if (current_group.length === 0) {
                continue;
            }
            current_group[current_group.length - 1].text += " " + line;
        }
    }
    return groups;
}

function read_into_rowClues_and_bandClues(lines) {
    const row_clue_lines = [];
    const band_clue_lines = [];
    let found_rowClues = false;
    let found_bandClues = false;
    let current_group = null;
    for (const raw_line of lines) {
        const line = raw_line.trim();
        if (line.length === 0) {
            continue;
        }
        if (!found_rowClues && line === ROWS_HEADER) {
            found_rowClues = true;
            current_group = row_clue_lines;
            continue;
        }
        if (!found_bandClues && line === BANDS_HEADER) {
            found_bandClues = true;
            current_group = band_clue_lines;
            continue;
        }
        if (current_group === null) {
            continue;
        }
        current_group.push(line);
    }
    const row_clues = read_nested_clues(row_clue_lines, ROW_IDENTIFIERS);
    const band_clues = read_nested_clues(band_clue_lines, BAND_IDENTIFIERS);
    return [ row_clues, band_clues ];
}

function parse_clues(input_text) {
    const lines = input_text.split("\n");
    const [rowClues, bandClues] = read_into_rowClues_and_bandClues(lines);
    if (rowClues.length === 0) {
        throw new Error("No rowClues found");
    }
    if (bandClues.length === 0) {
        throw new Error("No bandClues found");
    }
    const expected_row_count = bandClues.length * 2 + 1;
    if (rowClues.length !== expected_row_count) {
        throw new Error(`Expected ${expected_row_count} row(s), because we had ${bandClues.length} band(s) but found ${rowClues.length} row(s) instead`);
    }
    for (let i = 0; i < rowClues.length; i++) {
        if (rowClues[i].length === 0) {
            throw new Error(`Row ${i + 1} contains no clues`);
        }
    }
    for (let i = 0; i < bandClues.length; i++) {
        if (bandClues[i].length === 0) {
            throw new Error(`Band ${i + 1} contains no clues`);
        }
    }
    return [ rowClues, bandClues ];
}

class Puzzle {
    constructor(text) {
        this.original_text = text;
        const [row_clues, band_clues] = parse_clues(text);
        this.band_clues = band_clues.map(((clues, i) => ({
            index: i,
            kind: "band",
            clues
        })));
        this.row_clues = row_clues.map(((clues, i) => ({
            index: i,
            kind: "row",
            clues
        })));
        this.size = row_clues.length;
    }
}

const loadPuzzleFromJson = storedString => {
    const json = JSON.parse(storedString);
    try {
        return new Puzzle(json);
    } catch (e) {
        console.error("could not load puzzle from json: ", e);
        return null;
    }
};

const savePuzzleToJson = puzzle => {
    const json = JSON.stringify(puzzle);
    return json;
};

const DEFAULT_CURSOR = {
    i: 0,
    j: 0,
    use_band: false
};

class Solver {
    constructor(name) {
        this.name = name;
        this.cursor = Object.assign({}, DEFAULT_CURSOR);
    }
}

let getRandomValues;

const rnds8 = new Uint8Array(16);

function rng() {
    if (!getRandomValues) {
        getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
        if (!getRandomValues) {
            throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
        }
    }
    return getRandomValues(rnds8);
}

var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

function validate(uuid) {
    return typeof uuid === "string" && REGEX.test(uuid);
}

const byteToHex = [];

for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
}

function unsafeStringify(arr, offset = 0) {
    return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

function parse(uuid) {
    if (!validate(uuid)) {
        throw TypeError("Invalid UUID");
    }
    let v;
    const arr = new Uint8Array(16);
    arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
    arr[1] = v >>> 16 & 255;
    arr[2] = v >>> 8 & 255;
    arr[3] = v & 255;
    arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
    arr[5] = v & 255;
    arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
    arr[7] = v & 255;
    arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
    arr[9] = v & 255;
    arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255;
    arr[11] = v / 4294967296 & 255;
    arr[12] = v >>> 24 & 255;
    arr[13] = v >>> 16 & 255;
    arr[14] = v >>> 8 & 255;
    arr[15] = v & 255;
    return arr;
}

function stringToBytes(str) {
    str = unescape(encodeURIComponent(str));
    const bytes = [];
    for (let i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
}

const DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

const URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

function v35(name, version, hashfunc) {
    function generateUUID(value, namespace, buf, offset) {
        var _namespace;
        if (typeof value === "string") {
            value = stringToBytes(value);
        }
        if (typeof namespace === "string") {
            namespace = parse(namespace);
        }
        if (((_namespace = namespace) === null || _namespace === void 0 ? void 0 : _namespace.length) !== 16) {
            throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        }
        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 15 | version;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
            offset = offset || 0;
            for (let i = 0; i < 16; ++i) {
                buf[offset + i] = bytes[i];
            }
            return buf;
        }
        return unsafeStringify(bytes);
    }
    try {
        generateUUID.name = name;
    } catch (err) {}
    generateUUID.DNS = DNS;
    generateUUID.URL = URL;
    return generateUUID;
}

const randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);

var native = {
    randomUUID
};

function v4(options, buf, offset) {
    if (native.randomUUID && !buf && !options) {
        return native.randomUUID();
    }
    options = options || {};
    const rnds = options.random || (options.rng || rng)();
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    if (buf) {
        offset = offset || 0;
        for (let i = 0; i < 16; ++i) {
            buf[offset + i] = rnds[i];
        }
        return buf;
    }
    return unsafeStringify(rnds);
}

function f(s, x, y, z) {
    switch (s) {
      case 0:
        return x & y ^ ~x & z;

      case 1:
        return x ^ y ^ z;

      case 2:
        return x & y ^ x & z ^ y & z;

      case 3:
        return x ^ y ^ z;
    }
}

function ROTL(x, n) {
    return x << n | x >>> 32 - n;
}

function sha1(bytes) {
    const K = [ 1518500249, 1859775393, 2400959708, 3395469782 ];
    const H = [ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ];
    if (typeof bytes === "string") {
        const msg = unescape(encodeURIComponent(bytes));
        bytes = [];
        for (let i = 0; i < msg.length; ++i) {
            bytes.push(msg.charCodeAt(i));
        }
    } else if (!Array.isArray(bytes)) {
        bytes = Array.prototype.slice.call(bytes);
    }
    bytes.push(128);
    const l = bytes.length / 4 + 2;
    const N = Math.ceil(l / 16);
    const M = new Array(N);
    for (let i = 0; i < N; ++i) {
        const arr = new Uint32Array(16);
        for (let j = 0; j < 16; ++j) {
            arr[j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
        }
        M[i] = arr;
    }
    M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
    M[N - 1][14] = Math.floor(M[N - 1][14]);
    M[N - 1][15] = (bytes.length - 1) * 8 & 4294967295;
    for (let i = 0; i < N; ++i) {
        const W = new Uint32Array(80);
        for (let t = 0; t < 16; ++t) {
            W[t] = M[i][t];
        }
        for (let t = 16; t < 80; ++t) {
            W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
        }
        let a = H[0];
        let b = H[1];
        let c = H[2];
        let d = H[3];
        let e = H[4];
        for (let t = 0; t < 80; ++t) {
            const s = Math.floor(t / 20);
            const T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
            e = d;
            d = c;
            c = ROTL(b, 30) >>> 0;
            b = a;
            a = T;
        }
        H[0] = H[0] + a >>> 0;
        H[1] = H[1] + b >>> 0;
        H[2] = H[2] + c >>> 0;
        H[3] = H[3] + d >>> 0;
        H[4] = H[4] + e >>> 0;
    }
    return [ H[0] >> 24 & 255, H[0] >> 16 & 255, H[0] >> 8 & 255, H[0] & 255, H[1] >> 24 & 255, H[1] >> 16 & 255, H[1] >> 8 & 255, H[1] & 255, H[2] >> 24 & 255, H[2] >> 16 & 255, H[2] >> 8 & 255, H[2] & 255, H[3] >> 24 & 255, H[3] >> 16 & 255, H[3] >> 8 & 255, H[3] & 255, H[4] >> 24 & 255, H[4] >> 16 & 255, H[4] >> 8 & 255, H[4] & 255 ];
}

const v5 = v35("v5", 80, sha1);

var uuidv5 = v5;

function version(uuid) {
    if (!validate(uuid)) {
        throw TypeError("Invalid UUID");
    }
    return parseInt(uuid.slice(14, 15), 16);
}

const UUID_NAMESPACE = "https://drumline.rudesoftware.net";

class UserId {
    constructor(private_uuid) {
        if (private_uuid && private_uuid.length > 0 && validate(private_uuid) && version(private_uuid) === 4) {
            this.private_uuid = private_uuid;
        } else {
            this.private_uuid = v4();
        }
        this.public_uuid = uuidv5(uuidv5.URL + UUID_NAMESPACE, this.private_uuid);
    }
}

export { AnswerSegments, Cell, GAME_ACTIONS, GameState, Puzzle, Solver, UserId, actionToString, areActionsEqual, clear, clearSegment, joinPuzzle, leavePuzzle, loadPuzzleFromJson, markSegment, memoizedGenerateGridAttributes, memoizedGetBandNumberFromCoords, memoizedLocationsForBand, memoizedLocationsForRow, nextIndexWithWrap, nextIndexWithoutWrap, prevIndexWithWrap, prevIndexWithoutWrap, savePuzzleToJson, set, set_from_json, stringToAction, to_json, validateProperties };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL2NlbGxfYXR0cmlidXRlcy50cyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9saWIvdmFsaWRhdGlvbi50cyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9saWIvZ2FtZV9hY3Rpb25zLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9nYW1lX3N0YXRlLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9nYW1lX3N0YXRlX2pzb24udHMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL2NsdWVfcGFyc2VyLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9wdXp6bGUudHMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL3B1enpsZV9qc29uLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9zb2x2ZXIudHMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvZGlzdC9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3JuZy5qcyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9kaXN0L25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvcmVnZXguanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvZGlzdC9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3ZhbGlkYXRlLmpzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2Rpc3Qvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci9zdHJpbmdpZnkuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvZGlzdC9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3BhcnNlLmpzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2Rpc3Qvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci92MzUuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvZGlzdC9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL25hdGl2ZS5qcyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9kaXN0L25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvdjQuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvZGlzdC9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3NoYTEuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvZGlzdC9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3Y1LmpzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2Rpc3Qvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci92ZXJzaW9uLmpzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi91c2VyX2lkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsIi8vIFVuaXF1ZSBJRCBjcmVhdGlvbiByZXF1aXJlcyBhIGhpZ2ggcXVhbGl0eSByYW5kb20gIyBnZW5lcmF0b3IuIEluIHRoZSBicm93c2VyIHdlIHRoZXJlZm9yZVxuLy8gcmVxdWlyZSB0aGUgY3J5cHRvIEFQSSBhbmQgZG8gbm90IHN1cHBvcnQgYnVpbHQtaW4gZmFsbGJhY2sgdG8gbG93ZXIgcXVhbGl0eSByYW5kb20gbnVtYmVyXG4vLyBnZW5lcmF0b3JzIChsaWtlIE1hdGgucmFuZG9tKCkpLlxubGV0IGdldFJhbmRvbVZhbHVlcztcbmNvbnN0IHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcm5nKCkge1xuICAvLyBsYXp5IGxvYWQgc28gdGhhdCBlbnZpcm9ubWVudHMgdGhhdCBuZWVkIHRvIHBvbHlmaWxsIGhhdmUgYSBjaGFuY2UgdG8gZG8gc29cbiAgaWYgKCFnZXRSYW5kb21WYWx1ZXMpIHtcbiAgICAvLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG8gaW1wbGVtZW50YXRpb24uXG4gICAgZ2V0UmFuZG9tVmFsdWVzID0gdHlwZW9mIGNyeXB0byAhPT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKTtcblxuICAgIGlmICghZ2V0UmFuZG9tVmFsdWVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NyeXB0by5nZXRSYW5kb21WYWx1ZXMoKSBub3Qgc3VwcG9ydGVkLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3V1aWRqcy91dWlkI2dldHJhbmRvbXZhbHVlcy1ub3Qtc3VwcG9ydGVkJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG59IiwiZXhwb3J0IGRlZmF1bHQgL14oPzpbMC05YS1mXXs4fS1bMC05YS1mXXs0fS1bMS01XVswLTlhLWZdezN9LVs4OWFiXVswLTlhLWZdezN9LVswLTlhLWZdezEyfXwwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDApJC9pOyIsImltcG9ydCBSRUdFWCBmcm9tICcuL3JlZ2V4LmpzJztcblxuZnVuY3Rpb24gdmFsaWRhdGUodXVpZCkge1xuICByZXR1cm4gdHlwZW9mIHV1aWQgPT09ICdzdHJpbmcnICYmIFJFR0VYLnRlc3QodXVpZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHZhbGlkYXRlOyIsImltcG9ydCB2YWxpZGF0ZSBmcm9tICcuL3ZhbGlkYXRlLmpzJztcbi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xuXG5jb25zdCBieXRlVG9IZXggPSBbXTtcblxuZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXgucHVzaCgoaSArIDB4MTAwKS50b1N0cmluZygxNikuc2xpY2UoMSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5zYWZlU3RyaW5naWZ5KGFyciwgb2Zmc2V0ID0gMCkge1xuICAvLyBOb3RlOiBCZSBjYXJlZnVsIGVkaXRpbmcgdGhpcyBjb2RlISAgSXQncyBiZWVuIHR1bmVkIGZvciBwZXJmb3JtYW5jZVxuICAvLyBhbmQgd29ya3MgaW4gd2F5cyB5b3UgbWF5IG5vdCBleHBlY3QuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdXVpZGpzL3V1aWQvcHVsbC80MzRcbiAgcmV0dXJuIChieXRlVG9IZXhbYXJyW29mZnNldCArIDBdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMV1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAyXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDNdXSArICctJyArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgNF1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA1XV0gKyAnLScgKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDZdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgN11dICsgJy0nICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA4XV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDldXSArICctJyArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTBdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTFdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTJdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTNdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTRdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMTVdXSkudG9Mb3dlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gc3RyaW5naWZ5KGFyciwgb2Zmc2V0ID0gMCkge1xuICBjb25zdCB1dWlkID0gdW5zYWZlU3RyaW5naWZ5KGFyciwgb2Zmc2V0KTsgLy8gQ29uc2lzdGVuY3kgY2hlY2sgZm9yIHZhbGlkIFVVSUQuICBJZiB0aGlzIHRocm93cywgaXQncyBsaWtlbHkgZHVlIHRvIG9uZVxuICAvLyBvZiB0aGUgZm9sbG93aW5nOlxuICAvLyAtIE9uZSBvciBtb3JlIGlucHV0IGFycmF5IHZhbHVlcyBkb24ndCBtYXAgdG8gYSBoZXggb2N0ZXQgKGxlYWRpbmcgdG9cbiAgLy8gXCJ1bmRlZmluZWRcIiBpbiB0aGUgdXVpZClcbiAgLy8gLSBJbnZhbGlkIGlucHV0IHZhbHVlcyBmb3IgdGhlIFJGQyBgdmVyc2lvbmAgb3IgYHZhcmlhbnRgIGZpZWxkc1xuXG4gIGlmICghdmFsaWRhdGUodXVpZCkpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ1N0cmluZ2lmaWVkIFVVSUQgaXMgaW52YWxpZCcpO1xuICB9XG5cbiAgcmV0dXJuIHV1aWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHN0cmluZ2lmeTsiLCJpbXBvcnQgdmFsaWRhdGUgZnJvbSAnLi92YWxpZGF0ZS5qcyc7XG5cbmZ1bmN0aW9uIHBhcnNlKHV1aWQpIHtcbiAgaWYgKCF2YWxpZGF0ZSh1dWlkKSkge1xuICAgIHRocm93IFR5cGVFcnJvcignSW52YWxpZCBVVUlEJyk7XG4gIH1cblxuICBsZXQgdjtcbiAgY29uc3QgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBQYXJzZSAjIyMjIyMjIy0uLi4uLS4uLi4tLi4uLi0uLi4uLi4uLi4uLi5cblxuICBhcnJbMF0gPSAodiA9IHBhcnNlSW50KHV1aWQuc2xpY2UoMCwgOCksIDE2KSkgPj4+IDI0O1xuICBhcnJbMV0gPSB2ID4+PiAxNiAmIDB4ZmY7XG4gIGFyclsyXSA9IHYgPj4+IDggJiAweGZmO1xuICBhcnJbM10gPSB2ICYgMHhmZjsgLy8gUGFyc2UgLi4uLi4uLi4tIyMjIy0uLi4uLS4uLi4tLi4uLi4uLi4uLi4uXG5cbiAgYXJyWzRdID0gKHYgPSBwYXJzZUludCh1dWlkLnNsaWNlKDksIDEzKSwgMTYpKSA+Pj4gODtcbiAgYXJyWzVdID0gdiAmIDB4ZmY7IC8vIFBhcnNlIC4uLi4uLi4uLS4uLi4tIyMjIy0uLi4uLS4uLi4uLi4uLi4uLlxuXG4gIGFycls2XSA9ICh2ID0gcGFyc2VJbnQodXVpZC5zbGljZSgxNCwgMTgpLCAxNikpID4+PiA4O1xuICBhcnJbN10gPSB2ICYgMHhmZjsgLy8gUGFyc2UgLi4uLi4uLi4tLi4uLi0uLi4uLSMjIyMtLi4uLi4uLi4uLi4uXG5cbiAgYXJyWzhdID0gKHYgPSBwYXJzZUludCh1dWlkLnNsaWNlKDE5LCAyMyksIDE2KSkgPj4+IDg7XG4gIGFycls5XSA9IHYgJiAweGZmOyAvLyBQYXJzZSAuLi4uLi4uLi0uLi4uLS4uLi4tLi4uLi0jIyMjIyMjIyMjIyNcbiAgLy8gKFVzZSBcIi9cIiB0byBhdm9pZCAzMi1iaXQgdHJ1bmNhdGlvbiB3aGVuIGJpdC1zaGlmdGluZyBoaWdoLW9yZGVyIGJ5dGVzKVxuXG4gIGFyclsxMF0gPSAodiA9IHBhcnNlSW50KHV1aWQuc2xpY2UoMjQsIDM2KSwgMTYpKSAvIDB4MTAwMDAwMDAwMDAgJiAweGZmO1xuICBhcnJbMTFdID0gdiAvIDB4MTAwMDAwMDAwICYgMHhmZjtcbiAgYXJyWzEyXSA9IHYgPj4+IDI0ICYgMHhmZjtcbiAgYXJyWzEzXSA9IHYgPj4+IDE2ICYgMHhmZjtcbiAgYXJyWzE0XSA9IHYgPj4+IDggJiAweGZmO1xuICBhcnJbMTVdID0gdiAmIDB4ZmY7XG4gIHJldHVybiBhcnI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlOyIsImltcG9ydCB7IHVuc2FmZVN0cmluZ2lmeSB9IGZyb20gJy4vc3RyaW5naWZ5LmpzJztcbmltcG9ydCBwYXJzZSBmcm9tICcuL3BhcnNlLmpzJztcblxuZnVuY3Rpb24gc3RyaW5nVG9CeXRlcyhzdHIpIHtcbiAgc3RyID0gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHN0cikpOyAvLyBVVEY4IGVzY2FwZVxuXG4gIGNvbnN0IGJ5dGVzID0gW107XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBieXRlcy5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKTtcbiAgfVxuXG4gIHJldHVybiBieXRlcztcbn1cblxuZXhwb3J0IGNvbnN0IEROUyA9ICc2YmE3YjgxMC05ZGFkLTExZDEtODBiNC0wMGMwNGZkNDMwYzgnO1xuZXhwb3J0IGNvbnN0IFVSTCA9ICc2YmE3YjgxMS05ZGFkLTExZDEtODBiNC0wMGMwNGZkNDMwYzgnO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdjM1KG5hbWUsIHZlcnNpb24sIGhhc2hmdW5jKSB7XG4gIGZ1bmN0aW9uIGdlbmVyYXRlVVVJRCh2YWx1ZSwgbmFtZXNwYWNlLCBidWYsIG9mZnNldCkge1xuICAgIHZhciBfbmFtZXNwYWNlO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gc3RyaW5nVG9CeXRlcyh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lc3BhY2UgPSBwYXJzZShuYW1lc3BhY2UpO1xuICAgIH1cblxuICAgIGlmICgoKF9uYW1lc3BhY2UgPSBuYW1lc3BhY2UpID09PSBudWxsIHx8IF9uYW1lc3BhY2UgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9uYW1lc3BhY2UubGVuZ3RoKSAhPT0gMTYpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcignTmFtZXNwYWNlIG11c3QgYmUgYXJyYXktbGlrZSAoMTYgaXRlcmFibGUgaW50ZWdlciB2YWx1ZXMsIDAtMjU1KScpO1xuICAgIH0gLy8gQ29tcHV0ZSBoYXNoIG9mIG5hbWVzcGFjZSBhbmQgdmFsdWUsIFBlciA0LjNcbiAgICAvLyBGdXR1cmU6IFVzZSBzcHJlYWQgc3ludGF4IHdoZW4gc3VwcG9ydGVkIG9uIGFsbCBwbGF0Zm9ybXMsIGUuZy4gYGJ5dGVzID1cbiAgICAvLyBoYXNoZnVuYyhbLi4ubmFtZXNwYWNlLCAuLi4gdmFsdWVdKWBcblxuXG4gICAgbGV0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoMTYgKyB2YWx1ZS5sZW5ndGgpO1xuICAgIGJ5dGVzLnNldChuYW1lc3BhY2UpO1xuICAgIGJ5dGVzLnNldCh2YWx1ZSwgbmFtZXNwYWNlLmxlbmd0aCk7XG4gICAgYnl0ZXMgPSBoYXNoZnVuYyhieXRlcyk7XG4gICAgYnl0ZXNbNl0gPSBieXRlc1s2XSAmIDB4MGYgfCB2ZXJzaW9uO1xuICAgIGJ5dGVzWzhdID0gYnl0ZXNbOF0gJiAweDNmIHwgMHg4MDtcblxuICAgIGlmIChidWYpIHtcbiAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDE2OyArK2kpIHtcbiAgICAgICAgYnVmW29mZnNldCArIGldID0gYnl0ZXNbaV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBidWY7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuc2FmZVN0cmluZ2lmeShieXRlcyk7XG4gIH0gLy8gRnVuY3Rpb24jbmFtZSBpcyBub3Qgc2V0dGFibGUgb24gc29tZSBwbGF0Zm9ybXMgKCMyNzApXG5cblxuICB0cnkge1xuICAgIGdlbmVyYXRlVVVJRC5uYW1lID0gbmFtZTsgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWVtcHR5XG4gIH0gY2F0Y2ggKGVycikge30gLy8gRm9yIENvbW1vbkpTIGRlZmF1bHQgZXhwb3J0IHN1cHBvcnRcblxuXG4gIGdlbmVyYXRlVVVJRC5ETlMgPSBETlM7XG4gIGdlbmVyYXRlVVVJRC5VUkwgPSBVUkw7XG4gIHJldHVybiBnZW5lcmF0ZVVVSUQ7XG59IiwiY29uc3QgcmFuZG9tVVVJRCA9IHR5cGVvZiBjcnlwdG8gIT09ICd1bmRlZmluZWQnICYmIGNyeXB0by5yYW5kb21VVUlEICYmIGNyeXB0by5yYW5kb21VVUlELmJpbmQoY3J5cHRvKTtcbmV4cG9ydCBkZWZhdWx0IHtcbiAgcmFuZG9tVVVJRFxufTsiLCJpbXBvcnQgbmF0aXZlIGZyb20gJy4vbmF0aXZlLmpzJztcbmltcG9ydCBybmcgZnJvbSAnLi9ybmcuanMnO1xuaW1wb3J0IHsgdW5zYWZlU3RyaW5naWZ5IH0gZnJvbSAnLi9zdHJpbmdpZnkuanMnO1xuXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICBpZiAobmF0aXZlLnJhbmRvbVVVSUQgJiYgIWJ1ZiAmJiAhb3B0aW9ucykge1xuICAgIHJldHVybiBuYXRpdmUucmFuZG9tVVVJRCgpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGNvbnN0IHJuZHMgPSBvcHRpb25zLnJhbmRvbSB8fCAob3B0aW9ucy5ybmcgfHwgcm5nKSgpOyAvLyBQZXIgNC40LCBzZXQgYml0cyBmb3IgdmVyc2lvbiBhbmQgYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgXG5cbiAgcm5kc1s2XSA9IHJuZHNbNl0gJiAweDBmIHwgMHg0MDtcbiAgcm5kc1s4XSA9IHJuZHNbOF0gJiAweDNmIHwgMHg4MDsgLy8gQ29weSBieXRlcyB0byBidWZmZXIsIGlmIHByb3ZpZGVkXG5cbiAgaWYgKGJ1Zikge1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxNjsgKytpKSB7XG4gICAgICBidWZbb2Zmc2V0ICsgaV0gPSBybmRzW2ldO1xuICAgIH1cblxuICAgIHJldHVybiBidWY7XG4gIH1cblxuICByZXR1cm4gdW5zYWZlU3RyaW5naWZ5KHJuZHMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB2NDsiLCIvLyBBZGFwdGVkIGZyb20gQ2hyaXMgVmVuZXNzJyBTSEExIGNvZGUgYXRcbi8vIGh0dHA6Ly93d3cubW92YWJsZS10eXBlLmNvLnVrL3NjcmlwdHMvc2hhMS5odG1sXG5mdW5jdGlvbiBmKHMsIHgsIHksIHopIHtcbiAgc3dpdGNoIChzKSB7XG4gICAgY2FzZSAwOlxuICAgICAgcmV0dXJuIHggJiB5IF4gfnggJiB6O1xuXG4gICAgY2FzZSAxOlxuICAgICAgcmV0dXJuIHggXiB5IF4gejtcblxuICAgIGNhc2UgMjpcbiAgICAgIHJldHVybiB4ICYgeSBeIHggJiB6IF4geSAmIHo7XG5cbiAgICBjYXNlIDM6XG4gICAgICByZXR1cm4geCBeIHkgXiB6O1xuICB9XG59XG5cbmZ1bmN0aW9uIFJPVEwoeCwgbikge1xuICByZXR1cm4geCA8PCBuIHwgeCA+Pj4gMzIgLSBuO1xufVxuXG5mdW5jdGlvbiBzaGExKGJ5dGVzKSB7XG4gIGNvbnN0IEsgPSBbMHg1YTgyNzk5OSwgMHg2ZWQ5ZWJhMSwgMHg4ZjFiYmNkYywgMHhjYTYyYzFkNl07XG4gIGNvbnN0IEggPSBbMHg2NzQ1MjMwMSwgMHhlZmNkYWI4OSwgMHg5OGJhZGNmZSwgMHgxMDMyNTQ3NiwgMHhjM2QyZTFmMF07XG5cbiAgaWYgKHR5cGVvZiBieXRlcyA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBtc2cgPSB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoYnl0ZXMpKTsgLy8gVVRGOCBlc2NhcGVcblxuICAgIGJ5dGVzID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1zZy5sZW5ndGg7ICsraSkge1xuICAgICAgYnl0ZXMucHVzaChtc2cuY2hhckNvZGVBdChpKSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KGJ5dGVzKSkge1xuICAgIC8vIENvbnZlcnQgQXJyYXktbGlrZSB0byBBcnJheVxuICAgIGJ5dGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYnl0ZXMpO1xuICB9XG5cbiAgYnl0ZXMucHVzaCgweDgwKTtcbiAgY29uc3QgbCA9IGJ5dGVzLmxlbmd0aCAvIDQgKyAyO1xuICBjb25zdCBOID0gTWF0aC5jZWlsKGwgLyAxNik7XG4gIGNvbnN0IE0gPSBuZXcgQXJyYXkoTik7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBOOyArK2kpIHtcbiAgICBjb25zdCBhcnIgPSBuZXcgVWludDMyQXJyYXkoMTYpO1xuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCAxNjsgKytqKSB7XG4gICAgICBhcnJbal0gPSBieXRlc1tpICogNjQgKyBqICogNF0gPDwgMjQgfCBieXRlc1tpICogNjQgKyBqICogNCArIDFdIDw8IDE2IHwgYnl0ZXNbaSAqIDY0ICsgaiAqIDQgKyAyXSA8PCA4IHwgYnl0ZXNbaSAqIDY0ICsgaiAqIDQgKyAzXTtcbiAgICB9XG5cbiAgICBNW2ldID0gYXJyO1xuICB9XG5cbiAgTVtOIC0gMV1bMTRdID0gKGJ5dGVzLmxlbmd0aCAtIDEpICogOCAvIE1hdGgucG93KDIsIDMyKTtcbiAgTVtOIC0gMV1bMTRdID0gTWF0aC5mbG9vcihNW04gLSAxXVsxNF0pO1xuICBNW04gLSAxXVsxNV0gPSAoYnl0ZXMubGVuZ3RoIC0gMSkgKiA4ICYgMHhmZmZmZmZmZjtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IE47ICsraSkge1xuICAgIGNvbnN0IFcgPSBuZXcgVWludDMyQXJyYXkoODApO1xuXG4gICAgZm9yIChsZXQgdCA9IDA7IHQgPCAxNjsgKyt0KSB7XG4gICAgICBXW3RdID0gTVtpXVt0XTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCB0ID0gMTY7IHQgPCA4MDsgKyt0KSB7XG4gICAgICBXW3RdID0gUk9UTChXW3QgLSAzXSBeIFdbdCAtIDhdIF4gV1t0IC0gMTRdIF4gV1t0IC0gMTZdLCAxKTtcbiAgICB9XG5cbiAgICBsZXQgYSA9IEhbMF07XG4gICAgbGV0IGIgPSBIWzFdO1xuICAgIGxldCBjID0gSFsyXTtcbiAgICBsZXQgZCA9IEhbM107XG4gICAgbGV0IGUgPSBIWzRdO1xuXG4gICAgZm9yIChsZXQgdCA9IDA7IHQgPCA4MDsgKyt0KSB7XG4gICAgICBjb25zdCBzID0gTWF0aC5mbG9vcih0IC8gMjApO1xuICAgICAgY29uc3QgVCA9IFJPVEwoYSwgNSkgKyBmKHMsIGIsIGMsIGQpICsgZSArIEtbc10gKyBXW3RdID4+PiAwO1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSBST1RMKGIsIDMwKSA+Pj4gMDtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IFQ7XG4gICAgfVxuXG4gICAgSFswXSA9IEhbMF0gKyBhID4+PiAwO1xuICAgIEhbMV0gPSBIWzFdICsgYiA+Pj4gMDtcbiAgICBIWzJdID0gSFsyXSArIGMgPj4+IDA7XG4gICAgSFszXSA9IEhbM10gKyBkID4+PiAwO1xuICAgIEhbNF0gPSBIWzRdICsgZSA+Pj4gMDtcbiAgfVxuXG4gIHJldHVybiBbSFswXSA+PiAyNCAmIDB4ZmYsIEhbMF0gPj4gMTYgJiAweGZmLCBIWzBdID4+IDggJiAweGZmLCBIWzBdICYgMHhmZiwgSFsxXSA+PiAyNCAmIDB4ZmYsIEhbMV0gPj4gMTYgJiAweGZmLCBIWzFdID4+IDggJiAweGZmLCBIWzFdICYgMHhmZiwgSFsyXSA+PiAyNCAmIDB4ZmYsIEhbMl0gPj4gMTYgJiAweGZmLCBIWzJdID4+IDggJiAweGZmLCBIWzJdICYgMHhmZiwgSFszXSA+PiAyNCAmIDB4ZmYsIEhbM10gPj4gMTYgJiAweGZmLCBIWzNdID4+IDggJiAweGZmLCBIWzNdICYgMHhmZiwgSFs0XSA+PiAyNCAmIDB4ZmYsIEhbNF0gPj4gMTYgJiAweGZmLCBIWzRdID4+IDggJiAweGZmLCBIWzRdICYgMHhmZl07XG59XG5cbmV4cG9ydCBkZWZhdWx0IHNoYTE7IiwiaW1wb3J0IHYzNSBmcm9tICcuL3YzNS5qcyc7XG5pbXBvcnQgc2hhMSBmcm9tICcuL3NoYTEuanMnO1xuY29uc3QgdjUgPSB2MzUoJ3Y1JywgMHg1MCwgc2hhMSk7XG5leHBvcnQgZGVmYXVsdCB2NTsiLCJpbXBvcnQgdmFsaWRhdGUgZnJvbSAnLi92YWxpZGF0ZS5qcyc7XG5cbmZ1bmN0aW9uIHZlcnNpb24odXVpZCkge1xuICBpZiAoIXZhbGlkYXRlKHV1aWQpKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKCdJbnZhbGlkIFVVSUQnKTtcbiAgfVxuXG4gIHJldHVybiBwYXJzZUludCh1dWlkLnNsaWNlKDE0LCAxNSksIDE2KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgdmVyc2lvbjsiLG51bGxdLCJuYW1lcyI6WyJtZW1vaXplIiwiZnVuYyIsImNhY2hlIiwiTWFwIiwiYXJncyIsImtleSIsImpvaW4iLCJoYXMiLCJzZXQiLCJnZXQiLCJfbG9jYXRpb25zRm9yQmFuZCIsInNpemUiLCJiYW5kX2luZGV4IiwibG9jYXRpb25zIiwiY29sIiwicHVzaCIsInJvdyIsIm1lbW9pemVkTG9jYXRpb25zRm9yQmFuZCIsIl9sb2NhdGlvbnNGb3JSb3ciLCJyb3dfaW5kZXgiLCJjZW50ZXIiLCJNYXRoIiwiZmxvb3IiLCJBcnJheSIsImZyb20iLCJsZW5ndGgiLCJfIiwibWVtb2l6ZWRMb2NhdGlvbnNGb3JSb3ciLCJfZ2V0QmFuZE51bWJlckZyb21Db29yZHMiLCJpIiwiaiIsInJvd09mZnNldCIsIm1pbiIsImNvbE9mZnNldCIsImJhbmQiLCJtZW1vaXplZEdldEJhbmROdW1iZXJGcm9tQ29vcmRzIiwiX2NsYW1wIiwidmFsIiwibWF4IiwiX2NsYW1wTGlzdEluZGV4IiwibGlzdCIsImlkeCIsIm5leHRJbmRleFdpdGhvdXRXcmFwIiwicHJldkluZGV4V2l0aG91dFdyYXAiLCJuZXh0SW5kZXhXaXRoV3JhcCIsInByZXZJbmRleFdpdGhXcmFwIiwiX2dldEJhbmRTaWRlIiwiYmFja1NpZGUiLCJfZ2VuZXJhdGVHcmlkQXR0cmlidXRlcyIsImNlbGxzIiwibnVtX2JhbmRzIiwibG9jYXRpb25zX2Zvcl9iYW5kIiwibG9jYXRpb25zX2Zvcl9yb3ciLCJiYW5kX251bWJlciIsImJhbmRfbG9jYXRpb25zIiwiYmFuZF9vZmZzZXQiLCJmaW5kSW5kZXgiLCJ4IiwieSIsIkVycm9yIiwiYmFuZF9zaWRlIiwiaXNfY29ybmVyIiwiYmFuZF9ncm91cCIsImtpbmQiLCJpbmRleCIsIm9mZnNldCIsInByZXYiLCJuZXh0Iiwic2lkZSIsInJvd19sb2NhdGlvbnMiLCJyb3dfb2Zmc2V0Iiwicm93X2dyb3VwIiwiaXNfY2VudGVyIiwibWVtb2l6ZWRHZW5lcmF0ZUdyaWRBdHRyaWJ1dGVzIiwidmFsaWRhdGVQcm9wZXJ0aWVzIiwib2JqIiwibnVtUHJvcGVydGllcyIsInN0clByb3BlcnRpZXMiLCJ2YWx1ZSIsIk9iamVjdCIsImVudHJpZXMiLCJpbmNsdWRlcyIsIkdBTUVfQUNUSU9OUyIsImF0IiwidGV4dCIsImFjdGlvbiIsInVzZXJfaWQiLCJjaGFuZ2VfY291bnQiLCJjbGVhciIsIm1hcmtTZWdtZW50IiwiY2x1ZV9saXN0IiwiaWR4X2NlbGxfc3RhcnQiLCJpZHhfY2VsbF9lbmQiLCJjbGVhclNlZ21lbnQiLCJpZHhfY2VsbCIsImpvaW5QdXp6bGUiLCJzb2x2ZV9pZCIsImxlYXZlUHV6emxlIiwic3RyaW5nVG9BY3Rpb24iLCJzdHIiLCJKU09OIiwicGFyc2UiLCJhY3Rpb25Ub1N0cmluZyIsInN0cmluZ2lmeSIsImFyZUFjdGlvbnNFcXVhbCIsImEiLCJiIiwic2V0X2EiLCJzZXRfYiIsImdyaWRfYSIsImdyaWRfYiIsIm1hcmtfYSIsIm1hcmtfYiIsImNsdWVfYSIsImNsdWVfYiIsImNsZWFyX2EiLCJjbGVhcl9iIiwic29sdmVfaWRfYSIsInNvbHZlX2lkX2IiLCJFTVBUWV9DRUxMX1RFWFQiLCJDZWxsIiwiY29uc3RydWN0b3IiLCJ0aGlzIiwiaXNfZmlsbGVkIiwiQW5zd2VyU2VnbWVudHMiLCJyZW1vdmVPdmVybGFwcGluZ1NlZ21lbnRzIiwicmVtb3ZlIiwic2VnbWVudHMiLCJmaWx0ZXIiLCJzZWdtZW50IiwiaWR4X3N0YXJ0IiwiaWR4X2VuZCIsInNvcnQiLCJudW1BbnN3ZXJlZENlbGxzIiwicmVkdWNlIiwiYWNjIiwiaW5fYW5zd2VyX2F0X29mZnNldCIsIkdhbWVTdGF0ZSIsImFwcGx5IiwiY2x1ZV9saXN0X2FjdGlvbiIsImFwcGx5Q2x1ZUxpc3RBY3Rpb24iLCJncmlkX2FjdGlvbiIsImFwcGx5R3JpZEFjdGlvbiIsImFuc3dlcl9zZWdtZW50cyIsImdldEFuc3dlclNlZ21lbnRzIiwibWFya19zZWdtZW50X2FjdGlvbiIsImNsZWFyX3NlZ21lbnRfYWN0aW9uIiwiY2VsbCIsImdyaWQiLCJzZXRfYWN0aW9uIiwidXBkYXRlSXNTb2x2ZWQiLCJpc19zb2x2ZWQiLCJpc19yb3ciLCJhbnN3ZXJfc2VnbWVudHNfbGlzdCIsInJvd19hbnN3ZXJfc2VnbWVudHMiLCJiYW5kX2Fuc3dlcl9zZWdtZW50cyIsIm51bV9maWxsZWQiLCJsb2NhdGlvbiIsInRvX2pzb24iLCJnYW1lU3RhdGUiLCJtYXAiLCJmbl9zZWdtZW50c19vbmx5Iiwicm93X3NlZ21lbnRzIiwiYmFuZF9zZWdtZW50cyIsInJlc3VsdCIsInNldF9jbHVlX2xpc3RzIiwic2VnbWVudF92YWx1ZXNfbGlzdCIsInNlZ21lbnRfdmFsdWVzIiwiZ2FtZXN0YXRlX3NlZ21lbnRzIiwic2V0X2Zyb21fanNvbiIsImpzb24iLCJzaW1wbGVfanNvbiIsImpzb25fZ3JpZCIsIk1BWF9MRU5HVEgiLCJST1dfSURFTlRJRklFUlMiLCJ0b1N0cmluZyIsIkJBTkRfSURFTlRJRklFUlMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJDTFVFX0lERU5USUZJRVJTIiwibGV0dGVyIiwidG9Mb3dlckNhc2UiLCJST1dTX0hFQURFUiIsIkJBTkRTX0hFQURFUiIsInNhbmVfc3BsaXQiLCJpbnB1dCIsInNlcGFyYXRvciIsImZpcnN0Iiwic3BsaXQiLCJyZXN0Iiwic2xpY2UiLCJyZWFkX25lc3RlZF9jbHVlcyIsInJhd19saW5lcyIsImdyb3VwX2lkZW50aWZpZXJzX29yaWciLCJncm91cHMiLCJncm91cF9pZGVudGlmaWVycyIsIm5leHRfZ3JvdXBfaWRlbnRpZmllciIsInNoaWZ0IiwibGluZSIsImN1cnJlbnRfZ3JvdXAiLCJjbHVlX2luZGV4IiwibGFiZWwiLCJyZWFkX2ludG9fcm93Q2x1ZXNfYW5kX2JhbmRDbHVlcyIsImxpbmVzIiwicm93X2NsdWVfbGluZXMiLCJiYW5kX2NsdWVfbGluZXMiLCJmb3VuZF9yb3dDbHVlcyIsImZvdW5kX2JhbmRDbHVlcyIsInJhd19saW5lIiwidHJpbSIsInJvd19jbHVlcyIsImJhbmRfY2x1ZXMiLCJwYXJzZV9jbHVlcyIsImlucHV0X3RleHQiLCJyb3dDbHVlcyIsImJhbmRDbHVlcyIsImV4cGVjdGVkX3Jvd19jb3VudCIsIlB1enpsZSIsIm9yaWdpbmFsX3RleHQiLCJjbHVlcyIsImxvYWRQdXp6bGVGcm9tSnNvbiIsInN0b3JlZFN0cmluZyIsImUiLCJjb25zb2xlIiwiZXJyb3IiLCJzYXZlUHV6emxlVG9Kc29uIiwicHV6emxlIiwiREVGQVVMVF9DVVJTT1IiLCJ1c2VfYmFuZCIsIlNvbHZlciIsIm5hbWUiLCJjdXJzb3IiLCJhc3NpZ24iLCJnZXRSYW5kb21WYWx1ZXMiLCJybmRzOCIsIlVpbnQ4QXJyYXkiLCJybmciLCJjcnlwdG8iLCJiaW5kIiwiUkVHRVgiLCJ2YWxpZGF0ZSIsInV1aWQiLCJ0ZXN0IiwiYnl0ZVRvSGV4IiwidW5zYWZlU3RyaW5naWZ5IiwiYXJyIiwiVHlwZUVycm9yIiwidiIsInBhcnNlSW50Iiwic3RyaW5nVG9CeXRlcyIsInVuZXNjYXBlIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiYnl0ZXMiLCJjaGFyQ29kZUF0IiwiRE5TIiwiVVJMIiwidjM1IiwidmVyc2lvbiIsImhhc2hmdW5jIiwiZ2VuZXJhdGVVVUlEIiwibmFtZXNwYWNlIiwiYnVmIiwiX25hbWVzcGFjZSIsImVyciIsInJhbmRvbVVVSUQiLCJuYXRpdmUiLCJ2NCIsIm9wdGlvbnMiLCJybmRzIiwicmFuZG9tIiwiZiIsInMiLCJ6IiwiUk9UTCIsIm4iLCJzaGExIiwiSyIsIkgiLCJtc2ciLCJpc0FycmF5IiwicHJvdG90eXBlIiwiY2FsbCIsImwiLCJOIiwiY2VpbCIsIk0iLCJVaW50MzJBcnJheSIsInBvdyIsIlciLCJ0IiwiYyIsImQiLCJUIiwidjUiLCJ1dWlkdjUiLCJVVUlEX05BTUVTUEFDRSIsIlVzZXJJZCIsInByaXZhdGVfdXVpZCIsInV1aWRWYWxpZGF0ZSIsInV1aWRWZXJzaW9uIiwidXVpZHY0IiwicHVibGljX3V1aWQiXSwibWFwcGluZ3MiOiJBQW1EQSxTQUFTQSxRQUFnQ0M7SUFDckMsTUFBTUMsUUFBd0IsSUFBSUM7SUFDbEMsT0FBTyxJQUFJQztRQUNQLE1BQU1DLE1BQU1ELEtBQUtFLEtBQUs7UUFDdEIsS0FBS0osTUFBTUssSUFBSUYsTUFBTTtZQUNqQkgsTUFBTU0sSUFBSUgsS0FBS0osUUFBUUc7QUFDMUI7UUFDRCxPQUFPRixNQUFNTyxJQUFJSjtBQUFLO0FBRTlCOztBQUVBLE1BQU1LLG9CQUFvQixDQUFDQyxNQUFjQztJQUlyQyxNQUFNQyxZQUFnQztJQUN0QyxLQUFLLElBQUlDLE1BQU1GLFlBQVlFLE1BQU1ILE9BQU9DLFlBQVlFLE9BQU87UUFDdkRELFVBQVVFLEtBQUssRUFBQ0gsWUFBWUU7QUFDL0I7SUFDRCxLQUFLLElBQUlFLE1BQU1KLGFBQWEsR0FBR0ksTUFBTUwsT0FBT0MsYUFBYSxHQUFHSSxPQUFPO1FBQy9ESCxVQUFVRSxLQUFLLEVBQUNDLEtBQUtMLE9BQU9DLGFBQWE7QUFDNUM7SUFDRCxLQUFLLElBQUlFLE1BQU1ILE9BQU9DLGFBQWEsR0FBR0UsT0FBT0YsYUFBYSxHQUFHRSxPQUFPO1FBQ2hFRCxVQUFVRSxLQUFLLEVBQUNKLE9BQU9DLGFBQWEsR0FBR0U7QUFDMUM7SUFDRCxLQUFLLElBQUlFLE1BQU1MLE9BQU9DLGFBQWEsR0FBR0ksT0FBT0osYUFBYSxHQUFHSSxPQUFPO1FBQ2hFSCxVQUFVRSxLQUFLLEVBQUNDLEtBQUtKO0FBQ3hCO0lBQ0QsT0FBT0M7QUFBUzs7QUFFcEIsTUFBTUksMkJBQTJCakIsUUFBUVU7O0FBRXpDLE1BQU1RLG1CQUFtQixDQUFDUCxNQUFjUTtJQUNwQyxNQUFNQyxTQUFTQyxL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SUFBSSxNQUFNQSxHQUFHO1lBQzNCLE1BQU1sQixJQUFJMVAsS0FBS0MsTUFBTTJRLElBQUk7WUFDekIsTUFBTUcsSUFBSW5CLEtBQUt4SyxHQUFHLEtBQUtxSyxFQUFFQyxHQUFHckssR0FBR3dMLEdBQUdDLEtBQUtyRSxJQUFJc0QsRUFBRUwsS0FBS2lCLEVBQUVDLE9BQU87WUFDM0RuRSxJQUFJcUU7WUFDSkEsSUFBSUQ7WUFDSkEsSUFBSWpCLEtBQUt2SyxHQUFHLFFBQVE7WUFDcEJBLElBQUlEO1lBQ0pBLElBQUkyTDtBQUNMO1FBRURmLEVBQUUsS0FBS0EsRUFBRSxLQUFLNUssTUFBTTtRQUNwQjRLLEVBQUUsS0FBS0EsRUFBRSxLQUFLM0ssTUFBTTtRQUNwQjJLLEVBQUUsS0FBS0EsRUFBRSxLQUFLYSxNQUFNO1FBQ3BCYixFQUFFLEtBQUtBLEVBQUUsS0FBS2MsTUFBTTtRQUNwQmQsRUFBRSxLQUFLQSxFQUFFLEtBQUt2RCxNQUFNO0FBQ3JCO0lBRUQsT0FBTyxFQUFDdUQsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLElBQUksS0FBTUEsRUFBRSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxJQUFJLEtBQU1BLEVBQUUsS0FBSyxLQUFNQSxFQUFFLE1BQU0sS0FBSyxLQUFNQSxFQUFFLE1BQU0sS0FBSyxLQUFNQSxFQUFFLE1BQU0sSUFBSSxLQUFNQSxFQUFFLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLElBQUksS0FBTUEsRUFBRSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxJQUFJLEtBQU1BLEVBQUUsS0FBSztBQUM3Vjs7QUMzRkEsTUFBTWdCLEtBQUtyQyxJQUFJLE1BQU0sSUFBTW1COztBQUMzQixJQUFBbUIsU0FBZUQ7O0FDRGYsU0FBU3BDLFFBQVFoQjtJQUNmLEtBQUtELFNBQVNDLE9BQU87UUFDbkIsTUFBTUssVUFBVTtBQUNqQjtJQUVELE9BQU9FLFNBQVNQLEtBQUtuRCxNQUFNLElBQUksS0FBSztBQUN0Qzs7QUNKQSxNQUFNeUcsaUJBQWlCOztBQUV2QixNQUFNQztJQUlGLFdBQUEvSyxDQUFZZ0w7UUFDUixJQUNJQSxnQkFDQUEsYUFBYWhSLFNBQVMsS0FDdEJpUixTQUFhRCxpQkFDYkUsUUFBWUYsa0JBQWtCLEdBQ2hDO1lBQ0UvSyxLQUFLK0ssZUFBZUE7QUFDdkIsZUFBTTtZQUVIL0ssS0FBSytLLGVBQWVHO0FBQ3ZCO1FBR0RsTCxLQUFLbUwsY0FBY1AsT0FBT0EsT0FBT3ZDLE1BQU13QyxnQkFBZ0I3SyxLQUFLK0s7QUFDL0Q7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOV19
