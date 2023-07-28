<script lang="ts">
    import type { Clue } from 'drumline-lib';

    export let clue: Clue;
</script>

<div class="clue">
    <div class="clue-title">{clue.text}</div>
</div>
