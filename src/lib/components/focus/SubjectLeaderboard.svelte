<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { startOfWeek, dayKeyOf, formatMinutes } from '$lib/state/dates';
	import { SUBJECTS, subjectColor, subjectName } from '$lib/state/subjects';
	import AnimatedNumber from '$lib/components/ui/AnimatedNumber.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	$: log = $tracker.log;

	$: thisWeekKeys = (() => {
		const start = startOfWeek();
		const keys = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(start);
			d.setDate(d.getDate() + i);
			keys.push(dayKeyOf(d));
		}
		return keys;
	})();

	$: lastWeekKeys = (() => {
		const start = startOfWeek();
		start.setDate(start.getDate() - 7);
		const keys = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(start);
			d.setDate(d.getDate() + i);
			keys.push(dayKeyOf(d));
		}
		return keys;
	})();

	const getSubjectMinutes = (keys: string[]) => {
		const totals: Record<string, number> = { P: 0, C: 0, M: 0 };
		for (const session of log) {
			const key = dayKeyOf(new Date(session[0] * 60000));
			if (keys.includes(key)) {
				const sc = session[7];
				if (sc && totals[sc] !== undefined) {
					totals[sc] += session[1];
				}
			}
		}
		return totals;
	};

	$: thisWeekTotals = getSubjectMinutes(thisWeekKeys);
	$: lastWeekTotals = getSubjectMinutes(lastWeekKeys);

	$: ranked = SUBJECTS.map(s => {
		const tw = thisWeekTotals[s.code] || 0;
		const lw = lastWeekTotals[s.code] || 0;
		return { code: s.code, tw, lw, delta: tw - lw };
	}).sort((a, b) => b.tw - a.tw);

	$: maxMinutes = Math.max(...ranked.map(r => r.tw), 1);
	$: totalThisWeek = ranked.reduce((acc, r) => acc + r.tw, 0);

	const getMedal = (index: number) => {
		if (index === 0) return '🥇';
		if (index === 1) return '🥈';
		return '🥉';
	};

	const formatDelta = (delta: number, lw: number) => {
		if (lw === 0 && delta > 0) return 'New';
		if (delta === 0) return '0m';
		if (delta > 0) return `+${formatMinutes(delta)}`;
		return `-${formatMinutes(Math.abs(delta))}`;
	};
</script>

<div class="leaderboard card">
	<div class="header">
		<NavIcon name="trophy" size={20} />
		<h2>THIS WEEK'S LEADERBOARD</h2>
	</div>

	{#if totalThisWeek === 0}
		<div class="empty-state">No sessions yet this week</div>
	{:else}
		<div class="rows">
			{#each ranked as item, index}
				<div class="row">
					<div class="rank">{getMedal(index)}</div>
					<div class="info">
						<div class="top-line">
							<div class="subject-info">
								<span class="dot" style="background: {subjectColor(item.code)}"></span>
								<span class="name">{subjectName(item.code)}</span>
							</div>
							<div class="stats">
								<span class="time"><AnimatedNumber value={item.tw} format={formatMinutes} /></span>
								<span class="delta {item.lw === 0 && item.tw > 0 ? 'new' : item.delta > 0 ? 'pos' : item.delta < 0 ? 'neg' : ''}">
									{formatDelta(item.delta, item.lw)}
								</span>
							</div>
						</div>
						<div class="bar-bg">
							<div class="bar-fill" style="width: {(item.tw / maxMinutes) * 100}%; background: {subjectColor(item.code)}"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.card {
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.header {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary);
	}
	h2 {
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.5px;
		margin: 0;
	}
	.empty-state {
		padding: 30px 0;
		text-align: center;
		color: var(--text-secondary);
		font-size: 14px;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.rank {
		font-size: 24px;
		width: 32px;
		text-align: center;
	}
	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.top-line {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.subject-info {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
	}
	.stats {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 13px;
	}
	.time {
		font-weight: 600;
		color: var(--text-primary);
	}
	.delta {
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary);
		font-weight: 500;
	}
	.delta.pos { color: var(--success); background: color-mix(in srgb, var(--success) 15%, transparent); }
	.delta.neg { color: var(--danger); background: color-mix(in srgb, var(--danger) 15%, transparent); }
	.delta.new { color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); }
	
	.bar-bg {
		height: 6px;
		background: var(--border-subtle);
		border-radius: 4px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.3s ease;
	}
</style>
