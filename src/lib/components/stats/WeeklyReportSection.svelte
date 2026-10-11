<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import WeeklyDoubleGraph from '$lib/components/charts/WeeklyDoubleGraph.svelte';
	import { hydration, tracker, updateTracker } from '$lib/stores/tracker';
	import { buildWeekReport, currentWeekStartKey, rolloverWeekSnapshot } from '$lib/state/weekly';
	import { renderReportImage } from '$lib/services/reportCardImage';
	import { loadout } from '$lib/stores/cosmetics';

	// If a new week started while the app was open, capture the fresh baseline.
	$: if ($hydration === 'ready' && $tracker.gamification?.week?.start !== currentWeekStartKey()) {
		updateTracker(rolloverWeekSnapshot);
	}

	$: report = { ...buildWeekReport($tracker), flairTitle: $loadout.title, frameColors: $loadout.frame?.colors ?? null };

	let busy = false;
	let notice = '';

	async function download() {
		if (busy) return;
		busy = true;
		notice = '';
		try {
			const blob = await renderReportImage(report);
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `btracker-week-${report.startKey}.png`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 5000);
			notice = 'Card downloaded as PNG.';
		} catch {
			notice = 'Export failed — please try again.';
		} finally {
			busy = false;
		}
	}

	async function copyImage() {
		if (busy) return;
		busy = true;
		notice = '';
		try {
			const blob = await renderReportImage(report);
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			notice = 'Card copied — paste it anywhere.';
		} catch {
			notice = 'Clipboard is not available here — use Download.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="weekly-section">
	<div class="top-row">
		<div class="header-info">
			<h3><NavIcon name="trophy" size={16} /> Weekly Performance Report</h3>
			<p>
				Daily study hours and question solving breakdown for <b>{report.label}</b>.
			</p>
		</div>
		<div class="actions">
			<button type="button" class="btn solid" on:click={download} disabled={busy}>
				<NavIcon name="download" size={14} /> Download PNG
			</button>
			<button type="button" class="btn ghost" on:click={copyImage} disabled={busy}>
				<NavIcon name="share" size={14} /> Copy Image
			</button>
		</div>
	</div>

	{#if notice}<p class="notice">{notice}</p>{/if}

	<!-- Embedded Double Graph -->
	<div class="graph-box">
		<WeeklyDoubleGraph daily={report.daily} />
	</div>
</div>

<style>
	.weekly-section {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 0.2rem 0;
	}
	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.header-info h3 {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}
	.header-info h3 :global(svg) {
		color: var(--accent);
	}
	.header-info p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.86rem;
		line-height: 1.5;
	}
	.header-info p b {
		color: var(--text-primary);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.62rem 1.15rem;
		border: 1px solid transparent;
		border-radius: 10px;
		font-size: 0.82rem;
		font-weight: 750;
		cursor: pointer;
		transition: filter 0.15s ease, color 0.15s ease;
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: progress;
	}
	.btn.solid {
		color: #fff;
		background: var(--accent);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%);
	}
	.btn.solid:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.btn.ghost {
		color: var(--text-secondary);
		border-color: var(--border-subtle);
		background: var(--surface-subtle);
	}
	.btn.ghost:hover:not(:disabled) {
		color: var(--text-primary);
	}
	.notice {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--success, #2f9e6e);
	}
	.graph-box {
		width: 100%;
	}
</style>
