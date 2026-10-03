<script lang="ts">
	import AnimatedNumber from '$lib/components/ui/AnimatedNumber.svelte';
	import { tracker, streakDays } from '$lib/stores/tracker';
	import { startOfWeek, weekRangeLabel, dayKeyOf, formatMinutes } from '$lib/state/dates';
	import { logTotals, accuracyOf } from '$lib/state/questions';

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

	$: thisWeekMinutes = (() => {
		let sum = 0;
		for (const session of log) {
			const key = dayKeyOf(new Date(session[0] * 60000));
			if (thisWeekKeys.includes(key)) {
				sum += session[1];
			}
		}
		return sum;
	})();

	$: thisWeekHours = thisWeekMinutes / 60;

	$: questionsDone = (() => {
		let sum = 0;
		for (const key of thisWeekKeys) {
			const dayStat = $tracker.stat[key];
			if (dayStat) {
				sum += Object.values(dayStat).reduce((acc: number, v: number | undefined) => acc + (v || 0), 0);
			}
		}
		return sum;
	})();

	$: overallStats = logTotals($tracker);
	$: accuracy = accuracyOf(overallStats) || 0;

	$: startOfWeekMs = startOfWeek().getTime();
	$: chaptersRevised = Object.values($tracker.rev.chapters).filter(
		ch => ch.decay && ch.decay.lastRevisionAt && ch.decay.lastRevisionAt >= startOfWeekMs
	).length;

	$: currentStreak = $streakDays;

	const getFocusGrade = (h: number) => {
		if (h >= 10) return { l: 'A', c: 'var(--success)', v: 4 };
		if (h >= 6) return { l: 'B', c: '#2b8ba6', v: 3 };
		if (h >= 3) return { l: 'C', c: '#d99a2b', v: 2 };
		if (h >= 1) return { l: 'D', c: '#ff8a3d', v: 1 };
		return { l: 'F', c: 'var(--danger)', v: 0 };
	};

	const getAccGrade = (a: number) => {
		if (a >= 80) return { l: 'A', c: 'var(--success)', v: 4 };
		if (a >= 65) return { l: 'B', c: '#2b8ba6', v: 3 };
		if (a >= 50) return { l: 'C', c: '#d99a2b', v: 2 };
		if (a >= 30) return { l: 'D', c: '#ff8a3d', v: 1 };
		return { l: 'F', c: 'var(--danger)', v: 0 };
	};

	const getRevGrade = (r: number) => {
		if (r >= 5) return { l: 'A', c: 'var(--success)', v: 4 };
		if (r >= 3) return { l: 'B', c: '#2b8ba6', v: 3 };
		if (r >= 2) return { l: 'C', c: '#d99a2b', v: 2 };
		if (r >= 1) return { l: 'D', c: '#ff8a3d', v: 1 };
		return { l: 'F', c: 'var(--danger)', v: 0 };
	};

	const getStreakGrade = (s: number) => {
		if (s >= 7) return { l: 'A', c: 'var(--success)', v: 4 };
		if (s >= 4) return { l: 'B', c: '#2b8ba6', v: 3 };
		if (s >= 2) return { l: 'C', c: '#d99a2b', v: 2 };
		if (s >= 1) return { l: 'D', c: '#ff8a3d', v: 1 };
		return { l: 'F', c: 'var(--danger)', v: 0 };
	};

	$: fG = getFocusGrade(thisWeekHours);
	$: aG = getAccGrade(accuracy);
	$: rG = getRevGrade(chaptersRevised);
	$: sG = getStreakGrade(currentStreak);

	$: overallValue = (fG.v + aG.v + rG.v + sG.v) / 4;
	$: overallGrade = (() => {
		if (overallValue >= 3.5) return { l: 'A', c: 'var(--success)' };
		if (overallValue >= 2.5) return { l: 'B', c: '#2b8ba6' };
		if (overallValue >= 1.5) return { l: 'C', c: '#d99a2b' };
		if (overallValue >= 0.5) return { l: 'D', c: '#ff8a3d' };
		return { l: 'F', c: 'var(--danger)' };
	})();

	const getMessage = (v: number) => {
		if (v >= 3.5) return "Outstanding work this week! You're crushing it.";
		if (v >= 2.5) return "Solid week. Keep pushing to reach that next level.";
		if (v >= 1.5) return "Good effort, but there's room for more consistency.";
		if (v >= 0.5) return "A slow week. Time to refocus and build momentum.";
		return "Don't give up! Every day is a chance to start fresh.";
	};
</script>

<div class="report-card card">
	<div class="header">
		<h2>WEEKLY REPORT CARD</h2>
		<span class="range">{weekRangeLabel(startOfWeek())}</span>
	</div>

	<div class="grid">
		<div class="metric">
			<div class="grade" style="color: {fG.c}">{fG.l}</div>
			<div class="details">
				<div class="label">Focus Time</div>
				<div class="value"><AnimatedNumber value={thisWeekMinutes} format={formatMinutes} /></div>
			</div>
		</div>
		<div class="metric">
			<div class="grade" style="color: {aG.c}">{aG.l}</div>
			<div class="details">
				<div class="label">Accuracy</div>
				<div class="value"><AnimatedNumber value={accuracy} />% <span class="qs">(<AnimatedNumber value={questionsDone} /> Qs)</span></div>
			</div>
		</div>
		<div class="metric">
			<div class="grade" style="color: {rG.c}">{rG.l}</div>
			<div class="details">
				<div class="label">Revision</div>
				<div class="value"><AnimatedNumber value={chaptersRevised} /> chapters</div>
			</div>
		</div>
		<div class="metric">
			<div class="grade" style="color: {sG.c}">{sG.l}</div>
			<div class="details">
				<div class="label">Consistency</div>
				<div class="value"><AnimatedNumber value={currentStreak} /> day streak</div>
			</div>
		</div>
	</div>

	<div class="footer" style="border-top-color: color-mix(in srgb, {overallGrade.c} 30%, transparent)">
		<div class="overall">
			<span class="grade" style="color: {overallGrade.c}">{overallGrade.l}</span>
			<span class="label">Overall Grade</span>
		</div>
		<p class="message">{getMessage(overallValue)}</p>
	</div>
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
		justify-content: space-between;
		align-items: center;
	}
	h2 {
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.5px;
		color: var(--text-primary);
		margin: 0;
	}
	.range {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}
	.metric {
		background: var(--surface-bg);
		padding: 12px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.grade {
		font-size: 24px;
		font-weight: 800;
	}
	.details {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.label {
		font-size: 12px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.value {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}
	.qs {
		font-size: 12px;
		font-weight: 400;
		color: var(--text-secondary);
	}
	.footer {
		border-top: 1px solid var(--border-subtle);
		padding-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.overall {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.overall .grade {
		font-size: 32px;
		font-weight: 800;
	}
	.overall .label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}
	.message {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.4;
	}
</style>
