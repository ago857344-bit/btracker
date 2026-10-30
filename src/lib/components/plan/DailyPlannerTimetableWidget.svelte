<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { globalTimer } from '$lib/stores/timerState';
	import { goto } from '$app/navigation';
	import {
		tracker,
		addPeriodToPlanner,
		setCoachingTimetable,
		clearCoachingTimetable,
		celebration
	} from '$lib/stores/tracker';
	import { parseTimetableFromFile, parseTimetableFromText } from '$lib/services/timetableAi';
	import { parseKey } from '$lib/state/dates';
	import type { CoachingTimetable, TimetableDay, TimetablePeriod } from '$lib/types/tracker';

	export let dayKey: string; // ISO date 'YYYY-MM-DD'

	const DAYS: TimetableDay[] = [
		'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
	];

	$: weekdayName = (() => {
		try {
			const d = parseKey(dayKey);
			return DAYS[d.getDay()];
		} catch {
			return 'Monday';
		}
	})();

	$: timetable = $tracker.timetable ?? { batchName: '', periods: [] };
	$: allPeriods = timetable.periods ?? [];
	$: hasTimetable = allPeriods.length > 0;
	$: hasDatedPeriods = allPeriods.some((p) => !!p.date);

	// Periods for this selected day
	$: dayPeriods = (() => {
		if (hasDatedPeriods) {
			const matched = allPeriods.filter((p) => p.date === dayKey);
			if (matched.length > 0) {
				return matched.slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
			}
		}
		return allPeriods
			.filter((p) => p.day === weekdayName)
			.slice()
			.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
	})();

	// Check if a period has already been added to that day's planner tasks (pending or completed)
	$: dayTasks = [...($tracker.h || []), ...($tracker.hd || [])].filter((t) => t.due === dayKey || (t as any).date === dayKey);
	function isPeriodPlanned(p: TimetablePeriod): boolean {
		return dayTasks.some(
			(t) =>
				((t as any).date === dayKey || !(t as any).date || t.due === dayKey) &&
				((t as any).periodId === p.id || (t.st === p.startTime && (t.title?.includes(p.topic) || t.title?.includes(p.subject))))
		);
	}

	$: unplannedPeriods = dayPeriods.filter((p) => !isPeriodPlanned(p));
	$: unplannedCount = unplannedPeriods.length;

	function handlePlanAll() {
		for (const p of unplannedPeriods) {
			addPeriodToPlanner(p, dayKey);
		}
		celebration.set(`Planned all ${unplannedPeriods.length} classes for today! 🎯`);
	}

	function handleAddPeriod(p: TimetablePeriod) {
		addPeriodToPlanner(p, dayKey);
		celebration.set(`Added "${p.topic}" to daily planner! 🎯`);
	}

	// Upload Modal State
	let uploadModalOpen = false;
	let uploadLoading = false;
	let uploadError = '';
	let parsedPreview: CoachingTimetable | null = null;
	let uploadMode: 'file' | 'text' = 'file';
	let rawTextDraft = '';
	let isDragging = false;
	let fileInputRef: HTMLInputElement | null = null;

	async function processFile(file: File) {
		uploadLoading = true;
		uploadError = '';
		parsedPreview = null;

		try {
			const result = await parseTimetableFromFile(file);
			if (!result.periods || result.periods.length === 0) {
				uploadError = 'No periods could be recognized. Try pasting schedule text or check the file.';
			} else {
				parsedPreview = result;
			}
		} catch (err: any) {
			console.error(err);
			uploadError = err.message || 'Failed to parse timetable file.';
		} finally {
			uploadLoading = false;
		}
	}

	function handleFileInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			processFile(file);
		}
		target.value = '';
	}

	function handleFileDrop(e: DragEvent) {
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) {
			processFile(file);
		}
	}

	async function handleTextAnalyze() {
		if (!rawTextDraft.trim()) {
			uploadError = 'Please paste schedule text first.';
			return;
		}

		uploadLoading = true;
		uploadError = '';
		parsedPreview = null;

		try {
			const result = await parseTimetableFromText(rawTextDraft);
			if (!result.periods || result.periods.length === 0) {
				uploadError = 'Could not recognize periods. Ensure days, dates, or timings are included.';
			} else {
				parsedPreview = result;
			}
		} catch (err: any) {
			console.error(err);
			uploadError = err.message || 'Failed to parse timetable text.';
		} finally {
			uploadLoading = false;
		}
	}

	function confirmImport() {
		if (!parsedPreview) return;
		setCoachingTimetable(parsedPreview);
		celebration.set(`Loaded ${parsedPreview.periods.length} classes for ${parsedPreview.batchName || 'batch'}! 🚀`);
		uploadModalOpen = false;
		parsedPreview = null;
		rawTextDraft = '';
	}

	let confirmingClear = false;

	function handleClearTimetable() {
		if (confirmingClear) {
			clearCoachingTimetable();
			confirmingClear = false;
			uploadModalOpen = false;
			celebration.set('Timetable cleared.');
		} else {
			confirmingClear = true;
		}
	}

	function formatTime12(t?: string): string {
		if (!t) return '';
		const [hh, mm] = t.split(':').map(Number);
		if (isNaN(hh)) return t;
		const ampm = hh >= 12 ? 'PM' : 'AM';
		const h = hh % 12 || 12;
		return `${h}:${String(mm ?? 0).padStart(2, '0')} ${ampm}`;
	}

	function getSubjectColor(sub: string): string {
		if (sub === 'P') return 'var(--accent, #6d5dfc)';
		if (sub === 'C') return '#2f9e6e';
		if (sub === 'M') return '#f59f00';
		if (sub === 'Test') return '#e0455a';
		return 'var(--text-secondary)';
	}

	function getSubjectTitle(sub: string): string {
		if (sub === 'P') return 'Physics';
		if (sub === 'C') return 'Chemistry';
		if (sub === 'M') return 'Maths';
		if (sub === 'Test') return 'Test';
		return sub;
	}
</script>

<div class="planner-timetable-widget">
	{#if !hasTimetable}
		<!-- No Timetable Uploaded Yet: Actionable Banner -->
		<div class="timetable-prompt-banner" in:fade={{ duration: 150 }}>
			<div class="prompt-icon">
				<NavIcon name="clock" size={20} />
			</div>
			<div class="prompt-text">
				<b>Upload your timetable</b>
				<p>Add your coaching timetable PDF to see your scheduled classes here on each day.</p>
			</div>
			<button type="button" class="btn-upload-prompt" on:click={() => (uploadModalOpen = true)}>
				<NavIcon name="download" size={13} />
				<span>Upload Timetable</span>
			</button>
		</div>
	{:else}
		<!-- Timetable Loaded: Show Daily Classes Widget -->
		<div class="daily-classes-card" in:fade={{ duration: 150 }}>
			<div class="classes-header">
				<div class="header-left">
					<span class="header-icon">
						<NavIcon name="clock" size={14} />
					</span>
					<b class="header-title">Coaching Classes</b>
					{#if timetable.batchName && !timetable.batchName.toLowerCase().includes('coaching')}
						<span class="batch-chip font-mono" title={timetable.batchName}>
							{timetable.batchName}
						</span>
					{/if}
					<span class="count-badge font-mono">
						{dayPeriods.length} {dayPeriods.length === 1 ? 'class' : 'classes'}
					</span>
				</div>

				<div class="header-right">
					{#if unplannedCount > 0}
						<button
							type="button"
							class="btn-plan-all"
							title="Add all remaining classes to today's planner"
							on:click={handlePlanAll}
						>
							<NavIcon name="plus" size={12} />
							<span>Plan All ({unplannedCount})</span>
						</button>
					{/if}
					<button
						type="button"
						class="btn-manage"
						title="Manage or update timetable"
						on:click={() => (uploadModalOpen = true)}
					>
						<NavIcon name="edit" size={12} />
						<span>Update</span>
					</button>
				</div>
			</div>

			{#if dayPeriods.length > 0}
				<div class="classes-list">
					{#each dayPeriods as period (period.id)}
						{@const planned = isPeriodPlanned(period)}
						<div class="class-item" in:slide={{ duration: 140 }}>
							<span class="sub-stripe" style="background: {getSubjectColor(period.subject)}"></span>
							<div class="class-left font-mono">
								<span class="class-time">
									{formatTime12(period.startTime)} – {formatTime12(period.endTime)}
								</span>
								<span class="sub-pill" style="color: {getSubjectColor(period.subject)}; border-color: {getSubjectColor(period.subject)}">
									{getSubjectTitle(period.subject)}
								</span>
							</div>

							<div class="class-body">
								<span class="class-topic" title={period.topic}>{period.topic}</span>
								<div class="class-meta font-mono">
									{#if period.room}
										<span class="meta-tag">
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
											{period.room}
										</span>
									{/if}
									{#if period.notes}
										<span class="notes-tag">[{period.notes}]</span>
									{/if}
								</div>
							</div>

							<div class="class-action">
								{#if period.subject === 'P' || period.subject === 'C' || period.subject === 'M'}
									<button
										type="button"
										class="btn-focus-class font-mono"
										title="Start 45m Focus Session for {period.topic}"
										on:click={() => {
											globalTimer.start(period.subject, 45 * 60, period.topic, 'timer');
											goto('/focus');
										}}
									>
										<NavIcon name="focus" size={11} />
										<span>Focus</span>
									</button>
								{/if}
								{#if planned}
									<span class="planned-indicator font-mono" title="Already added to today's tasks">
										<NavIcon name="check" size={11} />
										<span>Planned</span>
									</span>
								{:else}
									<button
										type="button"
										class="btn-plan-class font-mono"
										title="Add lecture to daily tasks"
										on:click={() => handleAddPeriod(period)}
									>
										<NavIcon name="plus" size={11} />
										<span>+ Plan</span>
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="no-classes-row font-mono">
					<NavIcon name="check-circle" size={13} />
					<span>No coaching classes scheduled for {weekdayName}.</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- ========================================================= -->
<!-- UPLOAD / REPLACE TIMETABLE MODAL                          -->
<!-- ========================================================= -->
<Modal bind:open={uploadModalOpen} title="Upload your timetable" width="580px">
	<div class="upload-modal-content">
		{#if uploadLoading}
			<div class="upload-loading">
				<div class="spinner"></div>
				<b>Reading Timetable & Matching Syllabus...</b>
				<p>Detecting batch timings, subject codes (M18, C02, P16), and scheduled dates.</p>
			</div>
		{:else if parsedPreview}
			<!-- Preview Step Before Committing -->
			<div class="preview-step">
				<div class="preview-header">
					<div>
						<h4>{parsedPreview.batchName || 'Recognized Batch Schedule'}</h4>
						{#if parsedPreview.dateRange}
							<span class="date-range font-mono">{parsedPreview.dateRange}</span>
						{/if}
						<span class="preview-badge font-mono">{parsedPreview.periods.length} classes extracted</span>
					</div>
				</div>

				<div class="preview-table-wrap">
					{#each parsedPreview.periods as p}
						<div class="preview-row">
							<span class="row-date font-mono">{p.date ? p.date.slice(5) : p.day.slice(0, 3)}</span>
							<span class="row-time font-mono">{p.startTime}–{p.endTime}</span>
							<span class="row-sub font-mono" style="color: {getSubjectColor(p.subject)}">{p.subject}</span>
							<span class="row-topic">
								{p.topic}
								{#if p.notes}<small class="row-note">[{p.notes}]</small>{/if}
							</span>
						</div>
					{/each}
				</div>

				<div class="preview-actions">
					<button type="button" class="btn-ghost" on:click={() => (parsedPreview = null)}>
						Try Another File
					</button>
					<button type="button" class="btn-primary" on:click={confirmImport}>
						Save & Load Timetable
					</button>
				</div>
			</div>
		{:else}
			<!-- Method Segmented Switcher -->
			<div class="method-switcher" role="tablist">
				<button
					type="button"
					role="tab"
					class="method-btn"
					class:active={uploadMode === 'file'}
					on:click={() => (uploadMode = 'file')}
				>
					Upload PDF File
				</button>
				<button
					type="button"
					role="tab"
					class="method-btn"
					class:active={uploadMode === 'text'}
					on:click={() => (uploadMode = 'text')}
				>
					Paste Schedule Text
				</button>
			</div>

			{#if uploadMode === 'file'}
				<input
					bind:this={fileInputRef}
					id="daily-planner-tt-upload"
					type="file"
					accept="application/pdf,.pdf,text/plain,.txt"
					on:change={handleFileInputChange}
					class="sr-only-file-input"
				/>

				<label
					for="daily-planner-tt-upload"
					class="pdf-dropzone"
					class:dragging={isDragging}
					on:dragover|preventDefault={() => (isDragging = true)}
					on:dragenter|preventDefault={() => (isDragging = true)}
					on:dragleave={() => (isDragging = false)}
					on:drop|preventDefault={handleFileDrop}
				>
					<div class="drop-icon">
						<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
							<polyline points="17 8 12 3 7 8"/>
							<line x1="12" x2="12" y1="3" y2="15"/>
						</svg>
					</div>
					<b>Upload your timetable</b>
					<p>Drop your timetable PDF here or click to browse</p>
					<span class="btn-browse">
						Upload your timetable
					</span>
				</label>
			{:else}
				<div class="text-paste-zone">
					<label class="paste-label">
						<span>Paste Timetable Text</span>
						<textarea
							bind:value={rawTextDraft}
							placeholder="Paste your schedule text from WhatsApp or PDF here..."
							rows="7"
							class="text-input"
						></textarea>
					</label>
					<button
						type="button"
						class="btn-primary analyze-btn"
						disabled={!rawTextDraft.trim()}
						on:click={handleTextAnalyze}
					>
						✨ Analyze & Import Schedule
					</button>
				</div>
			{/if}

			{#if uploadError}
				<div class="error-msg" in:fade>
					<NavIcon name="alert" size={14} />
					<span>{uploadError}</span>
				</div>
			{/if}

			{#if hasTimetable}
				<div class="clear-zone">
					{#if confirmingClear}
						<div class="confirm-clear-box">
							<span class="confirm-text">Clear all coaching classes?</span>
							<div class="confirm-btns">
								<button type="button" class="btn-clear-danger" on:click={handleClearTimetable}>
									<NavIcon name="trash" size={12} />
									<span>Confirm Clear</span>
								</button>
								<button type="button" class="btn-cancel-clear" on:click={() => (confirmingClear = false)}>
									<span>Cancel</span>
								</button>
							</div>
						</div>
					{:else}
						<button type="button" class="btn-clear-danger" on:click={handleClearTimetable}>
							<NavIcon name="trash" size={12} />
							<span>Remove Timetable</span>
						</button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</Modal>

<style>
	.planner-timetable-widget {
		width: 100%;
		margin-bottom: 0.65rem;
	}

	/* Prompt Banner (When no timetable uploaded) */
	.timetable-prompt-banner {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.75rem 1rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent) 7%, var(--surface-panel));
		border: 1px dashed color-mix(in srgb, var(--accent) 35%, var(--border-subtle));
		flex-wrap: wrap;
	}

	.prompt-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.prompt-text {
		flex: 1;
		min-width: 180px;
	}

	.prompt-text b {
		display: block;
		font-size: 0.82rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.prompt-text p {
		margin: 0.15rem 0 0;
		font-size: 0.7rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.btn-upload-prompt {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.85rem;
		border-radius: 9px;
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		font-size: 0.72rem;
		font-weight: 750;
		border: none;
		cursor: pointer;
		font-family: inherit;
		transition: opacity 0.15s ease;
		white-space: nowrap;
	}

	.btn-upload-prompt:hover {
		opacity: 0.9;
	}

	/* Daily Classes Card (When timetable exists) */
	.daily-classes-card {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.75rem 0.9rem;
		border-radius: 14px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}

	.classes-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.header-icon {
		color: var(--accent);
		display: grid;
		place-items: center;
	}

	.header-title {
		font-size: 0.78rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.batch-chip {
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.12rem 0.4rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.count-badge {
		font-size: 0.62rem;
		color: var(--text-secondary);
	}

	.btn-plan-all {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.22rem 0.55rem;
		border-radius: 7px;
		border: 1px solid var(--accent);
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		font-size: 0.66rem;
		font-weight: 750;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.btn-plan-all:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.btn-manage {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.22rem 0.5rem;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-secondary);
		font-size: 0.66rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.btn-manage:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.classes-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.class-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.65rem;
		border-radius: 10px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		position: relative;
	}

	.sub-stripe {
		width: 3.5px;
		height: 28px;
		border-radius: 99px;
		flex-shrink: 0;
	}

	.class-left {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 95px;
		flex-shrink: 0;
	}

	.class-time {
		font-size: 0.66rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.sub-pill {
		display: inline-block;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		border: 1px solid currentColor;
		border-radius: 5px;
		padding: 0.02rem 0.3rem;
		width: fit-content;
	}

	.class-body {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		flex: 1;
		min-width: 0;
	}

	.class-topic {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.class-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6rem;
		color: var(--text-secondary);
	}

	.meta-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.notes-tag {
		color: var(--accent);
		font-weight: 700;
	}

	.class-action {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.btn-focus-class {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.55rem;
		border-radius: 7px;
		background: color-mix(in srgb, var(--surface) 60%, transparent);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		font-size: 0.64rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-focus-class:hover {
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		color: var(--accent);
	}

	.btn-plan-class {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.55rem;
		border-radius: 7px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		font-size: 0.64rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-plan-class:hover {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
	}

	.planned-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.22rem 0.5rem;
		border-radius: 7px;
		background: color-mix(in srgb, #2f9e6e 15%, transparent);
		color: #2f9e6e;
		border: 1px solid color-mix(in srgb, #2f9e6e 30%, transparent);
		font-size: 0.62rem;
		font-weight: 750;
	}

	.no-classes-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.2rem;
		font-size: 0.7rem;
		color: var(--text-secondary);
	}

	/* Upload Modal Styles */
	.upload-modal-content {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 0.2rem 0;
	}

	.method-switcher {
		display: flex;
		padding: 3px;
		border-radius: 10px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		gap: 3px;
	}

	.method-btn {
		flex: 1;
		padding: 0.4rem;
		font-size: 0.74rem;
		font-weight: 700;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font-family: inherit;
		transition: all 0.16s ease;
	}

	.method-btn.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
	}

	.sr-only-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
		opacity: 0;
		pointer-events: none;
	}

	.pdf-dropzone {
		border: 2px dashed var(--border-subtle);
		border-radius: 14px;
		padding: 1.8rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		background: color-mix(in srgb, var(--surface-subtle) 40%, transparent);
		cursor: pointer;
		transition: all 0.16s ease;
		gap: 0.45rem;
	}

	.pdf-dropzone:hover,
	.pdf-dropzone.dragging {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 6%, var(--surface-subtle));
	}

	.drop-icon {
		color: var(--accent);
		margin-bottom: 0.15rem;
	}

	.pdf-dropzone b {
		font-size: 0.88rem;
		color: var(--text-primary);
	}

	.pdf-dropzone p {
		margin: 0;
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.btn-browse {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 0.4rem;
		padding: 0.45rem 1.1rem;
		border-radius: 9px;
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		font-size: 0.76rem;
		font-weight: 750;
		border: none;
		cursor: pointer;
		font-family: inherit;
		user-select: none;
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	.btn-browse:hover {
		opacity: 0.9;
	}

	.text-paste-zone {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.paste-label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.76rem;
		font-weight: 750;
		color: var(--text-secondary);
	}

	.text-input {
		width: 100%;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.76rem;
		resize: vertical;
	}

	.analyze-btn {
		width: 100%;
		padding: 0.55rem;
		border-radius: 10px;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-weight: 750;
		border: none;
		cursor: pointer;
		font-size: 0.76rem;
	}

	.analyze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.upload-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.2rem 1rem;
		gap: 0.65rem;
		text-align: center;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-subtle);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.preview-step {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.preview-header h4 {
		margin: 0;
		font-size: 0.92rem;
		color: var(--text-primary);
		font-weight: 800;
	}

	.date-range {
		display: block;
		font-size: 0.68rem;
		color: var(--accent);
		font-weight: 700;
		margin-top: 0.15rem;
	}

	.preview-badge {
		display: inline-block;
		margin-top: 0.25rem;
		font-size: 0.65rem;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		font-weight: 750;
	}

	.preview-table-wrap {
		max-height: 260px;
		overflow-y: auto;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-subtle);
		display: flex;
		flex-direction: column;
	}

	.preview-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 0.72rem;
	}

	.preview-row:last-child {
		border-bottom: none;
	}

	.row-date {
		font-weight: 700;
		color: var(--text-primary);
		min-width: 45px;
	}

	.row-time {
		color: var(--text-secondary);
		min-width: 78px;
		font-size: 0.68rem;
	}

	.row-sub {
		font-weight: 800;
		min-width: 18px;
	}

	.row-topic {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-primary);
	}

	.row-note {
		color: var(--accent);
		margin-left: 0.35rem;
	}

	.preview-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	.btn-ghost {
		padding: 0.48rem 0.85rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-ghost:hover {
		color: var(--text-primary);
	}

	.btn-primary {
		padding: 0.48rem 1rem;
		border-radius: 9px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
	}

	.error-msg {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		background: color-mix(in srgb, #ef4444 14%, transparent);
		color: #ef4444;
		border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
		font-size: 0.72rem;
		font-weight: 650;
	}

	.clear-zone {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.4rem;
		border-top: 1px solid var(--border-subtle);
	}

	.btn-clear-danger {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		border-radius: 7px;
		background: transparent;
		border: 1px solid color-mix(in srgb, #ef4444 40%, var(--border-subtle));
		color: #ef4444;
		font-size: 0.68rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.btn-clear-danger:hover {
		background: color-mix(in srgb, #ef4444 12%, transparent);
		border-color: #ef4444;
	}

	.confirm-clear-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		padding: 0.4rem 0.6rem;
		background: color-mix(in srgb, #ef4444 10%, transparent);
		border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
		border-radius: 8px;
	}
	.confirm-text {
		font-size: 0.74rem;
		font-weight: 700;
		color: #ef4444;
	}
	.confirm-btns {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.btn-cancel-clear {
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.65rem;
		border-radius: 7px;
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s ease;
	}
	.btn-cancel-clear:hover {
		background: var(--surface-subtle);
		color: var(--text-primary);
	}

	@media (max-width: 540px) {
		.timetable-prompt-banner {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.6rem;
		}
		.btn-upload-prompt {
			width: 100%;
			justify-content: center;
		}
		.class-item {
			padding: 0.5rem 0.55rem;
			gap: 0.45rem;
		}
		.class-left {
			min-width: 76px;
		}
		.class-time {
			font-size: 0.62rem;
		}
		.class-topic {
			font-size: 0.76rem;
			white-space: normal;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
			line-height: 1.25;
		}
		.btn-plan-class,
		.btn-focus-class,
		.planned-indicator {
			min-height: 32px;
			padding: 0.35rem 0.65rem;
		}
		.preview-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			padding: 0.55rem 0.65rem;
		}
	}
</style>
