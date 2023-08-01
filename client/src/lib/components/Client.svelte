<script lang="ts">
    import type { NetworkClientEventType } from '$lib/client';

    export let status: NetworkClientEventType = 'disconnected';
</script>

<div class="networkStatus">
    {#if status === 'connected'}
        <p>🟢 Connected</p>
    {:else if status === 'connecting'}
        <p>🟡 Connecting...</p>
    {:else if status === 'disconnected'}
        <p>⚪ Disconnected</p>
    {:else if status === 'reconnecting'}
        <p>🔴 Reconnecting...</p>
    {/if}
</div>

<style>
    .networkStatus {
        position: absolute;
        top: 0;
        left: 0;
        padding: 0.5em;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        font-size: 1.5em;
    }
</style>
