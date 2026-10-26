<script lang="ts">
	import { onMount } from 'svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import MacInstallGuideModal from '$lib/components/MacInstallGuideModal.svelte';

	type OS = 'mac' | 'windows' | 'linux';
	let detectedOS: OS = 'mac';
	let activeGuideOS: 'mac' | 'windows' = 'mac';
	let deferredPrompt: any = null;
	let pwaInstalled = false;
	let copiedKey = '';
	let macGuideOpen = false;

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('win')) {
			detectedOS = 'windows';
			activeGuideOS = 'windows';
		} else {
			detectedOS = 'mac';
			activeGuideOS = 'mac';
		}

		const handleInstallPrompt = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e;
		};

		const handleAppInstalled = () => {
			pwaInstalled = true;
			deferredPrompt = null;
		};

		window.addEventListener('beforeinstallprompt', handleInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	});

	function copyToClipboard(text: string, key: string) {
		navigator.clipboard.writeText(text);
		copiedKey = key;
		setTimeout(() => {
			if (copiedKey === key) copiedKey = '';
		}, 2000);
	}

	async function installPWA() {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			const choice = await deferredPrompt.userChoice;
			if (choice.outcome === 'accepted') {
				pwaInstalled = true;
			}
			deferredPrompt = null;
		} else {
			alert('To install BTracker on this device, click the "Install" or "Add to Home Screen" icon in your browser URL bar / Share menu.');
		}
	}
</script>

<svelte:head>
	<title>Download BTracker — Free Desktop Application for macOS & Windows</title>
	<meta name="description" content="Download the standalone BTracker desktop app directly from the web for macOS and Windows. Zero App Store fees, offline-ready, 100% free forever." />
</svelte:head>

<div class="dl-page">
	<!-- Top Navigation -->
	<header class="dl-nav">
		<BrandLogo href="/welcome" size="sm" subtitle="JEE Study OS" label="BTracker — home" />
		<div class="dl-nav-right">
			<a href="/login" class="btn-ghost">Log in</a>
			<a href="/welcome" class="btn-subtle">Back to Home</a>
		</div>
	</header>

	<main class="dl-main">
		<!-- Hero Section -->
		<div class="dl-hero">
			<div class="dl-badge">
				<span class="live-pulse"></span>
				<span>Direct Internet Download · Zero App Store Fees</span>
			</div>
			<h1>BTracker for Desktop</h1>
			<p class="dl-sub">
				The full JEE Study OS running natively on your computer. Ultra-fast local performance, offline question logging, and seamless cloud sync.
			</p>
		</div>

		<!-- Platform Download Cards -->
		<div class="cards-grid">
			<!-- macOS Card -->
			<div class="platform-card" class:highlighted={detectedOS === 'mac'}>
				{#if detectedOS === 'mac'}
					<span class="auto-tag">Recommended for your Mac</span>
				{/if}
				<div class="card-top">
					<svg class="platform-icon" viewBox="0 0 170 170" width="36" height="36" fill="currentColor">
						<path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-6.19-9.57-11.03-20.73-14.53-33.48-3.5-12.74-5.25-24.62-5.25-35.63 0-14.35 3.5-26.39 10.5-36.12 7-9.73 15.84-14.71 26.5-14.94 4.58 0 9.88 1.25 15.89 3.75 6.02 2.5 10.15 3.79 12.4 3.87 2.02-.08 6.27-1.37 12.75-3.87 6.47-2.5 11.58-3.67 15.34-3.5 11.42.63 20.73 4.96 27.92 13 4.18 4.67 7.37 10.08 9.58 16.23-10.42 6.32-15.54 15.11-15.34 26.38.2 8.74 3.54 16.03 10.02 21.87 6.48 5.84 14.15 9.17 23 10-2.19 6.42-4.82 12.87-7.9 19.34zM119.22 31.9c0-6.72 2.37-13.14 7.12-18.25 4.74-5.11 10.7-8.52 17.88-10.22.42 1.58.63 3.09.63 4.54 0 6.64-2.48 13.04-7.44 18.2-4.96 5.16-11.01 8.52-18.15 10.07-.04-1.46-.04-2.9-.04-4.34z"/>
					</svg>
					<div>
						<h3>macOS Application</h3>
						<p>Apple Silicon (M1–M4) & Intel · macOS 11+</p>
					</div>
				</div>

				<div class="button-stack">
					<a
						href="/api/download?os=mac"
						download="BTracker-macOS.zip"
						class="dl-btn primary"
						on:click={() => (macGuideOpen = true)}
					>
						<span>Download for Mac (.ZIP)</span>
						<NavIcon name="arrow-right" size={14} />
					</a>
					<a
						href="/downloads/BTracker-macOS.zip"
						download="BTracker-macOS.zip"
						class="dl-btn secondary"
						on:click={() => (macGuideOpen = true)}
					>
						<span>Mirror Download (Direct)</span>
					</a>
				</div>
			</div>

			<!-- Windows Card -->
			<div class="platform-card" class:highlighted={detectedOS === 'windows'}>
				{#if detectedOS === 'windows'}
					<span class="auto-tag">Recommended for your PC</span>
				{/if}
				<div class="card-top">
					<svg class="platform-icon" viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
						<path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
					</svg>
					<div>
						<h3>Windows Application</h3>
						<p>Windows 10 & 11 (64-bit) · Portable</p>
					</div>
				</div>

				<div class="button-stack">
					<a
						href="/api/download?os=windows"
						download="BTracker-Windows.zip"
						class="dl-btn primary"
					>
						<span>Download for Windows (.ZIP)</span>
						<NavIcon name="arrow-right" size={14} />
					</a>
					<a
						href="/downloads/BTracker-Windows.zip"
						download="BTracker-Windows.zip"
						class="dl-btn secondary"
					>
						<span>Mirror Package (Direct)</span>
					</a>
				</div>
			</div>

			<!-- Instant Web App (PWA) Card -->
			<div class="platform-card">
				<div class="card-top">
					<div class="pwa-icon">⚡</div>
					<div>
						<h3>Instant Browser App (PWA)</h3>
						<p>Zero download · Chrome / Edge / Safari</p>
					</div>
				</div>

				<div class="button-stack">
					<button type="button" class="dl-btn primary" on:click={installPWA}>
						<span>{pwaInstalled ? 'Installed in Dock ✓' : 'Install to Dock / Desktop'}</span>
						<NavIcon name="arrow-right" size={14} />
					</button>
					<a href="/login" class="dl-btn secondary">
						<span>Launch in Browser</span>
					</a>
				</div>
			</div>
		</div>

		<!-- Instruction-Based Setup Guide -->
		<section class="guide-box">
			<div class="guide-header">
				<div class="guide-header-text">
					<h3>First-Time Setup Instructions</h3>
					<p>How to open and run BTracker on your computer with zero issues</p>
				</div>

				<!-- OS Switcher Tabs -->
				<div class="guide-tabs" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeGuideOS === 'mac'}
						class="guide-tab"
						class:active={activeGuideOS === 'mac'}
						on:click={() => (activeGuideOS = 'mac')}
					>
						<svg viewBox="0 0 170 170" width="16" height="16" fill="currentColor">
							<path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-6.19-9.57-11.03-20.73-14.53-33.48-3.5-12.74-5.25-24.62-5.25-35.63 0-14.35 3.5-26.39 10.5-36.12 7-9.73 15.84-14.71 26.5-14.94 4.58 0 9.88 1.25 15.89 3.75 6.02 2.5 10.15 3.79 12.4 3.87 2.02-.08 6.27-1.37 12.75-3.87 6.47-2.5 11.58-3.67 15.34-3.5 11.42.63 20.73 4.96 27.92 13 4.18 4.67 7.37 10.08 9.58 16.23-10.42 6.32-15.54 15.11-15.34 26.38.2 8.74 3.54 16.03 10.02 21.87 6.48 5.84 14.15 9.17 23 10-2.19 6.42-4.82 12.87-7.9 19.34zM119.22 31.9c0-6.72 2.37-13.14 7.12-18.25 4.74-5.11 10.7-8.52 17.88-10.22.42 1.58.63 3.09.63 4.54 0 6.64-2.48 13.04-7.44 18.2-4.96 5.16-11.01 8.52-18.15 10.07-.04-1.46-.04-2.9-.04-4.34z"/>
						</svg>
						<span>macOS Instructions</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeGuideOS === 'windows'}
						class="guide-tab"
						class:active={activeGuideOS === 'windows'}
						on:click={() => (activeGuideOS = 'windows')}
					>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
						</svg>
						<span>Windows Instructions</span>
					</button>
				</div>
			</div>

			<!-- macOS Instructions Panel -->
			{#if activeGuideOS === 'mac'}
				<div class="steps-grid">
					<div class="step-card">
						<span class="step-num">01</span>
						<b>Extract & Move</b>
						<p>Double-click <code>BTracker-macOS.zip</code>, then drag <code>BTracker.app</code> into your Applications folder.</p>
					</div>

					<div class="step-card">
						<span class="step-num">02</span>
						<b>First Open Prompt</b>
						<p>Double-click to open. Because BTracker is free and avoids Apple's $99/yr fee, macOS alerts <i>"Apple cannot check it for malicious software"</i>. Click <b>Done</b>.</p>
					</div>

					<div class="step-card highlight">
						<span class="step-num">03</span>
						<b>Allow in Settings (1-Time)</b>
						<p>Open <b>System Settings</b> &rarr; <b>Privacy & Security</b> &rarr; scroll to Security and click <b>"Open Anyway"</b>. Done!</p>
					</div>
				</div>

				<!-- macOS Terminal One-Liner -->
				<div class="cli-box">
					<div class="cli-info">
						<b>⚡ Or 1-Line Terminal Auto-Installer (Bypasses Gatekeeper completely):</b>
						<span>Installs directly to /Applications with zero warnings</span>
					</div>
					<div class="cli-code-row">
						<code>curl -fsSL https://btracker.app/install.sh | bash</code>
						<button
							type="button"
							class="copy-btn-large"
							on:click={() => copyToClipboard('curl -fsSL https://btracker.app/install.sh | bash', 'page-mac-curl')}
						>
							{copiedKey === 'page-mac-curl' ? 'Copied ✓' : 'Copy Command'}
						</button>
					</div>
				</div>

			<!-- Windows Instructions Panel -->
			{:else}
				<div class="steps-grid">
					<div class="step-card">
						<span class="step-num">01</span>
						<b>Extract the ZIP</b>
						<p>Right-click <code>BTracker-Windows.zip</code> and select <b>Extract All...</b> to any location (like your Desktop or Documents).</p>
					</div>

					<div class="step-card">
						<span class="step-num">02</span>
						<b>Launch BTracker</b>
						<p>Double-click <b><code>BTracker.vbs</code></b> (silent launcher) or <code>BTracker.bat</code> to open the app window.</p>
					</div>

					<div class="step-card highlight">
						<span class="step-num">03</span>
						<b>SmartScreen (If prompted)</b>
						<p>If Windows SmartScreen appears (*"Windows protected your PC"*), click <b>"More info"</b> &rarr; <b>"Run anyway"</b>.</p>
					</div>
				</div>

				<!-- Windows Pinning Tip -->
				<div class="cli-box">
					<div class="cli-info">
						<b>📌 Pro Tip: 1-Click Desktop & Taskbar Shortcut:</b>
						<span>Right-click <b>BTracker.vbs</b> &rarr; choose <b>"Pin to Taskbar"</b> or <b>"Send to Desktop (create shortcut)"</b> for one-click access every study session.</span>
					</div>
				</div>
			{/if}
		</section>
	</main>

	<MacInstallGuideModal bind:open={macGuideOpen} onClose={() => (macGuideOpen = false)} />
</div>

<style>
	.dl-page {
		min-height: 100vh;
		background: #fbf8f3;
		color: #141a16;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		position: relative;
	}

	.dl-nav {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.dl-nav-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.btn-ghost {
		color: #536259;
		text-decoration: none;
		font-size: 0.86rem;
		font-weight: 600;
		padding: 8px 16px;
		border-radius: 9999px;
		transition: all 0.15s ease;
	}

	.btn-ghost:hover {
		color: #0f2e20;
		background: rgba(15, 46, 32, 0.06);
	}

	.btn-subtle {
		color: #fbf8f3;
		background: #0f2e20;
		border: 1px solid #0f2e20;
		text-decoration: none;
		font-size: 0.86rem;
		font-weight: 600;
		padding: 8px 18px;
		border-radius: 9999px;
		transition: all 0.15s ease;
		box-shadow: 0 4px 12px rgba(15, 46, 32, 0.16);
	}

	.btn-subtle:hover {
		background: #184732;
		border-color: #184732;
		transform: translateY(-1px);
	}

	.dl-main {
		max-width: 1060px;
		margin: 0 auto;
		padding: 20px 20px 80px;
	}

	.dl-hero {
		text-align: center;
		max-width: 680px;
		margin: 0 auto 44px;
	}

	.dl-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #0f2e20;
		background: rgba(15, 46, 32, 0.07);
		border: 1px solid rgba(15, 46, 32, 0.16);
		padding: 6px 14px;
		border-radius: 9999px;
		margin-bottom: 18px;
	}

	.live-pulse {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #0f2e20;
		box-shadow: 0 0 8px rgba(15, 46, 32, 0.5);
	}

	.dl-hero h1 {
		font-family: 'Newsreader', 'Fraunces', Georgia, serif;
		font-size: clamp(2.4rem, 5vw, 3.8rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.1;
		margin: 0 0 14px;
		color: #0f2e20;
	}

	.dl-sub {
		font-size: 1.05rem;
		color: #536259;
		line-height: 1.55;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin-bottom: 44px;
	}

	.platform-card {
		position: relative;
		background: #ffffff;
		border: 1px solid rgba(15, 46, 32, 0.14);
		border-radius: 22px;
		padding: 28px 22px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-shadow: 0 12px 32px -8px rgba(15, 46, 32, 0.08);
		transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.platform-card.highlighted {
		border-color: rgba(15, 46, 32, 0.35);
		box-shadow: 0 16px 40px -8px rgba(15, 46, 32, 0.16);
	}

	.platform-card:hover {
		transform: translateY(-3px);
		border-color: rgba(15, 46, 32, 0.28);
	}

	.auto-tag {
		position: absolute;
		top: -11px;
		left: 20px;
		background: #0f2e20;
		color: #fbf8f3;
		font-size: 0.68rem;
		font-weight: 750;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 3px 10px;
		border-radius: 9999px;
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 24px;
	}

	.platform-icon {
		flex-shrink: 0;
		color: #0f2e20;
	}

	.pwa-icon {
		font-size: 1.8rem;
		line-height: 1;
	}

	.card-top h3 {
		font-size: 1.2rem;
		font-weight: 800;
		color: #0f2e20;
		margin: 0;
	}

	.card-top p {
		font-size: 0.78rem;
		color: #536259;
		margin: 3px 0 0;
	}

	.button-stack {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.dl-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 16px;
		border-radius: 12px;
		font-size: 0.84rem;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		border: none;
		transition: all 0.15s ease;
		width: 100%;
		text-align: center;
		box-sizing: border-box;
	}

	.dl-btn.primary {
		background: #0f2e20;
		color: #fbf8f3;
		box-shadow: 0 4px 14px rgba(15, 46, 32, 0.22);
	}

	.dl-btn.primary * {
		color: #fbf8f3;
		stroke: #fbf8f3;
	}

	.dl-btn.primary:hover {
		background: #184732;
		transform: translateY(-1px);
	}

	.dl-btn.secondary {
		background: rgba(15, 46, 32, 0.06);
		border: 1px solid rgba(15, 46, 32, 0.14);
		color: #0f2e20;
	}

	.dl-btn.secondary:hover {
		background: rgba(15, 46, 32, 0.12);
	}

	/* Instruction Guide Section */
	.guide-box {
		background: #ffffff;
		border: 1px solid rgba(15, 46, 32, 0.14);
		border-radius: 22px;
		padding: 32px 28px;
		box-shadow: 0 16px 48px -12px rgba(15, 46, 32, 0.08);
	}

	.guide-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}

	.guide-header-text h3 {
		font-family: 'Newsreader', 'Fraunces', Georgia, serif;
		font-size: 1.45rem;
		font-weight: 700;
		color: #0f2e20;
		margin: 0 0 4px;
	}

	.guide-header-text p {
		font-size: 0.86rem;
		color: #536259;
		margin: 0;
	}

	.guide-tabs {
		display: inline-flex;
		gap: 6px;
		background: rgba(15, 46, 32, 0.06);
		border: 1px solid rgba(15, 46, 32, 0.1);
		border-radius: 12px;
		padding: 4px;
	}

	.guide-tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 8px;
		background: transparent;
		border: none;
		color: #536259;
		font-size: 0.82rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.guide-tab.active {
		background: #ffffff;
		color: #0f2e20;
		box-shadow: 0 2px 6px rgba(15, 46, 32, 0.08);
	}

	.guide-tab:hover:not(.active) {
		color: #0f2e20;
		background: rgba(15, 46, 32, 0.04);
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		margin-bottom: 20px;
	}

	.step-card {
		background: #faf7f2;
		border: 1px solid rgba(15, 46, 32, 0.08);
		border-radius: 16px;
		padding: 20px;
	}

	.step-card.highlight {
		background: rgba(15, 46, 32, 0.05);
		border-color: rgba(15, 46, 32, 0.2);
	}

	.step-num {
		display: inline-block;
		font-size: 0.78rem;
		font-weight: 800;
		color: #0f2e20;
		background: rgba(15, 46, 32, 0.1);
		padding: 3px 8px;
		border-radius: 6px;
		margin-bottom: 10px;
		font-family: 'JetBrains Mono', monospace;
	}

	.step-card b {
		display: block;
		font-size: 0.95rem;
		margin-bottom: 6px;
		color: #0f2e20;
	}

	.step-card p {
		font-size: 0.8rem;
		color: #536259;
		line-height: 1.45;
		margin: 0;
	}

	.step-card code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.74rem;
		color: #0f2e20;
		background: rgba(15, 46, 32, 0.08);
		padding: 1px 4px;
		border-radius: 4px;
	}

	/* Terminal One-Liner Box on Download Page */
	.cli-box {
		background: #faf7f2;
		border: 1px solid rgba(15, 46, 32, 0.12);
		border-radius: 14px;
		padding: 16px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.cli-info b {
		display: block;
		font-size: 0.85rem;
		color: #0f2e20;
		margin-bottom: 2px;
	}

	.cli-info span {
		font-size: 0.78rem;
		color: #536259;
	}

	.cli-code-row {
		display: flex;
		align-items: center;
		gap: 10px;
		background: #ffffff;
		border: 1px solid rgba(15, 46, 32, 0.14);
		border-radius: 10px;
		padding: 6px 12px;
	}

	.cli-code-row code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		color: #0f2e20;
	}

	.copy-btn-large {
		background: #0f2e20;
		border: 1px solid #0f2e20;
		color: #fbf8f3;
		font-size: 0.76rem;
		font-weight: 700;
		padding: 5px 12px;
		border-radius: 7px;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.copy-btn-large:hover {
		background: #184732;
	}

	@media (max-width: 880px) {
		.cards-grid,
		.steps-grid {
			grid-template-columns: 1fr;
		}

		.guide-header {
			flex-direction: column;
			align-items: stretch;
		}

		.guide-tabs {
			width: 100%;
		}

		.guide-tab {
			flex: 1;
			justify-content: center;
		}

		.cli-box {
			flex-direction: column;
			align-items: stretch;
		}

		.cli-code-row {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}
	}
</style>