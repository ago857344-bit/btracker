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
	.login-stage { display: grid; place-items: center; min-height: 100vh; padding: 1.5rem; background: radial-gradient(100% 90% at 50% 0%, #1b1930 0%, #11101b 55%, #0c0b13 100%); }
	.skip-btn { margin-top: 1.5rem; padding: .8rem 1.5rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: transparent; color: var(--text-secondary); font-size: .82rem; font-weight: 650; cursor: pointer; transition: all .16s ease; }
	.skip-btn:hover { color: var(--text-primary); border-color: var(--accent); background: var(--surface-panel); }
</style>
