<script lang="ts">
	import AuthCard from '$lib/components/AuthCard.svelte';
</script>

<svelte:head><title>Sign in · BTracker</title></svelte:head>

<div class="login-stage">
	<AuthCard />
</div>

<style>
	.login-stage { display: grid; place-items: center; min-height: 100vh; padding: 1.5rem; background: radial-gradient(100% 90% at 50% 0%, #1b1930 0%, #11101b 55%, #0c0b13 100%); }
</style>
