<script lang="ts">
	import './site.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import SiteNav from '$lib/components/site/SiteNav.svelte';
	import SiteFooter from '$lib/components/site/SiteFooter.svelte';
	import GetStartedModal from '$lib/components/GetStartedModal.svelte';

	let getStartedOpen = false;

	function openGetStarted() {
		getStartedOpen = true;
	}

	onMount(() => {
		if (typeof document.startViewTransition !== 'function') {
			document.documentElement.classList.add('site-no-vt');
		}
		return () => document.documentElement.classList.remove('site-no-vt');
	});

	onNavigate((navigation) => {
		if (typeof document.startViewTransition !== 'function') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
</svelte:head>

<div class="site-root">
	<SiteNav onGetStarted={openGetStarted} />
	{#key $page.url.pathname}
		<main id="site-main" class="site-main">
			<slot />
		</main>
	{/key}
	<SiteFooter onGetStarted={openGetStarted} />
	<GetStartedModal bind:open={getStartedOpen} onClose={() => (getStartedOpen = false)} />
</div>
