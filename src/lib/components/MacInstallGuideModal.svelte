<script lang="ts">
	import { tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let open = false;
	export let onClose: () => void = () => {
		open = false;
	};

	const command = 'xattr -cr ~/Downloads/BTracker.app';
	let copied = false;
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let closeEl: HTMLButtonElement;

	$: if (open) focusOnOpen();

	async function focusOnOpen() {
		await tick();
		closeEl?.focus();
	}

	async function copyCommand() {
		try {
			await navigator.clipboard.writeText(command);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="mig-overlay"
		transition:fade={{ duration: 180 }}
		role="presentation"
		on:click|self={onClose}
	>
		<div
			class="mig-dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mig-title"
			transition:scale={{ start: 0.96, duration: 200 }}
		>
			<button
				type="button"
				class="mig-close"
				aria-label="Close macOS instructions"
				bind:this={closeEl}
				on:click={onClose}
			>
				<NavIcon name="x" size={18} />
			</button>

			<header class="mig-header">
				<span class="mig-badge">macOS first launch</span>
				<h2 id="mig-title" class="mig-title">How to open BTracker in 5 seconds</h2>
				<p class="mig-sub">Your download is starting. Follow these steps once — no Terminal required.</p>
			</header>

			<div class="mig-reason">
				<b>Why did macOS show that warning?</b>
				<p>
					Because BTracker is 100% free and independent, we avoid Apple's $99/year developer fee.
					macOS automatically shows this warning for any app downloaded directly from the web
					without a paid Apple certificate.
				</p>
			</div>

			<ol class="mig-steps">
				<li>
					<span class="mig-num">1</span>
					<p>Try to open <b>BTracker.app</b> once (macOS shows the prompt). Click <b>"Done" / "OK"</b>.</p>
				</li>
				<li>
					<span class="mig-num">2</span>
					<p>Open <b>System Settings</b> on your Mac.</p>
				</li>
				<li>
					<span class="mig-num">3</span>
					<p>Click <b>Privacy &amp; Security</b> in the left sidebar.</p>
				</li>
				<li>
					<span class="mig-num">4</span>
					<p>Scroll down to the <b>Security</b> section.</p>
				</li>
				<li>
					<span class="mig-num">5</span>
					<p>You will see: <i>"BTracker was blocked from use because it is not from an identified developer."</i></p>
				</li>
				<li>
					<span class="mig-num">6</span>
					<p>Click <b>Open Anyway</b> (enter your Mac password or Touch ID).</p>
				</li>
				<li>
					<span class="mig-num">7</span>
					<p>Click <b>Open</b>.</p>
				</li>
			</ol>

			<p class="mig-once">
				You only have to do this <b>once</b>. After that, BTracker opens instantly like any normal app.
			</p>

			<div class="mig-alt">
				<span class="mig-alt-label">Alternative (1-second Terminal command)</span>
				<div class="mig-code-row">
					<code>{command}</code>
					<button type="button" class="mig-copy" on:click={copyCommand}>
						{copied ? 'Copied ✓' : 'Copy'}
					</button>
				</div>
			</div>

			<div class="mig-actions">
				<button type="button" class="mig-done" on:click={onClose}>Got it — close</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.mig-overlay {
		position: fixed !important;
		inset: 0 !important;
		z-index: 10050 !important;
		background: rgba(15, 46, 32, 0.46) !important;
		backdrop-filter: blur(14px) !important;
		-webkit-backdrop-filter: blur(14px) !important;
		display: grid !important;
		place-items: center !important;
		padding: 20px !important;
		overflow-y: auto !important;
	}

	.mig-dialog {
		position: relative !important;
		width: min(600px, 100%) !important;
		max-height: 92vh !important;
		overflow-y: auto !important;
		border-radius: 24px !important;
		background: #fbf8f3 !important;
		background-image: linear-gradient(180deg, #ffffff 0%, #fbf8f3 100%) !important;
		border: 1px solid rgba(15, 46, 32, 0.16) !important;
		box-shadow:
			0 28px 70px -15px rgba(15, 46, 32, 0.34),
			0 8px 24px -4px rgba(15, 46, 32, 0.12),
			inset 0 1px 0 #ffffff !important;
		padding: 30px 28px 24px !important;
		color: #141a16 !important;
		box-sizing: border-box !important;
	}

	.mig-close {
		position: absolute !important;
		top: 16px !important;
		right: 16px !important;
		width: 34px !important;
		height: 34px !important;
		border-radius: 50% !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		background: rgba(15, 46, 32, 0.05) !important;
		color: #0f2e20 !important;
		display: grid !important;
		place-items: center !important;
		cursor: pointer !important;
		transition: background 0.15s ease !important;
		z-index: 2 !important;
	}

	.mig-close:hover {
		background: rgba(15, 46, 32, 0.12) !important;
	}

	.mig-header {
		margin-bottom: 18px !important;
		padding-right: 26px !important;
	}

	.mig-badge {
		display: inline-block !important;
		font-size: 0.66rem !important;
		font-weight: 750 !important;
		letter-spacing: 0.08em !important;
		text-transform: uppercase !important;
		color: #0f2e20 !important;
		background: rgba(15, 46, 32, 0.08) !important;
		border: 1px solid rgba(15, 46, 32, 0.16) !important;
		padding: 3px 9px !important;
		border-radius: 9999px !important;
		margin-bottom: 10px !important;
	}

	.mig-title {
		font-family: 'Newsreader', 'Fraunces', Georgia, serif !important;
		font-size: clamp(1.5rem, 4vw, 1.9rem) !important;
		font-weight: 700 !important;
		line-height: 1.1 !important;
		letter-spacing: -0.02em !important;
		color: #0f2e20 !important;
		margin: 0 0 6px !important;
	}

	.mig-sub {
		font-size: 0.84rem !important;
		line-height: 1.45 !important;
		color: #536259 !important;
		margin: 0 !important;
	}

	.mig-reason {
		background: rgba(15, 46, 32, 0.055) !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		border-radius: 12px !important;
		padding: 12px 14px !important;
		margin-bottom: 16px !important;
	}

	.mig-reason b {
		display: block !important;
		font-size: 0.8rem !important;
		font-weight: 750 !important;
		color: #0f2e20 !important;
		margin-bottom: 3px !important;
	}

	.mig-reason p {
		font-size: 0.76rem !important;
		line-height: 1.45 !important;
		color: #536259 !important;
		margin: 0 !important;
	}

	.mig-steps {
		list-style: none !important;
		display: flex !important;
		flex-direction: column !important;
		gap: 4px !important;
		margin: 0 0 14px !important;
		padding: 0 !important;
	}

	.mig-steps li {
		display: flex !important;
		align-items: flex-start !important;
		gap: 10px !important;
		padding: 6px 0 !important;
		margin: 0 !important;
	}

	.mig-num {
		flex: 0 0 auto !important;
		width: 20px !important;
		height: 20px !important;
		border-radius: 6px !important;
		background: #0f2e20 !important;
		color: #fbf8f3 !important;
		display: grid !important;
		place-items: center !important;
		font-family: 'JetBrains Mono', monospace !important;
		font-size: 0.68rem !important;
		font-weight: 700 !important;
		line-height: 1 !important;
		margin-top: 1px !important;
	}

	.mig-steps p {
		font-size: 0.8rem !important;
		line-height: 1.45 !important;
		color: #536259 !important;
		margin: 0 !important;
	}

	.mig-steps b {
		font-weight: 700 !important;
		color: #0f2e20 !important;
	}

	.mig-steps i {
		color: #0f2e20 !important;
	}

	.mig-once {
		font-size: 0.76rem !important;
		line-height: 1.45 !important;
		color: #536259 !important;
		background: rgba(223, 240, 228, 0.7) !important;
		border: 1px solid rgba(15, 46, 32, 0.12) !important;
		border-radius: 10px !important;
		padding: 9px 12px !important;
		margin: 0 0 14px !important;
	}

	.mig-once b {
		color: #0f2e20 !important;
		font-weight: 750 !important;
	}

	.mig-alt {
		border-top: 1px solid rgba(15, 46, 32, 0.09) !important;
		padding-top: 12px !important;
		margin-bottom: 18px !important;
	}

	.mig-alt-label {
		display: block !important;
		font-size: 0.72rem !important;
		font-weight: 650 !important;
		color: #0f2e20 !important;
		margin-bottom: 6px !important;
	}

	.mig-code-row {
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		gap: 8px !important;
		background: #faf7f2 !important;
		border: 1px solid rgba(15, 46, 32, 0.14) !important;
		border-radius: 8px !important;
		padding: 6px 8px 6px 10px !important;
	}

	.mig-code-row code {
		font-family: 'JetBrains Mono', monospace !important;
		font-size: 0.72rem !important;
		color: #0f2e20 !important;
		overflow-x: auto !important;
		white-space: nowrap !important;
	}

	.mig-copy {
		flex-shrink: 0 !important;
		background: #0f2e20 !important;
		border: 1px solid #0f2e20 !important;
		color: #fbf8f3 !important;
		font-size: 0.7rem !important;
		font-weight: 700 !important;
		padding: 4px 10px !important;
		border-radius: 5px !important;
		cursor: pointer !important;
		transition: background 0.15s ease !important;
	}

	.mig-copy:hover {
		background: #184732 !important;
	}

	.mig-actions {
		display: flex !important;
		justify-content: flex-end !important;
	}

	.mig-done {
		background: #0f2e20 !important;
		border: 1px solid #0f2e20 !important;
		color: #fbf8f3 !important;
		font-size: 0.82rem !important;
		font-weight: 700 !important;
		padding: 9px 18px !important;
		border-radius: 9px !important;
		cursor: pointer !important;
		box-shadow: 0 4px 14px rgba(15, 46, 32, 0.2) !important;
		transition: background 0.15s ease !important;
	}

	.mig-done:hover {
		background: #184732 !important;
	}

	@media (max-width: 540px) {
		.mig-overlay {
			padding: 10px !important;
		}

		.mig-dialog {
			padding: 20px 16px 14px !important;
			max-height: 96vh !important;
		}

		.mig-header {
			margin-bottom: 12px !important;
			padding-right: 28px !important;
		}

		.mig-badge {
			margin-bottom: 8px !important;
		}

		.mig-title {
			font-size: 1.34rem !important;
			margin-bottom: 4px !important;
		}

		.mig-sub {
			font-size: 0.78rem !important;
		}

		.mig-reason {
			padding: 10px 11px !important;
			margin-bottom: 10px !important;
		}

		.mig-reason p {
			font-size: 0.73rem !important;
			line-height: 1.38 !important;
		}

		.mig-steps {
			gap: 0 !important;
			margin-bottom: 10px !important;
		}

		.mig-steps li {
			padding: 4px 0 !important;
		}

		.mig-steps p {
			font-size: 0.76rem !important;
			line-height: 1.38 !important;
		}

		.mig-num {
			width: 18px !important;
			height: 18px !important;
			font-size: 0.62rem !important;
		}

		.mig-once {
			padding: 8px 10px !important;
			font-size: 0.72rem !important;
			margin-bottom: 10px !important;
		}

		.mig-alt {
			padding-top: 10px !important;
			margin-bottom: 12px !important;
		}

		.mig-actions {
			justify-content: stretch !important;
		}

		.mig-done {
			width: 100% !important;
			padding: 9px 16px !important;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mig-dialog {
			transition: none !important;
		}
	}
</style>
