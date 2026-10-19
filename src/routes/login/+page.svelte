<script lang="ts">
	import { goto } from '$app/navigation';
	import { hasSkippedLogin } from '$lib/stores/auth';
	import AuthCard from '$lib/components/AuthCard.svelte';

	function continueWithoutAccount() {
		hasSkippedLogin.set(true);
		void goto('/', { replaceState: true });
	}
</script>

<svelte:head><title>Sign in · BTracker</title></svelte:head>

<div class="login-stage">
	<AuthCard />
	<button type="button" class="skip-btn" on:click={continueWithoutAccount}>
		Continue without account
	</button>
</div>

<style>
	.login-stage {
		display: grid;
		place-items: center;
		min-height: 100vh;
		padding: 1.5rem;
		background: radial-gradient(100% 90% at 50% 0%, color-mix(in srgb, var(--accent) 10%, var(--surface-canvas)) 0%, var(--surface-canvas) 60%, var(--surface-subtle) 100%);
	}
	.skip-btn {
		margin-top: 1.5rem;
		padding: .8rem 1.6rem;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-panel);
		color: var(--text-secondary);
		font-size: .84rem;
		font-weight: 650;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		transition: all .16s ease;
	}
	.skip-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: var(--surface-subtle);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}
</style>
