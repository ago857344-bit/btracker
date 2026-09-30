<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { handleAuthCallback } from '$lib/stores/auth';

	let error = '';
	let loading = true;

	onMount(async () => {
		const url = new URL(window.location.href);
		const code = url.searchParams.get('code');
		const errorParam = url.searchParams.get('error_description') ?? url.searchParams.get('error');
		try {
			if (errorParam) throw new Error(errorParam);
			if (!code) throw new Error('Invalid sign-in link: missing authorization code.');
			await handleAuthCallback(code);
			await goto('/', { replaceState: true });
		} catch (err) {
			console.error('Auth callback error:', err);
			error = err instanceof Error ? err.message : 'Authentication failed';
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="loading">
		<p>Completing sign-in…</p>
	</div>
{:else if error}
	<div class="error">
		<div class="error-content">
			<h2>Sign-in failed</h2>
			<p>{error}</p>
			<button on:click={() => goto('/login')}>Back to sign in</button>
		</div>
	</div>
{/if}

<style>
	.loading {
		display: grid;
		min-height: 100vh;
		place-items: center;
		background: var(--surface-canvas);
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 650;
	}

	.error {
		display: grid;
		min-height: 100vh;
		place-items: center;
		background: var(--surface-canvas);
		padding: 1.5rem;
	}

	.error-content {
		max-width: 400px;
		padding: 2rem;
		border: 1px solid rgb(255 255 255 / 8%);
		border-radius: 22px;
		background: #131318;
		color: #ececf1;
		text-align: center;
	}

	.error-content h2 {
		margin: 0 0 1rem;
		font-size: 1.3rem;
		color: #ff6b6b;
	}

	.error-content p {
		margin: 0 0 1.5rem;
		color: #9d9dab;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.error-content button {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border: 0;
		border-radius: 11px;
		background: var(--accent);
		color: white;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
	}

	.error-content button:hover {
		filter: brightness(1.1);
	}
</style>
