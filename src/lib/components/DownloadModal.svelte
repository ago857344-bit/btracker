<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import MacInstallGuideModal from '$lib/components/MacInstallGuideModal.svelte';

	export let open = false;
	export let onClose: () => void = () => {
		open = false;
	};

	type OS = 'mac' | 'windows' | 'linux';
	let detectedOS: OS = 'mac';
	let activeOS: 'mac' | 'windows' = 'mac';
	let deferredPrompt: any = null;
	let pwaInstalled = false;
	let copiedKey = '';
	let macGuideOpen = false;

	$: if (!open && macGuideOpen) macGuideOpen = false;

	$: if (typeof document !== 'undefined') {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	});

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('win')) {
			detectedOS = 'windows';
			activeOS = 'windows';
		} else {
			detectedOS = 'mac';
			activeOS = 'mac';
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

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && open && !macGuideOpen) {
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
			window.removeEventListener('keydown', handleKeydown);
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
			alert('To install BTracker in your browser, click the "Install" or "Add to Home Screen" icon in your URL address bar.');
		}
	}
</script>

{#if open && !macGuideOpen}
	<div
		class="btracker-modal-overlay"
		transition:fade={{ duration: 180 }}
		role="presentation"
		on:click|self={onClose}
	>
		<div
			class="btracker-dl-dialog"
			aria-modal="true"
			aria-labelledby="download-title"
			transition:scale={{ start: 0.95, duration: 220 }}
		>
			<!-- Close Button -->
			<button
				type="button"
				class="dl-close-btn"
				aria-label="Close download dialog"
				on:click={onClose}
			>
				<NavIcon name="x" size={18} />
			</button>

			<!-- Header -->
			<div class="dl-header">
				<div class="dl-logo-badge">
					<span class="dl-logo-b">B</span>
				</div>
				<h2 id="download-title" class="dl-title">Download BTracker Free</h2>
				<p class="dl-subtitle">
					Independent desktop application — zero App Store fees, zero subscriptions, 100% offline-ready.
				</p>
			</div>

			<!-- OS Segmented Switcher -->
			<div class="dl-switcher" role="tablist" aria-label="Select Operating System">
				<button
					type="button"
					role="tab"
					aria-selected={activeOS === 'mac'}
					class="dl-tab"
					class:active={activeOS === 'mac'}
					on:click={() => (activeOS = 'mac')}
				>
					<svg class="tab-svg" viewBox="0 0 170 170" width="16" height="16" fill="currentColor">
						<path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-6.19-9.57-11.03-20.73-14.53-33.48-3.5-12.74-5.25-24.62-5.25-35.63 0-14.35 3.5-26.39 10.5-36.12 7-9.73 15.84-14.71 26.5-14.94 4.58 0 9.88 1.25 15.89 3.75 6.02 2.5 10.15 3.79 12.4 3.87 2.02-.08 6.27-1.37 12.75-3.87 6.47-2.5 11.58-3.67 15.34-3.5 11.42.63 20.73 4.96 27.92 13 4.18 4.67 7.37 10.08 9.58 16.23-10.42 6.32-15.54 15.11-15.34 26.38.2 8.74 3.54 16.03 10.02 21.87 6.48 5.84 14.15 9.17 23 10-2.19 6.42-4.82 12.87-7.9 19.34zM119.22 31.9c0-6.72 2.37-13.14 7.12-18.25 4.74-5.11 10.7-8.52 17.88-10.22.42 1.58.63 3.09.63 4.54 0 6.64-2.48 13.04-7.44 18.2-4.96 5.16-11.01 8.52-18.15 10.07-.04-1.46-.04-2.9-.04-4.34z"/>
					</svg>
					<span class="tab-label">macOS Setup</span>
					{#if detectedOS === 'mac'}
						<span class="tab-os-tag">Your OS</span>
					{/if}
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeOS === 'windows'}
					class="dl-tab"
					class:active={activeOS === 'windows'}
					on:click={() => (activeOS = 'windows')}
				>
					<svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
					</svg>
					<span class="tab-label">Windows Setup</span>
					{#if detectedOS === 'windows'}
						<span class="tab-os-tag">Your OS</span>
					{/if}
				</button>
			</div>

			<!-- ==================== macOS VIEW ==================== -->
			{#if activeOS === 'mac'}
				<div class="dl-panel" transition:fade={{ duration: 120 }}>
					<!-- Main Download CTA Box -->
					<div class="dl-action-box">
						<div class="action-info">
							<span class="os-pill mac">Apple Silicon (M1–M4) & Intel</span>
							<h3 class="action-title">BTracker for Mac</h3>
							<p class="action-desc">Native Mach-O application bundle with offline study workspace</p>
						</div>
						<div class="action-buttons">
							<a
								href="/api/download?os=mac"
								download="BTracker-macOS.zip"
								class="dl-btn-primary"
								on:click={() => (macGuideOpen = true)}
							>
								<span>Download .ZIP</span>
								<NavIcon name="arrow-right" size={14} />
							</a>
							<a
								href="/downloads/BTracker-macOS.zip"
								download="BTracker-macOS.zip"
								class="dl-btn-subtle"
								on:click={() => (macGuideOpen = true)}
							>
								Mirror
							</a>
						</div>
					</div>

					<!-- Step-by-Step Instructions -->
					<div class="dl-instructions">
						<div class="instr-head">
							<NavIcon name="shield" size={15} />
							<span class="instr-head-text">macOS First Launch Instructions</span>
						</div>
						<p class="instr-note">
							Because BTracker avoids Apple's $99/year fee, macOS Gatekeeper asks for permission once on first open:
						</p>

						<div class="step-stack">
							<div class="step-row">
								<span class="step-badge">01</span>
								<div class="step-body">
									<b class="step-heading">Unzip & Move</b>
									<p class="step-text">Double-click <code>BTracker-macOS.zip</code>, then drag <code>BTracker.app</code> into your Applications folder.</p>
								</div>
							</div>

							<div class="step-row">
								<span class="step-badge">02</span>
								<div class="step-body">
									<b class="step-heading">First Open Alert</b>
									<p class="step-text">Double-click the app. When macOS says <i>"Apple cannot check it for malicious software"</i>, click <b>Done</b>.</p>
								</div>
							</div>

							<div class="step-row spotlight">
								<span class="step-badge">03</span>
								<div class="step-body">
									<b class="step-heading">Allow Once in Settings</b>
									<p class="step-text">Open <b>System Settings</b> &rarr; <b>Privacy & Security</b> &rarr; scroll to Security & click <b>"Open Anyway"</b>.</p>
								</div>
							</div>
						</div>

						<!-- Terminal 1-Liner Shortcut -->
						<div class="dl-terminal">
							<span class="term-title">⚡ Or 1-line Terminal Auto-Installer (Zero Prompts):</span>
							<div class="term-row">
								<code class="term-code">curl -fsSL https://btracker.app/install.sh | bash</code>
								<button
									type="button"
									class="term-copy"
									on:click={() => copyToClipboard('curl -fsSL https://btracker.app/install.sh | bash', 'mac-curl')}
								>
									{copiedKey === 'mac-curl' ? 'Copied ✓' : 'Copy'}
								</button>
							</div>
						</div>
					</div>
				</div>

			<!-- ==================== Windows VIEW ==================== -->
			{:else}
				<div class="dl-panel" transition:fade={{ duration: 120 }}>
					<!-- Main Download CTA Box -->
					<div class="dl-action-box">
						<div class="action-info">
							<span class="os-pill win">Windows 10 & 11 (64-bit)</span>
							<h3 class="action-title">BTracker for Windows</h3>
							<p class="action-desc">Standalone desktop command center using native Edge engine</p>
						</div>
						<div class="action-buttons">
							<a
								href="/api/download?os=windows"
								download="BTracker-Windows.zip"
								class="dl-btn-primary"
							>
								<span>Download .ZIP</span>
								<NavIcon name="arrow-right" size={14} />
							</a>
							<a
								href="/downloads/BTracker-Windows.zip"
								download="BTracker-Windows.zip"
								class="dl-btn-subtle"
							>
								Mirror
							</a>
						</div>
					</div>

					<!-- Step-by-Step Instructions -->
					<div class="dl-instructions">
						<div class="instr-head">
							<NavIcon name="shield" size={15} />
							<span class="instr-head-text">Windows Setup Instructions</span>
						</div>
						<p class="instr-note">
							Simple 2-step portable setup for Windows 10 and Windows 11 PCs:
						</p>

						<div class="step-stack">
							<div class="step-row">
								<span class="step-badge">01</span>
								<div class="step-body">
									<b class="step-heading">Extract the ZIP</b>
									<p class="step-text">Right-click <code>BTracker-Windows.zip</code> and choose <b>Extract All...</b> to any folder (e.g. Desktop).</p>
								</div>
							</div>

							<div class="step-row">
								<span class="step-badge">02</span>
								<div class="step-body">
									<b class="step-heading">Launch App</b>
									<p class="step-text">Double-click <b><code>BTracker.vbs</code></b> (silent launcher) or <code>BTracker.bat</code> to start the app window.</p>
								</div>
							</div>

							<div class="step-row spotlight">
								<span class="step-badge">03</span>
								<div class="step-body">
									<b class="step-heading">SmartScreen (If prompted)</b>
									<p class="step-text">If Windows SmartScreen appears (*"Windows protected your PC"*), click <b>"More info"</b> &rarr; <b>"Run anyway"</b>.</p>
								</div>
							</div>
						</div>

						<!-- Windows Taskbar Tip -->
						<div class="dl-terminal">
							<span class="term-title">📌 Pro Tip: 1-Click Taskbar & Desktop Shortcut:</span>
							<p class="term-desc">
								Right-click <b>BTracker.vbs</b> &rarr; choose <b>"Pin to Taskbar"</b> or <b>"Send to Desktop (create shortcut)"</b> for one-click access every study session.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Universal Alternative: PWA 1-Click Browser Install -->
			<div class="dl-pwa-footer">
				<div class="pwa-card">
					<div class="pwa-tag">Instant App</div>
					<div class="pwa-content">
						<b class="pwa-title">Prefer zero downloads?</b>
						<span class="pwa-sub">Install directly from Chrome, Edge, or Safari (Add to Dock) with zero security prompts.</span>
					</div>
					<button type="button" class="pwa-btn" on:click={installPWA}>
						{pwaInstalled ? 'Installed ✓' : 'Install App →'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<MacInstallGuideModal bind:open={macGuideOpen} onClose={() => (macGuideOpen = false)} />

<style>
	/* Soft Forest Tinted Backdrop */
	.btracker-modal-overlay {
		position: fixed !important;
		inset: 0 !important;
		z-index: 9999 !important;
		background: rgba(15, 46, 32, 0.42) !important;
		backdrop-filter: blur(14px) !important;
		-webkit-backdrop-filter: blur(14px) !important;
		display: grid !important;
		place-items: center !important;
		padding: 20px !important;
		overflow-y: auto !important;
	}

	/* Archival Cream Card matching Welcome Page Theme */
	.btracker-dl-dialog {
		position: relative !important;
		width: min(640px, 94vw) !important;
		max-height: 92vh !important;
		overflow-y: auto !important;
		border-radius: 26px !important;
		background: #fbf8f3 !important;
		background-image: linear-gradient(180deg, #ffffff 0%, #fbf8f3 100%) !important;
		border: 1px solid rgba(15, 46, 32, 0.16) !important;
		box-shadow:
			0 28px 70px -15px rgba(15, 46, 32, 0.32),
			0 8px 24px -4px rgba(15, 46, 32, 0.12),
			inset 0 1px 0 #ffffff !important;
		padding: 28px 26px !important;
		color: #141a16 !important;
		box-sizing: border-box !important;
	}

	/* Top Close Button */
	.dl-close-btn {
		position: absolute !important;
		top: 18px !important;
		right: 18px !important;
		width: 34px !important;
		height: 34px !important;
		border-radius: 50% !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		background: rgba(15, 46, 32, 0.05) !important;
		color: #0f2e20 !important;
		display: grid !important;
		place-items: center !important;
		cursor: pointer !important;
		transition: all 0.15s ease !important;
		z-index: 10 !important;
	}

	.dl-close-btn:hover {
		background: rgba(15, 46, 32, 0.12) !important;
		transform: scale(1.05) !important;
	}

	/* Header */
	.dl-header {
		text-align: center !important;
		margin-bottom: 22px !important;
	}

	.dl-logo-badge {
		width: 44px !important;
		height: 44px !important;
		border-radius: 12px !important;
		background: #0f2e20 !important;
		color: #fbf8f3 !important;
		display: grid !important;
		place-items: center !important;
		margin: 0 auto 12px !important;
		box-shadow: 0 6px 18px rgba(15, 46, 32, 0.22) !important;
	}

	.dl-logo-b {
		font-family: 'Newsreader', 'Fraunces', Georgia, serif !important;
		font-weight: 700 !important;
		font-size: 24px !important;
		line-height: 1 !important;
		color: #fbf8f3 !important;
	}

	.dl-title {
		font-family: 'Newsreader', 'Fraunces', Georgia, serif !important;
		font-size: 1.65rem !important;
		font-weight: 700 !important;
		color: #0f2e20 !important;
		margin: 0 0 6px !important;
		letter-spacing: -0.02em !important;
	}

	.dl-subtitle {
		font-size: 0.84rem !important;
		color: #536259 !important;
		line-height: 1.45 !important;
		max-width: 460px !important;
		margin: 0 auto !important;
	}

	/* Segmented OS Switcher */
	.dl-switcher {
		display: grid !important;
		grid-template-columns: 1fr 1fr !important;
		gap: 6px !important;
		background: rgba(15, 46, 32, 0.06) !important;
		border: 1px solid rgba(15, 46, 32, 0.1) !important;
		border-radius: 13px !important;
		padding: 4px !important;
		margin-bottom: 18px !important;
	}

	.dl-tab {
		display: inline-flex !important;
		align-items: center !important;
		justify-content: center !important;
		gap: 8px !important;
		padding: 9px 14px !important;
		border-radius: 9px !important;
		background: transparent !important;
		border: none !important;
		color: #536259 !important;
		font-size: 0.82rem !important;
		font-weight: 650 !important;
		cursor: pointer !important;
		transition: all 0.15s ease !important;
	}

	.dl-tab.active {
		background: #ffffff !important;
		color: #0f2e20 !important;
		box-shadow: 0 2px 8px rgba(15, 46, 32, 0.08) !important;
	}

	.dl-tab:hover:not(.active) {
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.04) !important;
	}

	.tab-svg {
		flex-shrink: 0 !important;
		color: inherit !important;
	}

	.tab-label {
		color: inherit !important;
	}

	.tab-os-tag {
		font-size: 0.64rem !important;
		font-weight: 750 !important;
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.1) !important;
		padding: 2px 7px !important;
		border-radius: 9999px !important;
		border: 1px solid rgba(15, 46, 32, 0.18) !important;
		text-transform: uppercase !important;
	}

	/* Download CTA Card */
	.dl-action-box {
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		gap: 16px !important;
		background: #ffffff !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		border-radius: 16px !important;
		padding: 18px 20px !important;
		margin-bottom: 16px !important;
		box-shadow: 0 4px 16px rgba(15, 46, 32, 0.04) !important;
	}

	.os-pill {
		display: inline-block !important;
		font-size: 0.68rem !important;
		font-weight: 700 !important;
		text-transform: uppercase !important;
		letter-spacing: 0.05em !important;
		padding: 2px 8px !important;
		border-radius: 9999px !important;
		margin-bottom: 4px !important;
	}

	.os-pill.mac,
	.os-pill.win {
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.08) !important;
		border: 1px solid rgba(15, 46, 32, 0.16) !important;
	}

	.action-title {
		font-size: 1.05rem !important;
		font-weight: 800 !important;
		color: #0f2e20 !important;
		margin: 0 !important;
	}

	.action-desc {
		font-size: 0.78rem !important;
		color: #536259 !important;
		margin: 2px 0 0 !important;
	}

	.action-buttons {
		display: flex !important;
		align-items: center !important;
		gap: 8px !important;
		flex-shrink: 0 !important;
	}

	/* Primary Download Button: Forest Green with Cream Text */
	.dl-btn-primary {
		display: inline-flex !important;
		align-items: center !important;
		gap: 7px !important;
		background: #0f2e20 !important;
		color: #fbf8f3 !important;
		font-size: 0.84rem !important;
		font-weight: 750 !important;
		padding: 10px 18px !important;
		border-radius: 10px !important;
		text-decoration: none !important;
		box-shadow: 0 4px 14px rgba(15, 46, 32, 0.22) !important;
		transition: all 0.15s ease !important;
	}

	.dl-btn-primary * {
		color: #fbf8f3 !important;
		stroke: #fbf8f3 !important;
	}

	.dl-btn-primary:hover {
		background: #184732 !important;
		transform: translateY(-1px) !important;
	}

	.dl-btn-subtle {
		display: inline-flex !important;
		align-items: center !important;
		background: rgba(15, 46, 32, 0.06) !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		color: #0f2e20 !important;
		font-size: 0.8rem !important;
		font-weight: 650 !important;
		padding: 10px 14px !important;
		border-radius: 10px !important;
		text-decoration: none !important;
		transition: all 0.15s ease !important;
	}

	.dl-btn-subtle:hover {
		background: rgba(15, 46, 32, 0.12) !important;
	}

	/* Instructions Section */
	.dl-instructions {
		background: #ffffff !important;
		border: 1px solid rgba(15, 46, 32, 0.12) !important;
		border-radius: 16px !important;
		padding: 18px 20px !important;
		margin-bottom: 16px !important;
	}

	.instr-head {
		display: flex !important;
		align-items: center !important;
		gap: 8px !important;
		color: #0f2e20 !important;
		margin-bottom: 4px !important;
	}

	.instr-head-text {
		font-size: 0.86rem !important;
		font-weight: 750 !important;
		color: #0f2e20 !important;
	}

	.instr-note {
		font-size: 0.78rem !important;
		color: #536259 !important;
		margin: 0 0 12px !important;
		line-height: 1.4 !important;
	}

	.step-stack {
		display: flex !important;
		flex-direction: column !important;
		gap: 8px !important;
		margin-bottom: 14px !important;
	}

	.step-row {
		display: flex !important;
		align-items: flex-start !important;
		gap: 12px !important;
		background: #faf7f2 !important;
		border: 1px solid rgba(15, 46, 32, 0.08) !important;
		border-radius: 10px !important;
		padding: 10px 12px !important;
	}

	.step-row.spotlight {
		background: rgba(15, 46, 32, 0.05) !important;
		border-color: rgba(15, 46, 32, 0.2) !important;
	}

	.step-badge {
		font-family: 'JetBrains Mono', monospace !important;
		font-size: 0.72rem !important;
		font-weight: 800 !important;
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.1) !important;
		padding: 2px 6px !important;
		border-radius: 5px !important;
		flex-shrink: 0 !important;
	}

	.step-heading {
		display: block !important;
		font-size: 0.82rem !important;
		font-weight: 700 !important;
		color: #0f2e20 !important;
		margin-bottom: 2px !important;
	}

	.step-text {
		font-size: 0.75rem !important;
		color: #536259 !important;
		margin: 0 !important;
		line-height: 1.4 !important;
	}

	.step-text b {
		color: #0f2e20 !important;
	}

	.step-text code {
		font-family: 'JetBrains Mono', monospace !important;
		font-size: 0.72rem !important;
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.08) !important;
		padding: 1px 5px !important;
		border-radius: 4px !important;
	}

	/* Terminal One-Liner Box */
	.dl-terminal {
		border-top: 1px solid rgba(15, 46, 32, 0.09) !important;
		padding-top: 12px !important;
	}

	.term-title {
		display: block !important;
		font-size: 0.74rem !important;
		font-weight: 650 !important;
		color: #0f2e20 !important;
		margin-bottom: 6px !important;
	}

	.term-row {
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		background: #faf7f2 !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		border-radius: 8px !important;
		padding: 6px 10px !important;
	}

	.term-code {
		font-family: 'JetBrains Mono', monospace !important;
		font-size: 0.72rem !important;
		color: #0f2e20 !important;
		overflow-x: auto !important;
		white-space: nowrap !important;
	}

	.term-copy {
		background: #0f2e20 !important;
		border: 1px solid #0f2e20 !important;
		color: #fbf8f3 !important;
		font-size: 0.7rem !important;
		font-weight: 700 !important;
		padding: 3px 9px !important;
		border-radius: 5px !important;
		cursor: pointer !important;
		transition: background 0.15s ease !important;
		flex-shrink: 0 !important;
		margin-left: 8px !important;
	}

	.term-copy:hover {
		background: #184732 !important;
	}

	.term-desc {
		font-size: 0.74rem !important;
		color: #536259 !important;
		margin: 0 !important;
		line-height: 1.4 !important;
	}

	.term-desc b {
		color: #0f2e20 !important;
	}

	/* PWA Footer */
	.dl-pwa-footer {
		margin-top: 4px !important;
	}

	.pwa-card {
		display: flex !important;
		align-items: center !important;
		gap: 12px !important;
		background: #ffffff !important;
		border: 1px solid rgba(15, 46, 32, 0.12) !important;
		border-radius: 14px !important;
		padding: 12px 16px !important;
	}

	.pwa-tag {
		font-size: 0.68rem !important;
		font-weight: 750 !important;
		text-transform: uppercase !important;
		letter-spacing: 0.05em !important;
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.1) !important;
		border: 1px solid rgba(15, 46, 32, 0.2) !important;
		padding: 3px 8px !important;
		border-radius: 6px !important;
		flex-shrink: 0 !important;
	}

	.pwa-title {
		display: block !important;
		font-size: 0.8rem !important;
		font-weight: 700 !important;
		color: #0f2e20 !important;
	}

	.pwa-sub {
		display: block !important;
		font-size: 0.72rem !important;
		color: #536259 !important;
		line-height: 1.3 !important;
	}

	.pwa-btn {
		background: #0f2e20 !important;
		border: 1px solid #0f2e20 !important;
		color: #fbf8f3 !important;
		font-size: 0.76rem !important;
		font-weight: 700 !important;
		padding: 8px 14px !important;
		border-radius: 8px !important;
		cursor: pointer !important;
		transition: all 0.15s ease !important;
		flex-shrink: 0 !important;
	}

	.pwa-btn:hover {
		background: #184732 !important;
	}

	@media (max-width: 540px) {
		.btracker-dl-dialog {
			padding: 22px 18px !important;
		}

		.dl-action-box {
			flex-direction: column !important;
			align-items: stretch !important;
		}

		.action-buttons {
			flex-direction: column !important;
		}

		.dl-btn-primary,
		.dl-btn-subtle {
			width: 100% !important;
			justify-content: center !important;
		}

		.pwa-card {
			flex-direction: column !important;
			align-items: stretch !important;
			text-align: center !important;
		}

		.pwa-btn {
			width: 100% !important;
		}
	}
</style>