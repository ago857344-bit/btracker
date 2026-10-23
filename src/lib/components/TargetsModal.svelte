<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import { setDailyGoal, setExamDate, setStreakGoalHours, setWeeklyGoalHours, tracker } from '$lib/stores/tracker';
	import { getExamPresets } from '$lib/state/exam-presets';

	export let open = false;

	const presets = getExamPresets();

	let dayQ = 0; let dayH = 0; let weekH = 0; let streakH = 0; let exam = '';
	$: if (open) {
		dayQ = $tracker.goals.day.q; dayH = $tracker.goals.day.h;
		weekH = $tracker.meta.weekGoalH; streakH = $tracker.meta.streakGoalH;
		exam = $tracker.meta.exam ?? '';
	}

	const num = (value: string, min: number, max: number) => {
		const parsed = Number(value);
		return Math.min(max, Math.max(min, Number.isFinite(parsed) ? Math.round(parsed) : min));
	};
	function save() {
		setDailyGoal({ q: dayQ, h: dayH });
		setWeeklyGoalHours(weekH);
		setStreakGoalHours(streakH);
		setExamDate(exam || null);
		open = false;
	}
</script>

<Modal bind:open title="Edit targets" width="460px">
	<div class="rows">
		<label class="row"><span>Questions per day<small>Drives the daily ring &amp; “on track” nudge</small></span>
			<input type="number" min="1" max="2000" inputmode="numeric" value={dayQ} on:input={(e) => (dayQ = num(e.currentTarget.value, 1, 2000))} />
		</label>
		<label class="row"><span>Focus hours per day<small>Daily focus target in hours</small></span>
			<input type="number" min="1" max="24" inputmode="numeric" value={dayH} on:input={(e) => (dayH = num(e.currentTarget.value, 1, 24))} />
		</label>
		<label class="row"><span>Focus hours per week<small>Weekly standing target</small></span>
			<input type="number" min="1" max="500" inputmode="numeric" value={weekH} on:input={(e) => (weekH = num(e.currentTarget.value, 1, 500))} />
		</label>
		<label class="row"><span>Hours per day for a streak<small>How much study counts a day toward your streak</small></span>
			<input type="number" min="1" max="24" inputmode="numeric" value={streakH} on:input={(e) => (streakH = num(e.currentTarget.value, 1, 24))} />
		</label>

		<div class="exam-target-block">
			<label class="row"><span>Target exam date<small>Powers the exam countdown &amp; study milestones</small></span>
				<input type="date" value={exam} on:input={(e) => (exam = e.currentTarget.value)} />
			</label>
			<div class="exam-presets-row">
				<span class="presets-label">JEE Presets:</span>
				<div class="preset-buttons">
					{#each presets as p}
						<button
							type="button"
							class="preset-btn"
							class:active={exam === p.date}
							on:click={() => (exam = p.date)}
						>
							{p.shortName}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="ghostbtn" on:click={() => (open = false)}>Cancel</button>
		<button type="button" class="solidbtn" on:click={save}>Save targets</button>
	</svelte:fragment>
</Modal>

<style>
	.rows { display: grid; gap: .75rem; }
	.row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
	.row span { display: grid; gap: .12rem; color: var(--text-primary); font-size: .84rem; font-weight: 650; }
	.row small { color: var(--text-secondary); font-size: .7rem; font-weight: 550; }
	.row input { width: 130px; height: 38px; padding: 0 .6rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .86rem; font-weight: 650; text-align: right; font-family: inherit; }
	.row input:focus { outline: none; border-color: var(--accent); }
	
	.exam-target-block {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.65rem 0.75rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-subtle) 50%, transparent);
		border: 1px solid var(--border-subtle);
	}

	.exam-presets-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.2rem;
	}

	.presets-label {
		font-size: 0.68rem;
		font-weight: 750;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.preset-buttons {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.preset-btn {
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}

	.preset-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.preset-btn.active {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-canvas));
		color: var(--accent);
		border-color: var(--accent);
	}

	.ghostbtn { height: 36px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .8rem; font-weight: 700; cursor: pointer; }
	.solidbtn { height: 36px; padding: 0 1rem; border: 0; border-radius: 10px; background: var(--accent); color: var(--accent-contrast, white); font-size: .8rem; font-weight: 750; cursor: pointer; }

	@media (max-width: 500px) {
		.row {
			flex-direction: column;
			align-items: stretch;
			gap: 0.35rem;
		}
		.row input {
			width: 100%;
			text-align: left;
		}
	}
</style>
