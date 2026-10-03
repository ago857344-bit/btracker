<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { CHAPTER_WEIGHTAGE } from '$lib/state/weightage';
	import { CHAPTERS, subjectColor } from '$lib/state/subjects';

	$: effortMap = (() => {
		const map: Record<string, number> = {};
		
		Object.entries(CHAPTERS).forEach(([sub, chapters]) => {
			chapters.forEach((chName, i) => {
				const key = `${sub}${i + 1}`;
				map[key] = 0;
			});
		});

		for (const session of $tracker.sess) {
			const sub = session.sub;
			const ch = session.ch;
			const idx = CHAPTERS[sub]?.indexOf(ch) ?? -1;
			if (idx >= 0) {
				const key = `${sub}${idx + 1}`;
				map[key] = (map[key] || 0) + session.att;
			}
		}

		for (const session of $tracker.log) {
			const sub = session[7];
			const ch = session[8];
			if (sub && ch) {
				const idx = CHAPTERS[sub]?.indexOf(ch) ?? -1;
				if (idx >= 0) {
					const key = `${sub}${idx + 1}`;
					map[key] = (map[key] || 0) + session[1];
				}
			}
		}
		
		return map;
	})();

	$: allEfforts = Object.values(effortMap).filter(v => v > 0);
	$: effortThreshold = allEfforts.length > 0 
		? allEfforts.reduce((a, b) => a + b, 0) / allEfforts.length 
		: 10;
	
	const WEIGHT_THRESHOLD = 5;

	interface QuadrantItem {
		key: string;
		name: string;
		sub: string;
		weight: number;
		effort: number;
	}

	$: quadrants = (() => {
		const q1: QuadrantItem[] = [];
		const q2: QuadrantItem[] = [];
		const q3: QuadrantItem[] = [];
		const q4: QuadrantItem[] = [];

		Object.entries(CHAPTERS).forEach(([sub, chapters]) => {
			chapters.forEach((chName, i) => {
				const key = `${sub}${i + 1}`;
				const weight = CHAPTER_WEIGHTAGE[key] || 5;
				const effort = effortMap[key] || 0;
				
				const item = { key, name: chName, sub, weight, effort };
				
				if (weight > WEIGHT_THRESHOLD && effort <= effortThreshold) q1.push(item);
				else if (weight > WEIGHT_THRESHOLD && effort > effortThreshold) q2.push(item);
				else if (weight <= WEIGHT_THRESHOLD && effort <= effortThreshold) q3.push(item);
				else q4.push(item);
			});
		});

		q1.sort((a, b) => b.weight - a.weight || a.effort - b.effort);
		q2.sort((a, b) => b.weight - a.weight || b.effort - a.effort);
		q3.sort((a, b) => a.weight - b.weight || a.effort - b.effort);
		q4.sort((a, b) => a.weight - b.weight || b.effort - a.effort);

		return { q1, q2, q3, q4 };
	})();
</script>

<div class="matrix-container">
	<h2>Weightage vs Effort Matrix</h2>
	
	<div class="grid">
		<div class="quadrant q1">
			<div class="q-header">
				<h3>🥇 Gold Mines</h3>
				<span class="q-desc">High Weight, Low Effort (Huge ROI)</span>
			</div>
			<div class="q-content">
				{#each quadrants.q1.slice(0, 5) as item}
					<div class="badge" style="border-left: 4px solid {subjectColor(item.sub)}">
						<span class="ch-name" title="{item.name}">{item.name}</span>
						<span class="ch-stats">W:{item.weight} E:{item.effort}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="quadrant q2">
			<div class="q-header">
				<h3>💪 Core Strength</h3>
				<span class="q-desc">High Weight, High Effort</span>
			</div>
			<div class="q-content">
				{#each quadrants.q2.slice(0, 5) as item}
					<div class="badge" style="border-left: 4px solid {subjectColor(item.sub)}">
						<span class="ch-name" title="{item.name}">{item.name}</span>
						<span class="ch-stats">W:{item.weight} E:{item.effort}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="quadrant q3">
			<div class="q-header">
				<h3>🛡️ Skipped Safely</h3>
				<span class="q-desc">Low Weight, Low Effort</span>
			</div>
			<div class="q-content">
				{#each quadrants.q3.slice(0, 5) as item}
					<div class="badge" style="border-left: 4px solid {subjectColor(item.sub)}">
						<span class="ch-name" title="{item.name}">{item.name}</span>
						<span class="ch-stats">W:{item.weight} E:{item.effort}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="quadrant q4">
			<div class="q-header">
				<h3>⚠️ Time Traps</h3>
				<span class="q-desc">Low Weight, High Effort (Wasting time!)</span>
			</div>
			<div class="q-content">
				{#each quadrants.q4.slice(0, 5) as item}
					<div class="badge" style="border-left: 4px solid {subjectColor(item.sub)}">
						<span class="ch-name" title="{item.name}">{item.name}</span>
						<span class="ch-stats">W:{item.weight} E:{item.effort}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.matrix-container {
		background: var(--bg-1, #1a1a1a);
		border: 1px solid var(--border, #333);
		border-radius: 12px;
		padding: 24px;
		margin-top: 32px;
	}

	h2 {
		margin: 0 0 20px 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--text-1, #fff);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 768px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	.quadrant {
		background: var(--bg-2, #242424);
		border-radius: 8px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.q1 { border-top: 3px solid var(--accent, #d99a2b); }
	.q2 { border-top: 3px solid #2f9e6e; }
	.q3 { border-top: 3px solid #8b87a0; }
	.q4 { border-top: 3px solid #e0455a; }

	.q-header h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--text-1, #fff);
	}

	.q-desc {
		font-size: 0.85rem;
		color: var(--text-2, #aaa);
	}

	.q-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.badge {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--bg-3, #333);
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 0.85rem;
	}

	.ch-name {
		color: var(--text-1, #fff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.ch-stats {
		color: var(--text-2, #aaa);
		font-family: monospace;
		flex-shrink: 0;
		margin-left: 12px;
	}
</style>
