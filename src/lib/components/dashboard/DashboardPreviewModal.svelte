<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import DefaultLayoutPreview from '$lib/components/dashboard/DefaultLayoutPreview.svelte';
	import MinimalistLayout from '$lib/components/dashboard/MinimalistLayout.svelte';
	import FocusLayout from '$lib/components/dashboard/FocusLayout.svelte';
	import CompactLayout from '$lib/components/dashboard/CompactLayout.svelte';
	import type { DashboardLayout } from '$lib/types/tracker';

	export let open = false;
	export let layout: DashboardLayout = 'default';

	const dispatch = createEventDispatcher<{
		select: DashboardLayout;
		close: void;
	}>();

	let deviceMode: 'desktop' | 'tablet' | 'mobile' = 'desktop';

	const LAYOUT_META: Record<DashboardLayout, { name: string; badge: string; desc: string }> = {
		default: {
			name: 'Default Classic Grid',
			badge: 'Classic',
			desc: 'Balanced 3-column classic dashboard with modular widgets and drag-and-drop customization.'
		},
		minimalist: {
			name: 'Minimalist Flow',
			badge: 'Ultra Sleek',
			desc: 'Flat inline status bar, borderless mission list, thin 2px subject bars, and sticky mobile pill.'
		},
		focus: {
			name: 'Focus Asymmetric Split',
			badge: 'Deep Work',
			desc: '70% centerpiece stage for active focus session, with mission support docked in a 30% side rail.'
		},
		compact: {
			name: 'Pocket Flow (Mobile First)',
			badge: 'Mobile Native',
			desc: 'Glanceable KPI rings, segmented tabs, thumb-reachable action dock, and zero wasted vertical space.'
		}
	};

	function close() {
		open = false;
		dispatch('close');
	}

	function select() {
		dispatch('select', layout);
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			close();
		}
	}
</script>

{#if open}
	<div
		class="preview-modal-backdrop"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
		on:click|self={close}
		on:keydown={(e) => { if (e.key === 'Escape') close(); }}
	>
		<div class="preview-modal-card" transition:fly={{ y: 24, duration: 260 }}>
			<!-- Modal Header -->
			<header class="preview-header">
				<div class="header-left">
					<span class="preview-pill">{LAYOUT_META[layout]?.badge || 'Layout'}</span>
					<div class="header-titles">
						<h2>{LAYOUT_META[layout]?.name || 'Dashboard'} Preview</h2>
						<p>{LAYOUT_META[layout]?.desc}</p>
					</div>
				</div>

				<!-- Device Viewport Switcher -->
				<div class="device-switcher">
					<button
						type="button"
						class="device-btn"
						class:active={deviceMode === 'desktop'}
						on:click={() => (deviceMode = 'desktop')}
						title="Desktop View (>= 1024px)"
					>
						<NavIcon name="tv" size={14} />
						<span>Desktop</span>
					</button>
					<button
						type="button"
						class="device-btn"
						class:active={deviceMode === 'tablet'}
						on:click={() => (deviceMode = 'tablet')}
						title="Tablet View (768px – 1023px)"
					>
						<NavIcon name="layers" size={14} />
						<span>Tablet</span>
					</button>
					<button
						type="button"
						class="device-btn"
						class:active={deviceMode === 'mobile'}
						on:click={() => (deviceMode = 'mobile')}
						title="Mobile View (< 768px)"
					>
						<NavIcon name="pulse" size={14} />
						<span>Mobile</span>
					</button>
				</div>

				<button type="button" class="close-btn" aria-label="Close Preview" on:click={close}>
					<NavIcon name="x" size={16} />
				</button>
			</header>

			<!-- Preview Stage -->
			<div class="preview-viewport-scroll">
				<div
					class="device-frame {deviceMode}"
					class:is-phone={deviceMode === 'mobile'}
					class:is-tablet={deviceMode === 'tablet'}
					class:is-desktop={deviceMode === 'desktop'}
				>
					<!-- Browser / Device Chrome Header -->
					<div class="frame-bar">
						<div class="frame-dots">
							<span></span><span></span><span></span>
						</div>
						<div class="frame-address">
							<span class="lock-icon"><NavIcon name="lock" size={10} /></span>
							<span>btracker.app/dashboard • {deviceMode.toUpperCase()} VIEW</span>
						</div>
						<div class="frame-tag">Simulated</div>
					</div>

					<!-- Scrollable Content Canvas -->
					<div class="frame-content">
						{#if layout === 'default'}
							<DefaultLayoutPreview {deviceMode} />
						{:else if layout === 'minimalist'}
							<MinimalistLayout {deviceMode} />
						{:else if layout === 'focus'}
							<FocusLayout {deviceMode} />
						{:else if layout === 'compact'}
							<CompactLayout {deviceMode} />
						{/if}
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<footer class="preview-footer">
				<div class="footer-hint">
					<span>💡 Tip: Switch viewports above to preview responsiveness.</span>
				</div>
				<div class="footer-actions">
					<button type="button" class="btn-cancel" on:click={close}>
						Close
					</button>
					<button type="button" class="btn-apply" on:click={select}>
						<NavIcon name="check" size={14} />
						<span>Select &amp; Use {LAYOUT_META[layout]?.badge} Layout</span>
					</button>
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	.preview-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(0.75rem, 2vw, 1.75rem);
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
	}

	.preview-modal-card {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 1220px;
		height: 92vh;
		max-height: 920px;
		border-radius: 24px;
		background: color-mix(in srgb, var(--surface-panel) 92%, var(--surface-canvas));
		border: 1px solid var(--border-subtle);
		box-shadow: 0 32px 90px -16px rgba(0, 0, 0, 0.7);
		overflow: hidden;
	}

	/* Header */
	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.4rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle), transparent 30%);
		background: color-mix(in srgb, var(--surface-panel) 98%, transparent);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
	}

	.preview-pill {
		font-size: 0.65rem;
		font-weight: 850;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 99px;
		background: var(--accent);
		color: #ffffff;
		flex-shrink: 0;
	}

	.header-titles h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.header-titles p {
		margin: 0.15rem 0 0;
		font-size: 0.72rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 480px;
	}

	/* Device Switcher */
	.device-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 3px;
		border-radius: 12px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.device-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		border-radius: 9px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.18s ease;
		font-family: inherit;
	}

	.device-btn:hover {
		color: var(--text-primary);
	}

	.device-btn.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.close-btn {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.16s ease;
		flex-shrink: 0;
	}

	.close-btn:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
	}

	/* Preview Viewport */
	.preview-viewport-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem clamp(0.75rem, 2vw, 1.5rem);
		background: color-mix(in srgb, var(--surface-canvas) 85%, black);
		display: flex;
		justify-content: center;
		align-items: flex-start;
		scrollbar-width: thin;
	}

	.device-frame {
		width: 100%;
		background: var(--surface-canvas);
		border-radius: 18px;
		border: 1px solid var(--border-subtle);
		box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.5);
		transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.device-frame.is-desktop {
		max-width: 100%;
	}

	.device-frame.is-tablet {
		max-width: 780px;
		border: 4px solid var(--border-subtle);
		border-radius: 22px;
	}

	.device-frame.is-phone {
		max-width: 410px;
		border: 6px solid #1e293b;
		border-radius: 36px;
	}

	/* Frame Browser Bar */
	.frame-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.9rem;
		background: color-mix(in srgb, var(--surface-panel) 85%, var(--surface-subtle));
		border-bottom: 1px solid var(--border-subtle);
		font-size: 0.7rem;
	}

	.frame-dots {
		display: flex;
		gap: 5px;
	}

	.frame-dots span {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--border-subtle);
	}

	.frame-dots span:nth-child(1) { background: #ef4444; }
	.frame-dots span:nth-child(2) { background: #f59e0b; }
	.frame-dots span:nth-child(3) { background: #10b981; }

	.frame-address {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.8rem;
		border-radius: 99px;
		background: var(--surface-panel);
		color: var(--text-secondary);
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.68rem;
	}

	.frame-tag {
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.frame-content {
		padding: 1.25rem;
		min-height: 480px;
	}

	.device-frame.is-phone .frame-content {
		padding: 0.85rem 0.65rem;
	}

	/* Footer */
	.preview-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.4rem;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 30%);
		background: color-mix(in srgb, var(--surface-panel) 98%, transparent);
		flex-shrink: 0;
	}

	.footer-hint {
		font-size: 0.74rem;
		color: var(--text-secondary);
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-cancel {
		padding: 0.6rem 1.15rem;
		border-radius: 12px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}

	.btn-cancel:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
	}

	.btn-apply {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.6rem 1.4rem;
		border-radius: 12px;
		border: none;
		background: var(--accent);
		color: #ffffff;
		font-size: 0.82rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: all 0.16s ease;
		font-family: inherit;
	}

	.btn-apply:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.preview-modal-backdrop {
			padding: 0;
		}
		.preview-modal-card {
			height: 100dvh;
			max-height: 100dvh;
			border-radius: 0;
			border: none;
		}
		.preview-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
		.device-switcher {
			width: 100%;
			justify-content: space-around;
		}
		.preview-footer {
			flex-direction: column;
			gap: 0.75rem;
			align-items: stretch;
		}
		.footer-actions {
			flex-direction: column-reverse;
		}
		.btn-apply, .btn-cancel {
			width: 100%;
			justify-content: center;
		}
	}
</style>
