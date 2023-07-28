<script lang="ts">
    import { GameState, GridLocation, clear, clearSegment, markSegment, set } from 'drumline-lib';
    import { BAND_IDENTIFIERS } from 'drumline-lib/lib/clue_parser';
    import { createEventDispatcher } from 'svelte';

    export let gameState: GameState;
    export let highlightRow: number = -1;
    export let highlightBand: number = -1;
    export let cursorLocation: GridLocation = GridLocation.NONE;
    export let currentClue: string = '';

    let deleteDialog: HTMLDialogElement;
    let deleteDialogButton: HTMLButtonElement;
    const dispatch = createEventDispatcher();

    $: highlightRow !== undefined && gotoRow();
    $: highlightBand !== undefined && gotoBand();

    const gotoRow = () => {
        if (-1 == highlightRow) {
            return;
        }
        highlightBand = -1;
        // if we're not in the highlighted row, go to the first
        // empty cell in the row.
        if (cursorLocation.row === highlightRow) {
            return;
        }
        const row = gameState.puzzle.rows[highlightRow];
        cursorLocation = gameState.firstEmptyCell(row);
    };

    const gotoBand = () => {
        if (-1 == highlightBand) {
            return;
        }
        highlightRow = -1;
        // if the cursor happens to be in the band already, leave it there
        const cursorBand = gameState.puzzle.getBandNumberAtLocation(cursorLocation);
        if (cursorBand === highlightBand) {
            return;
        }
        // if we're not in the band, move cursor to the first
        // empty cell in the band
        const band = gameState.puzzle.bands[highlightBand];
        cursorLocation = gameState.firstEmptyCell(band);
    };

    // update current clue
    $: (highlightRow || highlightBand) && updateCurrentClue();

    const updateCurrentClue = () => {
        clearDragging();

        if (
            (highlightRow === -1 && highlightBand === -1) ||
            highlightBand >= gameState.puzzle.bands.length
        ) {
            currentClue = '';
            return;
        }
        const clues = isUsingBand()
            ? gameState.puzzle.bands[highlightBand].clues
            : gameState.puzzle.rows[highlightRow].clues;
        currentClue = clues.map((clue) => clue.text).join(' / ');
    };

    export const getCellClass = (i: number, j: number) => {
        const bandNumber = gameState.puzzle.getBandNumberAt(i, j);
        return bandNumber % 2 === 0 ? 'even-band' : 'odd-band';
    };

    function isUsingBand() {
        return highlightBand !== -1;
    }

    export const nextCell = (backwards: boolean): GridLocation => {
        const clueList = gameState.puzzle.getClueListAtLocation(cursorLocation, isUsingBand());
        if (backwards) {
            return clueList.prevCell(cursorLocation);
        } else {
            return clueList.nextCell(cursorLocation);
        }
    };

    function emptyOrInAnswer(location: GridLocation): boolean {
        const answerSegments = gameState.getAnswerSegmentsAtLocation(location, isUsingBand());
        return gameState.isEmpty(location) || answerSegments.in_answer_at_location(location)[0];
    }

    // returns the location of the square which can be added to an answer, after
    // inspecting both the cursor's square and then the previous square.
    // If neither square is valid, returns null.
    // A square can be added to an answer if it has text in it, and is not already
    // part of an answer.
    function findSquareToGroup(): GridLocation | null {
        if (cursorLocation.is_none()) {
            return null;
        }
        const startLocation = emptyOrInAnswer(cursorLocation) ? nextCell(true) : cursorLocation;
        if (emptyOrInAnswer(startLocation)) {
            return null;
        }
        return startLocation;
    }

    export const canGroupIntoAnswer = () => {
        if (cursorLocation.is_none()) {
            return false;
        }
        if (
            cursorLocation.row === gameState.center.row &&
            cursorLocation.col === gameState.center.col
        ) {
            return false;
        }
        return null != findSquareToGroup();
    };

    function getBandNumberFromCursor() {
        return gameState.puzzle.getBandNumberAtLocation(cursorLocation);
    }

    export const groupIntoAnswer = () => {
        const groupNexus = findSquareToGroup();
        if (groupNexus === null) {
            return;
        }
        const answerSegments = gameState.getAnswerSegmentsAtLocation(cursorLocation, isUsingBand());
        const [idxStart, idxEnd] = gameState.findWordBoundsAtLocation(groupNexus, answerSegments);

        const action = markSegment(answerSegments.clue_list, idxStart, idxEnd);
        gameState.apply(action);

        // do an assignment to trigger a re-render
        mouseDragging = true;
        mouseDragging = false;
        gameState = gameState;
    };

    export const canUngroupAnswer = () => {
        if (cursorLocation.is_none()) {
            return false;
        }
        if (
            cursorLocation.row === gameState.center.row &&
            cursorLocation.col === gameState.center.col
        ) {
            return false;
        }
        const answerSegments = gameState.getAnswerSegmentsAtLocation(cursorLocation, isUsingBand());
        return answerSegments.in_answer_at_location(cursorLocation)[0];
    };

    export const nextEmptyCell = (backwards: boolean) => {
        if (backwards) {
            return gameState.prevEmptyCell(cursorLocation, isUsingBand());
        }
        return gameState.nextEmptyCell(cursorLocation, isUsingBand());
    };

    function clearAnswerAtLocation(): boolean {
        if (!canUngroupAnswer()) {
            return false;
        }
        const clueList = gameState.puzzle.getClueListAtLocation(cursorLocation, isUsingBand());
        const index = clueList.indexAtLocation(cursorLocation);
        const action = clearSegment(clueList, index);
        gameState.apply(action);

        // do an assignment to trigger a re-render
        mouseDragging = true;
        mouseDragging = false;
        gameState = gameState;
        return true;
    }

    export const onKeyDown = (event: KeyboardEvent) => {
        // In the switch-case we're updating our boolean flags whenever the
        // desired bound keys are pressed.
        if (event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        if (cursorLocation.is_none()) {
            return false;
        }
        if (highlightBand === -1 && highlightRow === -1) {
            return;
        }
        let newLocation = new GridLocation(cursorLocation.row, cursorLocation.col);
        switch (event.key) {
            case 'ArrowDown':
                if (newLocation.row < gameState.puzzle.size - 1) {
                    newLocation.row += 1;
                }
                break;
            case 'ArrowUp':
                if (newLocation.row > 0) {
                    newLocation.row -= 1;
                }
                break;
            case 'ArrowLeft':
                if (newLocation.col > 0) {
                    newLocation.col -= 1;
                }
                break;
            case 'ArrowRight':
                if (newLocation.col < gameState.puzzle.size - 1) {
                    newLocation.col += 1;
                }
                break;
            case 'Tab':
                newLocation = nextCell(event.shiftKey);
                highlight(newLocation);
                event.preventDefault();
                return;
            case 'Escape':
                if (deleteDialog !== undefined && deleteDialog.open) {
                    deleteDialog.close();
                    event.preventDefault();
                    return;
                }
                if (mouseDragging) {
                    clearDragging();
                    event.preventDefault();
                    return;
                }
                // nothing else special to do
                return;
            case ' ':
                toggleSelection();
                event.preventDefault();
                return;
            case '.':
                // find adjacent letters and mark them as a word
                //
                groupIntoAnswer();
                event.preventDefault();
                return;

            case 'Backspace':
                // first, if our current square is in a word,
                // clear the word and do nothing else
                if (clearAnswerAtLocation()) {
                    event.preventDefault();
                    return;
                }

                // check to see if we're in an empty square, if so
                // move to the previous square
                if (!gameState.getCell(cursorLocation).is_filled()) {
                    newLocation = nextCell(true);
                    highlight(newLocation);

                    // again, check to see if this new square is in a word
                    // if so clear the word and do nothing else
                    if (clearAnswerAtLocation()) {
                        event.preventDefault();
                        return;
                    }
                }

                // no word to clear, so just clear the character in the
                // current square
                const action = clear(cursorLocation);
                gameState.apply(action);
                gameState = gameState;
                event.preventDefault();
                return;
            default:
                if (event.key.length === 1) {
                    const action = set(cursorLocation, event.key);
                    gameState.apply(action);
                    gameState = gameState;
                    event.preventDefault();
                    // move to next cell, either in the row or the band
                    newLocation = nextEmptyCell(false);
                } else {
                    // don't stop default behavior
                    return;
                }
        }
        highlight(newLocation);
        event.preventDefault();
    };

    function toggleSelection() {
        if (highlightRow !== -1) {
            highlightBand = getBandNumberFromCursor();
            highlightRow = -1;
        } else {
            highlightRow = cursorLocation.row;
            highlightBand = -1;
        }
    }

    export const highlight = (newLocation: GridLocation, from_click: boolean = false) => {
        if (cursorLocation == newLocation) {
            // do nothing
            if (from_click) {
                toggleSelection();
            }
            return;
        }
        // if the last highlight was a row, keep that
        // otherwise, highlight the band
        if (highlightRow !== -1) {
            highlightRow = newLocation.row;
        } else {
            highlightBand = gameState.puzzle.getBandNumberAtLocation(newLocation);
        }
        cursorLocation = newLocation;
    };

    function clearDragging() {
        draggingStart = GridLocation.NONE;
        draggingEnd = GridLocation.NONE;
        mouseDragging = false;
    }

    export let draggingStart: GridLocation = GridLocation.NONE;
    export let draggingEnd: GridLocation = GridLocation.NONE;
    export let mouseDragging = false;

    export const onDragStart = (event: MouseEvent, i: number, j: number) => {
        if (mouseDragging) {
            return;
        }
        if (highlightRow === -1 && highlightBand === -1) {
            return;
        }
        mouseDragging = true;
        draggingEnd = draggingStart = new GridLocation(i, j);
        event.preventDefault();
    };

    function orderByPath(start: GridLocation, end: GridLocation): [GridLocation, GridLocation] {
        const clueList = gameState.puzzle.getClueListAtLocation(start, isUsingBand());
        let options: [number, GridLocation][] = [
            [clueList.indexAtLocation(start), start],
            [clueList.indexAtLocation(end), end]
        ];
        options.sort((a, b) => a[0] - b[0]);
        return [options[0][1], options[1][1]];
    }

    function getDraggingBand() {
        if (!isUsingBand()) {
            return -1;
        }
        if (draggingStart.is_none()) {
            return -1;
        }
        return gameState.puzzle.getBandNumberAtLocation(draggingStart);
    }

    export const onDragOver = (event: MouseEvent, i: number, j: number) => {
        if (!mouseDragging) {
            return;
        }
        if (isUsingBand()) {
            const band = gameState.puzzle.getBandNumberAt(i, j);
            if (band !== getDraggingBand()) {
                // do nothing
                return;
            }
        } else {
            if (i !== draggingStart.row) {
                // do nothing
                return;
            }
        }
        draggingEnd = new GridLocation(i, j);
        event.preventDefault();
    };

    export const onPath = (i: number, j: number) => {
        if (!mouseDragging) {
            return false;
        }
        // if we don't have an end, we're not on the path
        if (draggingEnd.is_none()) {
            return false;
        }
        // if we haven't dragged anywhere, we're not on the path
        if (draggingStart === draggingEnd) {
            return false;
        }

        if (isUsingBand()) {
            const band = gameState.puzzle.getClueListAt(i, j, true);
            if (band.index !== getDraggingBand()) {
                // do nothing
                return;
            }
            // is the cell on or between the start and end of the drag?
            const bandStartIdx = band.indexAtLocation(draggingStart);
            const bandEndIdx = band.indexAtLocation(draggingEnd);
            const cellIdx = band.indexAt(i, j);

            const minIdx = Math.min(bandStartIdx, bandEndIdx);
            const maxIdx = Math.max(bandStartIdx, bandEndIdx);
            if (cellIdx >= minIdx && cellIdx <= maxIdx) {
                return true;
            }
            return false;
        }
        // row path
        if (i !== draggingStart.row) {
            return false;
        }

        const minCol = Math.min(draggingStart.col, draggingEnd.col);
        const maxCol = Math.max(draggingStart.col, draggingEnd.col);
        if (j >= minCol && j <= maxCol) {
            return true;
        }
        return false;
    };

    export const onDragEnd = (event: MouseEvent) => {
        // also close delete dialog if it's open
        if (deleteDialog !== undefined && deleteDialog.open) {
            deleteDialog.close();
        }
        if (!mouseDragging) {
            return;
        }
        mouseDragging = false;
        // sort the start and end

        // if we don't have an end, we're not on the path
        if (draggingEnd.is_none()) {
            return false;
        }

        // if we haven't dragged anywhere, we're not on the path
        if (draggingStart === draggingEnd) {
            return false;
        }

        [draggingStart, draggingEnd] = orderByPath(draggingStart, draggingEnd);

        const clueList = gameState.puzzle.getClueListAtLocation(draggingStart, isUsingBand());

        const action = markSegment(
            clueList,
            clueList.indexAtLocation(draggingStart),
            clueList.indexAtLocation(draggingEnd)
        );
        gameState.apply(action);
        gameState = gameState;
        event.preventDefault();
        clearDragging();
    };

    export const isInRowWord = (i: number, j: number): boolean => {
        const rowSegments = gameState.getAnswerSegmentsAt(i, j, false);
        return rowSegments.in_answer_at(i, j)[0];
    };

    export const isInBandWord = (i: number, j: number) => {
        const bandSegments = gameState.getAnswerSegmentsAt(i, j, true);
        return bandSegments.in_answer_at(i, j)[0];
    };

    export const isRowWordStart = (i: number, j: number) => {
        const rowSegments = gameState.getAnswerSegmentsAt(i, j, false);
        return rowSegments.in_answer_at(i, j)[1];
    };
    export const isRowWordEnd = (i: number, j: number) => {
        const rowSegments = gameState.getAnswerSegmentsAt(i, j, false);
        return rowSegments.in_answer_at(i, j)[2];
    };
    export const isBandWordStart = (i: number, j: number) => {
        const bandSegments = gameState.getAnswerSegmentsAt(i, j, true);
        return bandSegments.in_answer_at(i, j)[1];
    };
    export const isBandWordEnd = (i: number, j: number) => {
        const bandSegments = gameState.getAnswerSegmentsAt(i, j, true);
        return bandSegments.in_answer_at(i, j)[2];
    };

    function bandSide(i: number, j: number) {
        const band = gameState.puzzle.getBandNumberAt(i, j);
        const backSide = gameState.puzzle.size - 1 - band;
        if (i === band && j !== backSide) {
            return [1, j === band];
        }
        if (j === backSide && i !== backSide) {
            return [2, i === band];
        }
        if (i === backSide && j !== band) {
            return [3, j === backSide];
        }
        if (j === band) {
            return [4, i === backSide];
        }
        throw new Error('bandSide called on non-band cell: ' + i + ', ' + j);
    }

    export const isBandCorner = (i: number, j: number, corner: number) => {
        const [side, isCorner] = bandSide(i, j);
        return side === corner && isCorner;
    };

    export const isBandSide = (i: number, j: number, sideDesired: number) => {
        const [side, isCorner] = bandSide(i, j);
        return side === sideDesired && !isCorner;
    };
</script>

<svelte:window on:keydown={onKeyDown} on:mouseup={onDragEnd} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="grid"
    style="--puzzle-size: {gameState.puzzle.size}"
    class:bandMode={highlightBand !== -1}
    class:rowMode={highlightRow !== -1}
>
    <div class="button-bar">
        <button
            on:click={toggleSelection}
            title="Switch to row mode [space]"
            disabled={cursorLocation.is_none() || highlightRow !== -1}>➡️ select row</button
        >
        <button
            on:click={toggleSelection}
            title="Switch to band mode [space]"
            disabled={cursorLocation.is_none() || highlightBand !== -1}>↩️ select band</button
        >

        <button
            on:click={groupIntoAnswer}
            disabled={cursorLocation.is_none() ||
                (mouseDragging && !mouseDragging) ||
                !canGroupIntoAnswer()}
            title="Group these letters into answer [period]">⛶ mark as answer</button
        >

        <button
            on:click={() => clearAnswerAtLocation()}
            disabled={cursorLocation.is_none() ||
                (mouseDragging && !mouseDragging) ||
                !canUngroupAnswer()}
            title="Remove this answer [backspace]">⛝ unmark answer</button
        >

        <button
            class="rightmost"
            tabindex="-1"
            on:click={() => deleteDialog.showModal()}
            bind:this={deleteDialogButton}
            title="Delete this puzzle">🗑️ delete puzzle</button
        >
        <dialog
            bind:this={deleteDialog}
            on:close={() => {
                deleteDialogButton.blur();
            }}
        >
            <div class="deleteMessage">Delete puzzle now?</div>
            <button on:click={() => dispatch('deletePuzzle')}
                >⚠️ delete puzzle immediately ⚠️</button
            >
            <button on:click={() => deleteDialog.close()}>nevermind</button>
        </dialog>
    </div>

    <div class="row">
        <div class="grid-current-clue">
            <p>{currentClue}</p>
        </div>
    </div>
    {#each { length: gameState.puzzle.size } as _, i}
        <div class="row">
            <div class="row-number">{i + 1}</div>

            {#each { length: gameState.puzzle.size } as _, j}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                {#if gameState.center.row === i && gameState.center.col === j}
                    <div
                        class="letter center-cell"
                        class:selected={cursorLocation.row === i && cursorLocation.col === j}
                        on:click={toggleSelection}
                    />
                {:else}
                    <div
                        class="letter {getCellClass(i, j)}"
                        class:selected={cursorLocation.row === i && cursorLocation.col === j}
                        class:highlightRow={highlightRow === i}
                        class:highlightBand={highlightBand ===
                            gameState.puzzle.getBandNumberAt(i, j)}
                        class:dragover={draggingEnd && draggingStart && onPath(i, j)}
                        class:rowWord={highlightRow != -1 &&
                            (!mouseDragging || mouseDragging) &&
                            isInRowWord(i, j)}
                        class:rowWordEnd={highlightRow != -1 &&
                            (!mouseDragging || mouseDragging) &&
                            isRowWordEnd(i, j)}
                        class:rowWordStart={highlightRow != -1 &&
                            (!mouseDragging || mouseDragging) &&
                            isRowWordStart(i, j)}
                        class:bandWord={highlightBand != -1 &&
                            (!mouseDragging || mouseDragging) &&
                            isInBandWord(i, j)}
                        class:bandWordStart={highlightBand != -1 &&
                            (!mouseDragging || mouseDragging) &&
                            isBandWordStart(i, j)}
                        class:bandWordEnd={highlightBand != -1 &&
                            (!mouseDragging || mouseDragging) &&
                            isBandWordEnd(i, j)}
                        class:bandCornerNW={isBandCorner(i, j, 1)}
                        class:bandSideN={isBandSide(i, j, 1)}
                        class:bandCornerNE={isBandCorner(i, j, 2)}
                        class:bandSideE={isBandSide(i, j, 2)}
                        class:bandCornerSE={isBandCorner(i, j, 3)}
                        class:bandSideS={isBandSide(i, j, 3)}
                        class:bandCornerSW={isBandCorner(i, j, 4)}
                        class:bandSideW={isBandSide(i, j, 4)}
                        on:click={() => highlight(new GridLocation(i, j), true)}
                        on:mousedown={(event) => onDragStart(event, i, j)}
                        on:mouseenter={(event) => onDragOver(event, i, j)}
                    >
                        {#if i === j && i < gameState.center.row}
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

    .grid-current-clue {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        box-sizing: border-box;

        grid-column-start: 2;
        grid-column-end: calc(var(--puzzle-size) + 2);
        grid-row-start: 1;
        grid-row-end: 2;

        aspect-ratio: var(--puzzle-size);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        font-family: var(--font-body);
        margin-bottom: 0.5em;
        color: rgba(0, 0, 0, 0.6);

        background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.4) 40%,
            rgba(255, 255, 255, 0.1) 100%
        );
        border-radius: 10px;
        box-shadow: -2px -2px 20px 10px rgba(var(--color-theme-1-rgb), 0.1),
            2px 2px 20px 10px rgba(var(--color-theme-2-rgb), 0.1);
        font-size: calc(
            0.75 * min(50vw / (var(--puzzle-size) * 2), 90vh / (4 * var(--puzzle-size)))
        );
    }

    .grid-current-clue p {
        padding: 1rem;
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

    .button-bar button.rightmost {
        margin-left: auto;
        margin-right: 0;
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
