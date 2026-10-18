<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import SubjectHubModal from '$lib/components/widgets/SubjectHubModal.svelte';
	import { subjectSolvedTotals, tracker } from '$lib/stores/tracker';
	import { SUBJECTS } from '$lib/state/subjects';
	import { getEloRank } from '$lib/state/gamification';
	import { subjectStats, pctOf } from '$lib/state/questions';

	let hubOpen = false;
	let hubSub = 'P';

	function openHub(code: string) { hubSub = code; hubOpen = true; }

	$: dailyGoal = $tracker.goals.day.q;
</script>

<div class="cards">
	{#each SUBJECTS as subject (subject.code)}
		{@const st = subjectStats($tracker, subject.code)}
		{@const eloVal = ($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[subject.code as "P" | "C" | "M"] || 300}
		{@const elo = getEloRank(eloVal)}
		{@const solvedCount = Math.max($subjectSolvedTotals[subject.code] ?? 0, st.done)}
		<button type="button" class="subject-card specular-card" style="--sub: {subject.color}" on:click={() => openHub(subject.code)}>
			<span class="icon"><NavIcon name={subject.icon as any} size={18} /></span>
			<span class="name">{subject.name}</span>
			<span class="goal">Goal: {dailyGoal} Qs</span>
			<span class="elo-badge" style="--elo: {elo.color}">
				<NavIcon name={elo.icon as any} size={11} /> {elo.name} ({Math.floor(eloVal)})
			</span>
			<span class="solved-wrap">
				<b class="solved">{solvedCount.toLocaleString()}</b>
				<small>Solved · {pctOf(st)}%</small>
			</span>
			<div class="bar-mini"><i style="width: {pctOf(st)}%; background: {subject.color}"></i></div>
			<span class="open">Open hub <NavIcon name="arrow-right" size={13} /></span>
		</button>
	{/each}
</div>

<SubjectHubModal bind:open={hubOpen} sub={hubSub} />

<style>
	.cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; height: 100%; }
	@media (max-width: 720px) { .cards { grid-template-columns: 1fr; } }
	.subject-card {
		position: relative;
		display: grid;
		gap: .2rem;
		justify-items: start;
		padding: 1rem 1.05rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 16px;
		background: var(--vision-glass-bg, var(--surface-subtle));
		backdrop-filter: var(--vision-glass-blur, blur(16px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
		box-shadow: var(--shadow-card), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.08));
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: inherit;
		overflow: hidden;
		transition: transform 0.22s var(--ease-ios-spring), border-color 0.25s ease, box-shadow 0.25s ease;
		min-height: 160px;
	}
	.subject-card::after { content: ''; position: absolute; inset: 0; opacity: 0; background: linear-gradient(140deg, color-mix(in srgb, var(--sub), transparent 82%), transparent 55%); transition: opacity .2s ease; }
	.subject-card:hover {
		transform: translateY(-2px);
		border-color: var(--sub);
		box-shadow: 0 14px 36px -6px color-mix(in srgb, var(--sub) 30%, transparent), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.12));
	}
	.subject-card:active {
		transform: translateY(0px) scale(0.985);
		transition: transform 0.12s var(--ease-ios-press, cubic-bezier(0.2, 0.9, 0.3, 1));
	}
	.subject-card:hover::after { opacity: 1; }
	.subject-card > * { position: relative; z-index: 3; }
	.icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: white; background: var(--sub); margin-bottom: .45rem; }
	.name { font-size: .84rem; font-weight: 800; letter-spacing: -.01em; }
	.goal { color: var(--text-secondary); font-size: .62rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }
	.solved-wrap { display: flex; align-items: baseline; gap: .4rem; margin: .3rem 0 .5rem; }
	.solved { font-size: 1.9rem; font-weight: 850; letter-spacing: -.05em; line-height: 1; color: var(--sub); }
	.solved-wrap small { color: var(--text-secondary); font-size: .66rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
	.open { display: inline-flex; align-items: center; gap: .35rem; color: var(--sub); font-size: .72rem; font-weight: 750; }
	.bar-mini { width: 100%; height: 5px; border-radius: 99px; background: var(--surface-panel); overflow: hidden; margin-bottom: .45rem; }
	.bar-mini i { display: block; height: 100%; border-radius: 99px; transition: width .5s ease; }
	.elo-badge { position: absolute; top: .85rem; right: .85rem; display: inline-flex; align-items: center; gap: .3rem; padding: .3rem .6rem; border-radius: 8px; background: color-mix(in srgb, var(--elo), transparent 85%); color: var(--elo); font-size: .66rem; font-weight: 850; letter-spacing: .05em; text-transform: uppercase; border: 1px solid color-mix(in srgb, var(--elo), transparent 70%); box-shadow: 0 4px 12px color-mix(in srgb, var(--elo), transparent 85%); }
</style>
