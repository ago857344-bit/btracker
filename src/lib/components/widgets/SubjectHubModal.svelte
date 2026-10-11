<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { addSubjectSession, plannerPrompt, tracker } from '$lib/stores/tracker';
	import { chaptersOf, subjectColor, subjectName } from '$lib/state/subjects';
	import { longDateKey } from '$lib/state/dates';
	import { allChapters } from '$lib/state/syllabus';
	import { chapterStats, subjectStats, accuracyOf, pctOf } from '$lib/state/questions';
	import { getEloRank } from '$lib/state/gamification';
	import { goto } from '$app/navigation';

	export let open = false;
	export let sub = 'P';

	let tab: 'chapters' | 'add' | 'past' = 'chapters';
	let chapter = '';
	let att = 10;
	let cor = 0;

	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));

	$: chapters = chaptersOf(sub);
	$: sylChapters = allChapters(sub);
	$: st = subjectStats($tracker, sub);
	$: eloVal = ($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[sub as "P" | "C" | "M"] || 300;
	$: elo = getEloRank(eloVal);
	$: if (!chapters.includes(chapter)) chapter = chapters[0] ?? '';
	$: past = $tracker.sess.filter((entry) => entry.sub === sub);
	$: color = subjectColor(sub);

	function save() {
		if (!chapter) return;
		addSubjectSession({ sub, ch: chapter, att: Math.max(0, att), cor: Math.min(Math.max(0, cor), Math.max(0, att)) });
		if (att > 0 && cor / att < 0.5) plannerPrompt.set(`Practice ${subjectName(sub)} — ${chapter}`);
		att = 10; cor = 0;
		tab = 'past';
	}

	function goToChapter(chNo: number) {
		open = false;
		goto(`/log?s=${sub}&c=${chNo}`);
	}
</script>

<Modal bind:open title="{subjectName(sub)} Hub" width="560px">
	<div class="hub" style="--sub: {color}">
		<div class="hub-hero">
			<div class="hero-stat">
				<span class="label">Questions Solved</span>
				<b class="val">{st.done.toLocaleString()} <small>/ {st.n.toLocaleString()}</small></b>
				<div class="bar-track"><i style="width: {pctOf(st)}%; background: {color}"></i></div>
			</div>
			<div class="hero-stat">
				<span class="label">Accuracy</span>
				<b class="val">{accuracyOf(st) !== null ? `${accuracyOf(st)}%` : '—'}</b>
				<span class="subtext">{st.correct} correct · {st.wrong} wrong</span>
			</div>
			<div class="hero-stat">
				<span class="label">Skill Rating</span>
				<span class="elo-pill" style="--elo: {elo.color}"><NavIcon name={elo.icon as any} size={11} /> {elo.name} ({Math.floor(eloVal)})</span>
				<span class="subtext">{pctOf(st)}% syllabus done</span>
			</div>
		</div>

		<div class="tabs">
			<button type="button" class:selected={tab === 'chapters'} on:click={() => tab = 'chapters'}>Chapters <em>{sylChapters.length}</em></button>
			<button type="button" class:selected={tab === 'add'} on:click={() => tab = 'add'}>Add session</button>
			<button type="button" class:selected={tab === 'past'} on:click={() => tab = 'past'}>Past sessions <em>{past.length}</em></button>
		</div>

		{#if tab === 'chapters'}
			<div class="chapter-list">
				{#each sylChapters as ch (ch.no)}
					{@const chSt = chapterStats($tracker, sub, ch.no)}
					<div class="ch-row">
						<div class="ch-info">
							<b>{ch.no}. {ch.name}</b>
							<small>{chSt.done} of {chSt.n} solved · {pctOf(chSt)}%{accuracyOf(chSt) !== null ? ` · ${accuracyOf(chSt)}% acc` : ''}</small>
							<div class="ch-bar"><i style="width: {pctOf(chSt)}%; background: {color}"></i></div>
						</div>
						<button type="button" class="btn-prac" on:click={() => goToChapter(ch.no)}>
							Log <NavIcon name="arrow-right" size={11} />
						</button>
					</div>
				{/each}
			</div>
		{:else if tab === 'add'}
			<label class="field"><small>Chapter</small>
				<select bind:value={chapter}>
					{#each chapters as ch}<option value={ch}>{ch}</option>{/each}
				</select>
			</label>
			<div class="steppers">
				<div class="stepper">
					<small>Attempted</small>
					<div class="step-row">
						<button type="button" aria-label="Decrease attempted" on:click={() => att = Math.max(0, att - 1)}><NavIcon name="minus" size={13} /></button>
						<input type="number" min="0" max="2000" inputmode="numeric" aria-label="Questions attempted" value={att} on:input={(e) => (att = clamp(Number(e.currentTarget.value), 0, 2000))} on:change={(e) => (att = clamp(Number(e.currentTarget.value), 0, 2000))} />
						<button type="button" aria-label="Increase attempted" on:click={() => att += 1}><NavIcon name="plus" size={13} /></button>
					</div>
				</div>
				<div class="stepper">
					<small>Correct</small>
					<div class="step-row">
						<button type="button" aria-label="Decrease correct" on:click={() => cor = Math.max(0, cor - 1)}><NavIcon name="minus" size={13} /></button>
						<input type="number" min="0" max={att} inputmode="numeric" aria-label="Questions correct" value={cor} on:input={(e) => (cor = clamp(Number(e.currentTarget.value), 0, att))} on:change={(e) => (cor = clamp(Number(e.currentTarget.value), 0, att))} />
						<button type="button" aria-label="Increase correct" on:click={() => cor = Math.min(att, cor + 1)}><NavIcon name="plus" size={13} /></button>
					</div>
				</div>
			</div>
			<p class="acc">Accuracy: <b>{att ? Math.round((cor / att) * 100) : 0}%</b></p>
			<button type="button" class="save" style="background: {color}" on:click={save}>Save session</button>
		{:else}
			{#if past.length}
				<ul class="past-list">
					{#each past as entry (entry.id)}
						<li>
							<span class="dot" style="background: {color}"></span>
							<div><b>{entry.ch}</b><small>{longDateKey(entry.day)} · {entry.att} QS · {entry.att ? Math.round((entry.cor / entry.att) * 100) : 0}% correct</small></div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="none">No manual {subjectName(sub)} sessions logged yet. Use “Add session” after your next practice block.</p>
			{/if}
		{/if}
	</div>
</Modal>

<style>
	.hub { display: grid; gap: 1rem; }
	.hub-hero { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; padding: .85rem 1rem; border-radius: 14px; background: var(--surface-subtle); border: 1px solid var(--border-subtle); }
	.hero-stat { display: grid; gap: .25rem; align-content: start; }
	.hero-stat .label { color: var(--text-secondary); font-size: .62rem; font-weight: 750; text-transform: uppercase; letter-spacing: .06em; }
	.hero-stat .val { font-size: 1.15rem; font-weight: 850; letter-spacing: -.02em; }
	.hero-stat .val small { font-size: .74rem; color: var(--text-secondary); font-weight: 600; }
	.hero-stat .subtext { font-size: .68rem; color: var(--text-secondary); font-weight: 600; }
	.bar-track { height: 5px; border-radius: 99px; background: var(--surface-panel); overflow: hidden; margin-top: .2rem; }
	.bar-track i { display: block; height: 100%; border-radius: 99px; transition: width .4s ease; }
	.elo-pill { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .5rem; border-radius: 6px; background: color-mix(in srgb, var(--elo), transparent 85%); color: var(--elo); font-size: .68rem; font-weight: 800; border: 1px solid color-mix(in srgb, var(--elo), transparent 70%); width: fit-content; }
	
	.tabs { display: inline-flex; gap: .25rem; justify-self: start; padding: .25rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.tabs button { display: inline-flex; align-items: center; gap: .4rem; height: 30px; padding: 0 .8rem; border: 0; border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.tabs button em { font-style: normal; opacity: .65; }
	.tabs button.selected { color: var(--sub); background: var(--surface-panel); box-shadow: 0 4px 10px rgb(10 8 26 / 10%); }

	.chapter-list { display: grid; gap: .45rem; max-height: 320px; overflow-y: auto; padding-right: .2rem; }
	.ch-row { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .65rem .8rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.ch-info { display: grid; gap: .2rem; flex: 1; min-width: 0; }
	.ch-info b { font-size: .82rem; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ch-info small { color: var(--text-secondary); font-size: .68rem; font-weight: 600; }
	.ch-bar { height: 4px; border-radius: 99px; background: var(--surface-panel); overflow: hidden; margin-top: .15rem; }
	.ch-bar i { display: block; height: 100%; border-radius: 99px; }
	.btn-prac { display: inline-flex; align-items: center; gap: .3rem; padding: .35rem .65rem; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--sub); font-size: .72rem; font-weight: 750; cursor: pointer; white-space: nowrap; font-family: inherit; }
	.btn-prac:hover { border-color: var(--sub); }

	.field { display: grid; gap: .3rem; }
	small { color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	select { height: 38px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .82rem; font-family: inherit; }
	select:focus { outline: none; border-color: var(--sub); }
	.steppers { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
	.stepper { display: grid; gap: .35rem; padding: .75rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.step-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
	.step-row button { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-secondary); cursor: pointer; }
	.step-row button:hover { color: var(--sub); border-color: var(--sub); }
	.step-row input { width: 100%; min-width: 0; height: 34px; padding: 0 .4rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-primary); font-size: 1.05rem; font-weight: 700; letter-spacing: -.02em; text-align: center; -moz-appearance: textfield; appearance: textfield; }
	.step-row input:focus { outline: none; border-color: var(--sub); }
	.step-row input::-webkit-outer-spin-button, .step-row input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
	.acc { margin: 0; color: var(--text-secondary); font-size: .78rem; }
	.acc b { color: var(--text-primary); }
	.save { height: 40px; border: 0; border-radius: 12px; color: white; font-size: .82rem; font-weight: 800; letter-spacing: .03em; cursor: pointer; font-family: inherit; }
	.past-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; max-height: 300px; overflow: auto; }
	.past-list li { display: flex; align-items: center; gap: .6rem; padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.past-list .dot { width: 9px; height: 9px; border-radius: 99px; }
	.past-list b { display: block; font-size: .78rem; }
	.past-list small { text-transform: none; letter-spacing: 0; font-weight: 600; font-size: .68rem; }
	.none { margin: 0; color: var(--text-secondary); font-size: .8rem; line-height: 1.6; }
</style>
