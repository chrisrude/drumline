<script lang="ts">
    import type { Clue } from '$lib/puzzle';
    export let clue: Clue;
</script>

<div class="clue">
    <div class="clue-title">{clue.text}</div>
</div>
