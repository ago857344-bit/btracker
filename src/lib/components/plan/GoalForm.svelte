<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { addGoal } from '$lib/stores/tracker';
	import { SUBJECTS, chaptersOf, subjectColor } from '$lib/state/subjects';
	import { addDaysKey, todayKey } from '$lib/state/dates';
	import type { GoalMilestone, TrackerGoal } from '$lib/types/tracker';

	export let open = false;

	const typeOptions: { id: TrackerGoal['type']; label: string; icon: 'book' | 'sigma' | 'target' }[] = [
		{ id: 'syllabus', label: 'Syllabus', icon: 'book' },
		{ id: 'pyq', label: 'PYQs Count', icon: 'sigma' },
		{ id: 'custom', label: 'Custom Goal', icon: 'target' }
	];

	let type: TrackerGoal['type'] = 'syllabus';
	let sub = 'P';
	let ch = '';
	let title = '';
	let titleTouched = false;
	let deadline = addDaysKey(todayKey(), 30);
	let milestones: GoalMilestone[] = [];
	let milestoneText = '';
	let solved = 0;
	let target = 100;

	$: chapters = chaptersOf(sub);
	$: if (!chapters.includes(ch)) ch = chapters[0] ?? '';
	$: autoTitle = type === 'pyq' ? `Solve PYQs for ${ch || 'chapter'}` : `Master ${ch || 'chapter'}`;
	$: effectiveTitle = titleTouched && title.trim() ? title.trim() : autoTitle;

	const PREFILL = ['Read theory + NCERT', 'Solve worked examples', 'Attempt PYQs (last 10 yrs)', 'Revise notes + formula sheet', 'Take a chapter mock test'];
	let seq = 0;
	const uidm = () => `m${Date.now()}${seq++}`;

	function prefill() {
		for (const t of PREFILL) if (!milestones.some((m) => m.t === t)) milestones = [...milestones, { id: uidm(), t, done: false }];
	}
	function addMilestone() {
		const t = milestoneText.trim();
		if (!t) return;
		milestones = [...milestones, { id: uidm(), t, done: false }];
		milestoneText = '';
	}

	function confirm() {
		addGoal({
			type, sub: type === 'custom' ? '' : sub, ch: type === 'custom' ? '' : ch,
			title: effectiveTitle, deadline,
			milestones: type === 'pyq' ? [] : milestones,
			solved: type === 'pyq' ? solved : 0, target: type === 'pyq' ? target : 0
		});
		open = false;
		type = 'syllabus'; title = ''; titleTouched = false; milestones = []; milestoneText = ''; solved = 0; target = 100;
		deadline = addDaysKey(todayKey(), 30);
	}
</script>

<Modal bind:open title="Create New Goal" width="620px">
	<div class="form">
		<p class="label">Target type</p>
		<div class="type-row">
			{#each typeOptions as opt (opt.id)}
				<button type="button" class="type-card" class:selected={type === opt.id} on:click={() => { type = opt.id; titleTouched = false; }}>
					<NavIcon name={opt.icon} size={16} /><b>{opt.label}</b>
				</button>
			{/each}
		</div>

		{#if type !== 'custom'}
			<div class="grid2">
				<label><small>Subject</small>
					<select bind:value={sub}>
						{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
					</select>
				</label>
				<label><small>Chapter</small>
					<select bind:value={ch} style="border-color: {subjectColor(sub)}55">
						{#each chapters as c}<option value={c}>{c}</option>{/each}
					</select>
				</label>
			</div>
		{/if}

		<label class="full"><small>Goal title</small>
			<input type="text" placeholder={type === 'pyq' ? 'Solve PYQs for your chapter' : 'e.g. Master NCERT Biology Chapter 1'} bind:value={title} on:input={() => titleTouched = true} />
			{#if !titleTouched || !title.trim()}<em class="auto">Auto: “{autoTitle}”</em>{/if}
		</label>

		<label class="full"><small>Target date (deadline)</small><input type="date" bind:value={deadline} /></label>

		{#if type === 'pyq'}
			<div class="pyq">
				<p class="label">PYQ practice counts</p>
				<p class="target-line">Target: <b>{target} PYQs</b></p>
				<div class="chips">
					{#each [25, 50, 100, 150] as n}
						<button type="button" class="chip" class:selected={target === n} on:click={() => target = n}>{n}</button>
					{/each}
					<input class="chip custom" type="number" min="1" aria-label="Custom target" placeholder="Custom" on:change={(e) => target = Math.max(1, Number(e.currentTarget.value))} />
				</div>
				<label class="full"><small>Currently solved</small><input type="number" min="0" bind:value={solved} /></label>
			</div>
		{:else}
			<div class="milestones">
				<div class="ms-head">
					<p class="label">Milestones</p>
					<button type="button" class="prefill" on:click={prefill}><NavIcon name="bolt" size={13} /> Prefill</button>
				</div>
				{#if milestones.length}
					<ul>
						{#each milestones as m (m.id)}
							<li><NavIcon name="circle" size={12} /><span>{m.t}</span>
								<button type="button" aria-label="Remove milestone" on:click={() => milestones = milestones.filter((x) => x.id !== m.id)}><NavIcon name="x" size={12} /></button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="ms-empty">No milestones added — break this goal into steps, or hit ⚡ Prefill.</p>
				{/if}
				<div class="ms-add">
					<input type="text" placeholder="Add a milestone..." bind:value={milestoneText} on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())} aria-label="Milestone" />
					<button type="button" on:click={addMilestone} disabled={!milestoneText.trim()} aria-label="Add milestone"><NavIcon name="plus" size={14} /></button>
				</div>
			</div>
		{/if}
	</div>

	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => open = false}>Cancel</button>
		<button type="button" class="btn solid" on:click={confirm}>Confirm goal</button>
	</svelte:fragment>
</Modal>

<style>
	.form { display: grid; gap: .85rem; }
	.label { margin: 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.type-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }
	.type-card { display: grid; gap: .3rem; justify-items: center; padding: .8rem .4rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: transparent; color: var(--text-secondary); font-family: inherit; cursor: pointer; transition: border-color .14s ease, color .14s ease; }
	.type-card b { font-size: .74rem; }
	.type-card.selected { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
	label { display: grid; gap: .3rem; }
	small { color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	input, select { height: 38px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .82rem; font-family: inherit; }
	input:focus, select:focus { outline: none; border-color: var(--accent); }
	.auto { color: var(--text-secondary); font-size: .68rem; font-style: normal; }
	.pyq { display: grid; gap: .55rem; padding: .85rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-subtle); }
	.target-line { margin: 0; font-size: .78rem; color: var(--text-secondary); }
	.target-line b { color: var(--text-primary); }
	.chips { display: flex; gap: .4rem; flex-wrap: wrap; }
	.chip { height: 30px; min-width: 44px; padding: 0 .65rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-secondary); font-size: .74rem; font-weight: 700; cursor: pointer; }
	.chip.selected { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	.chip.custom { width: 86px; }
	.milestones { display: grid; gap: .5rem; padding: .85rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-subtle); }
	.ms-head { display: flex; align-items: center; justify-content: space-between; }
	.prefill { display: inline-flex; align-items: center; gap: .3rem; height: 27px; padding: 0 .6rem; border: 1px solid var(--border-subtle); border-radius: 99px; background: var(--surface-panel); color: var(--text-secondary); font-size: .68rem; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; }
	.prefill:hover { color: var(--accent); border-color: var(--accent); }
	ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; }
	li { display: flex; align-items: center; gap: .5rem; font-size: .78rem; }
	li span { flex: 1; }
	li button { display: grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: 7px; color: var(--text-secondary); background: transparent; cursor: pointer; }
	li button:hover { color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 88%); }
	.ms-empty { margin: .2rem 0; padding: .8rem; border: 1px dashed var(--border-subtle); border-radius: 11px; color: var(--text-secondary); font-size: .72rem; text-align: center; }
	.ms-add { display: flex; gap: .4rem; }
	.ms-add input { flex: 1; height: 34px; }
	.ms-add button { display: grid; place-items: center; width: 34px; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--text-secondary); background: var(--surface-panel); cursor: pointer; }
	.ms-add button:disabled { opacity: .4; cursor: default; }
	.btn { height: 36px; padding: 0 1rem; border-radius: 11px; font-size: .78rem; font-weight: 750; border: 1px solid transparent; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.solid { color: white; background: var(--accent); }
</style>
