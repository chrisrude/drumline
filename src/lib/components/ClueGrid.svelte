<script lang="ts">
	import type { Puzzle } from '$lib/puzzle';
	import {
		addPuzzleWordBand,
		addPuzzleWordRow,
		clearPuzzleWordBand,
		clearPuzzleWordRow,
		createWordAtLocation,
		firstEmptyBandCell,
		getBandNumberFromCoords,
		isInWord,
		nextCellInBand,
		nextCellInRow,
		offsetWithinBand
	} from '$lib/puzzle';

	export let puzzle: Puzzle;
	export let size = puzzle.size;
	export let highlightRow: number = -1;
	export let highlightBand: number = -1;
	export let selectedRow: number = -1;
	export let selectedCol: number = -1;
	export let currentClue: string = '';

	export const center = Math.floor(size / 2);

	$: highlightRow !== undefined && gotoRow();
	$: highlightBand !== undefined && gotoBand();

	const gotoRow = () => {
		if (-1 == highlightRow) {
			return;
		}
		highlightBand = -1;
		// if we're not in the highlighted row, go to the first
		// empty cell in the row.
		if (selectedRow === highlightRow) {
			return;
		}
		for (let i = 0; i < size; i++) {
			if (puzzle.grid[highlightRow][i].text === ' ') {
				selectedRow = highlightRow;
				selectedCol = i;
				return;
			}
		}
		// no empty cells in the row, so go to the first cell
		// in the row
		selectedRow = highlightRow;
		selectedCol = 0;
	};
	const gotoBand = () => {
		if (-1 == highlightBand) {
			return;
		}
		highlightRow = -1;
		// if we're not in the band, go to the first
		// empty cell in the band, clockwise
		const selectedBand = getBandNumberFromCoords(selectedRow, selectedCol, size);
		if (selectedBand === highlightBand) {
			return;
		}
		[selectedRow, selectedCol] = firstEmptyBandCell(puzzle, selectedBand);
	};

	// update current clue
	$: (highlightRow || highlightBand) && updateCurrentClue();

	const updateCurrentClue = () => {
		clearDragging();

		if (highlightRow === -1 && highlightBand === -1) {
			currentClue = '';
			return;
		}
		// todo: keep highlightBand from getting an invalid value instead?
		if (highlightBand >= puzzle.bands.length) {
			currentClue = '';
			return;
		}
		const clues =
			highlightRow === -1 ? puzzle.bands[highlightBand].clues : puzzle.rows[highlightRow].clues;
		currentClue = clues.map((clue) => clue.text).join(' / ');
	};

	export const getCellClass = (i: number, j: number) => {
		const bandNumber = getBandNumberFromCoords(i, j, size);
		return bandNumber % 2 === 0 ? 'even-band' : 'odd-band';
	};

	function isUsingBand() {
		return highlightBand !== -1;
	}

	export const nextCell = (backwards: boolean) => {
		if (isUsingBand()) {
			return nextCellInBand(puzzle.size, selectedRow, selectedCol, backwards);
		} else {
			return nextCellInRow(puzzle.size, selectedRow, selectedCol, backwards);
		}
	};

	function clearWordAtSelection(): boolean {
		if (!isInWord(puzzle, selectedRow, selectedCol, isUsingBand())) {
			return false;
		}
		if (isUsingBand()) {
			const band = getBandNumberFromCoords(selectedRow, selectedCol, size);
			const bandIdx = offsetWithinBand(selectedRow, selectedCol, size);
			clearPuzzleWordBand(puzzle, band, bandIdx);
		} else {
			clearPuzzleWordRow(puzzle, selectedRow, selectedCol);
		}
		// do an assignment to trigger a re-render
		mouseDragging = true;
		mouseDragging = false;
		return true;
	}

	export const onKeyDown = (event: KeyboardEvent) => {
		// In the switch-case we're updating our boolean flags whenever the
		// desired bound keys are pressed.
		if (event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}
		if (selectedRow === -1 || selectedCol === -1) {
			return;
		}
		if (highlightBand === -1 && highlightRow === -1) {
			return;
		}
		let newRow = selectedRow;
		let newCol = selectedCol;
		switch (event.key) {
			case 'ArrowDown':
				if (newRow < size - 1) {
					newRow = newRow + 1;
				}
				break;
			case 'ArrowUp':
				if (newRow > 0) {
					newRow = newRow - 1;
				}
				break;
			case 'ArrowLeft':
				if (newCol > 0) {
					newCol = newCol - 1;
				}
				break;
			case 'ArrowRight':
				if (newCol < size - 1) {
					newCol = newCol + 1;
				}
				break;
			case 'Tab':
				[newRow, newCol] = nextCell(event.shiftKey);
				highlight(newRow, newCol);
				event.preventDefault();
				return;
			case 'Escape':
				if (mouseDragging) {
					clearDragging();
					event.preventDefault();
					return;
				}
			case ' ':
				toggleSelection();
				event.preventDefault();
				return;
			case '.':
				// find adjacent letters and mark them as a word
				//
				// are we using the current square?
				let startRow,
					startCol = -1;
				if (
					puzzle.grid[selectedRow][selectedCol].text === ' ' ||
					isInWord(puzzle, selectedRow, selectedCol, isUsingBand())
				) {
					// is the previous square in the row/band filled in?
					[startRow, startCol] = nextCell(true);
				} else {
					startRow = selectedRow;
					startCol = selectedCol;
				}
				if (startRow === -1 || startCol === -1) {
					// nothing to do
					return;
				}
				createWordAtLocation(puzzle, startRow, startCol, isUsingBand());
				// do an assignment to trigger a re-render
				mouseDragging = true;
				mouseDragging = false;
				event.preventDefault();
				return;

			case 'Backspace':
				// first, if our current square is in a word,
				// clear the word and do nothing else
				if (clearWordAtSelection()) {
					event.preventDefault();
					return;
				}

				// check to see if we're in an empty square, if so
				// move to the previous square
				if (puzzle.grid[selectedRow][selectedCol].text === ' ') {
					[newRow, newCol] = nextCell(true);
					highlight(newRow, newCol);

					// again, check to see if this new square is in a word
					// if so clear the word and do nothing else
					if (clearWordAtSelection()) {
						event.preventDefault();
						return;
					}
				}

				// no word to clear, so just clear the character in the
				// current square
				puzzle.grid[selectedRow][selectedCol].text = ' ';
				event.preventDefault();
				return;
			default:
				if (event.key.length === 1) {
					puzzle.grid[selectedRow][selectedCol].text = event.key;
					event.preventDefault();
					// move to next cell, either in the row or the band
					[newRow, newCol] = nextCell(false);
				} else {
					// don't stop default behavior
					return;
				}
		}
		highlight(newRow, newCol);
		event.preventDefault();
	};

	function toggleSelection() {
		if (highlightRow !== -1) {
			highlightBand = getBandNumberFromCoords(selectedRow, selectedCol, size);
			highlightRow = -1;
		} else {
			highlightRow = selectedRow;
			highlightBand = -1;
		}
	}

	export const highlight = (i: number, j: number, from_click: boolean = false) => {
		if (selectedRow === i && selectedCol === j) {
			// do nothing
			if (from_click) {
				toggleSelection();
			}
			return;
		}
		// if the last highlight was a row, keep that
		// otherwise, highlight the band
		if (highlightRow !== -1) {
			highlightRow = i;
		} else {
			highlightBand = getBandNumberFromCoords(i, j, size);
		}
		selectedRow = i;
		selectedCol = j;
	};

	export const clearHighlight = () => {
		highlightRow = -1;
		highlightBand = -1;
		clearDragging();
	};

	function clearDragging() {
		draggingStart = [-1, -1];
		draggingEnd = [-1, -1];
		mouseDragging = false;
	}

	export let draggingStart: [number, number] = [-1, -1];
	export let draggingEnd: [number, number] = [-1, -1];
	export let mouseDragging = false;

	export const onDragStart = (event: MouseEvent, i: number, j: number) => {
		if (mouseDragging) {
			return;
		}
		if (highlightRow === -1 && highlightBand === -1) {
			return;
		}
		mouseDragging = true;
		draggingEnd = draggingStart = [i, j];
		event.preventDefault();
	};

	function orderByPath(
		start: [number, number],
		end: [number, number]
	): [[number, number], [number, number]] {
		let options: [number, [number, number]][];
		if (isUsingBand()) {
			options = [
				[offsetWithinBand(start[0], start[1], puzzle.size), start],
				[offsetWithinBand(end[0], end[1], puzzle.size), end]
			];
		} else {
			options = [
				[start[1], start],
				[end[1], end]
			];
		}
		options.sort((a, b) => a[0] - b[0]);
		return [options[0][1], options[1][1]];
	}

	function getDraggingBand() {
		if (!isUsingBand()) {
			return -1;
		}
		if (-1 === draggingStart[0] || -1 === draggingStart[1]) {
			return -1;
		}
		return getBandNumberFromCoords(draggingStart[0], draggingStart[1], size);
	}

	export const onDragOver = (event: MouseEvent, i: number, j: number) => {
		if (!mouseDragging) {
			return;
		}
		if (isUsingBand()) {
			const band = getBandNumberFromCoords(i, j, size);
			if (band !== getDraggingBand()) {
				// do nothing
				return;
			}
		} else {
			if (i !== draggingStart[0]) {
				// do nothing
				return;
			}
		}
		draggingEnd = [i, j];
		event.preventDefault();
	};

	export const onPath = (i: number, j: number) => {
		if (!mouseDragging) {
			return false;
		}
		// if we don't have an end, we're not on the path
		if (draggingEnd[0] === -1 && draggingEnd[1] === -1) {
			return false;
		}
		// if we haven't dragged anywhere, we're not on the path
		if (draggingStart[0] == draggingEnd[0] && draggingStart[1] == draggingEnd[1]) {
			return false;
		}

		if (isUsingBand()) {
			const band = getBandNumberFromCoords(i, j, size);
			if (band !== getDraggingBand()) {
				// do nothing
				return;
			}
			// is the cell on or between the start and end of the drag?
			const bandStartIdx = offsetWithinBand(draggingStart[0], draggingStart[1], puzzle.size);
			const bandEndIdx = offsetWithinBand(draggingEnd[0], draggingEnd[1], puzzle.size);
			const cellIdx = offsetWithinBand(i, j, puzzle.size);

			const minIdx = Math.min(bandStartIdx, bandEndIdx);
			const maxIdx = Math.max(bandStartIdx, bandEndIdx);
			if (cellIdx >= minIdx && cellIdx <= maxIdx) {
				return true;
			}
			return false;
		}
		// row path
		if (i !== draggingStart[0]) {
			return false;
		}

		const minCol = Math.min(draggingStart[1], draggingEnd[1]);
		const maxCol = Math.max(draggingStart[1], draggingEnd[1]);
		if (j >= minCol && j <= maxCol) {
			return true;
		}
		return false;
	};

	export const onDragEnd = (event: MouseEvent, i: number, j: number) => {
		if (!mouseDragging) {
			return;
		}
		mouseDragging = false;
		// sort the start and end

		// if we don't have an end, we're not on the path
		if (draggingEnd[0] === -1 && draggingEnd[1] === -1) {
			return false;
		}

		// if we haven't dragged anywhere, we're not on the path
		if (draggingStart[0] == draggingEnd[0] && draggingStart[1] == draggingEnd[1]) {
			return false;
		}

		[draggingStart, draggingEnd] = orderByPath(draggingStart, draggingEnd);

		if (isUsingBand()) {
			const start_offset = offsetWithinBand(draggingStart[0], draggingStart[1], puzzle.size);
			const end_offset = offsetWithinBand(draggingEnd[0], draggingEnd[1], puzzle.size);
			const bandIdx = getBandNumberFromCoords(draggingStart[0], draggingStart[1], size);
			addPuzzleWordBand(puzzle, bandIdx, start_offset, end_offset);
		} else {
			addPuzzleWordRow(puzzle, draggingStart[0], draggingStart[1], draggingEnd[1]);
		}

		// todo: why not save already?
		puzzle = puzzle;
		event.preventDefault();
		clearDragging();
	};

	export const isInRowWord = (i: number, j: number) => {
		const words = puzzle.rows[i].words;
		for (const word of words) {
			if (word[0] <= j && word[1] >= j) {
				return true;
			}
		}
		return false;
	};

	export const isInBandWord = (i: number, j: number) => {
		const band = getBandNumberFromCoords(i, j, size);
		const bandOffset = offsetWithinBand(i, j, size);
		const words = puzzle.bands[band].words;
		for (const word of words) {
			if (word[0] <= bandOffset && word[1] >= bandOffset) {
				return true;
			}
		}
		return false;
	};

	function isRowWordTerminus(i: number, j: number, useStart: boolean): boolean {
		const words = puzzle.rows[i].words;
		for (const word of words) {
			if (j === (useStart ? word[0] : word[1])) {
				return true;
			}
		}
		return false;
	}

	function isBandWordTerminus(i: number, j: number, useStart: boolean): boolean {
		const bandIdx = offsetWithinBand(i, j, size);
		const band = getBandNumberFromCoords(i, j, size);
		const words = puzzle.bands[band].words;
		for (const word of words) {
			if (bandIdx === (useStart ? word[0] : word[1])) {
				return true;
			}
		}
		return false;
	}
	export const isRowWordStart = (i: number, j: number) => {
		return isRowWordTerminus(i, j, true);
	};
	export const isRowWordEnd = (i: number, j: number) => {
		return isRowWordTerminus(i, j, false);
	};
	export const isBandWordStart = (i: number, j: number) => {
		return isBandWordTerminus(i, j, true);
	};
	export const isBandWordEnd = (i: number, j: number) => {
		return isBandWordTerminus(i, j, false);
	};

	function bandSide(i: number, j: number) {
		const band = getBandNumberFromCoords(i, j, size);
		const backSide = size - 1 - band;
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
		throw new Error('bandSide called on non-band cell');
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

<svelte:window on:keydown={onKeyDown} />

{#if currentClue}
	<div class="grid-current-clue">{currentClue}</div>
{/if}

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="grid"
	style="--puzzle-size: {size}"
	class:bandMode={highlightBand !== -1}
	class:rowMode={highlightRow !== -1}
>
	{#each { length: size } as _, i}
		<div class="row">
			{#each { length: size } as _, j}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				{#if i === center && j === center}
					<div
						class="letter center-cell"
						class:selected={selectedRow === i && selectedCol === j}
						on:click={clearHighlight}
					/>
				{:else}
					<div
						class="letter {getCellClass(i, j)}"
						class:selected={selectedRow === i && selectedCol === j}
						class:highlightRow={highlightRow === i}
						class:highlightBand={highlightBand === getBandNumberFromCoords(i, j, size)}
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
						on:click={() => highlight(i, j, true)}
						on:mousedown={(event) => onDragStart(event, i, j)}
						on:mouseenter={(event) => onDragOver(event, i, j)}
						on:mouseup={(event) => onDragEnd(event, i, j)}
					>
						{puzzle.grid[i][j].text}
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
		grid-template-columns: repeat(var(--puzzle-size), 1fr);
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
		/* border: solid 1px rgba(58, 58, 89, 0.2); */
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
		display: flex;
		font-weight: 500;
		margin-bottom: 0.5rem;
		background-color: var(--color-bg-2);
		padding: 0.5rem 1rem;
		border-radius: 10px;
		overflow: scroll;
		max-height: 3rem;
		min-height: 3rem;
	}
</style>
