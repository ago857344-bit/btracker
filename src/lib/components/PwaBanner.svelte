<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { celebration, targetsModalOpen } from '$lib/stores/tracker';
	import {
		pwaModalOpen,
		pwaInstalled,
		canNativeInstall,
		setDeferredPrompt,
		triggerNativeInstall,
		closePwaModal,
		openPwaModal,
		detectDevice,
		type DeviceInfo
	} from '$lib/stores/pwa';

	let isOffline = false;
	let dontAskAgain = false;
	let device: DeviceInfo = detectDevice();

	onMount(() => {
		device = detectDevice();
		isOffline = !navigator.onLine;

		if (device.isStandalone) {
			pwaInstalled.set(true);
		}

		const handleBeforeInstall = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e);
		};

		const handleAppInstalled = () => {
			pwaInstalled.set(true);
			pwaModalOpen.set(false);
			celebration.set('BTracker app installed successfully! 🚀');
			try {
				localStorage.setItem('btracker_pwa_installed', 'true');
			} catch {}
		};

		const handleOnline = () => {
			isOffline = false;
			celebration.set('Back online — sync active 🟢');
		};

		const handleOffline = () => {
			isOffline = true;
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstall);
		window.addEventListener('appinstalled', handleAppInstalled);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Auto-prompt detection: Show after 3.5s if not standalone and not opted out
		try {
			const isInstalledLocal = localStorage.getItem('btracker_pwa_installed') === 'true';
			const isOptedOut = localStorage.getItem('btracker_pwa_opt_out') === 'true';
			const lastPromptTime = parseInt(localStorage.getItem('btracker_pwa_last_prompt') || '0', 10);
			const cooldownPassed = Date.now() - lastPromptTime > 7 * 24 * 60 * 60 * 1000;

			if (!device.isStandalone && !isInstalledLocal && !isOptedOut && cooldownPassed) {
				const timer = setTimeout(() => {
					// Don't interrupt if the user is in the onboarding questionnaire
					if (!$targetsModalOpen && !device.isStandalone) {
						openPwaModal();
					}
				}, 3500);
				return () => clearTimeout(timer);
			}
		} catch {}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
			window.removeEventListener('appinstalled', handleAppInstalled);
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	async function handleDirectInstall() {
		const outcome = await triggerNativeInstall();
		if (outcome === 'accepted') {
			celebration.set('BTracker installed! Opening your app window... 🚀');
		}
	}

	function handleDismiss() {
		closePwaModal(dontAskAgain);
	}

	function handleMarkAsAdded() {
		closePwaModal(true);
		pwaInstalled.set(true);
		celebration.set('Awesome! BTracker is ready on your device. 🌟');
	}
</script>

<!-- Offline Status Indicator Pill -->
{#if isOffline}
	<div class="offline-pill" transition:fly={{ y: -20, duration: 200 }} role="status">
		<span class="pulse-dot"></span>
		<span>Offline Mode — All changes saved locally to device</span>
	</div>
{/if}

<!-- Device-Tailored PWA App Install Modal -->
<Modal bind:open={$pwaModalOpen} title="INSTALL BTRACKER WEB APP" width="580px">
	<div class="pwa-install-modal">
		<!-- Header / App Card -->
		<header class="pwa-hero">
			<div class="app-icon-badge">
				<img src="/favicon.png" alt="BTracker Icon" class="btracker-logo" />
				<span class="specular-ring" aria-hidden="true"></span>
			</div>
			<div class="pwa-hero-copy">
				<div class="device-pill">
					{#if device.isIos}
						<span>📱 Optimized for iPhone &amp; iPad</span>
					{:else if device.isAndroid}
						<span>🤖 Optimized for Android</span>
					{:else if device.isMac}
						<span>💻 Optimized for macOS</span>
					{:else if device.isWindows}
						<span>🖥️ Optimized for Windows</span>
					{:else}
						<span>⚡ Standalone Web App</span>
					{/if}
				</div>
				<h3>Install as a Dedicated App</h3>
				<p>Get a full-screen, distraction-free study experience with zero browser tabs and instant offline capability.</p>
			</div>
		</header>

		<!-- Native One-Click Install Banner (Chrome, Edge, Android) -->
		{#if $canNativeInstall}
			<div class="native-install-banner">
				<div class="native-text">
					<b>1-Tap Instant Installation</b>
					<small>Your browser supports direct installation.</small>
				</div>
				<button type="button" class="btn-native-install" on:click={handleDirectInstall}>
					<NavIcon name="sparkles" size={15} />
					<span>Install App Now</span>
				</button>
			</div>
		{/if}

		<!-- Device-Specific Instructions Stepper -->
		<div class="device-guide-section">
			<h4 class="guide-title font-mono">
				{#if device.isIos}
					<span>HOW TO ADD ON IOS (SAFARI)</span>
				{:else if device.isAndroid}
					<span>HOW TO INSTALL ON ANDROID</span>
				{:else if device.isMac}
					<span>HOW TO ADD TO MAC DOCK</span>
				{:else}
					<span>HOW TO INSTALL ON PC / DESKTOP</span>
				{/if}
			</h4>

			<div class="instruction-steps">
				{#if device.isIos}
					<!-- iOS Safari Steps -->
					<div class="step-card">
						<div class="step-icon-wrap ios-share">
							<!-- Safari Share Icon -->
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
								<polyline points="16 6 12 2 8 6"></polyline>
								<line x1="12" y1="2" x2="12" y2="15"></line>
							</svg>
						</div>
						<div class="step-details">
							<b>1. Tap the Share Button</b>
							<p>In Safari's toolbar at the bottom of your iPhone (or top-right on iPad), tap the <strong>Share</strong> icon.</p>
						</div>
					</div>

					<div class="step-card">
						<div class="step-icon-wrap ios-add">
							<!-- Add to Home Screen Icon -->
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<rect width="18" height="18" x="3" y="3" rx="4" />
								<line x1="12" y1="8" x2="12" y2="16" />
								<line x1="8" y1="12" x2="16" y2="12" />
							</svg>
						</div>
						<div class="step-details">
							<b>2. Select "Add to Home Screen"</b>
							<p>Scroll down through the share menu options and tap <strong>"Add to Home Screen"</strong>.</p>
						</div>
					</div>

					<div class="step-card">
						<div class="step-icon-wrap ios-done">
							<NavIcon name="check" size={17} />
						</div>
						<div class="step-details">
							<b>3. Tap "Add" in Top-Right</b>
							<p>Confirm by tapping <strong>Add</strong>. BTracker will now launch like a full-screen native iOS app!</p>
						</div>
					</div>
				{:else if device.isAndroid}
					<!-- Android Steps -->
					<div class="step-card">
						<div class="step-icon-wrap">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<circle cx="12" cy="12" r="1.5"></circle>
								<circle cx="12" cy="5" r="1.5"></circle>
								<circle cx="12" cy="19" r="1.5"></circle>
							</svg>
						</div>
						<div class="step-details">
							<b>1. Open Browser Menu</b>
							<p>Tap the three-dots <strong>(⋮)</strong> menu button in the top-right corner of Chrome or your browser.</p>
						</div>
					</div>

					<div class="step-card">
						<div class="step-icon-wrap">
							<NavIcon name="download" size={17} />
						</div>
						<div class="step-details">
							<b>2. Tap "Install App" or "Add to Home"</b>
							<p>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> from the menu options.</p>
						</div>
					</div>

					<div class="step-card">
						<div class="step-icon-wrap">
							<NavIcon name="check" size={17} />
						</div>
						<div class="step-details">
							<b>3. Confirm &amp; Launch</b>
							<p>Tap <strong>Install</strong>. BTracker appears in your home screen and app drawer with offline support!</p>
						</div>
					</div>
				{:else if device.isMac}
					<!-- macOS Steps -->
					{#if device.isSafari}
						<div class="step-card">
							<div class="step-icon-wrap mac-icon">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
									<polyline points="16 6 12 2 8 6"></polyline>
									<line x1="12" y1="2" x2="12" y2="15"></line>
								</svg>
							</div>
							<div class="step-details">
								<b>1. In Safari Menu Bar: Click "File"</b>
								<p>Or click the <strong>Share</strong> button in Safari's top toolbar.</p>
							</div>
						</div>

						<div class="step-card">
							<div class="step-icon-wrap mac-icon">
								<NavIcon name="tv" size={17} />
							</div>
							<div class="step-details">
								<b>2. Choose "Add to Dock..."</b>
								<p>Select <strong>"Add to Dock..."</strong> from the menu and confirm name "BTracker".</p>
							</div>
						</div>

						<div class="step-card">
							<div class="step-icon-wrap mac-icon">
								<NavIcon name="sparkles" size={17} />
							</div>
							<div class="step-details">
								<b>3. Enjoy Standalone Mac App</b>
								<p>Click BTracker in your Mac Dock to launch as a standalone desktop application with keyboard shortcuts!</p>
							</div>
						</div>
					{:else}
						<div class="step-card">
							<div class="step-icon-wrap">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<circle cx="12" cy="12" r="10" />
									<path d="m15 12-3-3-3 3" />
									<path d="M12 9v6" />
								</svg>
							</div>
							<div class="step-details">
								<b>1. Click Install in Address Bar</b>
								<p>In Chrome / Edge, look at the right side of the address bar and click the <strong>Install BTracker</strong> icon.</p>
							</div>
						</div>

						<div class="step-card">
							<div class="step-icon-wrap">
								<NavIcon name="check" size={17} />
							</div>
							<div class="step-details">
								<b>2. Click "Install"</b>
								<p>BTracker will install to your Mac Applications folder and launch in its own standalone window.</p>
							</div>
						</div>
					{/if}
				{:else}
					<!-- Windows / PC Steps -->
					<div class="step-card">
						<div class="step-icon-wrap">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="16" />
								<line x1="8" y1="12" x2="16" y2="12" />
							</svg>
						</div>
						<div class="step-details">
							<b>1. Look at Browser URL Bar</b>
							<p>In Chrome, Edge, or Brave, click the <strong>Install App</strong> icon (or computer monitor with arrow) in the address bar.</p>
						</div>
					</div>

					<div class="step-card">
						<div class="step-icon-wrap">
							<NavIcon name="check" size={17} />
						</div>
						<div class="step-details">
							<b>2. Click "Install"</b>
							<p>Pin BTracker to your Windows Taskbar or Start Menu for one-click access!</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Key Advantages Grid -->
		<div class="perks-grid">
			<div class="perk-card">
				<span class="perk-icon">⚡</span>
				<div class="perk-copy">
					<b>1-Tap Instant Launch</b>
					<small>Opens instantly from Home Screen or Dock.</small>
				</div>
			</div>
			<div class="perk-card">
				<span class="perk-icon">📴</span>
				<div class="perk-copy">
					<b>100% Offline Access</b>
					<small>Timers, formulas &amp; logs work with zero Wi-Fi.</small>
				</div>
			</div>
			<div class="perk-card">
				<span class="perk-icon">🎯</span>
				<div class="perk-copy">
					<b>Zero Distractions</b>
					<small>No search bars, browser tabs, or accidental closes.</small>
				</div>
			</div>
			<div class="perk-card">
				<span class="perk-icon">🔄</span>
				<div class="perk-copy">
					<b>Automatic Cloud Sync</b>
					<small>Saves locally &amp; syncs automatically when online.</small>
				</div>
			</div>
		</div>

		<!-- Footer Options -->
		<footer class="pwa-footer">
			<label class="opt-out-checkbox">
				<input type="checkbox" bind:checked={dontAskAgain} />
				<span>Don't show this popup automatically on this device</span>
			</label>

			<div class="footer-actions">
				<button type="button" class="btn-subtle" on:click={handleDismiss}>
					Maybe Later
				</button>
				<button type="button" class="btn-primary" on:click={handleMarkAsAdded}>
					<NavIcon name="check" size={14} />
					<span>I've Added It ✓</span>
				</button>
			</div>
		</footer>
	</div>
</Modal>

<style>
	/* Offline Status Pill */
	.offline-pill {
		position: fixed;
		top: 14px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10001;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 1rem;
		border-radius: 99px;
		background: #f59e0b;
		color: #1c1002;
		font-size: 0.76rem;
		font-weight: 800;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
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

	/* Modal Container */
	.pwa-install-modal {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	/* Hero Section */
	.pwa-hero {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-bottom: 0.95rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.app-icon-badge {
		position: relative;
		width: 58px;
		height: 58px;
		border-radius: 16px;
		overflow: hidden;
		flex-shrink: 0;
		box-shadow: 0 8px 24px -4px color-mix(in srgb, var(--accent) 45%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 50%, rgba(255, 255, 255, 0.3));
	}

	.btracker-logo {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.specular-ring {
		position: absolute;
		inset: 0;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.35);
		pointer-events: none;
	}

	.pwa-hero-copy {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.device-pill {
		display: inline-flex;
		align-items: center;
		width: fit-content;
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.55rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.pwa-hero-copy h3 {
		margin: 0;
		font-size: 1.12rem;
		font-weight: 850;
		color: var(--text-primary);
		letter-spacing: -0.025em;
	}

	.pwa-hero-copy p {
		margin: 0;
		font-size: 0.76rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	/* Native One-Click Install Banner */
	.native-install-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--accent) 12%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border-subtle));
		flex-wrap: wrap;
	}

	.native-text b {
		display: block;
		font-size: 0.82rem;
		color: var(--text-primary);
	}

	.native-text small {
		font-size: 0.7rem;
		color: var(--text-secondary);
	}

	.btn-native-install {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 1rem;
		border-radius: 9px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		font-size: 0.78rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 40%, transparent);
		transition: transform 0.15s ease, filter 0.15s ease;
	}

	.btn-native-install:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	/* Device Guide Stepper */
	.device-guide-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.guide-title {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--accent);
		text-transform: uppercase;
	}

	.instruction-steps {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.step-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.7rem 0.85rem;
		border-radius: 12px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		transition: all 0.18s ease;
	}

	.step-card:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--border-subtle));
		background: color-mix(in srgb, var(--accent) 5%, var(--surface-subtle));
	}

	.step-icon-wrap {
		width: 32px;
		height: 32px;
		border-radius: 9px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.step-icon-wrap.ios-share {
		background: color-mix(in srgb, #0284c7 15%, transparent);
		color: #0284c7;
		border-color: color-mix(in srgb, #0284c7 30%, transparent);
	}

	.step-icon-wrap.ios-add {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.step-icon-wrap.ios-done {
		background: color-mix(in srgb, #10b981 15%, transparent);
		color: #10b981;
		border-color: color-mix(in srgb, #10b981 30%, transparent);
	}

	.step-details {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}

	.step-details b {
		font-size: 0.8rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.step-details p {
		margin: 0;
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.step-details strong {
		color: var(--text-primary);
	}

	/* Perks 2x2 Grid */
	.perks-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.55rem;
		padding-top: 0.3rem;
	}

	.perk-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.75rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-subtle) 60%, transparent);
		border: 1px solid var(--border-subtle);
	}

	.perk-icon {
		font-size: 1.25rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.perk-copy b {
		display: block;
		font-size: 0.76rem;
		font-weight: 750;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.perk-copy small {
		display: block;
		font-size: 0.65rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	/* Footer */
	.pwa-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
		flex-wrap: wrap;
	}

	.opt-out-checkbox {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.72rem;
		color: var(--text-secondary);
		cursor: pointer;
		user-select: none;
	}

	.opt-out-checkbox input {
		accent-color: var(--accent);
		cursor: pointer;
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-subtle {
		padding: 0.45rem 0.95rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-secondary);
		font-size: 0.76rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
	}

	.btn-subtle:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.48rem 1.15rem;
		border-radius: 9px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		font-size: 0.78rem;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: transform 0.15s ease, opacity 0.15s ease;
	}

	.btn-primary:hover {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	@media (max-width: 600px) {
		.pwa-hero {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.perks-grid {
			grid-template-columns: 1fr;
		}

		.pwa-footer {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.footer-actions {
			display: flex;
			width: 100%;
			gap: 0.5rem;
		}

		.footer-actions button {
			flex: 1;
			justify-content: center;
			text-align: center;
			min-height: 40px;
		}
	}
</style>
