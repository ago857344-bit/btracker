<script lang="ts">
	import { onMount } from 'svelte';
	import { isMobileDevice } from '$lib/state/themes';
	import { uiSuccess, uiPop } from '$lib/utils/feedback';
	import { boostChapterFromPractice } from '$lib/stores/recall-actions';
	import { fade, slide } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { subjectColor, CHAPTERS } from '$lib/state/subjects';
	import { allChapters, allChaptersWithCustom, SYLLABUS } from '$lib/state/syllabus';
	import { extractPdfText, extractImageText, matchChapters, matchChaptersAI, type ChapterMatch } from '$lib/services/btest';
import { triageTodos } from '$lib/services/aiTriage';
import { buildAcademicConstraintPrompt } from '$lib/services/aiContext';
	import {
		addChecklistColumn, addTodo, addTodos, celebration, CHECKLIST_DEFAULT_COLS, clearDoneTodos, deleteTodo,
		removeChecklistColumn, reorderTodo, toggleChecklistCell, toggleChapterStarted, toggleTodo, tracker, updateTracker, addTodoSubtask, toggleTodoSubtask, deleteTodoSubtask, addTodoSubsteps, transferTodosToPlanner
	} from '$lib/stores/tracker';

	let isDesktop = false;
	let clViewMode: 'cards' | 'table' = 'cards';
	let clSearch = '';

	onMount(() => {
		isDesktop = !isMobileDevice();
		clViewMode = window.innerWidth <= 768 ? 'cards' : 'table';
		const onResize = () => { isDesktop = !isMobileDevice(); };
		window.addEventListener('resize', onResize, { passive: true });
		return () => window.removeEventListener('resize', onResize);
	});

	let tab: 'tasks' | 'checklist' | 'btest' = 'tasks';
	let draft = '';
	let dragId: string | null = null;
	let expandedTodo: string | null = null;
	let subtaskDraft = '';
let triaging = false;

async function runAiTriage() {
    const openTodos = ($tracker.todos || []).filter(t => !t.done);
    if (!openTodos.length) return;
    
    triaging = true;
    try {
        const constraint = buildAcademicConstraintPrompt($tracker);
        const result = await triageTodos(openTodos, $tracker.gamification?.elo || { P: 1200, C: 1200, M: 1200 }, constraint);
        
        updateTracker(s => {
            s.todos = s.todos.map(t => {
                if (result[t.id]) {
                    return { ...t, roiTag: result[t.id], updated: Date.now() };
                }
                return t;
            });
        });
        uiSuccess();
    } catch (e) {
        console.error(e);
        uiPop();
    } finally {
        triaging = false;
    }
}

	let taskFilter: 'all' | 'open' | 'done' = 'all';

	$: todos = $tracker.todos;
	$: open = todos.filter((t) => !t.done);
	$: done = todos.filter((t) => t.done);
	$: displayedTodos = taskFilter === 'open' ? open : taskFilter === 'done' ? done : todos;
	$: percentDone = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0;

	function submit() {
		const title = draft.trim();
		if (!title) return;
		addTodo({ title });
		draft = '';
		if (taskFilter === 'done') taskFilter = 'all';
	}

	
	function onSubToggle(todoId: string, subtaskId: string) {
		const item = ($tracker.todos || []).find(t => t.id === todoId);
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
		const item = ($tracker.todos || []).find(t => t.id === id);
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
	let clFilter: 'all' | 'started' | 'done' | 'unstarted' = 'all';

	$: grids = $tracker.chapterGrids;
	$: clGrid = grids?.[clSub];
	$: clCols = clGrid?.cols ?? CHECKLIST_DEFAULT_COLS;
	$: clChapters = allChaptersWithCustom($tracker, clSub);

	$: isChStarted = (chNo: number) => {
		const hasManualStart = Boolean(clGrid?.started?.[chNo]);
		const hasCheckedCell = Boolean(clGrid?.data[chNo]?.some((v: string) => v === '✓'));
		return hasManualStart || hasCheckedCell;
	};

	$: isChDone = (chNo: number) => {
		if (!clCols.length) return false;
		return clCols.every((_, i) => clGrid?.data[chNo]?.[i] === '✓');
	};

	$: ongoingCount = clChapters.filter((ch) => isChStarted(ch.no) && !isChDone(ch.no)).length;
	$: doneCount = clChapters.filter((ch) => isChDone(ch.no)).length;
	$: unstartedCount = clChapters.filter((ch) => !isChStarted(ch.no)).length;

	function chCompletedSteps(chNo: number, colsCount: number, grid: any) {
		let count = 0;
		for (let i = 0; i < colsCount; i++) {
			if (grid?.data?.[chNo]?.[i] === '✓') count++;
		}
		return count;
	}

	$: displayedChapters = clChapters.filter((ch) => {
		const started = isChStarted(ch.no);
		const done = isChDone(ch.no);
		if (clFilter === 'started' && (!started || done)) return false;
		if (clFilter === 'done' && !done) return false;
		if (clFilter === 'unstarted' && started) return false;
		if (clSearch.trim()) {
			const q = clSearch.trim().toLowerCase();
			return ch.name.toLowerCase().includes(q) || String(ch.no).includes(q);
		}
		return true;
	});

	const checklistPct = (subCode: string, source: typeof grids) => {
		const chapters = allChaptersWithCustom($tracker, subCode);
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
	let integrateSubsteps = true;

	const key = (m: ChapterMatch) => `${m.code}:${m.no}`;

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = true; error = ''; matches = []; scanned = false; fileName = file.name;
		try {
			const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
			const text = isImage ? await extractImageText(file) : await extractPdfText(file);
			const found = await matchChaptersAI(text);
			matches = found;
			selected = new Set(found.map(key));
			scanned = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not read that file.';
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
		if (integrateSubsteps && added > 0) {
			addTodoSubsteps('btest', ['Ex 1', 'Ex 2']);
		}
		celebration.set(added ? `${added} chapter task${added > 1 ? 's' : ''} added${integrateSubsteps ? ' with Ex 1 & Ex 2 substeps' : ''}` : 'No new tasks (already added)');
		tab = 'tasks';
		taskFilter = 'all';
		matches = []; selected = new Set(); scanned = false; fileName = '';
	}
</script>

<svelte:head><title>To Do · BTracker</title></svelte:head>

<section class="todo">
	<header>
		<div>
			<h1>To Do</h1>
			<p>{open.length} open · {done.length} done{#if todos.length > 0} · <b class="num-val">{percentDone}%</b> done{/if}</p>
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

		{#if todos.length > 0}
			<div class="todo-progress-card glass" in:fade={{ duration: 180 }}>
				<div class="progress-info-row">
					<div class="progress-label-wrap">
						<span class="progress-title">
							<NavIcon name="check" size={13} />
							<span>Completion</span>
						</span>
						<span class="progress-stat-pill">
							<b>{done.length}</b> of <b>{todos.length}</b> tasks done
						</span>
					</div>
					<div class="progress-pct-badge" class:complete={percentDone === 100}>
						<span class="pct-num num-val">{percentDone}%</span>
					</div>
				</div>

				<div class="progress-track" role="progressbar" aria-valuenow={percentDone} aria-valuemin="0" aria-valuemax="100" aria-label="Task completion percentage">
					<div
						class="progress-fill"
						class:complete={percentDone === 100}
						style="width: {percentDone}%"
					></div>
				</div>

				<div class="progress-footer-row">
					<span class="progress-note">
						{#if percentDone === 100}
							🎉 All tasks completed! Outstanding focus.
						{:else if percentDone >= 75}
							🔥 Almost done! Only {open.length} task{open.length === 1 ? '' : 's'} remaining.
						{:else if percentDone >= 50}
							⚡ Halfway there! Great momentum.
						{:else if percentDone > 0}
							🎯 In progress — {open.length} task{open.length === 1 ? '' : 's'} remaining.
						{:else}
							Ready to make progress? Check off your first task!
						{/if}
					</span>
					{#if open.length > 0}
						<span class="remaining-badge">{open.length} remaining</span>
					{/if}
				</div>
			</div>
		{/if}
        
		<div class="task-toolbar">
			<div class="task-filters">
				<button type="button" class="filter-pill" class:active={taskFilter === 'all'} on:click={() => (taskFilter = 'all')}>
					All ({todos.length})
				</button>
				<button type="button" class="filter-pill" class:active={taskFilter === 'open'} on:click={() => (taskFilter = 'open')}>
					Active ({open.length})
				</button>
				<button type="button" class="filter-pill" class:active={taskFilter === 'done'} on:click={() => (taskFilter = 'done')}>
					Completed ({done.length})
				</button>
			</div>
			<div class="toolbar-actions">
				{#if todos.some(t => !t.done && (!t.subtasks || t.subtasks.length === 0))}
					<button
						type="button"
						class="btn-action-tool"
						title="Bulk add standard Ex 1 &amp; Ex 2 substeps to tasks"
						on:click={() => {
							const updated = addTodoSubsteps('btest', ['Ex 1', 'Ex 2']);
							celebration.set(updated > 0 ? `Added Ex 1 & Ex 2 to ${updated} tasks!` : 'Substeps already integrated.');
						}}
					>
						<NavIcon name="plus" size={12} /> + Ex 1 &amp; Ex 2
					</button>
				{/if}
				{#if open.length > 0}
					<button
						type="button"
						class="btn-action-tool"
						title="Transfer active to-dos to daily planner"
						on:click={() => {
							const transferred = transferTodosToPlanner();
							celebration.set(transferred > 0 ? `Sent ${transferred} tasks to Daily Planner! 🚀` : 'All tasks already in planner.');
						}}
					>
						<NavIcon name="plan" size={12} /> Send to Plan
					</button>
				{/if}
				<button type="button" class="btn-triage" class:loading={triaging} on:click={runAiTriage} disabled={triaging || !todos.some(t => !t.done)}>
					<NavIcon name="sparkles" size={13} /> {triaging ? 'Triaging...' : 'AI Smart Triage'}
				</button>
			</div>
        </div>

		{#if todos.length}
			{#if displayedTodos.length}
				<ul class="list">
					{#each displayedTodos as item (item.id)}
					<li
						class="row"
						class:done={item.done}
						draggable={isDesktop && !item.done}
						on:dragstart={(e) => {
							if (!isDesktop || (e.target as HTMLElement)?.closest('button, input, [role="button"]')) {
								e.preventDefault();
								return;
							}
							dragId = item.id;
						}}
						on:dragend={() => (dragId = null)}
						on:dragover|preventDefault={() => {}}
						on:drop|preventDefault={() => { if (dragId && dragId !== item.id) reorderTodo(dragId, item.id); dragId = null; }}
					>
						<span class="grip" aria-hidden="true"><NavIcon name="drag" size={15} /></span>
						<button
							type="button"
							class="check-btn"
							aria-label="Toggle task"
							draggable="false"
							on:click|stopPropagation={() => onToggle(item.id)}
						>
							<span class="check-circle" class:checked={item.done}>
								{#if item.done}<NavIcon name="check" size={12} />{/if}
							</span>
						</button>
						{#if item.sub}<span class="dot" style="background: {subjectColor(item.sub)}" title={item.sub}></span>{/if}
						<div class="title-wrap" on:click={() => expandedTodo = expandedTodo === item.id ? null : item.id} on:keydown={(e) => e.key === 'Enter' && (expandedTodo = expandedTodo === item.id ? null : item.id)} tabindex="0" role="button">
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
						{#if item.source === 'brain-dump'}<span class="tag brain-dump"><NavIcon name="brain" size={10} /> Brain dump</span>{/if}
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
										<button
											type="button"
											class="check-btn sub-check-btn"
											aria-label="Toggle subtask"
											draggable="false"
											on:click|stopPropagation={() => onSubToggle(item.id, sub.id)}
										>
											<span class="check-circle sub" class:checked={sub.done}>
												{#if sub.done}<NavIcon name="check" size={10} />{/if}
											</span>
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
			{:else}
				<div class="empty" style="padding: 1.6rem 1rem;">
					<b>No {taskFilter === 'open' ? 'active' : 'completed'} tasks</b>
					<p>{taskFilter === 'open' ? 'All caught up! Great job.' : 'No tasks marked completed yet.'}</p>
				</div>
			{/if}
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
					<button
						type="button"
						class="pbar"
						class:active={clSub === sub.code}
						on:click={() => (clSub = sub.code)}
						aria-label="Switch to {sub.name}"
					>
						<div class="pbar-top">
							<span class="pdot" style="background: {sub.accent}"></span>
							<b>{sub.short}</b>
							<span class="ppct">{checklistPct(sub.code, grids)}%</span>
						</div>
						<div class="pbar-track"><div class="pbar-fill" style="width: {checklistPct(sub.code, grids)}%; background: {sub.accent}"></div></div>
					</button>
				{/each}
			</div>

			<div class="cl-toolbar">
				<div class="tabs subtabs" role="tablist">
					{#each SYLLABUS as sub (sub.code)}
						<button type="button" role="tab" aria-selected={clSub === sub.code} class:selected={clSub === sub.code} on:click={() => (clSub = sub.code)}>
							<i style="background: {sub.accent}"></i>{sub.name}
						</button>
					{/each}
				</div>

				<div class="cl-actions-row">
					<div class="cl-search-box">
						<NavIcon name="search" size={13} />
						<input
							type="search"
							placeholder="Search chapter..."
							bind:value={clSearch}
							class="cl-search-input"
						/>
						{#if clSearch}
							<button type="button" class="cl-clear-search" on:click={() => (clSearch = '')} aria-label="Clear search">×</button>
						{/if}
					</div>

					<div class="cl-view-toggle" role="group" aria-label="Checklist view mode">
						<button
							type="button"
							class="view-toggle-btn"
							class:active={clViewMode === 'cards'}
							on:click={() => (clViewMode = 'cards')}
							title="Cards view"
						>
							<NavIcon name="grid" size={13} />
							<span>Cards</span>
						</button>
						<button
							type="button"
							class="view-toggle-btn"
							class:active={clViewMode === 'table'}
							on:click={() => (clViewMode = 'table')}
							title="Spreadsheet table view"
						>
							<NavIcon name="list" size={13} />
							<span>Table</span>
						</button>
					</div>
				</div>

				<div class="cl-filter-group">
					<button type="button" class="cl-filter-btn" class:active={clFilter === 'all'} on:click={() => (clFilter = 'all')}>
						All ({clChapters.length})
					</button>
					<button type="button" class="cl-filter-btn ongoing" class:active={clFilter === 'started'} on:click={() => (clFilter = 'started')}>
						<span class="indicator-dot ongoing"></span> Started ({ongoingCount})
					</button>
					<button type="button" class="cl-filter-btn done" class:active={clFilter === 'done'} on:click={() => (clFilter = 'done')}>
						<span class="indicator-dot done"></span> Done ({doneCount})
					</button>
					<button type="button" class="cl-filter-btn" class:active={clFilter === 'unstarted'} on:click={() => (clFilter = 'unstarted')}>
						Unstarted ({unstartedCount})
					</button>
				</div>
			</div>

			{#if clViewMode === 'cards'}
				<div class="ch-cards-list">
					{#if displayedChapters.length === 0}
						<div class="empty" style="padding: 2rem 1rem;">
							<b>No chapters found</b>
							<p>{clSearch ? `No chapters match "${clSearch}"` : 'No chapters in this filter.'}</p>
							{#if clSearch || clFilter !== 'all'}
								<button type="button" class="linkish" on:click={() => { clSearch = ''; clFilter = 'all'; }}>Reset search & filters</button>
							{/if}
						</div>
					{:else}
						{#each displayedChapters as ch (ch.no)}
							{@const started = isChStarted(ch.no)}
							{@const done = isChDone(ch.no)}
							{@const completedCount = chCompletedSteps(ch.no, clCols.length, clGrid)}
							{@const pct = clCols.length ? Math.round((completedCount / clCols.length) * 100) : 0}
							<div
								class="ch-card"
								class:ch-card-ongoing={started && !done}
								class:ch-card-done={done}
							>
								<div class="ch-card-header">
									<button
										type="button"
										class="start-btn"
										class:started={started && !done}
										class:done={done}
										title={done ? "Chapter fully completed!" : started ? "Chapter in progress · Click to toggle" : "Mark as started (lectures/study began)"}
										on:click={() => { uiPop(); toggleChapterStarted(clSub, ch.no); }}
									>
										{#if done}
											<NavIcon name="check" size={13} />
										{:else if started}
											<span class="ongoing-dot"></span>
										{:else}
											<span class="idle-ring"></span>
										{/if}
									</button>

									<div class="ch-card-title-group">
										<span class="ch-card-num">#{ch.no}</span>
										<span class="ch-card-title">{ch.name}</span>
									</div>

									<div class="ch-card-badge-wrap">
										{#if done}
											<span class="status-pill done">Done</span>
										{:else if started}
											<span class="status-pill ongoing">{pct}%</span>
										{/if}
									</div>
								</div>

								{#if clCols.length > 0}
									<div class="ch-card-progress">
										<div class="ch-card-track">
											<div
												class="ch-card-fill"
												style="width: {pct}%; background: {done ? '#2f9e6e' : subjectColor(clSub)}"
											></div>
										</div>
										<span class="ch-card-stepcount">{completedCount}/{clCols.length}</span>
									</div>

									<div class="ch-steps-grid">
										{#each clCols as colName, i (i)}
											{@const isDone = clGrid?.data?.[ch.no]?.[i] === '✓'}
											<button
												type="button"
												class="step-chip"
												class:step-chip-done={isDone}
												on:click={() => toggleChecklistCell(clSub, ch.no, i)}
											>
												<span class="chip-check">{isDone ? '✓' : '○'}</span>
												<span class="chip-label">{colName}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			{:else}
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
							{#each displayedChapters as ch (ch.no)}
								{@const started = isChStarted(ch.no)}
								{@const done = isChDone(ch.no)}
								<tr class:row-ongoing={started && !done} class:row-done={done}>
									<td class="chcol">
										<div class="ch-cell">
											<button
												type="button"
												class="start-btn"
												class:started={started && !done}
												class:done={done}
												title={done ? "Chapter fully completed!" : started ? "Chapter in progress · Click to toggle" : "Mark as started (lectures/study began)"}
												on:click={() => { uiPop(); toggleChapterStarted(clSub, ch.no); }}
											>
												{#if done}
													<NavIcon name="check" size={13} />
												{:else if started}
													<span class="ongoing-dot"></span>
												{:else}
													<span class="idle-ring"></span>
												{/if}
											</button>
											<div class="ch-title-wrap">
												<span class="ch-title-text">{ch.no}. {ch.name}</span>
												{#if done}
													<span class="status-pill done">Done</span>
												{:else if started}
													<span class="status-pill ongoing">Started</span>
												{/if}
											</div>
										</div>
									</td>
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
			{/if}
		</div>
	{:else}
		<div class="btest">
			<label class="drop" class:busy>
				<input type="file" accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" hidden on:change={onFile} disabled={busy} />
				{#if busy}
					<span class="scan-ring"><i></i></span>
					<b>Reading syllabus…</b>
					<small class="scan-status">{fileName ? `"${fileName}"` : ''} — scanning text and matching chapters, this can take ~20s on free models</small>
				{:else}
					<NavIcon name="download" size={22} />
					<b>Upload syllabus PDF or image</b>
					<small>We extract chapter names and match them to the Log syllabus modules, then add the matches as tasks.</small>
				{/if}
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
					<label class="substep-toggle">
						<input type="checkbox" bind:checked={integrateSubsteps} />
						<span>Integrate 2 standard substeps (Ex 1 &amp; Ex 2) in each task</span>
					</label>
				{/if}

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
	.todo {
		display: grid;
		gap: 1.1rem;
		background: transparent;
		touch-action: pan-y;
		-webkit-overflow-scrolling: touch;
	}
	header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .25rem 0 0; color: var(--text-secondary); font-size: .74rem; font-weight: 650; }
	.tabs {
		display: inline-flex;
		gap: 3px;
		padding: 3px;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--surface-subtle), transparent 30%);
		border: 0.5px solid color-mix(in srgb, var(--border-subtle), transparent 50%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
	.tabs button {
		height: 36px;
		padding: 0 1.1rem;
		border: 0;
		border-radius: 9999px;
		background: transparent;
		color: var(--text-secondary);
		font-size: .78rem;
		font-weight: 650;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.22s var(--ease-ios-spring, cubic-bezier(0.32, 0.72, 0, 1));
	}
	.tabs button.selected {
		color: var(--accent-contrast, #fff);
		background: var(--accent);
		box-shadow: 0 2px 10px color-mix(in srgb, var(--accent), transparent 60%), inset 0 1px 0 rgba(255, 255, 255, 0.3);
		font-weight: 750;
	}

	.add {
		display: flex;
		align-items: center;
		gap: .65rem;
		height: 48px;
		padding: 0 .6rem 0 1rem;
		border: 0.5px solid color-mix(in srgb, rgba(255, 255, 255, 0.2), var(--border-subtle) 80%);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-panel), transparent 45%);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08);
		color: var(--text-secondary);
		transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
	}
	.add:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent), transparent 82%);
	}
	.add input { flex: 1; border: 0; background: transparent; color: var(--text-primary); font-size: .88rem; font-family: inherit; }
	.add input:focus { outline: none; }
	.add button {
		height: 36px;
		padding: 0 1.1rem;
		border: 0;
		border-radius: 9999px;
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		font-size: .8rem;
		font-weight: 750;
		font-family: inherit;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent), transparent 60%);
		transition: transform 0.14s var(--ease-ios-press, cubic-bezier(0.2, 0.9, 0.3, 1));
	}
	.add button:active:not(:disabled) { transform: scale(0.93); }
	.add button:disabled { opacity: .45; cursor: default; }

	.todo-progress-card {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.95rem 1.15rem;
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-panel), transparent 45%);
		border: 0.5px solid color-mix(in srgb, rgba(255, 255, 255, 0.18), var(--border-subtle) 80%);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.08);
	}
	.progress-info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.progress-label-wrap {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.progress-title {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}
	.progress-stat-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.18rem 0.55rem;
		border-radius: 9999px;
		background: var(--surface-subtle);
		border: 0.5px solid color-mix(in srgb, var(--border-subtle), transparent 40%);
		font-size: 0.72rem;
		color: var(--text-secondary);
	}
	.progress-stat-pill b {
		color: var(--text-primary);
		font-weight: 800;
	}
	.progress-pct-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--accent) 15%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 850;
		letter-spacing: -0.02em;
	}
	.progress-pct-badge.complete {
		background: color-mix(in srgb, var(--success, #22c55e) 18%, var(--surface-subtle));
		border-color: color-mix(in srgb, var(--success, #22c55e) 35%, transparent);
		color: var(--success, #22c55e);
	}
	.progress-track {
		width: 100%;
		height: 8px;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--surface-subtle) 90%, transparent);
		overflow: hidden;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
	}
	.progress-fill {
		height: 100%;
		border-radius: 9999px;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #60a5fa));
		box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
		transition: width 0.45s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s ease;
	}
	.progress-fill.complete {
		background: linear-gradient(90deg, #10b981, #22c55e);
		box-shadow: 0 0 14px color-mix(in srgb, #22c55e 50%, transparent);
	}
	.progress-footer-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.72rem;
	}
	.progress-note {
		color: var(--text-secondary);
		font-weight: 600;
	}
	.remaining-badge {
		color: var(--text-secondary);
		font-weight: 700;
		font-size: 0.7rem;
		white-space: nowrap;
	}
	.num-val {
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.015em;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: .65rem;
		background: transparent;
		touch-action: pan-y;
	}
	.row {
		display: flex;
		align-items: center;
		gap: .65rem;
		padding: .8rem 1rem;
		border: 0.5px solid color-mix(in srgb, rgba(255, 255, 255, 0.16), var(--border-subtle) 84%);
		border-radius: 16px;
		background: var(--surface-panel);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 0.5px 0 rgba(255, 255, 255, 0.12);
		transition: transform 0.18s var(--ease-ios-press, cubic-bezier(0.2, 0.9, 0.3, 1)), box-shadow 0.18s ease;
		touch-action: pan-y;
		-webkit-user-select: none;
		user-select: none;
	}
	.title-wrap {
		flex: 1;
		min-width: 0;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		touch-action: pan-y;
	}
	.row:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
	.row.done { opacity: .55; background: transparent; box-shadow: none; }
	.grip { color: var(--border-subtle); cursor: grab; padding: 0 .2rem; }
	.check-btn {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		min-width: 38px;
		margin: -9px 0 -9px -6px;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		border-radius: 99px;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.check-circle {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border: 1.5px solid color-mix(in srgb, var(--text-secondary), transparent 40%);
		border-radius: 9999px;
		background: transparent;
		color: var(--accent-contrast, #fff);
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.check-btn:hover .check-circle {
		border-color: var(--accent);
		transform: scale(1.08);
	}
	.check-circle.checked {
		border-color: #2f9e6e;
		background: #2f9e6e;
		box-shadow: 0 2px 8px rgba(47, 158, 110, 0.35);
	}
	.check-circle.sub {
		width: 18px;
		height: 18px;
	}
	.check { display: grid; flex: 0 0 20px; place-items: center; width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-radius: 99px; background: transparent; color: var(--accent-contrast, #fff); cursor: pointer; }
	.check.checked { border-color: #2f9e6e; background: #2f9e6e; }
	.dot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 99px; }
	.title { flex: 1; min-width: 0; font-size: .86rem; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.row.done .title { color: var(--text-secondary); text-decoration: line-through; }
	.tag { padding: .12rem .5rem; border-radius: 99px; background: var(--accent-soft); color: var(--accent); font-size: .58rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
	.tag.brain-dump { display: inline-flex; align-items: center; gap: .25rem; background: color-mix(in srgb, var(--accent), transparent 85%); color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent), transparent 70%); }
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
	.drop.busy { cursor: default; border-color: var(--accent); }
	.drop b { color: var(--text-primary); font-size: .95rem; }
	.drop small { color: var(--text-secondary); font-size: .74rem; max-width: 460px; line-height: 1.5; }

	.scan-ring { position: relative; width: 44px; height: 44px; }
	.scan-ring i { position: absolute; inset: 0; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--accent), transparent 75%); }
	.scan-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; border-top-color: var(--accent); animation: scan-spin .9s linear infinite; }
	.scan-ring::after { content: ''; position: absolute; inset: 8px; border-radius: 50%; border: 2px solid transparent; border-bottom-color: color-mix(in srgb, var(--accent), white 30%); animation: scan-spin 1.4s linear infinite reverse; }
	@keyframes scan-spin { to { transform: rotate(360deg); } }
	.scan-status { animation: scan-pulse 1.8s ease-in-out infinite; }
	@keyframes scan-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
	.err { margin: 0; padding: .7rem .9rem; border: 1px solid var(--danger, #e0455a); border-radius: 12px; color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 90%); font-size: .8rem; }

	.result-head { display: flex; align-items: center; justify-content: space-between; gap: .8rem; flex-wrap: wrap; }
	.result-head b { font-size: .9rem; }
	.substep-toggle { display: inline-flex; align-items: center; gap: .6rem; padding: .55rem .85rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-subtle); color: var(--text-primary); font-size: .8rem; font-weight: 650; cursor: pointer; user-select: none; }
	.substep-toggle input { accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer; }
	.result-actions { display: flex; gap: .45rem; flex-wrap: wrap; }
	.ghost, .solid { height: 44px; padding: 0 .85rem; border-radius: 10px; font-size: .76rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.ghost { border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); }
	.ghost:hover { color: var(--text-primary); border-color: var(--accent); }
	.solid { border: 0; background: var(--accent); color: var(--accent-contrast, #fff); }
	.solid:disabled { opacity: .45; cursor: default; }

	.matches {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: .4rem;
		max-height: 52vh;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		touch-action: pan-y;
	}
	.match { display: flex; align-items: center; gap: .6rem; padding: .55rem .7rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); cursor: pointer; }
	.match input { width: 17px; height: 17px; accent-color: var(--accent); }
	.mdot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 99px; }
	.mtext { display: grid; min-width: 0; }
	.mtext b { font-size: .82rem; letter-spacing: -.01em; }
	.mtext small { color: var(--text-secondary); font-size: .66rem; }
	.none { margin: 0; color: var(--text-secondary); font-size: .82rem; line-height: 1.55; }

	.checklist { display: grid; gap: 1rem; }
	.pbars { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .6rem; }
	.pbar {
		display: grid;
		gap: .4rem;
		padding: .65rem .8rem;
		border: 1px solid var(--border-subtle);
		border-radius: 13px;
		background: var(--surface-panel);
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
		transition: all .15s ease;
	}
	.pbar:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.pbar.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-panel));
		box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.pbar-top { display: flex; align-items: center; gap: .45rem; font-size: .76rem; }
	.pbar-top b { font-weight: 800; letter-spacing: -.01em; }
	.pdot { width: 8px; height: 8px; border-radius: 3px; }
	.ppct { margin-left: auto; color: var(--text-secondary); font-weight: 750; font-variant-numeric: tabular-nums; }
	.pbar-track { height: 7px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.pbar-fill { height: 100%; border-radius: inherit; transition: width .3s ease; }

	.cl-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: .75rem;
	}
	.cl-actions-row {
		display: flex;
		align-items: center;
		gap: .6rem;
		flex-wrap: wrap;
	}
	.cl-search-box {
		display: inline-flex;
		align-items: center;
		gap: .4rem;
		padding: .26rem .65rem;
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		background: var(--surface-panel);
		color: var(--text-secondary);
		transition: border-color .15s ease;
	}
	.cl-search-box:focus-within {
		border-color: var(--accent);
		color: var(--accent);
	}
	.cl-search-input {
		border: none;
		outline: none;
		background: transparent;
		font-size: .75rem;
		color: var(--text-primary);
		width: 120px;
		font-family: inherit;
	}
	.cl-search-input::placeholder {
		color: var(--text-secondary);
		opacity: .7;
	}
	.cl-clear-search {
		background: none;
		border: none;
		padding: 0;
		color: var(--text-secondary);
		font-size: .85rem;
		cursor: pointer;
		line-height: 1;
	}
	.cl-clear-search:hover {
		color: var(--text-primary);
	}
	.cl-view-toggle {
		display: inline-flex;
		align-items: center;
		padding: 2px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		gap: 2px;
	}
	.view-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: .3rem;
		padding: .24rem .55rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--text-secondary);
		font-size: .7rem;
		font-weight: 750;
		cursor: pointer;
		font-family: inherit;
		transition: all .15s ease;
	}
	.view-toggle-btn:hover {
		color: var(--text-primary);
	}
	.view-toggle-btn.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
	}

	/* Chapter Cards List (Mobile-first view) */
	.ch-cards-list {
		display: grid;
		gap: .65rem;
	}
	.ch-card {
		display: flex;
		flex-direction: column;
		gap: .6rem;
		padding: .75rem .85rem;
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		background: var(--surface-panel);
		transition: border-color .15s ease, background-color .15s ease, transform .12s ease;
	}
	.ch-card-ongoing {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--border-subtle));
		background: color-mix(in srgb, var(--accent) 3.5%, var(--surface-panel));
	}
	.ch-card-done {
		border-color: color-mix(in srgb, #2f9e6e 40%, var(--border-subtle));
		background: color-mix(in srgb, #2f9e6e 3.5%, var(--surface-panel));
	}
	.ch-card-header {
		display: flex;
		align-items: center;
		gap: .6rem;
	}
	.ch-card-title-group {
		display: flex;
		align-items: baseline;
		gap: .4rem;
		flex: 1;
		min-width: 0;
	}
	.ch-card-num {
		font-size: .75rem;
		font-weight: 800;
		color: var(--text-secondary);
		opacity: .8;
		flex-shrink: 0;
	}
	.ch-card-title {
		font-size: .84rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.3;
		word-break: break-word;
	}
	.ch-card-badge-wrap {
		flex-shrink: 0;
	}
	.ch-card-progress {
		display: flex;
		align-items: center;
		gap: .6rem;
	}
	.ch-card-track {
		flex: 1;
		height: 5px;
		border-radius: 99px;
		background: var(--surface-subtle);
		overflow: hidden;
	}
	.ch-card-fill {
		height: 100%;
		border-radius: inherit;
		transition: width .25s ease;
	}
	.ch-card-stepcount {
		font-size: .68rem;
		font-weight: 750;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}
	.ch-steps-grid {
		display: flex;
		flex-wrap: wrap;
		gap: .35rem;
	}
	.step-chip {
		display: inline-flex;
		align-items: center;
		gap: .35rem;
		padding: .35rem .65rem;
		min-height: 32px;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: .74rem;
		font-weight: 650;
		cursor: pointer;
		font-family: inherit;
		transition: all .12s ease;
		touch-action: manipulation;
		user-select: none;
	}
	.step-chip:hover {
		border-color: var(--accent);
		color: var(--text-primary);
	}
	.step-chip-done {
		border-color: #2f9e6e;
		background: color-mix(in srgb, #2f9e6e 15%, var(--surface-panel));
		color: #2f9e6e;
		font-weight: 750;
	}
	.chip-check {
		font-size: .75rem;
		line-height: 1;
		font-weight: 800;
	}
	.chip-label {
		line-height: 1;
	}
	.cl-filter-group {
		display: flex;
		align-items: center;
		gap: .35rem;
		flex-wrap: wrap;
	}
	.cl-filter-btn {
		display: inline-flex;
		align-items: center;
		gap: .35rem;
		padding: .28rem .65rem;
		font-size: .72rem;
		font-weight: 700;
		color: var(--text-secondary);
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		cursor: pointer;
		transition: all .15s ease;
	}
	.cl-filter-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}
	.cl-filter-btn.active {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		border-color: var(--accent);
	}
	.indicator-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		display: inline-block;
	}
	.indicator-dot.ongoing { background: var(--accent); }
	.indicator-dot.done { background: #2f9e6e; }
	.cl-filter-btn.active .indicator-dot { background: var(--accent-contrast, #fff); }

	.ch-cell {
		display: flex;
		align-items: center;
		gap: .65rem;
	}
	.start-btn {
		display: inline-grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 1.5px solid var(--border-subtle);
		border-radius: 7px;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		flex-shrink: 0;
		transition: all .14s ease;
		padding: 0;
	}
	.start-btn:hover {
		border-color: var(--accent);
		transform: scale(1.08);
	}
	.start-btn.started {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		border-color: var(--accent);
		color: var(--accent);
		box-shadow: 0 0 8px -2px color-mix(in srgb, var(--accent) 40%, transparent);
	}
	.start-btn.done {
		background: #2f9e6e;
		border-color: #2f9e6e;
		color: #fff;
	}
	.idle-ring {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		opacity: .55;
	}
	.ongoing-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 6px var(--accent);
	}
	.ch-title-wrap {
		display: inline-flex;
		align-items: center;
		gap: .45rem;
		min-width: 0;
		flex: 1;
	}
	.ch-title-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.status-pill {
		font-size: .62rem;
		font-weight: 750;
		padding: .08rem .4rem;
		border-radius: 4px;
		letter-spacing: .03em;
		text-transform: uppercase;
		flex-shrink: 0;
	}
	.status-pill.ongoing {
		background: color-mix(in srgb, var(--accent) 16%, transparent);
		color: var(--accent);
	}
	.status-pill.done {
		background: color-mix(in srgb, #2f9e6e 16%, transparent);
		color: #2f9e6e;
	}
	.row-ongoing td {
		background: color-mix(in srgb, var(--accent) 4%, var(--surface-panel));
	}
	.row-done td {
		background: color-mix(in srgb, #2f9e6e 4%, var(--surface-panel));
	}

	.subtabs button { display: inline-flex; align-items: center; gap: .45rem; }
	.subtabs i { width: 8px; height: 8px; border-radius: 3px; display: inline-block; }

	.tblwrap { max-height: 62vh; overflow: auto; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); }
	.sheet { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .8rem; }
	.sheet th, .sheet td { padding: .5rem .65rem; border-bottom: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); text-align: center; white-space: nowrap; }
	.sheet th:last-child, .sheet td:last-child { border-right: 0; }
	.sheet tbody tr:last-child td { border-bottom: 0; }
	.sheet thead th { position: sticky; top: 0; z-index: 1; background: var(--surface-panel); font-size: .72rem; font-weight: 800; letter-spacing: .02em; color: var(--text-secondary); text-transform: uppercase; }
	.chcol { text-align: left !important; min-width: 220px; font-weight: 600; color: var(--text-primary); }
	thead .chcol { text-transform: none !important; font-size: .78rem !important; color: var(--text-primary) !important; }
	.coldel { margin-left: .4rem; padding: 0 .25rem; border: 0; background: transparent; color: var(--text-secondary); font-size: .85rem; line-height: 1; cursor: pointer; border-radius: 6px; }
	.coldel:hover { color: var(--danger, #e0455a); background: var(--surface-subtle); }
	.addcol { width: 44px; }
	.coladd { width: 26px; height: 26px; border: 1px dashed var(--border-subtle); border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 1rem; line-height: 1; cursor: pointer; }
	.coladd:hover { color: var(--accent); border-color: var(--accent); }
	.tick { display: inline-grid; place-items: center; width: 24px; height: 24px; border: 2px solid var(--border-subtle); border-radius: 8px; background: transparent; color: transparent; font-size: .8rem; cursor: pointer; transition: all .12s ease; }
	.tick:hover { border-color: var(--accent); }
	.tick.on { border-color: #2f9e6e; background: #2f9e6e; color: #fff; }

	@media (max-width: 768px) {
		.todo { padding-bottom: 3.5rem; }
		.grip { display: none !important; }
		.tabs { width: 100%; display: flex; }
		.tabs button { flex: 1; padding: 0 0.5rem; text-align: center; }
		.task-toolbar { flex-direction: column; align-items: stretch; gap: 0.5rem; }
		.toolbar-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 0.35rem; }
		.toolbar-actions > * { flex: 1 1 auto; justify-content: center; }
		.btn-triage { width: 100%; justify-content: center; }
		.row { padding: 0.75rem 0.75rem; gap: 0.5rem; }
		.subtasks-container { padding: 8px 10px 8px 24px; touch-action: pan-y; }
		.pbars {
			grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
			gap: .4rem !important;
		}
		.pbar {
			padding: .5rem .55rem !important;
			border-radius: 10px !important;
		}
		.pbar-top {
			font-size: .7rem !important;
			gap: .3rem !important;
		}
		.cl-toolbar {
			gap: .5rem !important;
		}
		.cl-actions-row {
			width: 100% !important;
			display: flex !important;
			justify-content: space-between !important;
			gap: .4rem !important;
		}
		.cl-search-box {
			flex: 1 !important;
		}
		.cl-search-input {
			width: 100% !important;
		}
		.cl-filter-group {
			width: 100% !important;
			overflow-x: auto !important;
			flex-wrap: nowrap !important;
			-webkit-overflow-scrolling: touch !important;
			padding-bottom: 2px !important;
		}
		.cl-filter-btn {
			flex-shrink: 0 !important;
		}
		.step-chip {
			min-height: 36px !important;
			padding: .4rem .7rem !important;
			font-size: .78rem !important;
		}
		.tblwrap {
			max-height: none;
			overflow-x: auto;
			overflow-y: visible;
			-webkit-overflow-scrolling: touch;
			touch-action: pan-x pan-y;
		}
		.chcol { min-width: 180px; }
	}

	.sub-progress { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
	.sub-progress .bar { flex: 1; height: 3px; background: var(--surface-subtle); border-radius: 4px; overflow: hidden; }
	.sub-progress .fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
	.sub-progress .pct { font-size: 0.65rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
	.expand-btn { background: none; border: none; padding: 4px; color: var(--text-secondary); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
	.expand-btn:hover { background: var(--surface-subtle); color: var(--text-primary); }
	
	.subtasks-container { padding: 8px 12px 8px 48px; background: var(--surface-panel); border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 6px; }
	.sub-row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
	.sub-row .sub-title { font-size: 0.85rem; color: var(--text-primary); flex: 1; }
	.sub-row.done .sub-title { color: var(--text-secondary); text-decoration: line-through; }
	.sub-row .del { opacity: 0; background: none; border: none; color: var(--danger); cursor: pointer; padding: 2px; }
	.sub-row:hover .del { opacity: 1; }
	
	.subtask-form { display: flex; align-items: center; gap: 12px; margin-top: 4px; padding: 4px 0; color: var(--text-secondary); }
	.subtask-form input { background: none; border: none; font-size: 0.85rem; color: var(--text-primary); outline: none; flex: 1; }
	.subtask-form input::placeholder { color: var(--text-secondary); }


.btn-triage { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.8rem; border-radius: 99px; background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); font-size: 0.76rem; font-weight: 750; border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); cursor: pointer; transition: all 0.2s; }
	.btn-triage:hover:not(:disabled) { background: var(--accent); color: var(--accent-contrast, white); }
	.btn-triage.loading { opacity: 0.6; pointer-events: none; }
	.roi-tag { font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 6px; letter-spacing: 0.02em; text-transform: uppercase; margin-right: 0.3rem; }
	.roi-tag.high-roi { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); border: 1px solid color-mix(in srgb, var(--success) 40%, transparent); }
	.roi-tag.time-trap { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); border: 1px solid color-mix(in srgb, var(--warning) 40%, transparent); }
	.roi-tag.core { background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
	.roi-tag.normal { display: none; }

	.task-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: .5rem;
		margin-top: -0.2rem;
		margin-bottom: 0.35rem;
	}
	.task-filters {
		display: flex;
		align-items: center;
		gap: .35rem;
		flex-wrap: wrap;
	}
	.filter-pill {
		display: inline-flex;
		align-items: center;
		padding: .26rem .65rem;
		font-size: .72rem;
		font-weight: 700;
		color: var(--text-secondary);
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		cursor: pointer;
		transition: all .15s ease;
	}
	.filter-pill:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}
	.filter-pill.active {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		border-color: var(--accent);
	}

	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: .4rem;
		flex-wrap: wrap;
	}
	.btn-action-tool {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
		color: var(--text-primary);
		font-size: 0.72rem;
		font-weight: 700;
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-action-tool:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

</style>
