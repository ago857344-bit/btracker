<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { dayKeyOf, focusMinutesOn, formatMinutes, lastNDays, sessionDayKey, todayKey } from '$lib/state/dates';

	const sumQuestions = (keys: string[]) => keys.reduce((total, key) => {
		const bucket = $tracker.stat[key] ?? {};
		return total + Object.values(bucket).reduce<number>((s, v) => s + (Number(v) || 0), 0);
	}, 0);

	$: now = new Date();
	$: today = todayKey();
	$: weekKeys = lastNDays(7, now);
	$: monthKeys = (() => {
		const keys: string[] = [];
		for (let d = 1; d <= now.getDate(); d++) keys.push(dayKeyOf(new Date(now.getFullYear(), now.getMonth(), d)));
		return keys;
	})();
	$: monthLog = $tracker.log.filter((s) => sessionDayKey(s).startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`));

	const rows = () => [
		{ label: 'Today', qs: sumQuestions([today]), time: focusMinutesOn($tracker.log, today) },
		{ label: 'Week', qs: sumQuestions(weekKeys), time: weekKeys.reduce((sum, key) => sum + focusMinutesOn($tracker.log, key), 0) },
		{ label: 'Month', qs: sumQuestions(monthKeys), time: monthLog.reduce((sum, s) => sum + s[1], 0) }
	];
</script>

<div class="standing">
	<div class="cols">
		<span></span><small>Questions</small><small>Time studied</small>
	</div>
	{#each rows() as row (row.label)}
		<div class="cols row">
			<b>{row.label}</b>
			<span class="qs">{row.qs}</span>
			<span class="time">{row.time ? formatMinutes(row.time) : '—'}</span>
		</div>
	{/each}
</div>

<style>
	.standing { display: grid; gap: .4rem; height: 100%; align-content: start; }
	.cols { display: grid; grid-template-columns: 80px 1fr 1fr; align-items: center; gap: .5rem; padding: .5rem .6rem; border-radius: 11px; }
	.cols small { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; text-align: center; }
	.row { background: var(--surface-subtle); }
	.row b { font-size: .78rem; letter-spacing: -.01em; }
	.qs { font-size: 1.05rem; font-weight: 800; letter-spacing: -.03em; color: var(--accent); text-align: center; }
	.time { color: var(--text-secondary); font-size: .82rem; font-weight: 700; text-align: center; }
</style>
