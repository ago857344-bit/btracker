<script lang="ts">
	import { uiSuccess, uiPop } from '$lib/utils/feedback';
	import { boostChapterFromPractice } from '$lib/stores/recall-actions';
	import { fade, slide } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { subjectColor, CHAPTERS } from '$lib/state/subjects';
	import { allChapters, SYLLABUS } from '$lib/state/syllabus';
	import { extractPdfText, matchChapters, matchChaptersAI, type ChapterMatch } from '$lib/services/btest';
import { triageTodos } from '$lib/services/aiTriage';
	import {
		addChecklistColumn, addTodo, addTodos, celebration, CHECKLIST_DEFAULT_COLS, clearDoneTodos, deleteTodo,
		removeChecklistColumn, reorderTodo, toggleChecklistCell, toggleTodo, tracker, addTodoSubtask, toggleTodoSubtask, deleteTodoSubtask
	} from '$lib/stores/tracker';

	let tab: 'tasks' | 'checklist' | 'btest' = 'tasks';
	let draft = '';
	let dragId: string | null = null;
	let expandedTodo: string | null = null;
	let subtaskDraft = '';
let triaging = false;

async function runAiTriage() {
    const openTodos = $tracker.todos.filter(t => !t.done);
    if (!openTodos.length) return;
    
    triaging = true;
    try {
        const result = await triageTodos(openTodos, $tracker.gamification?.elo || { P: 1200, C: 1200, M: 1200 });
        
        $tracker.todos = $tracker.todos.map(t => {
            if (result[t.id]) {
                return { ...t, roiTag: result[t.id] };
            }
            return t;
        });
        uiSuccess();
    } catch (e) {
        console.error(e);
        uiPop();
    } finally {
        triaging = false;
    }
}

	$: todos = $tracker.todos;
	$: open = todos.filter((t) => !t.done);
	$: done = todos.filter((t) => t.done);

	function submit() {
		const title = draft.trim();
		if (!title) return;
		addTodo({ title });
		draft = '';
	}

	
	function onSubToggle(todoId: string, subtaskId: string) {
		const item = $tracker.todos.find(t => t.id === todoId);
		const sub = item?.subtasks?.find(s => s.id === subtaskId);
		const wasDone = sub?.done;
		
		const parentCompleted = toggleTodoSubtask(todoId, subtaskId);
		
		if (wasDone) {
			uiPop();
		} else {
			uiSuccess();
			if (parentCompleted) celebration.set(Date.now().toString());
		}
	}

	function handleSubtaskSubmit(todoId: string) {
		if (!subtaskDraft.trim()) return;
		addTodoSubtask(todoId, subtaskDraft);
		subtaskDraft = '';
	}

	function onToggle(id: string) {
		const item = $tracker.todos.find(t => t.id === id);
		const wasDone = item?.done;
		toggleTodo(id);
		if (wasDone) uiPop(); else uiSuccess();
		if (!wasDone && item && item.sub && item.ch) {
			const chName = CHAPTERS[item.sub]?.[item.ch - 1];
			if (chName) boostChapterFromPractice(`${item.sub}-${chName}`);
			celebration.set('Sent to Active Recall Hub!');
		}
	}

	/* checklist -------------------------------------------------------- */
	let clSub = SYLLABUS[0]?.code ?? 'P';

	$: grids = $tracker.chapterGrids;
	$: clGrid = grids?.[clSub];
	$: clCols = clGrid?.cols ?? CHECKLIST_DEFAULT_COLS;
	$: clChapters = allChapters(clSub);

	const checklistPct = (subCode: string, source: typeof grids) => {
		const chapters = allChapters(subCode);
		const grid = source?.[subCode];
		const cols = grid?.cols ?? CHECKLIST_DEFAULT_COLS;
		const total = chapters.length * cols.length;
		if (!total) return 0;
		let done = 0;
		for (const ch of chapters) for (let i = 0; i < cols.length; i += 1) if (grid?.data[ch.no]?.[i] === '✓') done += 1;
		return Math.round((done / total) * 100);
	};

	function addColumn() {
		const name = prompt('Column name', '');
		if (name) addChecklistColumn(clSub, name);
	}

	function removeColumn(i: number) {
		if (clGrid && confirm(`Remove column "${clGrid.cols[i]}"? Its checkmarks will be deleted.`)) removeChecklistColumn(clSub, i);
	}

	/* btest ---------------------------------------------------------- */
	let fileName = '';
	let busy = false;
	let error = '';
	let matches: ChapterMatch[] = [];
	let selected = new Set<string>();
	let scanned = false;

	const key = (m: ChapterMatch) => `${m.code}:${m.no}`;

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = true; error = ''; matches = []; scanned = false; fileName = file.name;
		try {
			const text = await extractPdfText(file);
			const found = await matchChaptersAI(text);
			matches = found;
			selected = new Set(found.map(key));
			scanned = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not read that PDF.';
		} finally {
			busy = false;
		}
	}

	function toggleMatch(m: ChapterMatch) {
		const k = key(m);
		if (selected.has(k)) selected.delete(k); else selected.add(k);
		selected = new Set(selected);
	}

	function addSelected() {
		const chosen = matches.filter((m) => selected.has(key(m)));
		const added = addTodos(chosen.map((m) => ({ title: `${m.subName}: ${m.name}`, sub: m.code, ch: m.no, source: 'btest' as const })));
		celebration.set(added ? `${added} chapter task${added > 1 ? 's' : ''} added` : 'No new tasks (already added)');
		tab = 'tasks';
		matches = []; selected = new Set(); scanned = false; fileName = '';
	}
</script>

<svelte:head><title>To Do · BTracker</title></svelte:head>

<section class="todo">
	<header>
		<div>
			<h1>To Do</h1>
			<p>{open.length} open · {done.length} done</p>
		</div>
		<div class="tabs" role="tablist">
			<button type="button" role="tab" aria-selected={tab === 'tasks'} class:selected={tab === 'tasks'} on:click={() => tab = 'tasks'}>Tasks</button>
			<button type="button" role="tab" aria-selected={tab === 'checklist'} class:selected={tab === 'checklist'} on:click={() => tab = 'checklist'}>Checklist</button>
			<button type="button" role="tab" aria-selected={tab === 'btest'} class:selected={tab === 'btest'} on:click={() => tab = 'btest'}>btest</button>
		</div>
	</header>

	{#if tab === 'tasks'}
		<form class="add" on:submit|preventDefault={submit}>
			<NavIcon name="plus" size={17} />
			<input type="text" placeholder="Add a task and press Enter…" bind:value={draft} aria-label="New task" />
			<button type="submit" disabled={!draft.trim()}>Add</button>
		</form>
        
        <div style="display: flex; justify-content: flex-end; margin-top: -0.2rem; margin-bottom: 0.2rem;">
            <button type="button" class="btn-triage" class:loading={triaging} on:click={runAiTriage} disabled={triaging || !todos.some(t => !t.done)}>
                <NavIcon name="sparkles" size={13} /> {triaging ? 'Triaging...' : 'AI Smart Triage'}
            </button>
        </div>

		{#if todos.length}
			<ul class="list">
				{#each todos as item (item.id)}
					<li
						class="row"
						class:done={item.done}
						draggable={!item.done}
						on:dragstart={() => (dragId = item.id)}
						on:dragend={() => (dragId = null)}
						on:dragover|preventDefault={() => {}}
						on:drop|preventDefault={() => { if (dragId && dragId !== item.id) reorderTodo(dragId, item.id); dragId = null; }}
					>
						<span class="grip" aria-hidden="true"><NavIcon name="drag" size={15} /></span>
						<button type="button" class="check" class:checked={item.done} aria-label="Toggle task" on:click={() => onToggle(item.id)}>
							{#if item.done}<NavIcon name="check" size={12} />{/if}
						</button>
						{#if item.sub}<span class="dot" style="background: {subjectColor(item.sub)}" title={item.sub}></span>{/if}
						<div class="title-wrap" style="flex: 1; cursor: pointer; display: flex; flex-direction: column;" on:click={() => expandedTodo = expandedTodo === item.id ? null : item.id} on:keydown={(e) => e.key === 'Enter' && (expandedTodo = expandedTodo === item.id ? null : item.id)} tabindex="0" role="button">
							<span class="title">{item.title}</span>
							{#if item.subtasks && item.subtasks.length > 0}
								<div class="sub-progress">
									<div class="bar"><div class="fill" style="width: {(item.subtasks.filter(s => s.done).length / item.subtasks.length) * 100}%"></div></div>
									<span class="pct">{item.subtasks.filter(s => s.done).length}/{item.subtasks.length}</span>
								</div>
							{/if}
						</div>
						{#if item.roiTag}
							<span class="roi-tag {item.roiTag.replace(' ', '-').toLowerCase()}">{item.roiTag}</span>
						{/if}
						{#if item.source === 'btest'}<span class="tag">btest</span>{/if}
						<button type="button" class="expand-btn" on:click={() => expandedTodo = expandedTodo === item.id ? null : item.id}>
							<NavIcon name={expandedTodo === item.id ? 'chevron-down' : 'chevron'} size={14} />
						</button>
						<button type="button" class="del" aria-label="Delete task" on:click={() => deleteTodo(item.id)}><NavIcon name="trash" size={14} /></button>
					</li>
					{#if expandedTodo === item.id}
						<div class="subtasks-container" transition:slide={{ duration: 200 }}>
							{#if item.subtasks}
								{#each item.subtasks as sub (sub.id)}
									<div class="sub-row" class:done={sub.done}>
										<button type="button" class="check" class:checked={sub.done} on:click={() => onSubToggle(item.id, sub.id)}>
											{#if sub.done}<NavIcon name="check" size={10} />{/if}
										</button>
										<span class="sub-title">{sub.title}</span>
										<button type="button" class="del" on:click={() => deleteTodoSubtask(item.id, sub.id)}><NavIcon name="x" size={12} /></button>
									</div>
								{/each}
							{/if}
							<form on:submit|preventDefault={() => handleSubtaskSubmit(item.id)} class="subtask-form">
								<NavIcon name="plus" size={12} />
								<input type="text" bind:value={subtaskDraft} placeholder="Add subtask..." />
							</form>
						</div>
					{/if}
				{/each}
			</ul>
			{#if done.length}
				<button type="button" class="clear" on:click={clearDoneTodos}><NavIcon name="trash" size={13} /> Clear {done.length} completed</button>
			{/if}
		{:else}
			<div class="empty">
				<b>No tasks yet</b>
				<p>Add one above, or use the <button type="button" class="linkish" on:click={() => (tab = 'btest')}>btest</button> tab to turn a syllabus PDF into chapter tasks.</p>
			</div>
		{/if}
	{:else if tab === 'checklist'}
		<div class="checklist">
			<div class="pbars">
				{#each SYLLABUS as sub (sub.code)}
					<div class="pbar">
						<div class="pbar-top">
							<span class="pdot" style="background: {sub.accent}"></span>
							<b>{sub.short}</b>
							<span class="ppct">{checklistPct(sub.code, grids)}%</span>
						</div>
						<div class="pbar-track"><div class="pbar-fill" style="width: {checklistPct(sub.code, grids)}%; background: {sub.accent}"></div></div>
					</div>
				{/each}
			</div>

			<div class="tabs subtabs" role="tablist">
				{#each SYLLABUS as sub (sub.code)}
					<button type="button" role="tab" aria-selected={clSub === sub.code} class:selected={clSub === sub.code} on:click={() => (clSub = sub.code)}>
						<i style="background: {sub.accent}"></i>{sub.name}
					</button>
				{/each}
			</div>

			<div class="tblwrap">
				<table class="sheet">
					<thead>
						<tr>
							<th class="chcol">Chapter</th>
							{#each clCols as col, i (i)}
								<th>{col}<button type="button" class="coldel" aria-label="Remove column {col}" on:click={() => removeColumn(i)}>×</button></th>
							{/each}
							<th class="addcol"><button type="button" class="coladd" aria-label="Add column" on:click={addColumn}>+</button></th>
						</tr>
					</thead>
					<tbody>
						{#each clChapters as ch (ch.no)}
							<tr>
								<td class="chcol">{ch.no}. {ch.name}</td>
								{#each clCols as _, i (i)}
									<td>
										<button
											type="button"
											class="tick"
											class:on={clGrid?.data[ch.no]?.[i] === '✓'}
											aria-label="{clCols[i]} — {ch.name}"
											on:click={() => toggleChecklistCell(clSub, ch.no, i)}
										>✓</button>
									</td>
								{/each}
								<td></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="btest">
			<label class="drop">
				<input type="file" accept="application/pdf,.pdf" hidden on:change={onFile} />
				<NavIcon name="download" size={22} />
				<b>{busy ? 'Reading PDF…' : 'Upload syllabus PDF'}</b>
				<small>We extract chapter names and match them to the Log syllabus modules, then add the matches as tasks.</small>
			</label>

			{#if error}<p class="err">{error}</p>{/if}

			{#if scanned}
				<div class="result-head">
					<b>{matches.length} chapter{matches.length === 1 ? '' : 's'} matched</b>
					{#if matches.length}
						<div class="result-actions">
							<button type="button" class="ghost" on:click={() => { selected = new Set(matches.map(key)); }}>Select all</button>
							<button type="button" class="ghost" on:click={() => { selected = new Set(); }}>None</button>
							<button type="button" class="solid" disabled={!selected.size} on:click={addSelected}>Add {selected.size} as tasks</button>
						</div>
					{/if}
				</div>

				{#if matches.length}
					<ul class="matches">
						{#each matches as m (key(m))}
							<li>
								<label class="match">
									<input type="checkbox" checked={selected.has(key(m))} on:change={() => toggleMatch(m)} />
									<span class="mdot" style="background: {subjectColor(m.code)}"></span>
									<span class="mtext"><b>{m.name}</b><small>{m.subName} · {m.moduleName} · {Math.round(m.score * 100)}% match</small></span>
								</label>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="none">No chapter names in <b>{fileName}</b> matched the syllabus. Try a syllabus/contents page with clear chapter titles.</p>
				{/if}
			{/if}
		</div>
	{/if}
</section>

<style>
	.todo { display: grid; gap: 1.1rem; background: transparent; }
	header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .25rem 0 0; color: var(--text-secondary); font-size: .74rem; font-weight: 650; }
	.tabs { display: inline-flex; gap: .3rem; padding: .28rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: transparent; }
	.tabs button { height: 44px; padding: 0 1.1rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .78rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.tabs button.selected { color: #fff; background: var(--accent); }

	.add { display: flex; align-items: center; gap: .6rem; height: 46px; padding: 0 .5rem 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: color-mix(in srgb, var(--surface-panel), transparent 55%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: var(--text-secondary); }
	.add:focus-within { border-color: var(--accent); background: color-mix(in srgb, var(--surface-panel), transparent 35%); }
	.add input { flex: 1; border: 0; background: transparent; color: var(--text-primary); font-size: .88rem; font-family: inherit; }
	.add input:focus { outline: none; }
	.add button { height: 44px; padding: 0 1.1rem; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font-size: .8rem; font-weight: 750; font-family: inherit; }
	.add button:disabled { opacity: .45; cursor: default; }

	.list { list-style: none; margin: 0; padding: 0; display: grid; gap: .65rem; background: transparent; }
	.row { display: flex; align-items: center; gap: .6rem; padding: .75rem .9rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: transform 0.15s ease, box-shadow 0.15s ease; }
	.row:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
	.row.done { opacity: .55; background: transparent; box-shadow: none; }
	.grip { color: var(--border-subtle); cursor: grab; }
	.check { display: grid; flex: 0 0 20px; place-items: center; width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-radius: 99px; background: transparent; color: #fff; cursor: pointer; }
	.check.checked { border-color: #2f9e6e; background: #2f9e6e; }
	.dot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 99px; }
	.title { flex: 1; min-width: 0; font-size: .86rem; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.row.done .title { color: var(--text-secondary); text-decoration: line-through; }
	.tag { padding: .12rem .5rem; border-radius: 99px; background: var(--accent-soft); color: var(--accent); font-size: .58rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
	.del { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 9px; background: transparent; color: var(--text-secondary); cursor: pointer; }
	.del:hover { color: var(--danger, #e0455a); background: var(--surface-subtle); }
	.clear { justify-self: start; display: inline-flex; align-items: center; gap: .4rem; height: 44px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-secondary); font-size: .76rem; font-weight: 700; cursor: pointer; font-family: inherit; }
	.clear:hover { color: var(--danger, #e0455a); border-color: var(--danger, #e0455a); }

	.empty { display: grid; gap: .35rem; justify-items: center; padding: 2.4rem 1rem; border: 1px dashed var(--border-subtle); border-radius: 16px; text-align: center; }
	.empty b { font-size: .92rem; }
	.empty p { margin: 0; color: var(--text-secondary); font-size: .8rem; max-width: 420px; line-height: 1.55; }
	.linkish { border: 0; background: transparent; color: var(--accent); font-weight: 750; font-size: inherit; cursor: pointer; padding: 0; font-family: inherit; }

	.btest { display: grid; gap: 1rem; }
	.drop { display: grid; gap: .35rem; justify-items: center; padding: 2.2rem 1.2rem; border: 1.6px dashed var(--border-subtle); border-radius: 18px; background: var(--surface-panel); color: var(--accent); text-align: center; cursor: pointer; transition: border-color .15s ease; }
	.drop:hover { border-color: var(--accent); }
	.drop b { color: var(--text-primary); font-size: .95rem; }
	.drop small { color: var(--text-secondary); font-size: .74rem; max-width: 460px; line-height: 1.5; }
	.err { margin: 0; padding: .7rem .9rem; border: 1px solid var(--danger, #e0455a); border-radius: 12px; color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 90%); font-size: .8rem; }

	.result-head { display: flex; align-items: center; justify-content: space-between; gap: .8rem; flex-wrap: wrap; }
	.result-head b { font-size: .9rem; }
	.result-actions { display: flex; gap: .45rem; flex-wrap: wrap; }
	.ghost, .solid { height: 44px; padding: 0 .85rem; border-radius: 10px; font-size: .76rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.ghost { border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); }
	.ghost:hover { color: var(--text-primary); border-color: var(--accent); }
	.solid { border: 0; background: var(--accent); color: #fff; }
	.solid:disabled { opacity: .45; cursor: default; }

	.matches { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; max-height: 52vh; overflow: auto; }
	.match { display: flex; align-items: center; gap: .6rem; padding: .55rem .7rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); cursor: pointer; }
	.match input { width: 17px; height: 17px; accent-color: var(--accent); }
	.mdot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 99px; }
	.mtext { display: grid; min-width: 0; }
	.mtext b { font-size: .82rem; letter-spacing: -.01em; }
	.mtext small { color: var(--text-secondary); font-size: .66rem; }
	.none { margin: 0; color: var(--text-secondary); font-size: .82rem; line-height: 1.55; }

	.checklist { display: grid; gap: 1rem; }
	.pbars { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .6rem; }
	.pbar { display: grid; gap: .4rem; padding: .65rem .8rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-panel); }
	.pbar-top { display: flex; align-items: center; gap: .45rem; font-size: .76rem; }
	.pbar-top b { font-weight: 800; letter-spacing: -.01em; }
	.pdot { width: 8px; height: 8px; border-radius: 3px; }
	.ppct { margin-left: auto; color: var(--text-secondary); font-weight: 750; font-variant-numeric: tabular-nums; }
	.pbar-track { height: 7px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.pbar-fill { height: 100%; border-radius: inherit; transition: width .3s ease; }

	.subtabs button { display: inline-flex; align-items: center; gap: .45rem; }
	.subtabs i { width: 8px; height: 8px; border-radius: 3px; display: inline-block; }

	.tblwrap { max-height: 62vh; overflow: auto; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); }
	.sheet { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .8rem; }
	.sheet th, .sheet td { padding: .5rem .65rem; border-bottom: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); text-align: center; white-space: nowrap; }
	.sheet th:last-child, .sheet td:last-child { border-right: 0; }
	.sheet tbody tr:last-child td { border-bottom: 0; }
	.sheet thead th { position: sticky; top: 0; z-index: 1; background: var(--surface-panel); font-size: .72rem; font-weight: 800; letter-spacing: .02em; color: var(--text-secondary); text-transform: uppercase; }
	.chcol { position: sticky; left: 0; z-index: 2; background: var(--surface-panel); text-align: left !important; min-width: 210px; font-weight: 600; color: var(--text-primary); box-shadow: 1px 0 0 var(--border-subtle); }
	thead .chcol { z-index: 3; text-transform: none !important; font-size: .78rem !important; color: var(--text-primary) !important; }
	.coldel { margin-left: .4rem; padding: 0 .25rem; border: 0; background: transparent; color: var(--text-secondary); font-size: .85rem; line-height: 1; cursor: pointer; border-radius: 6px; }
	.coldel:hover { color: var(--danger, #e0455a); background: var(--surface-subtle); }
	.addcol { width: 44px; }
	.coladd { width: 26px; height: 26px; border: 1px dashed var(--border-subtle); border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 1rem; line-height: 1; cursor: pointer; }
	.coladd:hover { color: var(--accent); border-color: var(--accent); }
	.tick { display: inline-grid; place-items: center; width: 24px; height: 24px; border: 2px solid var(--border-subtle); border-radius: 8px; background: transparent; color: transparent; font-size: .8rem; cursor: pointer; transition: all .12s ease; }
	.tick:hover { border-color: var(--accent); }
	.tick.on { border-color: #2f9e6e; background: #2f9e6e; color: #fff; }

	@media (max-width: 760px) {
		.tblwrap { max-height: none; overflow-x: auto; -webkit-overflow-scrolling: touch; }
		.chcol { position: sticky; left: 0; min-width: 140px; }
	}

	.sub-progress { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
	.sub-progress .bar { flex: 1; height: 3px; background: var(--surface-subtle); border-radius: 4px; overflow: hidden; }
	.sub-progress .fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
	.sub-progress .pct { font-size: 0.65rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
	.expand-btn { background: none; border: none; padding: 4px; color: var(--text-secondary); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
	.expand-btn:hover { background: var(--surface-subtle); color: var(--text-primary); }
	
	.subtasks-container { padding: 8px 12px 8px 48px; background: var(--surface-panel); border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 6px; }
	.sub-row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
	.sub-row .check { width: 16px; height: 16px; border: 1.5px solid var(--text-secondary); border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--surface-panel); padding: 0; flex-shrink: 0; }
	.sub-row .check.checked { background: var(--accent); border-color: var(--accent); }
	.sub-row .sub-title { font-size: 0.85rem; color: var(--text-primary); flex: 1; }
	.sub-row.done .sub-title { color: var(--text-secondary); text-decoration: line-through; }
	.sub-row .del { opacity: 0; background: none; border: none; color: var(--danger); cursor: pointer; padding: 2px; }
	.sub-row:hover .del { opacity: 1; }
	
	.subtask-form { display: flex; align-items: center; gap: 12px; margin-top: 4px; padding: 4px 0; color: var(--text-secondary); }
	.subtask-form input { background: none; border: none; font-size: 0.85rem; color: var(--text-primary); outline: none; flex: 1; }
	.subtask-form input::placeholder { color: var(--text-secondary); }


.btn-triage { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.8rem; border-radius: 99px; background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); font-size: 0.76rem; font-weight: 750; border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); cursor: pointer; transition: all 0.2s; }
	.btn-triage:hover:not(:disabled) { background: var(--accent); color: white; }
	.btn-triage.loading { opacity: 0.6; pointer-events: none; }
	.roi-tag { font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 6px; letter-spacing: 0.02em; text-transform: uppercase; margin-right: 0.3rem; }
	.roi-tag.high-roi { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); border: 1px solid color-mix(in srgb, var(--success) 40%, transparent); }
	.roi-tag.time-trap { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); border: 1px solid color-mix(in srgb, var(--warning) 40%, transparent); }
	.roi-tag.core { background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
	.roi-tag.normal { display: none; }

</style>
