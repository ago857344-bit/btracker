<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let open = false;
	export let onClose: () => void = () => {
		open = false;
	};

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

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && open) {
			onClose();
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="wx-modal-backdrop"
		transition:fade={{ duration: 180 }}
		role="presentation"
		on:click|self={onClose}
	>
		<div
			class="wx-dialog-card"
			aria-modal="true"
			aria-labelledby="get-started-title"
			transition:scale={{ start: 0.95, duration: 220 }}
		>
			<!-- Close Button -->
			<button
				type="button"
				class="wx-close-btn"
				aria-label="Close dialog"
				on:click={onClose}
			>
				<NavIcon name="x" size={17} />
			</button>

			<!-- Header -->
			<div class="wx-modal-header">
				<div class="wx-logo-mark">
					<span class="wx-logo-letter">B</span>
				</div>
				<h2 id="get-started-title" class="wx-modal-title">How would you like to use BTracker?</h2>
				<p class="wx-modal-sub">
					Choose whether you want to install the standalone desktop application or use it directly as a website.
				</p>
			</div>

			<!-- Choice Cards Grid -->
			<div class="wx-cards-grid">
				<!-- Option 1: Download Desktop -->
				<a href="/download" class="wx-card-item download-item" on:click={onClose}>
					<div class="wx-card-header">
						<div class="wx-icon-circle download">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
						</div>
						<span class="wx-tag mac-win">Mac & Windows</span>
					</div>

					<div class="wx-card-content">
						<b class="wx-card-name">Download Desktop App</b>
						<p class="wx-card-description">
							Standalone desktop application with offline focus workspace and zero browser tab clutter.
						</p>
					</div>

					<div class="wx-card-cta">
						<span class="wx-action-btn primary">
							<span>Go to Download Page</span>
							<NavIcon name="arrow-right" size={14} />
						</span>
					</div>
				</a>

				<!-- Option 2: Use as Site -->
				<a href="/login" class="wx-card-item site-item" on:click={onClose}>
					<div class="wx-card-header">
						<div class="wx-icon-circle site">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10" />
								<line x1="2" y1="12" x2="22" y2="12" />
								<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
							</svg>
						</div>
						<span class="wx-tag web">Instant Cloud</span>
					</div>

					<div class="wx-card-content">
						<b class="wx-card-name">Use as Site (Web App)</b>
						<p class="wx-card-description">
							Open directly in Chrome, Safari, or Edge. Instant cloud access with Google sync across all devices.
						</p>
					</div>

					<div class="wx-card-cta">
						<span class="wx-action-btn secondary">
							<span>Go to Site Login</span>
							<NavIcon name="arrow-right" size={14} />
						</span>
					</div>
				</a>
			</div>

			<!-- Footer Note -->
			<div class="wx-modal-footer">
				<span>100% free · Zero subscriptions · No credit card required</span>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Soft Forest Tinted Backdrop */
	.wx-modal-backdrop {
		position: fixed !important;
		inset: 0 !important;
		z-index: 9999 !important;
		background: rgba(15, 46, 32, 0.4) !important;
		backdrop-filter: blur(14px) !important;
		-webkit-backdrop-filter: blur(14px) !important;
		display: grid !important;
		place-items: center !important;
		padding: 20px !important;
		overflow-y: auto !important;
	}

	/* Archival Cream Card matching Welcome Page Theme */
	.wx-dialog-card {
		position: relative !important;
		width: min(580px, 94vw) !important;
		border-radius: 26px !important;
		background: #fbf8f3 !important;
		background-image: linear-gradient(180deg, #ffffff 0%, #fbf8f3 100%) !important;
		border: 1px solid rgba(15, 46, 32, 0.16) !important;
		box-shadow:
			0 28px 70px -15px rgba(15, 46, 32, 0.32),
			0 8px 24px -4px rgba(15, 46, 32, 0.12),
			inset 0 1px 0 #ffffff !important;
		padding: 30px 26px !important;
		color: #141a16 !important;
		box-sizing: border-box !important;
	}

	/* Close Button */
	.wx-close-btn {
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
		transition: all 0.16s ease !important;
		z-index: 10 !important;
	}

	.wx-close-btn:hover {
		background: rgba(15, 46, 32, 0.12) !important;
		color: #0a2418 !important;
		transform: scale(1.05) !important;
	}

	/* Header */
	.wx-modal-header {
		text-align: center !important;
		margin-bottom: 22px !important;
	}

	.wx-logo-mark {
		width: 44px !important;
		height: 44px !important;
		border-radius: 13px !important;
		background: #0f2e20 !important;
		color: #fbf8f3 !important;
		display: grid !important;
		place-items: center !important;
		margin: 0 auto 14px !important;
		box-shadow: 0 4px 16px rgba(15, 46, 32, 0.25) !important;
	}

	.wx-logo-letter {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-weight: 800 !important;
		font-size: 23px !important;
		line-height: 1 !important;
		color: #fbf8f3 !important;
	}

	.wx-modal-title {
		font-family: 'Newsreader', 'Fraunces', Georgia, serif !important;
		font-size: 1.65rem !important;
		font-weight: 500 !important;
		color: #0f2e20 !important;
		margin: 0 0 6px !important;
		letter-spacing: -0.025em !important;
		line-height: 1.15 !important;
	}

	.wx-modal-sub {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-size: 0.85rem !important;
		color: #536259 !important;
		line-height: 1.45 !important;
		max-width: 440px !important;
		margin: 0 auto !important;
	}

	/* Choice Cards Grid */
	.wx-cards-grid {
		display: grid !important;
		grid-template-columns: 1fr 1fr !important;
		gap: 14px !important;
		margin-bottom: 20px !important;
	}

	.wx-card-item {
		display: flex !important;
		flex-direction: column !important;
		justify-content: space-between !important;
		background: #ffffff !important;
		border: 1px solid rgba(15, 46, 32, 0.12) !important;
		border-radius: 18px !important;
		padding: 18px !important;
		text-decoration: none !important;
		color: inherit !important;
		box-shadow: 0 4px 14px rgba(15, 46, 32, 0.04) !important;
		transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1) !important;
		cursor: pointer !important;
	}

	.wx-card-item:hover {
		transform: translateY(-2px) !important;
		border-color: #0f2e20 !important;
		box-shadow: 0 10px 26px -6px rgba(15, 46, 32, 0.16) !important;
	}

	.wx-card-header {
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		margin-bottom: 14px !important;
	}

	.wx-icon-circle {
		width: 38px !important;
		height: 38px !important;
		border-radius: 11px !important;
		display: grid !important;
		place-items: center !important;
		background: rgba(15, 46, 32, 0.08) !important;
		color: #0f2e20 !important;
	}

	.wx-tag {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-size: 0.68rem !important;
		font-weight: 750 !important;
		padding: 3px 8px !important;
		border-radius: 9999px !important;
		background: rgba(15, 46, 32, 0.08) !important;
		color: #0f2e20 !important;
		letter-spacing: 0.02em !important;
	}

	.wx-card-content {
		flex: 1 !important;
		margin-bottom: 16px !important;
	}

	.wx-card-name {
		display: block !important;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-size: 1rem !important;
		font-weight: 750 !important;
		color: #0f2e20 !important;
		margin-bottom: 4px !important;
		letter-spacing: -0.01em !important;
	}

	.wx-card-description {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-size: 0.77rem !important;
		color: #536259 !important;
		line-height: 1.45 !important;
		margin: 0 !important;
	}

	.wx-card-cta {
		margin-top: auto !important;
	}

	.wx-action-btn {
		display: inline-flex !important;
		align-items: center !important;
		justify-content: center !important;
		gap: 6px !important;
		width: 100% !important;
		padding: 10px 14px !important;
		border-radius: 10px !important;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-size: 0.8rem !important;
		font-weight: 700 !important;
		transition: all 0.16s ease !important;
		box-sizing: border-box !important;
	}

	.wx-action-btn.primary {
		background: #0f2e20 !important;
		color: #fbf8f3 !important;
	}

	.wx-action-btn.primary * {
		color: #fbf8f3 !important;
		stroke: #fbf8f3 !important;
	}

	.wx-card-item:hover .wx-action-btn.primary {
		background: #0a2418 !important;
	}

	.wx-action-btn.secondary {
		background: rgba(15, 46, 32, 0.06) !important;
		color: #0f2e20 !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
	}

	.wx-card-item:hover .wx-action-btn.secondary {
		background: rgba(15, 46, 32, 0.12) !important;
	}

	/* Footer Note */
	.wx-modal-footer {
		text-align: center !important;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
		font-size: 0.73rem !important;
		color: #536259 !important;
	}

	@media (max-width: 540px) {
		.wx-dialog-card {
			padding: 24px 18px !important;
		}

		.wx-cards-grid {
			grid-template-columns: 1fr !important;
		}
	}
</style>
