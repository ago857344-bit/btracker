<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import { setDailyGoal, setExamDate, setStreakGoalHours, setWeeklyGoalHours, tracker } from '$lib/stores/tracker';

	export let open = false;

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

<Modal bind:open title="Edit targets" width="440px">
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
		<label class="row"><span>Target exam date<small>Powers the exam countdown</small></span>
			<input type="date" value={exam} on:input={(e) => (exam = e.currentTarget.value)} />
		</label>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="ghostbtn" on:click={() => (open = false)}>Cancel</button>
		<button type="button" class="solidbtn" on:click={save}>Save targets</button>
	</svelte:fragment>
</Modal>

<style>
	.rows { display: grid; gap: .7rem; }
	.row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
	.row span { display: grid; gap: .12rem; color: var(--text-primary); font-size: .84rem; font-weight: 650; }
	.row small { color: var(--text-secondary); font-size: .7rem; font-weight: 550; }
	.row input { width: 130px; height: 38px; padding: 0 .6rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .86rem; font-weight: 650; text-align: right; }
	.row input:focus { outline: none; border-color: var(--accent); }
	.ghostbtn { height: 36px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .8rem; font-weight: 700; }
	.solidbtn { height: 36px; padding: 0 1rem; border: 0; border-radius: 10px; background: var(--accent); color: white; font-size: .8rem; font-weight: 750; }
</style>
