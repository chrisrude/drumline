<script lang="ts">
    import { AnswerSelect } from '$lib/editor/answer_select';
    import { firstEmptyCell, nextEmptyCell } from '$lib/editor/cursor';
    import {
        canGroupIntoAnswer,
        canUngroupAnswer,
        findWordBounds
    } from '$lib/editor/word_grouping';
    import type { NetworkedGameState } from '$lib/network/networked_game_state';
    import { storedGameState } from '$lib/stores/game_state_store';
    import {
        clear,
        clearSegment,
        markSegment,
        memoizedGenerateGridAttributes,
        set,
        type BandGroup,
        type BandSides,
        type CellAttributes,
        type GameActions,
        type RowGroup
    } from '@chrisrude/drumline-lib';
    import { BAND_IDENTIFIERS } from '@chrisrude/drumline-lib/lib/clue_parser';

    export let gameState: NetworkedGameState;
    export let highlightRow: number = -1;
    export let highlightBand: number = -1;

    const LOCATION_NONE: [number, number] = [-1, -1];
    let cursorLocation: [number, number] = [...LOCATION_NONE];

    const gridAttributes = memoizedGenerateGridAttributes(gameState.size);

    const isUsingBand = () => highlightBand !== -1;

    const answerSelect = new AnswerSelect(gridAttributes, isUsingBand);
    // use this as a prop as to trigger a re-render
    let isDragging: boolean = false;

    $: highlightRow !== undefined && gotoRow();
    $: highlightBand !== undefined && gotoBand();

    const apply = (action: GameActions) => {
        storedGameState.update((gs) => {
            if (null === gs) {
                return null;
            }
            gs.apply_from_ui(action);
            return gs;
        });
    };

    const attributesAtCursor = (): CellAttributes => attributesAt(cursorLocation);

    const attributesAt = ([i, j]: [number, number]): CellAttributes => gridAttributes.cells[i][j];

    const currentGroup = (attr: CellAttributes): BandGroup | RowGroup =>
        isUsingBand() ? attr.band_group : attr.row_group;

    const isNone = ([i, j]: [number, number]): boolean =>
        i === LOCATION_NONE[0] || j === LOCATION_NONE[1];

    const cancelDrag = () => {
        if (isDragging) {
            answerSelect.clearDragging();
            isDragging = false;
        }
    };

    const gotoRow = () => {
        if (-1 == highlightRow) {
            return;
        }
        cancelDrag();
        highlightBand = -1;
        // if we're not in the highlighted row, go to the first
        // empty cell in the row.
        if (!isNone(cursorLocation) && attributesAtCursor().row_group.index === highlightRow) {
            return;
        }
        const locations = gridAttributes.locations_for_row[highlightRow];
        if (!locations) {
            return;
        }
        cursorLocation = firstEmptyCell(gameState.grid, locations, false);
    };

    const gotoBand = () => {
        if (-1 == highlightBand) {
            return;
        }
        cancelDrag();
        highlightRow = -1;
        // if the cursor happens to be in the band already, leave it there
        if (!isNone(cursorLocation) && attributesAtCursor().band_group.index === highlightBand) {
            return;
        }
        const locations = gridAttributes.locations_for_band[highlightBand];
        if (!locations) {
            return;
        }
        // if we're not in the band, move cursor to the first
        // empty cell in the band
        cursorLocation = firstEmptyCell(gameState.grid, locations, true);
    };

    const getCellClass = (i: number, j: number) =>
        gridAttributes.cells[i][j].band_group.index % 2 === 0 ? 'even-band' : 'odd-band';

    const cursorCellGroup = (): RowGroup | BandGroup => currentGroup(attributesAtCursor());

    const nextCell = (): [number, number] => cursorCellGroup().next;

    const prevCell = (): [number, number] => cursorCellGroup().prev;

    const nextEmptyCellAtCursor = () => {
        const locations_list = isUsingBand()
            ? gridAttributes.locations_for_band
            : gridAttributes.locations_for_row;
        const cellGroup = cursorCellGroup();
        if (cellGroup.offset === -1) {
            // if we're at the start, just return the first cell
            throw new Error('location_offset cannot be -1');
        }
        return nextEmptyCell(
            gameState.grid,
            locations_list[cellGroup.index],
            cellGroup.offset,
            isUsingBand()
        );
    };

    const groupIntoAnswer = (): void => {
        const wordBounds = findWordBounds(
            gameState.grid,
            gameState,
            gridAttributes,
            cursorLocation,
            isUsingBand()
        );
        if (wordBounds === null) {
            return;
        }
        const cellGroup = cursorCellGroup();
        const action = markSegment(cellGroup, wordBounds[0], wordBounds[1]);
        apply(action);
    };

    const canGroup = (): boolean =>
        canGroupIntoAnswer(gameState, gridAttributes, cursorLocation, isUsingBand());

    const canUngroup = (): boolean =>
        canUngroupAnswer(gameState, gridAttributes, cursorLocation, isUsingBand());

    const clearAnswerAtLocation = (): boolean => {
        if (!canUngroup()) {
            return false;
        }
        const cellGroup = cursorCellGroup();
        const action = clearSegment(cellGroup, cellGroup.offset);
        apply(action);
        return true;
    };

    const onShiftDown = (start: [number, number], next: [number, number]) => {
        const attrStart = attributesAt(start);
        if (
            currentGroup(attributesAt(next)).index != currentGroup(attrStart).index ||
            attrStart.is_center
        ) {
            // don't start a drag across groups
            return;
        }
        if (!isDragging) {
            answerSelect.startDrag(start[0], start[1]);
            isDragging = true;
        }
        answerSelect.dragOver(next[0], next[1]);
        isDragging = false;
        isDragging = true;
    };

    const onKeyUp = (event: KeyboardEvent): void => {
        if (event.key === 'Shift') {
            handleDragEnd();
            event.preventDefault();
        }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        // In the switch-case we're updating our boolean flags whenever the
        // desired bound keys are pressed.
        if (event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        if (isNone(cursorLocation)) {
            return;
        }
        if (highlightBand === -1 && highlightRow === -1) {
            return;
        }
        let newLocation: [number, number] = [...cursorLocation];
        switch (event.key) {
            case 'ArrowDown':
                if (newLocation[0] < gameState.size - 1) {
                    newLocation[0] += 1;
                }
                if (event.shiftKey) {
                    onShiftDown(cursorLocation, newLocation);
                }
                break;
            case 'ArrowUp':
                if (newLocation[0] > 0) {
                    newLocation[0] -= 1;
                }
                if (event.shiftKey) {
                    onShiftDown(cursorLocation, newLocation);
                }
                break;
            case 'ArrowLeft':
                if (newLocation[1] > 0) {
                    newLocation[1] -= 1;
                }
                if (event.shiftKey) {
                    onShiftDown(cursorLocation, newLocation);
                }
                break;
            case 'ArrowRight':
                if (newLocation[1] < gameState.size - 1) {
                    newLocation[1] += 1;
                }
                if (event.shiftKey) {
                    onShiftDown(cursorLocation, newLocation);
                }
                break;
            case 'Tab':
                newLocation = event.shiftKey ? prevCell() : nextCell();
                if (event.shiftKey) {
                    onShiftDown(cursorLocation, newLocation);
                }
                break;
            case 'Escape':
                cancelDrag();
                // nothing else special to do
                return;
            case ' ':
                toggleSelection();
                break;
            case '.':
                // find adjacent letters and mark them as a word
                //
                groupIntoAnswer();
                break;
            case 'Backspace':
                // first, if our current square is in a word,
                // clear the word and do nothing else
                if (clearAnswerAtLocation()) {
                    break;
                }

                const original_location: [number, number] = [...cursorLocation];
                // check to see if we're in an empty square, if so
                // move to the previous square
                if (!gameState.cell(cursorLocation).is_filled()) {
                    newLocation = prevCell();
                    highlight(newLocation);

                    // again, check to see if this new square is in a word
                    // if so clear the word and do nothing else
                    if (clearAnswerAtLocation()) {
                        // whoops, stay on original square
                        newLocation = original_location;
                        break;
                    }
                }

                // no word to clear, so just clear the character in the
                // current square
                const action = clear({
                    row: cursorLocation[0],
                    col: cursorLocation[1]
                });
                apply(action);
                break;
            default:
                if (event.key.length === 1) {
                    const action = set(
                        {
                            row: cursorLocation[0],
                            col: cursorLocation[1]
                        },
                        event.key
                    );
                    apply(action);
                    // move to next cell, either in the row or the band
                    newLocation = nextEmptyCellAtCursor();
                    break;
                } else {
                    // don't stop default behavior
                    return;
                }
        }
        highlight(newLocation);
        event.preventDefault();
    };

    const toggleSelection = (): void => {
        cancelDrag();
        const cellInfo = attributesAtCursor();
        if (highlightRow !== -1) {
            highlightBand = cellInfo.band_group.index;
            highlightRow = -1;
        } else {
            highlightRow = cellInfo.row_group.index;
            highlightBand = -1;
        }
    };

    const highlight = (newLocation: [number, number], from_click: boolean = false) => {
        if (cursorLocation == newLocation) {
            // do nothing
            if (from_click) {
                toggleSelection();
            }
            return;
        }
        const newAttr = attributesAt(newLocation);
        // if the last highlight was a row, keep that
        // otherwise, highlight the band
        if (highlightRow !== -1) {
            // do this instead of newLocation[0] to avoid dragging
            // through the center cell.  We still want to move the
            // cursor to the center cell, though.
            if (highlightRow !== newAttr.row_group.index || newAttr.is_center) {
                cancelDrag();
            }
            highlightRow = newLocation[0];
        } else {
            const newBand = newAttr.band_group.index;
            if (highlightBand !== newBand) {
                cancelDrag();
            }
            highlightBand = newBand;
        }
        cursorLocation = newLocation;
    };

    const onPath = (i: number, j: number) => {
        return answerSelect.onPath(i, j);
    };

    const onDragStart = (event: MouseEvent, i: number, j: number) => {
        if (isDragging) {
            return;
        }
        if (highlightRow === -1 && highlightBand === -1) {
            return;
        }
        answerSelect.startDrag(i, j);
        isDragging = true;
        event.preventDefault();
    };

    const onDragOver = (event: MouseEvent, i: number, j: number) => {
        if (!isDragging) {
            return;
        }
        answerSelect.dragOver(i, j);

        // assignment to trigger render
        isDragging = false;
        isDragging = true;

        event.preventDefault();
    };

    const handleDragEnd = () => {
        if (!isDragging) {
            return;
        }
        isDragging = false;

        const result = answerSelect.endDrag();
        if (result === null) {
            // there was no selection after all
            return;
        }
        const [draggingStart, draggingEnd] = result;
        const clueStart = currentGroup(attributesAt(draggingStart));
        const clueEnd = currentGroup(attributesAt(draggingEnd));

        const action = markSegment(clueStart, clueStart.offset, clueEnd.offset);
        apply(action);
    };

    const onDragEnd = (event: MouseEvent) => {
        handleDragEnd();
        event.preventDefault();
    };

    const row_word_attrs = (i: number, j: number): [boolean, boolean, boolean] => {
        const attrs = attributesAt([i, j]);
        return gameState.row_answer_segments[attrs.row_group.index].in_answer_at_offset(
            attrs.row_group.offset
        );
    };

    const band_word_attrs = (i: number, j: number): [boolean, boolean, boolean] => {
        const attrs = attributesAt([i, j]);
        return gameState.band_answer_segments[attrs.band_group.index].in_answer_at_offset(
            attrs.band_group.offset
        );
    };

    const isInRowWord = (i: number, j: number): boolean => row_word_attrs(i, j)[0];
    const isRowWordStart = (i: number, j: number) => row_word_attrs(i, j)[1];
    const isRowWordEnd = (i: number, j: number) => row_word_attrs(i, j)[2];

    const isInBandWord = (i: number, j: number) => band_word_attrs(i, j)[0];
    const isBandWordStart = (i: number, j: number) => band_word_attrs(i, j)[1];
    const isBandWordEnd = (i: number, j: number) => band_word_attrs(i, j)[2];

    const isBandCorner = (i: number, j: number, side: BandSides): boolean => {
        const band_group = attributesAt([i, j]).band_group;
        return band_group.is_corner && band_group.side === side;
    };

    const isBandSide = (i: number, j: number, side: BandSides): boolean => {
        const band_group = attributesAt([i, j]).band_group;
        return !band_group.is_corner && band_group.side === side;
    };
</script>

<svelte:window
    on:keydown={onKeyDown}
    on:keyup={onKeyUp}
    on:mouseup={(isDragging || !isDragging) && onDragEnd}
/>

<div
    class="grid"
    style="--puzzle-size: {gameState.size}"
    class:bandMode={highlightBand !== -1}
    class:rowMode={highlightRow !== -1}
>
    <div class="button-bar">
        <button
            on:click={toggleSelection}
            title="Switch to row mode [space]"
            disabled={isNone(cursorLocation) || highlightRow !== -1}>➡️ select row</button
        >
        <button
            on:click={toggleSelection}
            title="Switch to band mode [space]"
            disabled={isNone(cursorLocation) || highlightBand !== -1}>↩️ select band</button
        >

        <button
            on:click={groupIntoAnswer}
            disabled={isNone(cursorLocation) || (!gameState && gameState) || !canGroup()}
            title="Group these letters into answer [period]">⛶ mark as answer</button
        >

        <button
            on:click={() => clearAnswerAtLocation()}
            disabled={isNone(cursorLocation) || (!gameState && gameState) || !canUngroup()}
            title="Remove this answer [backspace]">⛝ unmark answer</button
        >
    </div>

    {#each { length: gameState.size } as _, i}
        <div class="row">
            <div class="row-number">{i + 1}</div>

            {#each { length: gameState.size } as _, j}
                {#if gameState.center === i && gameState.center === j}
                    <div
                        class="letter center-cell"
                        class:selected={cursorLocation[0] === i && cursorLocation[1] === j}
                    />
                {:else}
                    <!-- this is ok because the keyboard events are handled higher up -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="letter {getCellClass(i, j)}"
                        class:selected={cursorLocation[0] === i && cursorLocation[1] === j}
                        class:highlightRow={highlightRow === i}
                        class:highlightBand={highlightBand ===
                            attributesAt([i, j]).band_group.index}
                        class:dragover={(isDragging || !isDragging) && onPath(i, j)}
                        class:rowWord={highlightRow != -1 &&
                            (!gameState || gameState) &&
                            isInRowWord(i, j)}
                        class:rowWordEnd={highlightRow != -1 &&
                            (!gameState || gameState) &&
                            isRowWordEnd(i, j)}
                        class:rowWordStart={highlightRow != -1 &&
                            (!gameState || gameState) &&
                            isRowWordStart(i, j)}
                        class:bandWord={highlightBand != -1 &&
                            (!gameState || gameState) &&
                            isInBandWord(i, j)}
                        class:bandWordStart={highlightBand != -1 &&
                            (!gameState || gameState) &&
                            isBandWordStart(i, j)}
                        class:bandWordEnd={highlightBand != -1 &&
                            (!gameState || gameState) &&
                            isBandWordEnd(i, j)}
                        class:bandCornerNW={isBandCorner(i, j, 'top')}
                        class:bandSideN={isBandSide(i, j, 'top')}
                        class:bandCornerNE={isBandCorner(i, j, 'right')}
                        class:bandSideE={isBandSide(i, j, 'right')}
                        class:bandCornerSE={isBandCorner(i, j, 'bottom')}
                        class:bandSideS={isBandSide(i, j, 'bottom')}
                        class:bandCornerSW={isBandCorner(i, j, 'left')}
                        class:bandSideW={isBandSide(i, j, 'left')}
                        on:click={() => highlight([i, j], true)}
                        on:mousedown={(event) => onDragStart(event, i, j)}
                        on:mouseenter={(event) => onDragOver(event, i, j)}
                    >
                        {#if i === j && i < gameState.center}
                            <div class="band-letter">
                                {BAND_IDENTIFIERS[i]}
                            </div>
                        {/if}
                        {gameState.grid[i][j].text}
                    </div>
                {/if}
            {/each}
        </div>
    {/each}
</div>

<style>
    .grid {
        --width: min(50vw, 90vh);
        min-width: var(--width);
        min-height: var(--width);
        width: var(--width);
        height: var(--width);
        max-height: var(--width);
        max-width: var(--width);
        display: flex;
        flex-direction: column;
    }

    .grid .row {
        display: grid;
        grid-template-columns: 2rem repeat(var(--puzzle-size), 1fr);
    }

    .grid .row-number {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 0.5rem;
        font-size: calc(
            0.75 * min(50vw / (var(--puzzle-size) * 2), 90vh / (2 * var(--puzzle-size)))
        );
        color: rgba(0, 0, 0, 0.4);
        box-shadow: var(--thin-right);
    }

    .band-letter {
        --offset: calc(min(50vw / (2 * var(--puzzle-size)), 90vh / (2 * var(--puzzle-size))));

        position: absolute;
        font-size: calc(
            0.75 * min(50vw / (2 * var(--puzzle-size)), 90vh / (2 * var(--puzzle-size)))
        );
        font-family: var(--font-body);
        color: rgba(0, 0, 0, 0.4);
        margin-top: var(--offset);
        margin-left: var(--offset);
    }

    .grid .odd-band {
        background-color: var(--color-odd-band);
    }

    .grid .even-band {
        background-color: var(--color-even-band);
    }

    .grid .center-cell {
        background-color: rgba(100, 47, 108, 0.8);
    }

    .letter {
        box-shadow: var(--thin-top), var(--thin-right);
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        font-size: calc(min(100vh / var(--puzzle-size), 33vw / var(--puzzle-size)));
        overflow: hidden;
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
        font-family: var(--font-mono);
    }

    .grid .highlightRow,
    .grid .highlightBand {
        background-color: rgba(var(--color-theme-2-rgb), 0.5);
    }

    .grid .dragover {
        background-color: rgba(var(--color-theme-1-rgb), 0.7);
    }

    /* Word groupings */
    .grid.bandMode .bandWord,
    .grid.rowMode .rowWord {
        color: rgba(0, 0, 0, 0.4);
    }

    .grid.bandMode .bandWord .band-letter,
    .grid.rowMode .rowWord .band-letter {
        color: rgba(0, 0, 0, 0.2);
    }

    .grid.rowMode .rowWord {
        box-shadow: var(--shadow-bottom), var(--thin-top);
    }
    .grid.rowMode .rowWord.rowWordStart {
        box-shadow: var(--shadow-bottom), var(--shadow-left), var(--thin-top);
    }
    .grid.rowMode .rowWord.rowWordEnd {
        box-shadow: var(--shadow-bottom), var(--shadow-right), var(--thin-top);
    }
    .grid.bandMode .bandCornerNW.bandWord {
        box-shadow: var(--thin-top), var(--thin-right);
    }
    .grid.bandMode .bandCornerNW.bandWordStart {
        box-shadow: var(--shadow-bottom), var(--shadow-left), var(--thin-top);
    }
    .grid.bandMode .bandCornerNW.bandWordEnd {
        box-shadow: var(--shadow-right) var(--thin-top);
    }

    .grid.bandMode .bandSideN.bandWord {
        box-shadow: var(--shadow-bottom), var(--thin-top);
    }
    .grid.bandMode .bandSideN.bandWord.bandWordStart {
        box-shadow: var(--shadow-bottom), var(--shadow-left), var(--thin-top);
    }
    .grid.bandMode .bandSideN.bandWord.bandWordEnd {
        box-shadow: var(--shadow-bottom), var(--shadow-right), var(--thin-top);
    }

    .grid.bandMode .bandCornerNE.bandWord {
        box-shadow: var(--thin-top), var(--thin-right);
    }
    .grid.bandMode .bandCornerNE.bandWord.bandWordStart {
        box-shadow: var(--shadow-left), var(--thin-top), var(--thin-right);
    }
    .grid.bandMode .bandCornerNE.bandWord.bandWordEnd {
        box-shadow: var(--shadow-bottom), var(--thin-top), var(--thin-right);
    }

    .grid.bandMode .bandSideE.bandWord {
        box-shadow: var(--shadow-left), var(--thin-right);
    }
    .grid.bandMode .bandSideE.bandWord.bandWordStart {
        box-shadow: var(--shadow-left), var(--shadow-top), var(--thin-right);
    }
    .grid.bandMode .bandSideE.bandWord.bandWordEnd {
        box-shadow: var(--shadow-left), var(--shadow-bottom), var(--thin-right);
    }

    .grid.bandMode .bandCornerSE.bandWord {
        box-shadow: var(--thin-right);
    }
    .grid.bandMode .bandCornerSE.bandWord.bandWordStart {
        box-shadow: var(--shadow-top), var(--thin-right);
    }
    .grid.bandMode .bandCornerSE.bandWord.bandWordEnd {
        box-shadow: var(--shadow-left), var(--thin-right);
    }

    .grid.bandMode .bandSideS.bandWord {
        box-shadow: var(--shadow-top);
    }
    .grid.bandMode .bandSideS.bandWord.bandWordStart {
        box-shadow: var(--shadow-top), var(--shadow-right);
    }
    .grid.bandMode .bandSideS.bandWord.bandWordEnd {
        box-shadow: var(--shadow-top), var(--shadow-left);
    }

    .grid.bandMode .bandCornerSW.bandWord {
        box-shadow: none;
    }
    .grid.bandMode .bandCornerSW.bandWord.bandWordStart {
        box-shadow: var(--shadow-right);
    }
    .grid.bandMode .bandCornerSW.bandWord.bandWordEnd {
        box-shadow: var(--shadow-top);
    }

    .grid.bandMode .bandSideW.bandWord {
        box-shadow: var(--shadow-right);
    }
    .grid.bandMode .bandSideW.bandWord.bandWordStart {
        box-shadow: var(--shadow-right), var(--shadow-bottom);
    }
    .grid.bandMode .bandSideW.bandWord.bandWordEnd {
        box-shadow: var(--shadow-right), var(--shadow-top);
    }

    .selected {
        outline: solid 4px var(--color-theme-1);
        outline-offset: -8px;
    }

    .button-bar {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        max-height: 5vh;
        margin-bottom: 0.5rem;
        margin-left: 2rem;
        max-width: min(50vw, 90vh);
    }

    .button-bar button {
        max-height: 5vh;
        margin-right: 0.5rem;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        border-radius: 4px;
        border-color: var(--color-bg-2);
        border-width: 1px;
    }

    .button-bar button:hover:enabled {
        background-color: var(--color-theme-1);
        color: var(--color-bg-0);
    }

    .deleteMessage {
        font-size: 1.5rem;
        font-weight: 500;
        margin-bottom: 1rem;
    }
</style>
