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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL2NlbGxfYXR0cmlidXRlcy50cyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9saWIvdmFsaWRhdGlvbi50cyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9saWIvZ2FtZV9hY3Rpb25zLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9nYW1lX3N0YXRlLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9nYW1lX3N0YXRlX2pzb24udHMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL2NsdWVfcGFyc2VyLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9wdXp6bGUudHMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL3B1enpsZV9qc29uLnRzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL2xpYi9zb2x2ZXIudHMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci9ybmcuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci9yZWdleC5qcyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3ZhbGlkYXRlLmpzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvc3RyaW5naWZ5LmpzIiwiL1VzZXJzL3J1ZGUvZHJ1bWxpbmUvZHJ1bWxpbmUtbGliL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLWJyb3dzZXIvcGFyc2UuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci92MzUuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci9uYXRpdmUuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci92NC5qcyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3NoYTEuanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tYnJvd3Nlci92NS5qcyIsIi9Vc2Vycy9ydWRlL2RydW1saW5lL2RydW1saW5lLWxpYi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1icm93c2VyL3ZlcnNpb24uanMiLCIvVXNlcnMvcnVkZS9kcnVtbGluZS9kcnVtbGluZS1saWIvbGliL3VzZXJfaWQudHMiXSwic291cmNlc0NvbnRlbnQiOltudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCwiLy8gVW5pcXVlIElEIGNyZWF0aW9uIHJlcXVpcmVzIGEgaGlnaCBxdWFsaXR5IHJhbmRvbSAjIGdlbmVyYXRvci4gSW4gdGhlIGJyb3dzZXIgd2UgdGhlcmVmb3JlXG4vLyByZXF1aXJlIHRoZSBjcnlwdG8gQVBJIGFuZCBkbyBub3Qgc3VwcG9ydCBidWlsdC1pbiBmYWxsYmFjayB0byBsb3dlciBxdWFsaXR5IHJhbmRvbSBudW1iZXJcbi8vIGdlbmVyYXRvcnMgKGxpa2UgTWF0aC5yYW5kb20oKSkuXG5sZXQgZ2V0UmFuZG9tVmFsdWVzO1xuY29uc3Qgcm5kczggPSBuZXcgVWludDhBcnJheSgxNik7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBybmcoKSB7XG4gIC8vIGxhenkgbG9hZCBzbyB0aGF0IGVudmlyb25tZW50cyB0aGF0IG5lZWQgdG8gcG9seWZpbGwgaGF2ZSBhIGNoYW5jZSB0byBkbyBzb1xuICBpZiAoIWdldFJhbmRvbVZhbHVlcykge1xuICAgIC8vIGdldFJhbmRvbVZhbHVlcyBuZWVkcyB0byBiZSBpbnZva2VkIGluIGEgY29udGV4dCB3aGVyZSBcInRoaXNcIiBpcyBhIENyeXB0byBpbXBsZW1lbnRhdGlvbi5cbiAgICBnZXRSYW5kb21WYWx1ZXMgPSB0eXBlb2YgY3J5cHRvICE9PSAndW5kZWZpbmVkJyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pO1xuXG4gICAgaWYgKCFnZXRSYW5kb21WYWx1ZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignY3J5cHRvLmdldFJhbmRvbVZhbHVlcygpIG5vdCBzdXBwb3J0ZWQuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdXVpZGpzL3V1aWQjZ2V0cmFuZG9tdmFsdWVzLW5vdC1zdXBwb3J0ZWQnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbn0iLCJleHBvcnQgZGVmYXVsdCAvXig/OlswLTlhLWZdezh9LVswLTlhLWZdezR9LVsxLTVdWzAtOWEtZl17M30tWzg5YWJdWzAtOWEtZl17M30tWzAtOWEtZl17MTJ9fDAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCkkL2k7IiwiaW1wb3J0IFJFR0VYIGZyb20gJy4vcmVnZXguanMnO1xuXG5mdW5jdGlvbiB2YWxpZGF0ZSh1dWlkKSB7XG4gIHJldHVybiB0eXBlb2YgdXVpZCA9PT0gJ3N0cmluZycgJiYgUkVHRVgudGVzdCh1dWlkKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgdmFsaWRhdGU7IiwiaW1wb3J0IHZhbGlkYXRlIGZyb20gJy4vdmFsaWRhdGUuanMnO1xuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG5cbmNvbnN0IGJ5dGVUb0hleCA9IFtdO1xuXG5mb3IgKGxldCBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleC5wdXNoKChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zbGljZSgxKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1bnNhZmVTdHJpbmdpZnkoYXJyLCBvZmZzZXQgPSAwKSB7XG4gIC8vIE5vdGU6IEJlIGNhcmVmdWwgZWRpdGluZyB0aGlzIGNvZGUhICBJdCdzIGJlZW4gdHVuZWQgZm9yIHBlcmZvcm1hbmNlXG4gIC8vIGFuZCB3b3JrcyBpbiB3YXlzIHlvdSBtYXkgbm90IGV4cGVjdC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS91dWlkanMvdXVpZC9wdWxsLzQzNFxuICByZXR1cm4gKGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMF1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDJdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgM11dICsgJy0nICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA0XV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDVdXSArICctJyArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgNl1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA3XV0gKyAnLScgKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDhdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgOV1dICsgJy0nICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxMF1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxMV1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxMl1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxM11dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxNF1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAxNV1dKS50b0xvd2VyQ2FzZSgpO1xufVxuXG5mdW5jdGlvbiBzdHJpbmdpZnkoYXJyLCBvZmZzZXQgPSAwKSB7XG4gIGNvbnN0IHV1aWQgPSB1bnNhZmVTdHJpbmdpZnkoYXJyLCBvZmZzZXQpOyAvLyBDb25zaXN0ZW5jeSBjaGVjayBmb3IgdmFsaWQgVVVJRC4gIElmIHRoaXMgdGhyb3dzLCBpdCdzIGxpa2VseSBkdWUgdG8gb25lXG4gIC8vIG9mIHRoZSBmb2xsb3dpbmc6XG4gIC8vIC0gT25lIG9yIG1vcmUgaW5wdXQgYXJyYXkgdmFsdWVzIGRvbid0IG1hcCB0byBhIGhleCBvY3RldCAobGVhZGluZyB0b1xuICAvLyBcInVuZGVmaW5lZFwiIGluIHRoZSB1dWlkKVxuICAvLyAtIEludmFsaWQgaW5wdXQgdmFsdWVzIGZvciB0aGUgUkZDIGB2ZXJzaW9uYCBvciBgdmFyaWFudGAgZmllbGRzXG5cbiAgaWYgKCF2YWxpZGF0ZSh1dWlkKSkge1xuICAgIHRocm93IFR5cGVFcnJvcignU3RyaW5naWZpZWQgVVVJRCBpcyBpbnZhbGlkJyk7XG4gIH1cblxuICByZXR1cm4gdXVpZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgc3RyaW5naWZ5OyIsImltcG9ydCB2YWxpZGF0ZSBmcm9tICcuL3ZhbGlkYXRlLmpzJztcblxuZnVuY3Rpb24gcGFyc2UodXVpZCkge1xuICBpZiAoIXZhbGlkYXRlKHV1aWQpKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKCdJbnZhbGlkIFVVSUQnKTtcbiAgfVxuXG4gIGxldCB2O1xuICBjb25zdCBhcnIgPSBuZXcgVWludDhBcnJheSgxNik7IC8vIFBhcnNlICMjIyMjIyMjLS4uLi4tLi4uLi0uLi4uLS4uLi4uLi4uLi4uLlxuXG4gIGFyclswXSA9ICh2ID0gcGFyc2VJbnQodXVpZC5zbGljZSgwLCA4KSwgMTYpKSA+Pj4gMjQ7XG4gIGFyclsxXSA9IHYgPj4+IDE2ICYgMHhmZjtcbiAgYXJyWzJdID0gdiA+Pj4gOCAmIDB4ZmY7XG4gIGFyclszXSA9IHYgJiAweGZmOyAvLyBQYXJzZSAuLi4uLi4uLi0jIyMjLS4uLi4tLi4uLi0uLi4uLi4uLi4uLi5cblxuICBhcnJbNF0gPSAodiA9IHBhcnNlSW50KHV1aWQuc2xpY2UoOSwgMTMpLCAxNikpID4+PiA4O1xuICBhcnJbNV0gPSB2ICYgMHhmZjsgLy8gUGFyc2UgLi4uLi4uLi4tLi4uLi0jIyMjLS4uLi4tLi4uLi4uLi4uLi4uXG5cbiAgYXJyWzZdID0gKHYgPSBwYXJzZUludCh1dWlkLnNsaWNlKDE0LCAxOCksIDE2KSkgPj4+IDg7XG4gIGFycls3XSA9IHYgJiAweGZmOyAvLyBQYXJzZSAuLi4uLi4uLi0uLi4uLS4uLi4tIyMjIy0uLi4uLi4uLi4uLi5cblxuICBhcnJbOF0gPSAodiA9IHBhcnNlSW50KHV1aWQuc2xpY2UoMTksIDIzKSwgMTYpKSA+Pj4gODtcbiAgYXJyWzldID0gdiAmIDB4ZmY7IC8vIFBhcnNlIC4uLi4uLi4uLS4uLi4tLi4uLi0uLi4uLSMjIyMjIyMjIyMjI1xuICAvLyAoVXNlIFwiL1wiIHRvIGF2b2lkIDMyLWJpdCB0cnVuY2F0aW9uIHdoZW4gYml0LXNoaWZ0aW5nIGhpZ2gtb3JkZXIgYnl0ZXMpXG5cbiAgYXJyWzEwXSA9ICh2ID0gcGFyc2VJbnQodXVpZC5zbGljZSgyNCwgMzYpLCAxNikpIC8gMHgxMDAwMDAwMDAwMCAmIDB4ZmY7XG4gIGFyclsxMV0gPSB2IC8gMHgxMDAwMDAwMDAgJiAweGZmO1xuICBhcnJbMTJdID0gdiA+Pj4gMjQgJiAweGZmO1xuICBhcnJbMTNdID0gdiA+Pj4gMTYgJiAweGZmO1xuICBhcnJbMTRdID0gdiA+Pj4gOCAmIDB4ZmY7XG4gIGFyclsxNV0gPSB2ICYgMHhmZjtcbiAgcmV0dXJuIGFycjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcGFyc2U7IiwiaW1wb3J0IHsgdW5zYWZlU3RyaW5naWZ5IH0gZnJvbSAnLi9zdHJpbmdpZnkuanMnO1xuaW1wb3J0IHBhcnNlIGZyb20gJy4vcGFyc2UuanMnO1xuXG5mdW5jdGlvbiBzdHJpbmdUb0J5dGVzKHN0cikge1xuICBzdHIgPSB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3RyKSk7IC8vIFVURjggZXNjYXBlXG5cbiAgY29uc3QgYnl0ZXMgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGJ5dGVzLnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xuICB9XG5cbiAgcmV0dXJuIGJ5dGVzO1xufVxuXG5leHBvcnQgY29uc3QgRE5TID0gJzZiYTdiODEwLTlkYWQtMTFkMS04MGI0LTAwYzA0ZmQ0MzBjOCc7XG5leHBvcnQgY29uc3QgVVJMID0gJzZiYTdiODExLTlkYWQtMTFkMS04MGI0LTAwYzA0ZmQ0MzBjOCc7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB2MzUobmFtZSwgdmVyc2lvbiwgaGFzaGZ1bmMpIHtcbiAgZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKHZhbHVlLCBuYW1lc3BhY2UsIGJ1Ziwgb2Zmc2V0KSB7XG4gICAgdmFyIF9uYW1lc3BhY2U7XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBzdHJpbmdUb0J5dGVzKHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG5hbWVzcGFjZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWVzcGFjZSA9IHBhcnNlKG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKCgoX25hbWVzcGFjZSA9IG5hbWVzcGFjZSkgPT09IG51bGwgfHwgX25hbWVzcGFjZSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX25hbWVzcGFjZS5sZW5ndGgpICE9PSAxNikge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCdOYW1lc3BhY2UgbXVzdCBiZSBhcnJheS1saWtlICgxNiBpdGVyYWJsZSBpbnRlZ2VyIHZhbHVlcywgMC0yNTUpJyk7XG4gICAgfSAvLyBDb21wdXRlIGhhc2ggb2YgbmFtZXNwYWNlIGFuZCB2YWx1ZSwgUGVyIDQuM1xuICAgIC8vIEZ1dHVyZTogVXNlIHNwcmVhZCBzeW50YXggd2hlbiBzdXBwb3J0ZWQgb24gYWxsIHBsYXRmb3JtcywgZS5nLiBgYnl0ZXMgPVxuICAgIC8vIGhhc2hmdW5jKFsuLi5uYW1lc3BhY2UsIC4uLiB2YWx1ZV0pYFxuXG5cbiAgICBsZXQgYnl0ZXMgPSBuZXcgVWludDhBcnJheSgxNiArIHZhbHVlLmxlbmd0aCk7XG4gICAgYnl0ZXMuc2V0KG5hbWVzcGFjZSk7XG4gICAgYnl0ZXMuc2V0KHZhbHVlLCBuYW1lc3BhY2UubGVuZ3RoKTtcbiAgICBieXRlcyA9IGhhc2hmdW5jKGJ5dGVzKTtcbiAgICBieXRlc1s2XSA9IGJ5dGVzWzZdICYgMHgwZiB8IHZlcnNpb247XG4gICAgYnl0ZXNbOF0gPSBieXRlc1s4XSAmIDB4M2YgfCAweDgwO1xuXG4gICAgaWYgKGJ1Zikge1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7ICsraSkge1xuICAgICAgICBidWZbb2Zmc2V0ICsgaV0gPSBieXRlc1tpXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1ZjtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5zYWZlU3RyaW5naWZ5KGJ5dGVzKTtcbiAgfSAvLyBGdW5jdGlvbiNuYW1lIGlzIG5vdCBzZXR0YWJsZSBvbiBzb21lIHBsYXRmb3JtcyAoIzI3MClcblxuXG4gIHRyeSB7XG4gICAgZ2VuZXJhdGVVVUlELm5hbWUgPSBuYW1lOyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZW1wdHlcbiAgfSBjYXRjaCAoZXJyKSB7fSAvLyBGb3IgQ29tbW9uSlMgZGVmYXVsdCBleHBvcnQgc3VwcG9ydFxuXG5cbiAgZ2VuZXJhdGVVVUlELkROUyA9IEROUztcbiAgZ2VuZXJhdGVVVUlELlVSTCA9IFVSTDtcbiAgcmV0dXJuIGdlbmVyYXRlVVVJRDtcbn0iLCJjb25zdCByYW5kb21VVUlEID0gdHlwZW9mIGNyeXB0byAhPT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLnJhbmRvbVVVSUQgJiYgY3J5cHRvLnJhbmRvbVVVSUQuYmluZChjcnlwdG8pO1xuZXhwb3J0IGRlZmF1bHQge1xuICByYW5kb21VVUlEXG59OyIsImltcG9ydCBuYXRpdmUgZnJvbSAnLi9uYXRpdmUuanMnO1xuaW1wb3J0IHJuZyBmcm9tICcuL3JuZy5qcyc7XG5pbXBvcnQgeyB1bnNhZmVTdHJpbmdpZnkgfSBmcm9tICcuL3N0cmluZ2lmeS5qcyc7XG5cbmZ1bmN0aW9uIHY0KG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIGlmIChuYXRpdmUucmFuZG9tVVVJRCAmJiAhYnVmICYmICFvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5hdGl2ZS5yYW5kb21VVUlEKCk7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgY29uc3Qgcm5kcyA9IG9wdGlvbnMucmFuZG9tIHx8IChvcHRpb25zLnJuZyB8fCBybmcpKCk7IC8vIFBlciA0LjQsIHNldCBiaXRzIGZvciB2ZXJzaW9uIGFuZCBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGBcblxuICBybmRzWzZdID0gcm5kc1s2XSAmIDB4MGYgfCAweDQwO1xuICBybmRzWzhdID0gcm5kc1s4XSAmIDB4M2YgfCAweDgwOyAvLyBDb3B5IGJ5dGVzIHRvIGJ1ZmZlciwgaWYgcHJvdmlkZWRcblxuICBpZiAoYnVmKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDE2OyArK2kpIHtcbiAgICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHJuZHNbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZjtcbiAgfVxuXG4gIHJldHVybiB1bnNhZmVTdHJpbmdpZnkocm5kcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHY0OyIsIi8vIEFkYXB0ZWQgZnJvbSBDaHJpcyBWZW5lc3MnIFNIQTEgY29kZSBhdFxuLy8gaHR0cDovL3d3dy5tb3ZhYmxlLXR5cGUuY28udWsvc2NyaXB0cy9zaGExLmh0bWxcbmZ1bmN0aW9uIGYocywgeCwgeSwgeikge1xuICBzd2l0Y2ggKHMpIHtcbiAgICBjYXNlIDA6XG4gICAgICByZXR1cm4geCAmIHkgXiB+eCAmIHo7XG5cbiAgICBjYXNlIDE6XG4gICAgICByZXR1cm4geCBeIHkgXiB6O1xuXG4gICAgY2FzZSAyOlxuICAgICAgcmV0dXJuIHggJiB5IF4geCAmIHogXiB5ICYgejtcblxuICAgIGNhc2UgMzpcbiAgICAgIHJldHVybiB4IF4geSBeIHo7XG4gIH1cbn1cblxuZnVuY3Rpb24gUk9UTCh4LCBuKSB7XG4gIHJldHVybiB4IDw8IG4gfCB4ID4+PiAzMiAtIG47XG59XG5cbmZ1bmN0aW9uIHNoYTEoYnl0ZXMpIHtcbiAgY29uc3QgSyA9IFsweDVhODI3OTk5LCAweDZlZDllYmExLCAweDhmMWJiY2RjLCAweGNhNjJjMWQ2XTtcbiAgY29uc3QgSCA9IFsweDY3NDUyMzAxLCAweGVmY2RhYjg5LCAweDk4YmFkY2ZlLCAweDEwMzI1NDc2LCAweGMzZDJlMWYwXTtcblxuICBpZiAodHlwZW9mIGJ5dGVzID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IG1zZyA9IHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChieXRlcykpOyAvLyBVVEY4IGVzY2FwZVxuXG4gICAgYnl0ZXMgPSBbXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbXNnLmxlbmd0aDsgKytpKSB7XG4gICAgICBieXRlcy5wdXNoKG1zZy5jaGFyQ29kZUF0KGkpKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoYnl0ZXMpKSB7XG4gICAgLy8gQ29udmVydCBBcnJheS1saWtlIHRvIEFycmF5XG4gICAgYnl0ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChieXRlcyk7XG4gIH1cblxuICBieXRlcy5wdXNoKDB4ODApO1xuICBjb25zdCBsID0gYnl0ZXMubGVuZ3RoIC8gNCArIDI7XG4gIGNvbnN0IE4gPSBNYXRoLmNlaWwobCAvIDE2KTtcbiAgY29uc3QgTSA9IG5ldyBBcnJheShOKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IE47ICsraSkge1xuICAgIGNvbnN0IGFyciA9IG5ldyBVaW50MzJBcnJheSgxNik7XG5cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IDE2OyArK2opIHtcbiAgICAgIGFycltqXSA9IGJ5dGVzW2kgKiA2NCArIGogKiA0XSA8PCAyNCB8IGJ5dGVzW2kgKiA2NCArIGogKiA0ICsgMV0gPDwgMTYgfCBieXRlc1tpICogNjQgKyBqICogNCArIDJdIDw8IDggfCBieXRlc1tpICogNjQgKyBqICogNCArIDNdO1xuICAgIH1cblxuICAgIE1baV0gPSBhcnI7XG4gIH1cblxuICBNW04gLSAxXVsxNF0gPSAoYnl0ZXMubGVuZ3RoIC0gMSkgKiA4IC8gTWF0aC5wb3coMiwgMzIpO1xuICBNW04gLSAxXVsxNF0gPSBNYXRoLmZsb29yKE1bTiAtIDFdWzE0XSk7XG4gIE1bTiAtIDFdWzE1XSA9IChieXRlcy5sZW5ndGggLSAxKSAqIDggJiAweGZmZmZmZmZmO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgTjsgKytpKSB7XG4gICAgY29uc3QgVyA9IG5ldyBVaW50MzJBcnJheSg4MCk7XG5cbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDE2OyArK3QpIHtcbiAgICAgIFdbdF0gPSBNW2ldW3RdO1xuICAgIH1cblxuICAgIGZvciAobGV0IHQgPSAxNjsgdCA8IDgwOyArK3QpIHtcbiAgICAgIFdbdF0gPSBST1RMKFdbdCAtIDNdIF4gV1t0IC0gOF0gXiBXW3QgLSAxNF0gXiBXW3QgLSAxNl0sIDEpO1xuICAgIH1cblxuICAgIGxldCBhID0gSFswXTtcbiAgICBsZXQgYiA9IEhbMV07XG4gICAgbGV0IGMgPSBIWzJdO1xuICAgIGxldCBkID0gSFszXTtcbiAgICBsZXQgZSA9IEhbNF07XG5cbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDgwOyArK3QpIHtcbiAgICAgIGNvbnN0IHMgPSBNYXRoLmZsb29yKHQgLyAyMCk7XG4gICAgICBjb25zdCBUID0gUk9UTChhLCA1KSArIGYocywgYiwgYywgZCkgKyBlICsgS1tzXSArIFdbdF0gPj4+IDA7XG4gICAgICBlID0gZDtcbiAgICAgIGQgPSBjO1xuICAgICAgYyA9IFJPVEwoYiwgMzApID4+PiAwO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gVDtcbiAgICB9XG5cbiAgICBIWzBdID0gSFswXSArIGEgPj4+IDA7XG4gICAgSFsxXSA9IEhbMV0gKyBiID4+PiAwO1xuICAgIEhbMl0gPSBIWzJdICsgYyA+Pj4gMDtcbiAgICBIWzNdID0gSFszXSArIGQgPj4+IDA7XG4gICAgSFs0XSA9IEhbNF0gKyBlID4+PiAwO1xuICB9XG5cbiAgcmV0dXJuIFtIWzBdID4+IDI0ICYgMHhmZiwgSFswXSA+PiAxNiAmIDB4ZmYsIEhbMF0gPj4gOCAmIDB4ZmYsIEhbMF0gJiAweGZmLCBIWzFdID4+IDI0ICYgMHhmZiwgSFsxXSA+PiAxNiAmIDB4ZmYsIEhbMV0gPj4gOCAmIDB4ZmYsIEhbMV0gJiAweGZmLCBIWzJdID4+IDI0ICYgMHhmZiwgSFsyXSA+PiAxNiAmIDB4ZmYsIEhbMl0gPj4gOCAmIDB4ZmYsIEhbMl0gJiAweGZmLCBIWzNdID4+IDI0ICYgMHhmZiwgSFszXSA+PiAxNiAmIDB4ZmYsIEhbM10gPj4gOCAmIDB4ZmYsIEhbM10gJiAweGZmLCBIWzRdID4+IDI0ICYgMHhmZiwgSFs0XSA+PiAxNiAmIDB4ZmYsIEhbNF0gPj4gOCAmIDB4ZmYsIEhbNF0gJiAweGZmXTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgc2hhMTsiLCJpbXBvcnQgdjM1IGZyb20gJy4vdjM1LmpzJztcbmltcG9ydCBzaGExIGZyb20gJy4vc2hhMS5qcyc7XG5jb25zdCB2NSA9IHYzNSgndjUnLCAweDUwLCBzaGExKTtcbmV4cG9ydCBkZWZhdWx0IHY1OyIsImltcG9ydCB2YWxpZGF0ZSBmcm9tICcuL3ZhbGlkYXRlLmpzJztcblxuZnVuY3Rpb24gdmVyc2lvbih1dWlkKSB7XG4gIGlmICghdmFsaWRhdGUodXVpZCkpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ0ludmFsaWQgVVVJRCcpO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlSW50KHV1aWQuc2xpY2UoMTQsIDE1KSwgMTYpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB2ZXJzaW9uOyIsbnVsbF0sIm5hbWVzIjpbIm1lbW9pemUiLCJmdW5jIiwiY2FjaGUiLCJNYXAiLCJhcmdzIiwia2V5Iiwiam9pbiIsImhhcyIsInNldCIsImdldCIsIl9sb2NhdGlvbnNGb3JCYW5kIiwic2l6ZSIsImJhbmRfaW5kZXgiLCJsb2NhdGlvbnMiLCJjb2wiLCJwdXNoIiwicm93IiwibWVtb2l6ZWRMb2NhdGlvbnNGb3JCYW5kIiwiX2xvY2F0aW9uc0ZvclJvdyIsInJvd19pbmRleCIsImNlbnRlciIsIk1hdGgiLCJmbG9vciIsIkFycmF5IiwiZnJvbSIsImxlbmd0aCIsIl8iLCJtZW1vaXplZExvY2F0aW9uc0ZvclJvdyIsIl9nZXRCYW5kTnVtYmVyRnJvbUNvb3JkcyIsImkiLCJqIiwicm93T2Zmc2V0IiwibWluIiwiY29sT2Zmc2V0IiwiYmFuZCIsIm1lbW9pemVkR2V0QmFuZE51bWJlckZyb21Db29yZHMiLCJfY2xhbXAiLCJ2YWwiLCJtYXgiLCJfY2xhbXBMaXN0SW5kZXgiLCJsaXN0IiwiaWR4IiwibmV4dEluZGV4V2l0aG91dFdyYXAiLCJwcmV2SW5kZXhXaXRob3V0V3JhcCIsIm5leHRJbmRleFdpdGhXcmFwIiwicHJldkluZGV4V2l0aFdyYXAiLCJfZ2V0QmFuZFNpZGUiLCJiYWNrU2lkZSIsIl9nZW5lcmF0ZUdyaWRBdHRyaWJ1dGVzIiwiY2VsbHMiLCJudW1fYmFuZHMiLCJsb2NhdGlvbnNfZm9yX2JhbmQiLCJsb2NhdGlvbnNfZm9yX3JvdyIsImJhbmRfbnVtYmVyIiwiYmFuZF9sb2NhdGlvbnMiLCJiYW5kX29mZnNldCIsImZpbmRJbmRleCIsIngiLCJ5IiwiRXJyb3IiLCJiYW5kX3NpZGUiLCJpc19jb3JuZXIiLCJiYW5kX2dyb3VwIiwia2luZCIsImluZGV4Iiwib2Zmc2V0IiwicHJldiIsIm5leHQiLCJzaWRlIiwicm93X2xvY2F0aW9ucyIsInJvd19vZmZzZXQiLCJyb3dfZ3JvdXAiLCJpc19jZW50ZXIiLCJtZW1vaXplZEdlbmVyYXRlR3JpZEF0dHJpYnV0ZXMiLCJ2YWxpZGF0ZVByb3BlcnRpZXMiLCJvYmoiLCJudW1Qcm9wZXJ0aWVzIiwic3RyUHJvcGVydGllcyIsInZhbHVlIiwiT2JqZWN0IiwiZW50cmllcyIsImluY2x1ZGVzIiwiR0FNRV9BQ1RJT05TIiwiYXQiLCJ0ZXh0IiwiYWN0aW9uIiwidXNlcl9pZCIsImNoYW5nZV9jb3VudCIsImNsZWFyIiwibWFya1NlZ21lbnQiLCJjbHVlX2xpc3QiLCJpZHhfY2VsbF9zdGFydCIsImlkeF9jZWxsX2VuZCIsImNsZWFyU2VnbWVudCIsImlkeF9jZWxsIiwiam9pblB1enpsZSIsInNvbHZlX2lkIiwibGVhdmVQdXp6bGUiLCJzdHJpbmdUb0FjdGlvbiIsInN0ciIsIkpTT04iLCJwYXJzZSIsImFjdGlvblRvU3RyaW5nIiwic3RyaW5naWZ5IiwiYXJlQWN0aW9uc0VxdWFsIiwiYSIsImIiLCJzZXRfYSIsInNldF9iIiwiZ3JpZF9hIiwiZ3JpZF9iIiwibWFya19hIiwibWFya19iIiwiY2x1ZV9hIiwiY2x1ZV9iIiwiY2xlYXJfYSIsImNsZWFyX2IiLCJzb2x2ZV9pZF9hIiwic29sdmVfaWRfYiIsIkVNUFRZX0NFTExfVEVYVCIsIkNlbGwiLCJjb25zdHJ1Y3RvciIsInRoaXMiLCJpc19maWxsZWQiLCJBbnN3ZXJTZWdtZW50cyIsInJlbW92ZU92ZXJsYXBwaW5nU2VnbWVudHMiLCJyZW1vdmUiLCJzZWdtZW50cyIsImZpbHRlciIsInNlZ21lbnQiLCJpZHhfc3RhcnQiLCJpZHhfZW5kIiwic29ydCIsIm51bUFuc3dlcmVkQ2VsbHMiLCJyZWR1Y2UiLCJhY2MiLCJpbl9hbnN3ZXJfYXRfb2Zmc2V0IiwiR2FtZVN0YXRlIiwiYXBwbHkiLCJjbHVlX2xpc3RfYWN0aW9uIiwiYXBwbHlDbHVlTGlzdEFjdGlvbiIsImdyaWRfYWN0aW9uIiwiYXBwbHlHcmlkQWN0aW9uIiwiYW5zd2VyX3NlZ21lbnRzIiwiZ2V0QW5zd2VyU2VnbWVudHMiLCJtYXJrX3NlZ21lbnRfYWN0aW9uIiwiY2xlYXJfc2VnbWVudF9hY3Rpb24iLCJjZWxsIiwiZ3JpZCIsInNldF9hY3Rpb24iLCJ1cGRhdGVJc1NvbHZlZCIsImlzX3NvbHZlZCIsImlzX3JvdyIsImFuc3dlcl9zZWdtZW50c19saXN0Iiwicm93X2Fuc3dlcl9zZWdtZW50cyIsImJhbmRfYW5zd2VyX3NlZ21lbnRzIiwibnVtX2ZpbGxlZCIsImxvY2F0aW9uIiwidG9fanNvbiIsImdhbWVTdGF0ZSIsIm1hcCIsImZuX3NlZ21lbnRzX29ubHkiLCJyb3dfc2VnbWVudHMiLCJiYW5kX3NlZ21lbnRzIiwicmVzdWx0Iiwic2V0X2NsdWVfbGlzdHMiLCJzZWdtZW50X3ZhbHVlc19saXN0Iiwic2VnbWVudF92YWx1ZXMiLCJnYW1lc3RhdGVfc2VnbWVudHMiLCJzZXRfZnJvbV9qc29uIiwianNvbiIsInNpbXBsZV9qc29uIiwianNvbl9ncmlkIiwiTUFYX0xFTkdUSCIsIlJPV19JREVOVElGSUVSUyIsInRvU3RyaW5nIiwiQkFORF9JREVOVElGSUVSUyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsIkNMVUVfSURFTlRJRklFUlMiLCJsZXR0ZXIiLCJ0b0xvd2VyQ2FzZSIsIlJPV1NfSEVBREVSIiwiQkFORFNfSEVBREVSIiwic2FuZV9zcGxpdCIsImlucHV0Iiwic2VwYXJhdG9yIiwiZmlyc3QiLCJzcGxpdCIsInJlc3QiLCJzbGljZSIsInJlYWRfbmVzdGVkX2NsdWVzIiwicmF3X2xpbmVzIiwiZ3JvdXBfaWRlbnRpZmllcnNfb3JpZyIsImdyb3VwcyIsImdyb3VwX2lkZW50aWZpZXJzIiwibmV4dF9ncm91cF9pZGVudGlmaWVyIiwic2hpZnQiLCJsaW5lIiwiY3VycmVudF9ncm91cCIsImNsdWVfaW5kZXgiLCJsYWJlbCIsInJlYWRfaW50b19yb3dDbHVlc19hbmRfYmFuZENsdWVzIiwibGluZXMiLCJyb3dfY2x1ZV9saW5lcyIsImJhbmRfY2x1ZV9saW5lcyIsImZvdW5kX3Jvd0NsdWVzIiwiZm91bmRfYmFuZENsdWVzIiwicmF3X2xpbmUiLCJ0cmltIiwicm93X2NsdWVzIiwiYmFuZF9jbHVlcyIsInBhcnNlX2NsdWVzIiwiaW5wdXRfdGV4dCIsInJvd0NsdWVzIiwiYmFuZENsdWVzIiwiZXhwZWN0ZWRfcm93X2NvdW50IiwiUHV6emxlIiwib3JpZ2luYWxfdGV4dCIsImNsdWVzIiwibG9hZFB1enpsZUZyb21Kc29uIiwic3RvcmVkU3RyaW5nIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsInNhdmVQdXp6bGVUb0pzb24iLCJwdXp6bGUiLCJERUZBVUxUX0NVUlNPUiIsInVzZV9iYW5kIiwiU29sdmVyIiwibmFtZSIsImN1cnNvciIsImFzc2lnbiIsImdldFJhbmRvbVZhbHVlcyIsInJuZHM4IiwiVWludDhBcnJheSIsInJuZyIsImNyeXB0byIsImJpbmQiLCJSRUdFWCIsInZhbGlkYXRlIiwidXVpZCIsInRlc3QiLCJieXRlVG9IZXgiLCJ1bnNhZmVTdHJpbmdpZnkiLCJhcnIiLCJUeXBlRXJyb3IiLCJ2IiwicGFyc2VJbnQiLCJzdHJpbmdUb0J5dGVzIiwidW5lc2NhcGUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJieXRlcyIsImNoYXJDb2RlQXQiLCJETlMiLCJVUkwiLCJ2MzUiLCJ2ZXJzaW9uIiwiaGFzaGZ1bmMiLCJnZW5lcmF0ZVVVSUQiLCJuYW1lc3BhY2UiLCJidWYiLCJfbmFtZXNwYWNlIiwiZXJyIiwicmFuZG9tVVVJRCIsIm5hdGl2ZSIsInY0Iiwib3B0aW9ucyIsInJuZHMiLCJyYW5kb20iLCJmIiwicyIsInoiLCJST1RMIiwibiIsInNoYTEiLCJLIiwiSCIsIm1zZyIsImlzQXJyYXkiLCJwcm90b3R5cGUiLCJjYWxsIiwibCIsIk4iLCJjZWlsIiwiTSIsIlVpbnQzMkFycmF5IiwicG93IiwiVyIsInQiLCJjIiwiZCIsIlQiLCJ2NSIsInV1aWR2NSIsIlVVSURfTkFNRVNQQUNFIiwiVXNlcklkIiwicHJpdmF0ZV91dWlkIiwidXVpZFZhbGlkYXRlIiwidXVpZFZlcnNpb24iLCJ1dWlkdjQiLCJwdWJsaWNfdXVpZCJdLCJtYXBwaW5ncyI6IkFBbURBLFNBQVNBLFFBQWdDQztJQUNyQyxNQUFNQyxRQUF3QixJQUFJQztJQUNsQyxPQUFPLElBQUlDO1FBQ1AsTUFBTUMsTUFBTUQsS0FBS0UsS0FBSztRQUN0QixLQUFLSixNQUFNSyxJQUFJRixNQUFNO1lBQ2pCSCxNQUFNTSxJQUFJSCxLQUFLSixRQUFRRztBQUMxQjtRQUNELE9BQU9GLE1BQU1PLElBQUlKO0FBQUs7QUFFOUI7O0FBRUEsTUFBTUssb0JBQW9CLENBQUNDLE1BQWNDO0lBSXJDLE1BQU1DLFlBQWdDO0lBQ3RDLEtBQUssSUFBSUMsTUFBTUYsWUFBWUUsTUFBTUgsT0FBT0MsWUFBWUUsT0FBTztRQUN2REQsVUFBVUUsS0FBSyxFQUFDSCxZQUFZRTtBQUMvQjtJQUNELEtBQUssSUFBSUUsTUFBTUosYUFBYSxHQUFHSSxNQUFNTCxPQUFPQyxhQUFhLEdBQUdJLE9BQU87UUFDL0RILFVBQVVFLEtBQUssRUFBQ0MsS0FBS0wsT0FBT0MsYUFBYTtBQUM1QztJQUNELEtBQUssSUFBSUUsTUFBTUgsT0FBT0MsYUFBYSxHQUFHRSxPQUFPRixhQUFhLEdBQUdFLE9BQU87UUFDaEVELFVBQVVFLEtBQUssRUFBQ0osT0FBT0MsYUFBYSxHQUFHRTtBQUMxQztJQUNELEtBQUssSUFBSUUsTUFBTUwsT0FBT0MsYUFBYSxHQUFHSSxPQUFPSixhQUFhLEdBQUdJLE9BQU87UUFDaEVILFVBQVVFLEtBQUssRUFBQ0MsS0FBS0o7QUFDeEI7SUFDRCxPQUFPQztBQUFTOztBQUVwQixNQUFNSSwyQkFBMkJqQixRQUFRVTs7QUFFekMsTUFBTVEsbUJBQW1CLENBQUNQLE1BQWNRO0lBQ3BDLE1BQU1DLFNBQVNDLEtBQUtDLE1BQU1YLE9BQU87SUFDakMsSUFBSVEsY0FBY0MsUUFBUTtRQUN0QixPQUFPRyxNQUFNQyxLQUFLO1lBQUVDLFFBQVFkO1lBQVEsQ0FBQ2UsR0FBR1osUUFBUSxFQUFDSyxXQUFXTDtBQUMvRDtJQUVELE1BQU1ELFlBQWdDO0lBQ3RDLEtBQUssSUFBSUMsTUFBTSxHQUFHQSxNQUFNSCxNQUFNRyxPQUFPO1FBQ2pDLElBQUlBLFFBQVFNLFFBQVE7WUFDaEI7QUFDSDtRQUNEUCxVQUFVRSxLQUFLLEVBQUNJLFdBQVdMO0FBQzlCO0lBQ0QsT0FBT0Q7QUFBUzs7QUFFcEIsTUFBTWMsMEJBQTBCM0IsUUFBUWtCOztBQUV4QyxNQUFNVSwyQkFBMkIsQ0FBQ2pCLE1BQWNrQixHQUFXQztJQUN2RCxNQUFNQyxZQUFZVixLQUFLVyxJQUFJSCxHQUFHbEIsT0FBT2tCLElBQUk7SUFDekMsTUFBTUksWUFBWVosS0FBS1csSUFBSUYsR0FBR25CLE9BQU9tQixJQUFJO0lBQ3pDLE1BQU1JLE9BQU9iLEtBQUtXLElBQUlELFdBQVdFO0lBQ2pDLE9BQU9DO0FBQUk7O0FBRWYsTUFBTUMsa0NBQWtDbkMsUUFBUTRCOztBQUVoRCxNQUFNUSxTQUFTLENBQUNDLEtBQWFMLEtBQWFNLFFBQWdCakIsS0FBS1csSUFBSVgsS0FBS2lCLElBQUlELEtBQUtMLE1BQU1NOztBQUl2RixNQUFNQyxrQkFBa0IsQ0FBSUMsTUFBV0MsUUFBd0JMLE9BQU9LLEtBQUssR0FBR0QsS0FBS2YsU0FBUzs7QUFJNUYsTUFBTWlCLHVCQUF1QixDQUFDN0IsV0FBK0I0QixRQUN6REYsZ0JBQWdCMUIsV0FBVzRCLE1BQU07O0FBRXJDLE1BQU1FLHVCQUF1QixDQUFDOUIsV0FBK0I0QixRQUN6REYsZ0JBQWdCMUIsV0FBVzRCLE1BQU07O0FBRXJDLE1BQU1HLG9CQUFvQixDQUFDL0IsV0FBK0I0QixTQUNyREEsTUFBTSxLQUFLNUIsVUFBVVk7O0FBRXBCLE1BQUFvQixvQkFBb0IsQ0FBQ2hDLFdBQStCNEIsU0FDckRBLE1BQU01QixVQUFVWSxTQUFTLEtBQUtaLFVBQVVZOztBQU83QyxNQUFNcUIsZUFBZSxDQUFDbkMsTUFBY2tCLEdBQVdDO0lBQzNDLE1BQU1JLE9BQU9DLGdDQUFnQ3hCLE1BQU1rQixHQUFHQztJQUN0RCxNQUFNaUIsV0FBV3BDLE9BQU8sSUFBSXVCO0lBQzVCLElBQUlMLE1BQU1LLFFBQVFKLE1BQU1pQixVQUFVO1FBQzlCLE9BQU8sRUFBQyxPQUFPakIsTUFBTUk7QUFDeEI7SUFDRCxJQUFJSixNQUFNaUIsWUFBWWxCLE1BQU1rQixVQUFVO1FBQ2xDLE9BQU8sRUFBQyxTQUFTbEIsTUFBTUs7QUFDMUI7SUFDRCxJQUFJTCxNQUFNa0IsWUFBWWpCLE1BQU1JLE1BQU07UUFDOUIsT0FBTyxFQUFDLFVBQVVKLE1BQU1pQjtBQUMzQjtJQUNELElBQUlqQixNQUFNSSxNQUFNO1FBQ1osT0FBTyxFQUFDLFFBQVFMLE1BQU1rQjtBQUN6QjtJQUVELE9BQU8sRUFBQyxPQUFPO0FBQUs7O0FBcUN4QixNQUFNQywwQkFBMkJyQztJQUU3QixNQUFNc0MsUUFBNEI7SUFDbEMsTUFBTTdCLFNBQVNDLEtBQUtDLE1BQU1YLE9BQU87SUFDakMsTUFBTXVDLFlBQVk3QixLQUFLQyxPQUFPWCxPQUFPLEtBQUssS0FBSztJQUMvQyxNQUFNd0MscUJBQXFCNUIsTUFBTUMsS0FBSztRQUFFQyxRQUFReUI7UUFBYSxDQUFDeEIsR0FBR0csTUFDN0RaLHlCQUF5Qk4sTUFBTWtCO0lBRW5DLE1BQU11QixvQkFBb0I3QixNQUFNQyxLQUFLO1FBQUVDLFFBQVFkO1FBQVEsQ0FBQ2UsR0FBR0csTUFDdkRGLHdCQUF3QmhCLE1BQU1rQjtJQUVsQyxLQUFLLElBQUlBLElBQUksR0FBR0EsSUFBSWxCLE1BQU1rQixLQUFLO1FBQzNCLE1BQU1iLE1BQXdCO1FBQzlCLEtBQUssSUFBSWMsSUFBSSxHQUFHQSxJQUFJbkIsTUFBTW1CLEtBQUs7WUFDM0IsTUFBTXVCLGNBQWNsQixnQ0FBZ0N4QixNQUFNa0IsR0FBR0M7WUFDN0QsTUFBTXdCLGlCQUFpQnJDLHlCQUF5Qk4sTUFBTTBDO1lBQ3RELE1BQU1FLGNBQWNELGVBQWVFLFdBQVUsRUFBRUMsR0FBR0MsT0FBT0QsS0FBSzVCLEtBQUs2QixLQUFLNUI7WUFDeEUsS0FBSyxNQUFNeUIsYUFBYTtnQkFDcEIsTUFBTSxJQUFJSSxNQUFNLHdCQUF3QjlCLE1BQU1DO0FBQ2pEO1lBRUQsT0FBTzhCLFdBQVdDLGFBQWFmLGFBQWFuQyxNQUFNa0IsR0FBR0M7WUFDckQsTUFBTWdDLGFBQXdCO2dCQUMxQkMsTUFBTTtnQkFDTkMsT0FBT1g7Z0JBQ1BZLFFBQVFWO2dCQUNSVyxNQUFNWixlQUFlVCxrQkFBa0JTLGdCQUFnQkM7Z0JBQ3ZEWSxNQUFNYixlQUFlVixrQkFBa0JVLGdCQUFnQkM7Z0JBQ3ZEYSxNQUFNUjtnQkFDTkM7O1lBR0osTUFBTVEsZ0JBQWdCMUMsd0JBQXdCaEIsTUFBTWtCO1lBQ3BELE1BQU15QyxhQUFhRCxjQUFjYixXQUFVLEVBQUVDLEdBQUdDLE9BQU9ELEtBQUs1QixLQUFLNkIsS0FBSzVCO1lBQ3RFLEtBQUssTUFBTXdDLGdCQUFnQnpDLEtBQUtULFVBQVVVLEtBQUtWLFNBQVM7Z0JBQ3BELE1BQU0sSUFBSXVDLE1BQU0sd0JBQXdCOUIsTUFBTUM7QUFDakQ7WUFDRCxNQUFNeUMsWUFBc0I7Z0JBQ3hCUixNQUFNO2dCQUNOQyxPQUFPbkM7Z0JBQ1BvQyxRQUFRSztnQkFDUkosTUFBTUcsY0FBYzFCLHFCQUFxQjBCLGVBQWVDO2dCQUN4REgsTUFBTUUsY0FBYzNCLHFCQUFxQjJCLGVBQWVDOztZQUc1RCxNQUFNRSxZQUFZM0MsTUFBTVQsVUFBVVUsTUFBTVY7WUFDeENKLElBQUlELEtBQUs7Z0JBQUV5RDtnQkFBV1Y7Z0JBQVlTOztBQUNyQztRQUNEdEIsTUFBTWxDLEtBQUtDO0FBQ2Q7SUFDRCxPQUFPO1FBQ0hpQztRQUNBN0I7UUFDQThCO1FBQ0FDO1FBQ0FDO1FBQ0F6Qzs7QUFDSDs7QUFFTCxNQUFNOEQsaUNBQWlDekUsUUFBUWdEOztBQ25QekMsTUFBQTBCLHFCQUFxQixDQUN2QkMsS0FDQUMsZUFDQUM7SUFFQSxJQUFJRixRQUFRLE1BQU07UUFDZCxNQUFNLElBQUloQixNQUFNO0FBQ25CO0lBQ0QsS0FBSyxPQUFPdEQsS0FBS3lFLFVBQVVDLE9BQU9DLFFBQVFMLE1BQU07UUFDNUMsSUFBSUMsY0FBY0ssU0FBUzVFLE1BQU07WUFDN0IsV0FBV3lFLFVBQVUsVUFBVTtnQkFDM0IsTUFBTSxJQUFJbkIsTUFBTSxtQkFBbUJ0RDtBQUN0QztBQUNKO1FBQ0QsSUFBSXdFLGNBQWNJLFNBQVM1RSxNQUFNO1lBQzdCLFdBQVd5RSxVQUFVLFVBQVU7Z0JBQzNCLE1BQU0sSUFBSW5CLE1BQU0sbUJBQW1CdEQ7QUFDdEM7QUFDSjtBQUNKO0FBQUE7O0FDbUJMLE1BQU02RSxlQUFlLEVBQ2pCLGNBQ0EsZUFDQSxPQUNBLFNBQ0EsZUFDQTs7QUE2REosU0FBUzFFLElBQUkyRSxJQUFzQkM7SUFDL0IsT0FBTztRQUNIQyxRQUFRO1FBQ1JDLFNBQVM7UUFDVEMsZUFBZTtRQUNmdkUsS0FBS21FLEdBQUduRTtRQUNSRixLQUFLcUUsR0FBR3JFO1FBQ1JzRTs7QUFFUjs7QUFFQSxTQUFTSSxNQUFNTDtJQUNYLE9BQU87UUFDSEUsUUFBUTtRQUNSQyxTQUFTO1FBQ1RDLGVBQWU7UUFDZnZFLEtBQUttRSxHQUFHbkU7UUFDUkYsS0FBS3FFLEdBQUdyRTs7QUFFaEI7O0FBRUEsU0FBUzJFLFlBQ0xDLFdBQ0FDLGdCQUNBQztJQUVBLE9BQU87UUFDSFAsUUFBUTtRQUNSQyxTQUFTO1FBQ1RDLGVBQWU7UUFDZnZCLE9BQU8wQixVQUFVMUI7UUFDakJELE1BQU0yQixVQUFVM0I7UUFDaEI0QjtRQUNBQzs7QUFFUjs7QUFFQSxTQUFTQyxhQUFhSCxXQUErQkk7SUFDakQsT0FBTztRQUNIVCxRQUFRO1FBQ1JDLFNBQVM7UUFDVEMsZUFBZTtRQUNmdkIsT0FBTzBCLFVBQVUxQjtRQUNqQkQsTUFBTTJCLFVBQVUzQjtRQUNoQitCOztBQUVSOztBQUVBLFNBQVNDLFdBQVdDO0lBQ2hCLE9BQU87UUFDSFgsUUFBUTtRQUNSQyxTQUFTO1FBQ1RDLGVBQWU7UUFDZlM7O0FBRVI7O0FBRUEsU0FBU0M7SUFDTCxPQUFPO1FBQ0haLFFBQVE7UUFDUkMsU0FBUztRQUNUQyxlQUFlOztBQUV2Qjs7QUFFQSxTQUFTVyxlQUFlQztJQUNwQixJQUFJQSxRQUFRLE1BQU07UUFDZCxNQUFNLElBQUl4QyxNQUFNO0FBQ25CO0lBQ0QsTUFBTWlCLGdCQUFnQjtJQUN0QixNQUFNQyxnQkFBZ0I7SUFFdEIsTUFBTUYsTUFBTXlCLEtBQUtDLE1BQU1GO0lBSXZCekIsbUJBQW1CQyxLQUFLLElBQUksRUFBQztJQUM3QixRQUFRQSxJQUFJVTtNQUNSLEtBQUs7TUFDTCxLQUFLO1FBQ0RULGNBQWM3RCxLQUFLO1FBQ25CNkQsY0FBYzdELEtBQUs7UUFDbkI4RCxjQUFjOUQsS0FBSztRQUNuQjs7TUFDSixLQUFLO01BQ0wsS0FBSztRQUNENkQsY0FBYzdELEtBQUs7UUFDbkI4RCxjQUFjOUQsS0FBSztRQUNuQjZELGNBQWM3RCxLQUFLO1FBQ25CNkQsY0FBYzdELEtBQUs7UUFDbkI7O01BQ0osS0FBSztRQUNEOEQsY0FBYzlELEtBQUs7UUFDbkI7O01BQ0osS0FBSztRQUNEOztNQUNKO1FBQ0ksTUFBTSxJQUFJNEMsTUFBTSxxQkFBcUJ3Qzs7SUFFN0N0QixjQUFjOUQsS0FBSztJQUNuQjZELGNBQWM3RCxLQUFLO0lBRW5CMkQsbUJBQW1CQyxLQUFLQyxlQUFlQztJQUd2QyxJQUFJLFVBQVVBLGVBQWU7UUFDekIsSUFBSUYsSUFBSVosU0FBUyxZQUFZWSxJQUFJWixTQUFTLFFBQVE7WUFDOUMsTUFBTSxJQUFJSixNQUFNLHFCQUFxQndDO0FBQ3hDO0FBQ0o7SUFDRCxPQUFPeEI7QUFDWDs7QUFFQSxTQUFTMkIsZUFBZWpCO0lBQ3BCLE9BQU9lLEtBQUtHLFVBQVVsQjtBQUMxQjs7QUFFQSxTQUFTbUIsZ0JBQWdCQyxHQUFnQkM7SUFDckMsSUFBSUQsRUFBRW5CLFlBQVlvQixFQUFFcEIsU0FBUztRQUN6QixPQUFPO0FBQ1Y7SUFDRCxJQUFJbUIsRUFBRXBCLFdBQVdxQixFQUFFckIsUUFBUTtRQUN2QixPQUFPO0FBQ1Y7SUFDRCxJQUFJb0IsRUFBRWxCLGlCQUFpQm1CLEVBQUVuQixjQUFjO1FBRW5DLElBQUlrQixFQUFFbEIsa0JBQWtCLEtBQUttQixFQUFFbkIsa0JBQWtCLEdBQUc7WUFDaEQsT0FBTztBQUNWO0FBQ0o7SUFDRCxRQUFRa0IsRUFBRXBCO01BQ04sS0FBSztRQUNELE1BQU1zQixRQUFRRjtRQUNkLE1BQU1HLFFBQVFGO1FBQ2QsSUFBSUMsTUFBTXZCLFNBQVN3QixNQUFNeEIsTUFBTTtZQUMzQixPQUFPO0FBQ1Y7O01BRUwsS0FBSztRQUNELE1BQU15QixTQUFTSjtRQUNmLE1BQU1LLFNBQVNKO1FBQ2YsSUFBSUcsT0FBTzdGLFFBQVE4RixPQUFPOUYsS0FBSztZQUMzQixPQUFPO0FBQ1Y7UUFDRCxJQUFJNkYsT0FBTy9GLFFBQVFnRyxPQUFPaEcsS0FBSztZQUMzQixPQUFPO0FBQ1Y7UUFDRDs7TUFFSixLQUFLO1FBQ0QsTUFBTWlHLFNBQVNOO1FBQ2YsTUFBTU8sU0FBU047UUFDZixJQUFJSyxPQUFPcEIsbUJBQW1CcUIsT0FBT3JCLGdCQUFnQjtZQUNqRCxPQUFPO0FBQ1Y7O01BRUwsS0FBSztRQUNELE1BQU1zQixTQUFTUjtRQUNmLE1BQU1TLFNBQVNSO1FBQ2YsSUFBSU8sT0FBT2pELFVBQVVrRCxPQUFPbEQsT0FBTztZQUMvQixPQUFPO0FBQ1Y7UUFDRCxJQUFJaUQsT0FBT2xELFNBQVNtRCxPQUFPbkQsTUFBTTtZQUM3QixPQUFPO0FBQ1Y7UUFDRCxJQUFJLGtCQUFrQjBDLEVBQUVwQixRQUFRO1lBQzVCLE1BQU04QixVQUFVVjtZQUNoQixNQUFNVyxVQUFVVjtZQUNoQixJQUFJUyxRQUFRckIsYUFBYXNCLFFBQVF0QixVQUFVO2dCQUN2QyxPQUFPO0FBQ1Y7QUFDSjtRQUNEOztNQUNKLEtBQUs7UUFDRCxNQUFNdUIsYUFBYVo7UUFDbkIsTUFBTWEsYUFBYVo7UUFDbkIsSUFBSVcsV0FBV3JCLGFBQWFzQixXQUFXdEIsVUFBVTtZQUM3QyxPQUFPO0FBQ1Y7UUFDRDs7SUFLUixPQUFPO0FBQ1g7O0FDblJBLE1BQU11QixrQkFBa0I7O0FBTXhCLE1BQU1DO0lBRUYsV0FBQUM7UUFDSUMsS0FBS3RDLE9BQU9tQztBQUNmO0lBQ0QsS0FBQS9CO1FBQ0lrQyxLQUFLdEMsT0FBT21DO0FBQ2Y7SUFDRCxHQUFBL0csQ0FBSTRFO1FBQ0FzQyxLQUFLdEMsT0FBT0E7QUFDZjtJQUNELFNBQUF1QztRQUNJLE9BQU9ELEtBQUt0QyxTQUFTbUM7QUFDeEI7OztBQVFMLE1BQU1LO0lBR0YsV0FBQUg7UUFJQUMsS0FBQUcsNEJBQTZCQztZQUd6QkosS0FBS0ssV0FBV0wsS0FBS0ssU0FBU0MsUUFBUUM7Z0JBQ2xDLElBQUlBLFFBQVFDLFlBQVlKLE9BQU9JLFdBQVc7b0JBQ3RDLE9BQU9ELFFBQVFFLFVBQVVMLE9BQU9JO0FBQ25DLHVCQUFNO29CQUNILE9BQU9KLE9BQU9LLFVBQVVGLFFBQVFDO0FBQ25DO0FBQUE7QUFDSDtRQUdOUixLQUFBakMsY0FBZXdDO1lBRVhQLEtBQUtHLDBCQUEwQkk7WUFDL0JQLEtBQUtLLFNBQVNoSCxLQUFLa0g7WUFDbkJQLEtBQUtLLFNBQVNLLE1BQUssQ0FBQzNCLEdBQUdDLE1BQ1pELEVBQUV5QixZQUFZeEIsRUFBRXdCO0FBQ3pCO1FBR05SLEtBQUE3QixlQUFnQkM7WUFDWjRCLEtBQUtHLDBCQUEwQjtnQkFBRUssV0FBV3BDO2dCQUFVcUMsU0FBU3JDOztBQUFXO1FBSTlFNEIsS0FBZ0JXLG1CQUFHLE1BRVJYLEtBQUtLLFNBQVNPLFFBQU8sQ0FBQ0MsS0FBS04sWUFDdkJNLE1BQU1OLFFBQVFFLFVBQVVGLFFBQVFDLFlBQVksSUFDcEQ7UUFJUFIsS0FBQWMsc0JBQXVCdkU7WUFDbkIsS0FBSyxNQUFNZ0UsV0FBV1AsS0FBS0ssVUFBVTtnQkFDakMsSUFBSUUsUUFBUUMsYUFBYWpFLFVBQVVBLFVBQVVnRSxRQUFRRSxTQUFTO29CQUMxRCxPQUFPLEVBQUMsTUFBTUYsUUFBUUMsY0FBY2pFLFFBQVFnRSxRQUFRRSxZQUFZbEU7QUFDbkU7QUFDSjtZQUNELE9BQU8sRUFBQyxPQUFPLE9BQU87QUFBTTtRQTNDNUJ5RCxLQUFLSyxXQUFXO0FBQ25COzs7QUF5REwsTUFBTVU7SUFTRixXQUFBaEIsQ0FBWTlHLE1BQWNxRjtRQWMxQjBCLEtBQUFnQixRQUFTckQ7WUFDTCxRQUFRQSxPQUFPQTtjQUNYLEtBQUs7Y0FDTCxLQUFLO2dCQUNELE1BQU1zRCxtQkFBbUJ0RDtnQkFDekJxQyxLQUFLa0Isb0JBQW9CRDtnQkFDekI7O2NBQ0osS0FBSztjQUNMLEtBQUs7Z0JBQ0QsTUFBTUUsY0FBY3hEO2dCQUNwQnFDLEtBQUtvQixnQkFBZ0JEO2dCQUNyQjs7QUFDUDtRQUdMbkIsS0FBQWtCLHNCQUF1QnZEO1lBQ25CLE1BQU0wRCxrQkFBa0JyQixLQUFLc0Isa0JBQWtCM0QsT0FBT3RCLE1BQU1zQixPQUFPckI7WUFDbkUsUUFBUXFCLE9BQU9BO2NBQ1gsS0FBSztnQkFBZTtvQkFDaEIsTUFBTTRELHNCQUFzQjVEO29CQUM1QjBELGdCQUFnQnRELFlBQVk7d0JBQ3hCeUMsV0FBV2Usb0JBQW9CdEQ7d0JBQy9Cd0MsU0FBU2Msb0JBQW9CckQ7O29CQUVqQztBQUNIOztjQUNELEtBQUs7Z0JBQWdCO29CQUNqQixNQUFNc0QsdUJBQXVCN0Q7b0JBQzdCMEQsZ0JBQWdCbEQsYUFBYXFELHFCQUFxQnBEO29CQUNsRDtBQUNIOztBQUNKO1FBR0w0QixLQUFBb0Isa0JBQW1CekQ7WUFDZixNQUFNOEQsT0FBT3pCLEtBQUswQixLQUFLL0QsT0FBT3JFLEtBQUtxRSxPQUFPdkU7WUFDMUMsUUFBUXVFLE9BQU9BO2NBQ1gsS0FBSztnQkFBTztvQkFDUixNQUFNZ0UsYUFBYWhFO29CQUNuQjhELEtBQUszSSxJQUFJNkksV0FBV2pFO29CQUNwQnNDLEtBQUs0QjtvQkFDTDtBQUNIOztjQUNELEtBQUs7Z0JBQVM7b0JBQ1ZILEtBQUszRDtvQkFDTGtDLEtBQUs2QixZQUFZO29CQUNqQjtBQUNIOztBQUNKO1FBR0w3QixLQUFBc0Isb0JBQW9CLENBQUNqRixNQUFvQkM7WUFDckMsTUFBTXdGLFNBQVMsVUFBVXpGO1lBQ3pCLEtBQUt5RixVQUFVLFdBQVd6RixNQUFNO2dCQUM1QixNQUFNLElBQUlKLE1BQU0scUNBQXFDSTtBQUN4RDtZQUNELE1BQU0wRix1QkFBdUJELFNBQVM5QixLQUFLZ0Msc0JBQXNCaEMsS0FBS2lDO1lBQ3RFLElBQUkzRixRQUFRLEtBQUtBLFNBQVN5RixxQkFBcUJoSSxRQUFRO2dCQUNuRCxNQUFNLElBQUlrQyxNQUFNLGtDQUFrQ0ssYUFBYUQ7QUFDbEU7WUFDRCxPQUFPMEYscUJBQXFCekY7QUFBTTtRQUd0QzBELEtBQWM0QixpQkFBRztZQUViLE1BQU1NLGFBQWFsQyxLQUFLMEIsS0FBS2QsUUFBTyxDQUFDQyxLQUFLdkgsUUFFbEN1SCxNQUNBdkgsSUFBSXNILFFBQU8sQ0FBQ0MsS0FBS1ksU0FDTlosT0FBT1ksS0FBS3hCLGNBQWMsSUFBSSxLQUN0QyxLQUVSO1lBQ0hELEtBQUs2QixZQUFZSyxlQUFlbEMsS0FBSy9HLE9BQU8rRyxLQUFLL0csT0FBTztBQUFDO1FBRzdEK0csS0FBSXlCLE9BQUlVLFlBQXFDbkMsS0FBSzBCLEtBQUtTLFNBQVMsSUFBSUEsU0FBUztRQXpGekUsTUFBTTNHLFlBQVk3QixLQUFLQyxPQUFPWCxPQUFPLEtBQUs7UUFFMUMrRyxLQUFLaUMsdUJBQXVCcEksTUFBTUMsS0FBSztZQUFFQyxRQUFReUI7WUFBYSxNQUFNLElBQUkwRTtRQUN4RUYsS0FBS3RHLFNBQVNDLEtBQUtDLE1BQU1YLE9BQU87UUFDaEMrRyxLQUFLMEIsT0FBTzdILE1BQU1DLEtBQUs7WUFBRUMsUUFBUWQ7WUFBUSxNQUNyQ1ksTUFBTUMsS0FBSztZQUFFQyxRQUFRZDtZQUFRLE1BQU0sSUFBSTZHO1FBRTNDRSxLQUFLNkIsWUFBWTtRQUNqQjdCLEtBQUtnQyxzQkFBc0JuSSxNQUFNQyxLQUFLO1lBQUVDLFFBQVFkO1lBQVEsTUFBTSxJQUFJaUg7UUFDbEVGLEtBQUsvRyxPQUFPQTtRQUNaK0csS0FBSzFCLFdBQVdBO0FBQ25COzs7QUMzSEwsU0FBUzhELFFBQVFDO0lBRWIsTUFBTVgsT0FBT1csVUFBVVgsS0FBS1ksS0FBS2hKLE9BQ3RCQSxJQUFJZ0osS0FBS2IsUUFDTEEsS0FBSy9EO0lBR3BCLE1BQU02RSxtQkFBb0JsQixtQkFBb0NBLGdCQUFnQmhCO0lBQzlFLE1BQU1tQyxlQUFrQ0gsVUFBVUwsb0JBQW9CTSxJQUFJQztJQUMxRSxNQUFNRSxnQkFBbUNKLFVBQVVKLHFCQUFxQkssSUFBSUM7SUFFNUUsTUFBTUcsU0FBU2hFLEtBQUtHLFVBQVU7UUFDMUI2QztRQUNBYztRQUNBQzs7SUFFSixPQUFPQztBQUNYOztBQUVBLFNBQVNDLGVBQWV0QixpQkFBbUN1QjtJQUN2RCxJQUFJdkIsZ0JBQWdCdEgsVUFBVTZJLG9CQUFvQjdJLFFBQVE7UUFDdEQsTUFBTSxJQUFJa0MsTUFDTixpQ0FBaUNvRixnQkFBZ0J0SCx5QkFBeUI2SSxvQkFBb0I3STtBQUVyRztJQUVELEtBQUssSUFBSUksSUFBSSxHQUFHQSxJQUFJa0gsZ0JBQWdCdEgsUUFBUUksS0FBSztRQUM3QyxNQUFNMEksaUJBQWtDRCxvQkFBb0J6STtRQUM1RCxNQUFNMkkscUJBQXFCekIsZ0JBQWdCbEg7UUFDM0MsS0FBSyxNQUFNb0csV0FBV3NDLGdCQUFnQjtZQUNsQ0MsbUJBQW1CL0UsWUFBWTtnQkFDM0J5QyxXQUFXRCxRQUFRQztnQkFDbkJDLFNBQVNGLFFBQVFFOztBQUV4QjtBQUNKO0FBQ0w7O0FBRUEsU0FBU3NDLGNBQWNDLE1BQWNYO0lBQ2pDLE1BQU1ZLGNBQWN2RSxLQUFLQyxNQUFNcUU7SUFHL0IsSUFBSUMsWUFBWXZCLEtBQUszSCxVQUFVc0ksVUFBVXBKLE1BQU07UUFDM0MsTUFBTSxJQUFJZ0QsTUFDTiwyQkFBMkJnSCxZQUFZdkIsS0FBSzNILHlCQUF5QnNJLFVBQVVwSjtBQUV0RjtJQUNELElBQUlnSyxZQUFZdkIsS0FBSyxHQUFHM0gsVUFBVXNJLFVBQVVwSixNQUFNO1FBQzlDLE1BQU0sSUFBSWdELE1BQ04sMkJBQTJCZ0gsWUFBWXZCLEtBQUssR0FBRzNILDRCQUE0QnNJLFVBQVVwSjtBQUU1RjtJQUNELE1BQU11SixlQUFrQ1MsWUFBWVQ7SUFDcEQsSUFBSUEsYUFBYXpJLFVBQVVzSSxVQUFVcEosTUFBTTtRQUN2QyxNQUFNLElBQUlnRCxNQUNOLG1DQUFtQ3VHLGFBQWF6SSx5QkFBeUJzSSxVQUFVcEo7QUFFMUY7SUFDRCxNQUFNd0osZ0JBQW1DUSxZQUFZUjtJQUNyRCxNQUFNakgsWUFBWTZHLFVBQVVKLHFCQUFxQmxJO0lBQ2pELElBQUkwSSxjQUFjMUksVUFBVXlCLFdBQVc7UUFDbkMsTUFBTSxJQUFJUyxNQUNOLG9DQUFvQ3dHLGNBQWMxSSx5QkFBeUJ5QjtBQUVsRjtJQUdELE1BQU0wSCxZQUFZRCxZQUFZdkI7SUFDOUIsS0FBSyxJQUFJdkgsSUFBSSxHQUFHQSxJQUFJa0ksVUFBVVgsS0FBSzNILFFBQVFJLEtBQUs7UUFDNUMsS0FBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUlpSSxVQUFVWCxLQUFLM0gsUUFBUUssS0FBSztZQUM1Q2lJLFVBQVVYLEtBQUt2SCxHQUFHQyxHQUFHdEIsSUFBSW9LLFVBQVUvSSxHQUFHQztBQUN6QztBQUNKO0lBR0R1SSxlQUFlTixVQUFVTCxxQkFBcUJRO0lBQzlDRyxlQUFlTixVQUFVSixzQkFBc0JRO0FBQ25EOztBQzdFQSxNQUFNVSxhQUFhOztBQUVaLE1BQU1DLGtCQUFrQnZKLE1BQU1DLEtBQUs7SUFBRUMsUUFBUW9KO0lBQWMsQ0FBQ25KLEdBQUdHLE9BQU9BLElBQUksR0FBR2tKOztBQUU3RSxNQUFNQyxtQkFBbUJ6SixNQUFNQyxLQUFLO0lBQUVDLFFBQVFvSjtJQUFjLENBQUNuSixHQUFHRyxNQUNuRW9KLE9BQU9DLGFBQWFySixJQUFJOztBQUdyQixNQUFNc0osbUJBQW1CSCxpQkFBaUJoQixLQUFLb0IsVUFBV0EsT0FBT0M7O0FBRXhFLE1BQU1DLGNBQWM7O0FBQ3BCLE1BQU1DLGVBQWU7O0FBSXJCLFNBQVNDLFdBQVdDLE9BQWVDO0lBQy9CLE9BQU9DLFNBQVNGLE1BQU1HLE1BQU1GLFdBQVc7SUFDdkMsTUFBTUcsT0FBT0osTUFBTUssTUFBTUgsTUFBTWxLLFNBQVNpSyxVQUFVaks7SUFDbEQsT0FBTyxFQUFDa0ssT0FBT0U7QUFDbkI7O0FBRUEsU0FBU0Usa0JBQ0xDLFdBQ0FDO0lBRUEsTUFBTUMsU0FBbUI7SUFDekIsTUFBTUMsb0JBQW9CLEtBQUlGO0lBQzlCLElBQUlHLHdCQUF3QkQsa0JBQWtCRTtJQUU5QyxLQUFLLE1BQU1DLFFBQVFOLFdBQVc7UUFFMUIsS0FBS1osUUFBUWhHLFFBQVFvRyxXQUFXYyxNQUFNO1FBQ3RDLElBQUlsQixXQUFXZ0IsdUJBQXVCO1lBRWxDRixPQUFPbkwsS0FBSztZQUVacUwsd0JBQXdCRCxrQkFBa0JFO2FBR3pDakIsUUFBUWhHLFFBQVFvRyxXQUFXcEcsTUFBTTtBQUNyQztRQUNELElBQUk4RyxPQUFPekssV0FBVyxHQUFHO1lBR3JCO0FBQ0g7UUFFRCxNQUFNOEssZ0JBQWdCTCxPQUFPQSxPQUFPekssU0FBUztRQUM3QyxNQUFNK0ssYUFBYUQsY0FBYzlLO1FBQ2pDLE1BQU1nTCxRQUFRdEIsaUJBQWlCcUI7UUFDL0IsSUFBSXBCLFdBQVdxQixPQUFPO1lBRWxCRixjQUFjeEwsS0FBSztnQkFDZnlMO2dCQUNBQztnQkFDQXJIOztBQUVQLGVBQU07WUFDSCxJQUFJbUgsY0FBYzlLLFdBQVcsR0FBRztnQkFHNUI7QUFDSDtZQUdEOEssY0FBY0EsY0FBYzlLLFNBQVMsR0FBRzJELFFBQVEsTUFBTWtIO0FBQ3pEO0FBQ0o7SUFDRCxPQUFPSjtBQUNYOztBQUVBLFNBQVNRLGlDQUFpQ0M7SUFJdEMsTUFBTUMsaUJBQTJCO0lBQ2pDLE1BQU1DLGtCQUE0QjtJQUNsQyxJQUFJQyxpQkFBaUI7SUFDckIsSUFBSUMsa0JBQWtCO0lBQ3RCLElBQUlSLGdCQUFpQztJQUVyQyxLQUFLLE1BQU1TLFlBQVlMLE9BQU87UUFDMUIsTUFBTUwsT0FBT1UsU0FBU0M7UUFFdEIsSUFBSVgsS0FBSzdLLFdBQVcsR0FBRztZQUNuQjtBQUNIO1FBQ0QsS0FBS3FMLGtCQUFrQlIsU0FBU2hCLGFBQWE7WUFDekN3QixpQkFBaUI7WUFDakJQLGdCQUFnQks7WUFDaEI7QUFDSDtRQUNELEtBQUtHLG1CQUFtQlQsU0FBU2YsY0FBYztZQUMzQ3dCLGtCQUFrQjtZQUNsQlIsZ0JBQWdCTTtZQUNoQjtBQUNIO1FBQ0QsSUFBSU4sa0JBQWtCLE1BQU07WUFHeEI7QUFDSDtRQUNEQSxjQUFjeEwsS0FBS3VMO0FBQ3RCO0lBRUQsTUFBTVksWUFBWW5CLGtCQUFrQmEsZ0JBQWdCOUI7SUFDcEQsTUFBTXFDLGFBQWFwQixrQkFBa0JjLGlCQUFpQjdCO0lBRXRELE9BQU8sRUFBQ2tDLFdBQVdDO0FBQ3ZCOztBQUVBLFNBQVNDLFlBQVlDO0lBQ2pCLE1BQU1WLFFBQVFVLFdBQVd6QixNQUFNO0lBQy9CLE9BQU8wQixVQUFVQyxhQUFhYixpQ0FBaUNDO0lBRS9ELElBQUlXLFNBQVM3TCxXQUFXLEdBQUc7UUFDdkIsTUFBTSxJQUFJa0MsTUFBTTtBQUNuQjtJQUNELElBQUk0SixVQUFVOUwsV0FBVyxHQUFHO1FBQ3hCLE1BQU0sSUFBSWtDLE1BQU07QUFDbkI7SUFDRCxNQUFNNkoscUJBQXFCRCxVQUFVOUwsU0FBUyxJQUFJO0lBRWxELElBQUk2TCxTQUFTN0wsV0FBVytMLG9CQUFvQjtRQUN4QyxNQUFNLElBQUk3SixNQUNOLFlBQVk2Siw2Q0FBNkNELFVBQVU5TCw0QkFBNEI2TCxTQUFTN0w7QUFFL0c7SUFHRCxLQUFLLElBQUlJLElBQUksR0FBR0EsSUFBSXlMLFNBQVM3TCxRQUFRSSxLQUFLO1FBQ3RDLElBQUl5TCxTQUFTekwsR0FBR0osV0FBVyxHQUFHO1lBQzFCLE1BQU0sSUFBSWtDLE1BQU0sT0FBTzlCLElBQUk7QUFDOUI7QUFDSjtJQUNELEtBQUssSUFBSUEsSUFBSSxHQUFHQSxJQUFJMEwsVUFBVTlMLFFBQVFJLEtBQUs7UUFDdkMsSUFBSTBMLFVBQVUxTCxHQUFHSixXQUFXLEdBQUc7WUFDM0IsTUFBTSxJQUFJa0MsTUFBTSxRQUFROUIsSUFBSTtBQUMvQjtBQUNKO0lBRUQsT0FBTyxFQUFDeUwsVUFBVUM7QUFDdEI7O0FDaEhBLE1BQU1FO0lBTUYsV0FBQWhHLENBQVlyQztRQUNSc0MsS0FBS2dHLGdCQUFnQnRJO1FBQ3JCLE9BQU84SCxXQUFXQyxjQUFjQyxZQUFZaEk7UUFDNUNzQyxLQUFLeUYsYUFBYUEsV0FBV25ELEtBQUksQ0FBQzJELE9BQU85TCxPQUM5QjtZQUNIbUMsT0FBT25DO1lBQ1BrQyxNQUFNO1lBQ040Sjs7UUFHUmpHLEtBQUt3RixZQUFZQSxVQUFVbEQsS0FBSSxDQUFDMkQsT0FBTzlMLE9BQzVCO1lBQ0htQyxPQUFPbkM7WUFDUGtDLE1BQU07WUFDTjRKOztRQUdSakcsS0FBSy9HLE9BQU91TSxVQUFVekw7QUFDekI7OztBQ3RETCxNQUFNbU0scUJBQXNCQztJQUN4QixNQUFNbkQsT0FBT3RFLEtBQUtDLE1BQU13SDtJQUN4QjtRQUNJLE9BQU8sSUFBSUosT0FBTy9DO0FBQ3JCLE1BQUMsT0FBT29EO1FBQ0xDLFFBQVFDLE1BQU0scUNBQXFDRjtRQUNuRCxPQUFPO0FBQ1Y7QUFBQTs7QUFHTCxNQUFNRyxtQkFBb0JDO0lBQ3RCLE1BQU14RCxPQUFPdEUsS0FBS0csVUFBVTJIO0lBQzVCLE9BQU94RDtBQUFJOztBQ0ZmLE1BQU15RCxpQkFBNkI7SUFDL0J0TSxHQUFHO0lBQ0hDLEdBQUc7SUFDSHNNLFVBQVU7OztBQUdkLE1BQU1DO0lBSUYsV0FBQTVHLENBQVk2RztRQUNSNUcsS0FBSzRHLE9BQU9BO1FBQ1o1RyxLQUFLNkcsU0FBY3hKLE9BQUF5SixPQUFBLENBQUEsR0FBQUw7QUFDdEI7OztBQ3hCTCxJQUFJTTs7QUFDSixNQUFNQyxRQUFRLElBQUlDLFdBQVc7O0FBQ2QsU0FBU0M7SUFFdEIsS0FBS0gsaUJBQWlCO1FBRXBCQSx5QkFBeUJJLFdBQVcsZUFBZUEsT0FBT0osbUJBQW1CSSxPQUFPSixnQkFBZ0JLLEtBQUtEO1FBRXpHLEtBQUtKLGlCQUFpQjtZQUNwQixNQUFNLElBQUk5SyxNQUFNO0FBQ2pCO0FBQ0Y7SUFFRCxPQUFPOEssZ0JBQWdCQztBQUN6Qjs7QUNqQkEsSUFBQUssUUFBZTs7QUNFZixTQUFTQyxTQUFTQztJQUNoQixjQUFjQSxTQUFTLFlBQVlGLE1BQU1HLEtBQUtEO0FBQ2hEOztBQ0VBLE1BQU1FLFlBQVk7O0FBRWxCLEtBQUssSUFBSXROLElBQUksR0FBR0EsSUFBSSxPQUFPQSxHQUFHO0lBQzVCc04sVUFBVXBPLE1BQU1jLElBQUksS0FBT2tKLFNBQVMsSUFBSWUsTUFBTTtBQUNoRDs7QUFFTyxTQUFTc0QsZ0JBQWdCQyxLQUFLcEwsU0FBUztJQUc1QyxRQUFRa0wsVUFBVUUsSUFBSXBMLFNBQVMsTUFBTWtMLFVBQVVFLElBQUlwTCxTQUFTLE1BQU1rTCxVQUFVRSxJQUFJcEwsU0FBUyxNQUFNa0wsVUFBVUUsSUFBSXBMLFNBQVMsTUFBTSxNQUFNa0wsVUFBVUUsSUFBSXBMLFNBQVMsTUFBTWtMLFVBQVVFLElBQUlwTCxTQUFTLE1BQU0sTUFBTWtMLFVBQVVFLElBQUlwTCxTQUFTLE1BQU1rTCxVQUFVRSxJQUFJcEwsU0FBUyxNQUFNLE1BQU1rTCxVQUFVRSxJQUFJcEwsU0FBUyxNQUFNa0wsVUFBVUUsSUFBSXBMLFNBQVMsTUFBTSxNQUFNa0wsVUFBVUUsSUFBSXBMLFNBQVMsT0FBT2tMLFVBQVVFLElBQUlwTCxTQUFTLE9BQU9rTCxVQUFVRSxJQUFJcEwsU0FBUyxPQUFPa0wsVUFBVUUsSUFBSXBMLFNBQVMsT0FBT2tMLFVBQVVFLElBQUlwTCxTQUFTLE9BQU9rTCxVQUFVRSxJQUFJcEwsU0FBUyxNQUFNb0g7QUFDdmY7O0FDZEEsU0FBU2hGLE1BQU00STtJQUNiLEtBQUtELFNBQVNDLE9BQU87UUFDbkIsTUFBTUssVUFBVTtBQUNqQjtJQUVELElBQUlDO0lBQ0osTUFBTUYsTUFBTSxJQUFJVixXQUFXO0lBRTNCVSxJQUFJLE1BQU1FLElBQUlDLFNBQVNQLEtBQUtuRCxNQUFNLEdBQUcsSUFBSSxTQUFTO0lBQ2xEdUQsSUFBSSxLQUFLRSxNQUFNLEtBQUs7SUFDcEJGLElBQUksS0FBS0UsTUFBTSxJQUFJO0lBQ25CRixJQUFJLEtBQUtFLElBQUk7SUFFYkYsSUFBSSxNQUFNRSxJQUFJQyxTQUFTUCxLQUFLbkQsTUFBTSxHQUFHLEtBQUssU0FBUztJQUNuRHVELElBQUksS0FBS0UsSUFBSTtJQUViRixJQUFJLE1BQU1FLElBQUlDLFNBQVNQLEtBQUtuRCxNQUFNLElBQUksS0FBSyxTQUFTO0lBQ3BEdUQsSUFBSSxLQUFLRSxJQUFJO0lBRWJGLElBQUksTUFBTUUsSUFBSUMsU0FBU1AsS0FBS25ELE1BQU0sSUFBSSxLQUFLLFNBQVM7SUFDcER1RCxJQUFJLEtBQUtFLElBQUk7SUFHYkYsSUFBSSxPQUFPRSxJQUFJQyxTQUFTUCxLQUFLbkQsTUFBTSxJQUFJLEtBQUssT0FBTyxnQkFBZ0I7SUFDbkV1RCxJQUFJLE1BQU1FLElBQUksYUFBYztJQUM1QkYsSUFBSSxNQUFNRSxNQUFNLEtBQUs7SUFDckJGLElBQUksTUFBTUUsTUFBTSxLQUFLO0lBQ3JCRixJQUFJLE1BQU1FLE1BQU0sSUFBSTtJQUNwQkYsSUFBSSxNQUFNRSxJQUFJO0lBQ2QsT0FBT0Y7QUFDVDs7QUM3QkEsU0FBU0ksY0FBY3RKO0lBQ3JCQSxNQUFNdUosU0FBU0MsbUJBQW1CeEo7SUFFbEMsTUFBTXlKLFFBQVE7SUFFZCxLQUFLLElBQUkvTixJQUFJLEdBQUdBLElBQUlzRSxJQUFJMUUsVUFBVUksR0FBRztRQUNuQytOLE1BQU03TyxLQUFLb0YsSUFBSTBKLFdBQVdoTztBQUMzQjtJQUVELE9BQU8rTjtBQUNUOztBQUVPLE1BQU1FLE1BQU07O0FBQ1osTUFBTUMsTUFBTTs7QUFDSixTQUFTQyxJQUFJMUIsTUFBTTJCLFNBQVNDO0lBQ3pDLFNBQVNDLGFBQWFyTCxPQUFPc0wsV0FBV0MsS0FBS3BNO1FBQzNDLElBQUlxTTtRQUVKLFdBQVd4TCxVQUFVLFVBQVU7WUFDN0JBLFFBQVEySyxjQUFjM0s7QUFDdkI7UUFFRCxXQUFXc0wsY0FBYyxVQUFVO1lBQ2pDQSxZQUFZL0osTUFBTStKO0FBQ25CO1FBRUQsTUFBTUUsYUFBYUYsZUFBZSxRQUFRRSxvQkFBb0IsU0FBUyxJQUFJQSxXQUFXN08sWUFBWSxJQUFJO1lBQ3BHLE1BQU02TixVQUFVO0FBQ2pCO1FBS0QsSUFBSU0sUUFBUSxJQUFJakIsV0FBVyxLQUFLN0osTUFBTXJEO1FBQ3RDbU8sTUFBTXBQLElBQUk0UDtRQUNWUixNQUFNcFAsSUFBSXNFLE9BQU9zTCxVQUFVM087UUFDM0JtTyxRQUFRTSxTQUFTTjtRQUNqQkEsTUFBTSxLQUFLQSxNQUFNLEtBQUssS0FBT0s7UUFDN0JMLE1BQU0sS0FBS0EsTUFBTSxLQUFLLEtBQU87UUFFN0IsSUFBSVMsS0FBSztZQUNQcE0sU0FBU0EsVUFBVTtZQUVuQixLQUFLLElBQUlwQyxJQUFJLEdBQUdBLElBQUksTUFBTUEsR0FBRztnQkFDM0J3TyxJQUFJcE0sU0FBU3BDLEtBQUsrTixNQUFNL047QUFDekI7WUFFRCxPQUFPd087QUFDUjtRQUVELE9BQU9qQixnQkFBZ0JRO0FBQ3hCO0lBR0Q7UUFDRU8sYUFBYTdCLE9BQU9BO0FBQ3hCLE1BQUksT0FBT2lDLE1BQU87SUFHaEJKLGFBQWFMLE1BQU1BO0lBQ25CSyxhQUFhSixNQUFNQTtJQUNuQixPQUFPSTtBQUNUOztBQ2pFQSxNQUFNSyxvQkFBb0IzQixXQUFXLGVBQWVBLE9BQU8yQixjQUFjM0IsT0FBTzJCLFdBQVcxQixLQUFLRDs7QUFDaEcsSUFBZTRCLFNBQUE7SUFDYkQ7OztBQ0VGLFNBQVNFLEdBQUdDLFNBQVNOLEtBQUtwTTtJQUN4QixJQUFJd00sT0FBT0QsZUFBZUgsUUFBUU0sU0FBUztRQUN6QyxPQUFPRixPQUFPRDtBQUNmO0lBRURHLFVBQVVBLFdBQVc7SUFDckIsTUFBTUMsT0FBT0QsUUFBUUUsV0FBV0YsUUFBUS9CLE9BQU9BO0lBRS9DZ0MsS0FBSyxLQUFLQSxLQUFLLEtBQUssS0FBTztJQUMzQkEsS0FBSyxLQUFLQSxLQUFLLEtBQUssS0FBTztJQUUzQixJQUFJUCxLQUFLO1FBQ1BwTSxTQUFTQSxVQUFVO1FBRW5CLEtBQUssSUFBSXBDLElBQUksR0FBR0EsSUFBSSxNQUFNQSxHQUFHO1lBQzNCd08sSUFBSXBNLFNBQVNwQyxLQUFLK08sS0FBSy9PO0FBQ3hCO1FBRUQsT0FBT3dPO0FBQ1I7SUFFRCxPQUFPakIsZ0JBQWdCd0I7QUFDekI7O0FDeEJBLFNBQVNFLEVBQUVDLEdBQUd0TixHQUFHQyxHQUFHc047SUFDbEIsUUFBUUQ7TUFDTixLQUFLO1FBQ0gsT0FBT3ROLElBQUlDLEtBQUtELElBQUl1Tjs7TUFFdEIsS0FBSztRQUNILE9BQU92TixJQUFJQyxJQUFJc047O01BRWpCLEtBQUs7UUFDSCxPQUFPdk4sSUFBSUMsSUFBSUQsSUFBSXVOLElBQUl0TixJQUFJc047O01BRTdCLEtBQUs7UUFDSCxPQUFPdk4sSUFBSUMsSUFBSXNOOztBQUVyQjs7QUFFQSxTQUFTQyxLQUFLeE4sR0FBR3lOO0lBQ2YsT0FBT3pOLEtBQUt5TixJQUFJek4sTUFBTSxLQUFLeU47QUFDN0I7O0FBRUEsU0FBU0MsS0FBS3ZCO0lBQ1osTUFBTXdCLElBQUksRUFBQyxZQUFZLFlBQVksWUFBWTtJQUMvQyxNQUFNQyxJQUFJLEVBQUMsWUFBWSxZQUFZLFlBQVksV0FBWTtJQUUzRCxXQUFXekIsVUFBVSxVQUFVO1FBQzdCLE1BQU0wQixNQUFNNUIsU0FBU0MsbUJBQW1CQztRQUV4Q0EsUUFBUTtRQUVSLEtBQUssSUFBSS9OLElBQUksR0FBR0EsSUFBSXlQLElBQUk3UCxVQUFVSSxHQUFHO1lBQ25DK04sTUFBTTdPLEtBQUt1USxJQUFJekIsV0FBV2hPO0FBQzNCO0FBQ0YsV0FBTSxLQUFLTixNQUFNZ1EsUUFBUTNCLFFBQVE7UUFFaENBLFFBQVFyTyxNQUFNaVEsVUFBVTFGLE1BQU0yRixLQUFLN0I7QUFDcEM7SUFFREEsTUFBTTdPLEtBQUs7SUFDWCxNQUFNMlEsSUFBSTlCLE1BQU1uTyxTQUFTLElBQUk7SUFDN0IsTUFBTWtRLElBQUl0USxLQUFLdVEsS0FBS0YsSUFBSTtJQUN4QixNQUFNRyxJQUFJLElBQUl0USxNQUFNb1E7SUFFcEIsS0FBSyxJQUFJOVAsSUFBSSxHQUFHQSxJQUFJOFAsS0FBSzlQLEdBQUc7UUFDMUIsTUFBTXdOLE1BQU0sSUFBSXlDLFlBQVk7UUFFNUIsS0FBSyxJQUFJaFEsSUFBSSxHQUFHQSxJQUFJLE1BQU1BLEdBQUc7WUFDM0J1TixJQUFJdk4sS0FBSzhOLE1BQU0vTixJQUFJLEtBQUtDLElBQUksTUFBTSxLQUFLOE4sTUFBTS9OLElBQUksS0FBS0MsSUFBSSxJQUFJLE1BQU0sS0FBSzhOLE1BQU0vTixJQUFJLEtBQUtDLElBQUksSUFBSSxNQUFNLElBQUk4TixNQUFNL04sSUFBSSxLQUFLQyxJQUFJLElBQUk7QUFDbEk7UUFFRCtQLEVBQUVoUSxLQUFLd047QUFDUjtJQUVEd0MsRUFBRUYsSUFBSSxHQUFHLE9BQU8vQixNQUFNbk8sU0FBUyxLQUFLLElBQUlKLEtBQUswUSxJQUFJLEdBQUc7SUFDcERGLEVBQUVGLElBQUksR0FBRyxNQUFNdFEsS0FBS0MsTUFBTXVRLEVBQUVGLElBQUksR0FBRztJQUNuQ0UsRUFBRUYsSUFBSSxHQUFHLE9BQU8vQixNQUFNbk8sU0FBUyxLQUFLLElBQUk7SUFFeEMsS0FBSyxJQUFJSSxJQUFJLEdBQUdBLElBQUk4UCxLQUFLOVAsR0FBRztRQUMxQixNQUFNbVEsSUFBSSxJQUFJRixZQUFZO1FBRTFCLEtBQUssSUFBSUcsSUFBSSxHQUFHQSxJQUFJLE1BQU1BLEdBQUc7WUFDM0JELEVBQUVDLEtBQUtKLEVBQUVoUSxHQUFHb1E7QUFDYjtRQUVELEtBQUssSUFBSUEsSUFBSSxJQUFJQSxJQUFJLE1BQU1BLEdBQUc7WUFDNUJELEVBQUVDLEtBQUtoQixLQUFLZSxFQUFFQyxJQUFJLEtBQUtELEVBQUVDLElBQUksS0FBS0QsRUFBRUMsSUFBSSxNQUFNRCxFQUFFQyxJQUFJLEtBQUs7QUFDMUQ7UUFFRCxJQUFJeEwsSUFBSTRLLEVBQUU7UUFDVixJQUFJM0ssSUFBSTJLLEVBQUU7UUFDVixJQUFJYSxJQUFJYixFQUFFO1FBQ1YsSUFBSWMsSUFBSWQsRUFBRTtRQUNWLElBQUl2RCxJQUFJdUQsRUFBRTtRQUVWLEtBQUssSUFBSVksSUFBSSxHQUFHQSxJQUFJLE1BQU1BLEdBQUc7WUFDM0IsTUFBTWxCLElBQUkxUCxLQUFLQyxNQUFNMlEsSUFBSTtZQUN6QixNQUFNRyxJQUFJbkIsS0FBS3hLLEdBQUcsS0FBS3FLLEVBQUVDLEdBQUdySyxHQUFHd0wsR0FBR0MsS0FBS3JFLElBQUlzRCxFQUFFTCxLQUFLaUIsRUFBRUMsT0FBTztZQUMzRG5FLElBQUlxRTtZQUNKQSxJQUFJRDtZQUNKQSxJQUFJakIsS0FBS3ZLLEdBQUcsUUFBUTtZQUNwQkEsSUFBSUQ7WUFDSkEsSUFBSTJMO0FBQ0w7UUFFRGYsRUFBRSxLQUFLQSxFQUFFLEtBQUs1SyxNQUFNO1FBQ3BCNEssRUFBRSxLQUFLQSxFQUFFLEtBQUszSyxNQUFNO1FBQ3BCMkssRUFBRSxLQUFLQSxFQUFFLEtBQUthLE1BQU07UUFDcEJiLEVBQUUsS0FBS0EsRUFBRSxLQUFLYyxNQUFNO1FBQ3BCZCxFQUFFLEtBQUtBLEVBQUUsS0FBS3ZELE1BQU07QUFDckI7SUFFRCxPQUFPLEVBQUN1RCxFQUFFLE1BQU0sS0FBSyxLQUFNQSxFQUFFLE1BQU0sS0FBSyxLQUFNQSxFQUFFLE1BQU0sSUFBSSxLQUFNQSxFQUFFLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLElBQUksS0FBTUEsRUFBRSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxLQUFLLEtBQU1BLEVBQUUsTUFBTSxJQUFJLEtBQU1BLEVBQUUsS0FBSyxLQUFNQSxFQUFFLE1BQU0sS0FBSyxLQUFNQSxFQUFFLE1BQU0sS0FBSyxLQUFNQSxFQUFFLE1BQU0sSUFBSSxLQUFNQSxFQUFFLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLEtBQUssS0FBTUEsRUFBRSxNQUFNLElBQUksS0FBTUEsRUFBRSxLQUFLO0FBQzdWOztBQzNGQSxNQUFNZ0IsS0FBS3JDLElBQUksTUFBTSxJQUFNbUI7O0FBQzNCLElBQUFtQixTQUFlRDs7QUNEZixTQUFTcEMsUUFBUWhCO0lBQ2YsS0FBS0QsU0FBU0MsT0FBTztRQUNuQixNQUFNSyxVQUFVO0FBQ2pCO0lBRUQsT0FBT0UsU0FBU1AsS0FBS25ELE1BQU0sSUFBSSxLQUFLO0FBQ3RDOztBQ0pBLE1BQU15RyxpQkFBaUI7O0FBRXZCLE1BQU1DO0lBSUYsV0FBQS9LLENBQVlnTDtRQUNSLElBQ0lBLGdCQUNBQSxhQUFhaFIsU0FBUyxLQUN0QmlSLFNBQWFELGlCQUNiRSxRQUFZRixrQkFBa0IsR0FDaEM7WUFDRS9LLEtBQUsrSyxlQUFlQTtBQUN2QixlQUFNO1lBRUgvSyxLQUFLK0ssZUFBZUc7QUFDdkI7UUFHRGxMLEtBQUttTCxjQUFjUCxPQUFPQSxPQUFPdkMsTUFBTXdDLGdCQUFnQjdLLEtBQUsrSztBQUMvRDs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOls5LDEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5XX0=
