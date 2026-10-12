<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { celebration } from '$lib/stores/tracker';

	let deferredPrompt: any = null;
	let showInstallBanner = false;
	let isIos = false;
	let isOffline = false;
	let isStandalone = false;

	onMount(() => {
		isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any)?.standalone);
		isOffline = !navigator.onLine;

		const ua = window.navigator.userAgent.toLowerCase();
		isIos = /iphone|ipad|ipod/.test(ua);

		const handleBeforeInstall = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e;
			// Only prompt if not dismissed previously in this session
			if (!sessionStorage.getItem('btracker_pwa_dismissed') && !isStandalone) {
				showInstallBanner = true;
			}
		};

		// iOS Safari does not support beforeinstallprompt; show guided prompt if on iOS and not yet installed
		if (isIos && !isStandalone && !sessionStorage.getItem('btracker_pwa_dismissed')) {
			showInstallBanner = true;
		}

		const handleOnline = () => {
			isOffline = false;
			celebration.set('Back online — sync active');
		};

		const handleOffline = () => {
			isOffline = true;
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstall);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	async function installPwa() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			showInstallBanner = false;
			celebration.set('BTracker app installed!');
		}
		deferredPrompt = null;
	}

	function dismissInstall() {
		showInstallBanner = false;
		try {
			sessionStorage.setItem('btracker_pwa_dismissed', 'true');
		} catch {}
	}
</script>

<!-- Offline Status Indicator Pill -->
{#if isOffline}
	<div class="offline-pill" transition:fly={{ y: -20, duration: 200 }} role="status">
		<span class="pulse-dot"></span>
		<span>Offline Mode — All changes saved locally</span>
	</div>
{/if}

<!-- Native App Install Banner -->
{#if showInstallBanner}
	<div class="install-banner" transition:fly={{ y: 30, duration: 250 }} role="region" aria-label="Install App">
		<div class="install-left">
			<div class="app-icon"><NavIcon name="sparkles" size={16} /></div>
			<div class="install-text">
				{#if isIos}
					<b>Install BTracker on iOS</b>
					<span>Tap the <b>Share</b> button in Safari &amp; choose <b>Add to Home Screen</b></span>
				{:else}
					<b>Install BTracker</b>
					<span>Fast offline access &amp; distraction-free desktop/mobile app</span>
				{/if}
			</div>
		</div>
		<div class="install-actions">
			{#if !isIos}
				<button type="button" class="btn-install" on:click={installPwa}>
					Install App
				</button>
			{/if}
			<button type="button" class="btn-dismiss" aria-label="Dismiss" on:click={dismissInstall}>
				<NavIcon name="x" size={14} />
			</button>
		</div>
	</div>
{/if}

<style>
	.offline-pill {
		position: fixed;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10001;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.95rem;
		border-radius: 99px;
		background: #f59e0b;
		color: #1c1002;
		font-size: 0.76rem;
		font-weight: 800;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
		pointer-events: none;
	}

	.pulse-dot {
		width: 7px;
		height: 7px;
		border-radius: 99px;
		background: #78350f;
		animation: pulse 1.4s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(1.3); }
	}

	.install-banner {
		position: fixed;
		bottom: 1.2rem;
		left: 50%;
		transform: translateX(-50%);
		width: min(520px, 92vw);
		z-index: 9990;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem;
		padding: 0.75rem 1rem;
		border-radius: 14px;
		background: var(--surface-panel);
		border: 1px solid var(--accent);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
	}

	.install-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.app-icon {
		width: 32px;
		height: 32px;
		border-radius: 9px;
		background: var(--accent);
		color: white;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.install-text b {
		display: block;
		font-size: 0.84rem;
		color: var(--text-primary);
	}

	.install-text span {
		display: block;
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.install-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-install {
		padding: 0.45rem 0.9rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: white;
		font-size: 0.78rem;
		font-weight: 800;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.btn-dismiss {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	.btn-dismiss:hover {
		color: var(--text-primary);
	}

	@media (max-width: 760px) {
		.install-banner {
			bottom: 5.5rem; /* above mobile bottom nav */
		}
	}
</style>
