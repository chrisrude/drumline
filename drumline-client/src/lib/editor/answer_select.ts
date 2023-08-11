import type { BandGroup, CellAttributes, GridAttributes, RowGroup } from '@chrisrude/drumline-lib';

export { AnswerSelect };

const LOCATION_NONE: [number, number] = [-1, -1];

// todo: move to coordinate class?
const isNone = ([i, j]: [number, number]): boolean =>
    i === LOCATION_NONE[0] || j === LOCATION_NONE[1];

// TODO: ipad dragging

class AnswerSelect {
    readonly gridAttributes;
    readonly fn_is_using_band;

    draggingStart: [number, number];
    draggingEnd: [number, number];
    mouseDragging: boolean;

    constructor(gridAttributes: GridAttributes, fn_is_using_band: () => boolean) {
        this.gridAttributes = gridAttributes;
        this.fn_is_using_band = fn_is_using_band;

        this.draggingStart = [...LOCATION_NONE];
        this.draggingEnd = [...LOCATION_NONE];
        this.mouseDragging = false;
    }

    _attributesAt = ([i, j]: [number, number]): CellAttributes => this.gridAttributes.cells[i][j];

    _currentGroup = (attr: CellAttributes): BandGroup | RowGroup =>
        this.fn_is_using_band() ? attr.band_group : attr.row_group;

    _start_equals_end = (): boolean =>
        this.draggingStart[0] == this.draggingEnd[0] &&
        this.draggingStart[1] == this.draggingEnd[1];

    clearDragging = (): void => {
        this.draggingStart = [...LOCATION_NONE];
        this.draggingEnd = [...LOCATION_NONE];
        this.mouseDragging = false;
    };

    startDrag = (i: number, j: number) => {
        if (this.mouseDragging) {
            return;
        }
        this.draggingStart = [i, j];
        this.draggingEnd = [i, j];
        this.mouseDragging = true;
    };

    _orderByPath = (
        start: [number, number],
        end: [number, number]
    ): [[number, number], [number, number]] => {
        const startInfo = this._currentGroup(this._attributesAt(start));
        const endInfo = this._currentGroup(this._attributesAt(end));
        if (startInfo.offset > endInfo.offset) {
            return [end, start];
        }
        return [start, end];
    };

    _getDraggingBand = (): number => {
        if (!this.fn_is_using_band()) {
            return -1;
        }
        if (isNone(this.draggingStart)) {
            return -1;
        }
        return this._attributesAt(this.draggingStart).band_group.index;
    };

    dragOver = (i: number, j: number) => {
        if (!this.mouseDragging) {
            return;
        }
        if (this.fn_is_using_band()) {
            const band = this._attributesAt([i, j]).band_group.index;
            if (band !== this._getDraggingBand()) {
                // do nothing
                return;
            }
        } else {
            if (i !== this.draggingStart[0]) {
                // do nothing
                return;
            }
        }
        this.draggingEnd = [i, j];
    };

    onPath = (i: number, j: number) => {
        if (!this.mouseDragging) {
            return false;
        }
        // if we don't have an end, we're not on the path
        if (isNone(this.draggingEnd)) {
            return false;
        }
        // if we haven't dragged anywhere, we're not on the path
        if (this._start_equals_end()) {
            return false;
        }

        if (this.fn_is_using_band()) {
            const cellInfoStart = this._attributesAt(this.draggingStart);
            const cellInfoEnd = this._attributesAt(this.draggingEnd);
            const cellInfoCurrent = this._attributesAt([i, j]);
            if (cellInfoCurrent.band_group.index !== this._getDraggingBand()) {
                // do nothing
                return false;
            }
            // is the cell on or between the start and end of the drag?
            const bandStartIdx = cellInfoStart.band_group.offset;
            const bandEndIdx = cellInfoEnd.band_group.offset;
            const cellIdx = cellInfoCurrent.band_group.offset;

            const minIdx = Math.min(bandStartIdx, bandEndIdx);
            const maxIdx = Math.max(bandStartIdx, bandEndIdx);
            if (cellIdx >= minIdx && cellIdx <= maxIdx) {
                return true;
            }
            return false;
        }
        // row path
        if (i !== this.draggingStart[0]) {
            return false;
        }

        const minCol = Math.min(this.draggingStart[1], this.draggingEnd[1]);
        const maxCol = Math.max(this.draggingStart[1], this.draggingEnd[1]);
        if (j >= minCol && j <= maxCol) {
            return true;
        }
        return false;
    };

    endDrag = (): [[number, number], [number, number]] | null => {
        this.mouseDragging = false;
        // sort the start and end

        // if we don't have an end, we're not on the path
        if (isNone(this.draggingEnd)) {
            return null;
        }

        // if we haven't dragged anywhere, we're not on the path
        if (this._start_equals_end()) {
            return null;
        }

        const result = this._orderByPath(this.draggingStart, this.draggingEnd);
        this.clearDragging();

        return result;
    };
}
