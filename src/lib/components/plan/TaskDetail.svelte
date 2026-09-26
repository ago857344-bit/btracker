<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { addSubtask, deleteTask, patchTask } from '$lib/stores/tracker';
	import { TASK_COLORS, SUBJECTS, subjectColor, subjectName } from '$lib/state/subjects';
	import { longDateKey } from '$lib/state/dates';
	import type { HomeworkItem } from '$lib/types/tracker';

	export let open = false;
	export let task: HomeworkItem | null = null;

	let editing = false;
	let draft = { title: '', st: '', en: '', s: '', col: 0, hrs: 0 };
	let subtaskText = '';
	$: if (open && task) {
		editing = false;
		subtaskText = '';
		draft = { title: task.title ?? '', st: task.st ?? '', en: task.en ?? '', s: task.s ?? '', col: task.col ?? 0, hrs: task.hrs ?? 0 };
	}

	const fmtTime = (v?: string) => {
		if (!v) return '';
		const [h, m] = v.split(':').map(Number);
		const ampm = h >= 12 ? 'PM' : 'AM';
		const hh = h % 12 || 12;
		return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
	};

	function save() {
		if (!task) return;
		patchTask(task.id, { title: draft.title.trim() || task.title, st: draft.st, en: draft.en, s: draft.s || undefined, col: draft.col, hrs: draft.hrs });
		editing = false;
	}

	function remove() {
		if (!task) return;
		deleteTask(task.id);
		open = false;
	}

	function addSub() {
		if (!task || !subtaskText.trim()) return;
		addSubtask(task.id, subtaskText.trim());
		subtaskText = '';
	}
</script>

<Modal bind:open title="Task details" width="480px">
	{#if task}
		<div class="detail">
			<div class="head">
				<span class="ring" style="border-color: {TASK_COLORS[(task.col ?? 0) % TASK_COLORS.length]}"></span>
				{#if editing}
					<input class="title-edit" type="text" bind:value={draft.title} aria-label="Task title" />
				{:else}
					<b class="title">{task.title}</b>
				{/if}
			</div>

			<div class="rows">
				{#if editing}
					<label class="row"><span>Date</span><input type="date" value={task.due ?? ''} on:change={(e) => patchTask(task!.id, { due: e.currentTarget.value })} /></label>
					<label class="row"><span>Time</span>
						<span class="pair"><input type="time" bind:value={draft.st} /><input type="time" bind:value={draft.en} /></span>
					</label>
					<label class="row"><span>Subject</span>
						<select bind:value={draft.s}>
							<option value="">No Subject</option>
							{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
						</select>
					</label>
					<div class="row"><span>Color</span>
						<span class="swatches">
							{#each TASK_COLORS as color, i}
								<button type="button" class="swatch" class:selected={draft.col === i} style="background: {color}" aria-label="Color {i + 1}" on:click={() => draft.col = i}></button>
							{/each}
						</span>
					</div>
				{:else}
					<p class="row"><span>Date</span>{task.due ? longDateKey(task.due) : 'No specific date'}</p>
					<p class="row"><span>Time</span>{task.st || task.en ? `${fmtTime(task.st)}${task.st && task.en ? ' – ' + fmtTime(task.en) : ''}` : 'No specific time set'}</p>
					<p class="row"><span>Subject</span>
						{#if task.s}<i class="dot" style="background: {subjectColor(task.s)}"></i>{subjectName(task.s)}{:else}No Subject{/if}
					</p>
					{#if task.hrs}<p class="row"><span>Est.</span>{task.hrs} hrs</p>{/if}
					{#if task.test}<p class="row"><span>Tag</span><i class="test-pill">Scheduled test</i></p>{/if}
					{#if task.rec && task.rec !== 'once'}<p class="row"><span>Repeat</span>{task.rec}</p>{/if}
				{/if}
			</div>

			<div class="subtasks">
				<p class="label">Subtasks</p>
				{#each task.subs ?? [] as sub}
					<p class="sub"><NavIcon name="circle" size={12} /> {sub}</p>
				{/each}
				<div class="sub-add">
					<input type="text" placeholder="Add a subtask..." bind:value={subtaskText} on:keydown={(e) => e.key === 'Enter' && addSub()} aria-label="Add a subtask" />
					<button type="button" on:click={addSub} disabled={!subtaskText.trim()} aria-label="Add subtask"><NavIcon name="plus" size={14} /></button>
				</div>
			</div>

			<div class="actions">
				{#if editing}
					<button type="button" class="btn ghost" on:click={() => editing = false}>Cancel</button>
					<button type="button" class="btn solid" on:click={save}>Save changes</button>
				{:else}
					<button type="button" class="btn danger" aria-label="Delete task" on:click={remove}><NavIcon name="trash" size={15} /></button>
					<button type="button" class="btn ghost" on:click={() => editing = true}><NavIcon name="edit" size={14} /> Edit task</button>
				{/if}
			</div>
		</div>
	{/if}
</Modal>

<style>
	.detail { display: grid; gap: 1rem; }
	.head { display: flex; align-items: center; gap: .7rem; }
	.ring { flex: 0 0 16px; width: 16px; height: 16px; border: 3px solid var(--accent); border-radius: 99px; }
	.title { font-size: 1rem; letter-spacing: -.02em; }
	.title-edit { flex: 1; height: 36px; padding: 0 .65rem; border: 1px solid var(--accent); border-radius: 10px; background: var(--surface-subtle); color: var(--text-primary); font-size: .9rem; font-family: inherit; }
	.rows { display: grid; gap: .45rem; }
	.row { display: flex; align-items: center; gap: .6rem; margin: 0; color: var(--text-primary); font-size: .8rem; }
	.row > span:first-child { flex: 0 0 64px; color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
	.row input, .row select { height: 34px; padding: 0 .6rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-subtle); color: var(--text-primary); font-size: .78rem; font-family: inherit; }
	.row input[type="date"] { flex: 1; }
	.pair { display: flex; gap: .4rem; }
	.pair input { width: 118px; }
	.dot { width: 9px; height: 9px; border-radius: 99px; }
	.test-pill { padding: .18rem .5rem; border-radius: 99px; background: var(--accent-soft); color: var(--accent); font-size: .66rem; font-style: normal; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
	.swatches { display: flex; gap: .4rem; }
	.swatch { width: 20px; height: 20px; border: 2px solid transparent; border-radius: 99px; cursor: pointer; }
	.swatch.selected { border-color: var(--text-primary); }
	.subtasks { display: grid; gap: .45rem; padding: .8rem .9rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.label { margin: 0; color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
	.sub { display: flex; align-items: center; gap: .45rem; margin: 0; font-size: .78rem; }
	.sub-add { display: flex; gap: .4rem; }
	.sub-add input { flex: 1; height: 32px; padding: 0 .6rem; border: 1px dashed var(--border-subtle); border-radius: 9px; background: transparent; color: var(--text-primary); font-size: .76rem; font-family: inherit; }
	.sub-add button { display: grid; place-items: center; width: 32px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: transparent; cursor: pointer; }
	.sub-add button:disabled { opacity: .4; cursor: default; }
	.actions { display: flex; justify-content: flex-end; gap: .55rem; }
	.btn { display: inline-flex; align-items: center; gap: .4rem; height: 36px; padding: 0 .95rem; border-radius: 11px; font-size: .78rem; font-weight: 750; border: 1px solid transparent; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.ghost:hover { color: var(--text-primary); }
	.btn.solid { color: white; background: var(--accent); }
	.btn.danger { width: 36px; justify-content: center; padding: 0; color: var(--danger, #e0455a); border-color: var(--border-subtle); background: transparent; margin-right: auto; }
	.btn.danger:hover { border-color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 88%); }
</style>
