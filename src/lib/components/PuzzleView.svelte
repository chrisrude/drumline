<script lang="ts">
	import ClueGrid from '$lib/components/ClueGrid.svelte';
	import ClueList from '$lib/components/ClueList.svelte';
	import { isPuzzleComplete } from '$lib/puzzle';
	import { Confetti } from 'svelte-confetti';

	import type { Puzzle } from '$lib/puzzle';

	export let puzzle: Puzzle;

	export let highlightRow = -1;
	export let highlightBand = -1;
</script>

{#if isPuzzleComplete(puzzle)}
	<div class="confetti-container">
		<Confetti
			amount={100}
			x={[4, 10]}
			y={[0, 1]}
			size={50}
			infinite
			fallDistance="160vh"
			cone={true}
			rounded={true}
			colorArray={[
				'var(--color-theme-1)',
				'var(--color-theme-2)',
				'#C724B1',
				'#71DBD4',
				'#642F6C',
				'#58A7AF',
				'#B3B0C4',
				'#3A3A59'
			]}
		/>
	</div>
{/if}
<div class="puzzle">
	<div class="puzzle-grid">
		<ClueGrid bind:highlightRow bind:highlightBand bind:puzzle />
	</div>
	<div class="clue-sets">
		<div class="clue-set">
			<ClueList
				bind:puzzle
				clueTitle="Rows"
				clueSection={puzzle.rows}
				bind:highlightIdx={highlightRow}
			/>
		</div>
		<div class="clue-set">
			<ClueList
				bind:puzzle
				clueTitle="Bands"
				clueSection={puzzle.bands}
				bind:highlightIdx={highlightBand}
				useLetters={true}
			/>
		</div>
	</div>
</div>

<style>
	.puzzle {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-around;
		margin: auto 0;
	}
	.puzzle-grid {
		flex-grow: 2;
		width: 50vw;
		display: flex;
		flex-direction: column;
		align-self: flex-end;
	}
	.clue-sets {
		display: flex;
		flex-grow: 1;
	}
	.clue-set {
		margin-left: 1rem;
	}
	.confetti-container {
		position: absolute;
		top: -10vh;
		left: 0;
		height: 160vh;
		width: 100vw;
		display: flex;
		pointer-events: none;
		overflow: hidden;
	}
</style>
