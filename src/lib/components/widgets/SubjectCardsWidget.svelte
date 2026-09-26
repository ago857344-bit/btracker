<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import SubjectHubModal from '$lib/components/widgets/SubjectHubModal.svelte';
	import { subjectSolvedTotals, tracker } from '$lib/stores/tracker';
	import { SUBJECTS } from '$lib/state/subjects';

	let hubOpen = false;
	let hubSub = 'P';

	function openHub(code: string) { hubSub = code; hubOpen = true; }

	$: dailyGoal = $tracker.goals.day.q;
</script>

<div class="cards">
	{#each SUBJECTS as subject (subject.code)}
		<button type="button" class="subject-card" style="--sub: {subject.color}" on:click={() => openHub(subject.code)}>
			<span class="icon"><NavIcon name={subject.icon} size={18} /></span>
			<span class="name">{subject.name}</span>
			<span class="goal">Goal: {dailyGoal}</span>
			<span class="solved-wrap">
				<b class="solved">{$subjectSolvedTotals[subject.code] ?? 0}</b>
				<small>Solved</small>
			</span>
			<span class="open">Open hub <NavIcon name="arrow-right" size={13} /></span>
		</button>
	{/each}
</div>

<SubjectHubModal bind:open={hubOpen} sub={hubSub} />

<style>
	.cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; height: 100%; }
	@media (max-width: 720px) { .cards { grid-template-columns: 1fr; } }
	.subject-card { position: relative; display: grid; gap: .2rem; justify-items: start; padding: 1rem 1.05rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-subtle); cursor: pointer; text-align: left; font-family: inherit; color: inherit; overflow: hidden; transition: transform .16s ease, border-color .16s ease; min-height: 160px; }
	.subject-card::after { content: ''; position: absolute; inset: 0; opacity: 0; background: linear-gradient(140deg, color-mix(in srgb, var(--sub), transparent 82%), transparent 55%); transition: opacity .2s ease; }
	.subject-card:hover { transform: translateY(-2px); border-color: var(--sub); }
	.subject-card:hover::after { opacity: 1; }
	.subject-card > * { position: relative; z-index: 1; }
	.icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: white; background: var(--sub); margin-bottom: .45rem; }
	.name { font-size: .84rem; font-weight: 800; letter-spacing: -.01em; }
	.goal { color: var(--text-secondary); font-size: .62rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }
	.solved-wrap { display: flex; align-items: baseline; gap: .4rem; margin: .3rem 0 .5rem; }
	.solved { font-size: 1.9rem; font-weight: 850; letter-spacing: -.05em; line-height: 1; color: var(--sub); }
	.solved-wrap small { color: var(--text-secondary); font-size: .66rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
	.open { display: inline-flex; align-items: center; gap: .35rem; color: var(--sub); font-size: .72rem; font-weight: 750; }
</style>
