<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import PlannerGuide from '$lib/components/plan/PlannerGuide.svelte';
	import TaskForm from '$lib/components/plan/TaskForm.svelte';
	import TaskDetail from '$lib/components/plan/TaskDetail.svelte';
	import ReflectionJournal from '$lib/components/plan/ReflectionJournal.svelte';
	import GoalsTracker from '$lib/components/plan/GoalsTracker.svelte';
	import { applyRoutine, celebration, moveTaskToDay, reorderDayTasks, saveRoutine, toggleTask, tracker } from '$lib/stores/tracker';
	import { TASK_COLORS, SUBJECTS, subjectColor, subjectName } from '$lib/state/subjects';
	import { addDaysKey, dayKeyOf, monthLabelOf, parseKey, startOfWeek, todayKey } from '$lib/state/dates';
	import type { HomeworkItem } from '$lib/types/tracker';
	import { getAIPlannerBalance } from '$lib/services/ai';

	let tab: 'planner' | 'goals' = 'planner';
	let view: 'week' | 'month' = 'week';
	let cursor = new Date();
	let selectedDay = todayKey();
	let guideOpen = false;
	let libraryOpen = false;

	let balancerOpen = false;
	let balanceDays = 7;

	let aiBalancing = false;
	let aiError = '';

	async function runAutoBalance() {
		aiBalancing = true;
		aiError = '';
		try {
			const today = todayKey();
			const pendingTasks = ($tracker.h || []).filter(task => !task.done && task.due && task.due <= today);
			if (pendingTasks.length === 0) {
				balancerOpen = false;
				return;
			}
			
			const elo = $tracker.gamification?.elo || { P: 300, C: 300, M: 300 };
			const days = [];
			for (let i = 0; i < balanceDays; i++) {
				days.push(addDaysKey(today, i));
			}

			const taskInput = pendingTasks.map(t => ({ id: t.id, text: (t.text || '') as string, sub: (t.sub || '') as string }));
			const map = await getAIPlannerBalance(taskInput, days, elo);

			tracker.update(t => {
				for (const task of (t.h || [])) {
					if (map[task.id]) {
						task.due = map[task.id];
					}
				}
				return t;
			});
			balancerOpen = false;
		} catch (e: any) {
			aiError = e.message || 'Failed to auto-balance schedule.';
		} finally {
			aiBalancing = false;
		}
	}

	let query = '';
	let subjectFilter = '';
	let detailTask: HomeworkItem | null = null;
	let detailOpen = false;
	let dragId: string | null = null;
	let plannerRoot: HTMLElement;

	const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

	$: today = todayKey();
	$: allTasks = [...$tracker.h, ...$tracker.hd];
	$: tasksOn = (day: string) => allTasks.filter((t) => t.due === day);
	$: weekDays = Array.from({ length: 7 }, (_, i) => dayKeyOf(addDays(startOfWeek(cursor), i)));
	$: monthDays = (() => {
		const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
		const start = startOfWeek(first);
		const days: string[] = [];
		for (let i = 0; i < 42; i++) days.push(dayKeyOf(addDays(start, i)));
		return days;
	})();
	$: dayTasks = tasksOn(selectedDay).filter((t) => {
		const q = query.trim().toLowerCase();
		if (q && !(t.title ?? '').toLowerCase().includes(q)) return false;
		if (subjectFilter && t.s !== subjectFilter) return false;
		return true;
	});
	$: dayDone = dayTasks.filter((t) => t.done).length;
	$: sel = parseKey(selectedDay);
	$: selMonth = sel.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
	$: selWeekday = sel.toLocaleDateString('en-US', { weekday: 'long' });

	function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

	function step(dir: -1 | 1) {
		if (view === 'week') cursor = addDays(cursor, dir * 7);
		else cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
	}
	function goToday() { cursor = new Date(); selectedDay = today; }
	function selectDay(day: string) {
		selectedDay = day;
		cursor = parseKey(day);
		plannerRoot?.querySelector('.day-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	function onToggle(id: string) {
		if (toggleTask(id)) celebration.set('Task Completed!');
	}
	function applyMove(id: string, day: string) { moveTaskToDay(id, day); }
	function reorder(dragId: string, overId: string) { reorderDayTasks(dragId, overId); }

	function openDetail(task: HomeworkItem) { detailTask = task; detailOpen = true; }

	function onSaveRoutine() {
		const name = window.prompt('Enter library routine name:');
		if (name && name.trim()) saveRoutine(name.trim(), selectedDay);
	}

	const fmtTime = (v?: string) => {
		if (!v) return '';
		const [h, m] = v.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
	};
	const isMissed = (t: HomeworkItem) => !t.done && (t.due ?? '') < today;

	onMount(() => {
		if ($page.url.searchParams.get('new') === 'task') {
			tab = 'planner';
			requestAnimationFrame(() => plannerRoot?.querySelector<HTMLInputElement>('.task-form input[type="text"]')?.focus());
		}
	});
</script>

<svelte:head><title>Plan · BTracker</title></svelte:head>

<div class="plan" bind:this={plannerRoot}>
	<div class="tabs" role="tablist">
		<button type="button" role="tab" aria-selected={tab === 'planner'} class:selected={tab === 'planner'} on:click={() => tab = 'planner'}>Daily Planner</button>
		<button type="button" role="tab" aria-selected={tab === 'goals'} class:selected={tab === 'goals'} on:click={() => tab = 'goals'}>Goals Tracker</button>
	</div>

	{#if tab === 'planner'}
		<div class="toolbar">
			<span class="legend"><i class="missed-dot"></i> White = missed task</span>
			<button type="button" class="tool" on:click={goToday}>Today</button>
			<button type="button" class="tool icon" aria-label="Previous" on:click={() => step(-1)}><NavIcon name="chevron" size={14} /></button>
			<button type="button" class="tool icon" aria-label="Next" on:click={() => step(1)}><span class="flip"><NavIcon name="chevron" size={14} /></span></button>
			<b class="cursor-label">{monthLabelOf(cursor)}</b>
			<button type="button" class="tool" on:click={() => balancerOpen = true}><NavIcon name="plan" size={13} /> Auto Balance</button>
			<button type="button" class="tool" on:click={() => guideOpen = true}><NavIcon name="info" size={13} /> Guide</button>
			<div class="view-toggle">
				<button type="button" class:selected={view === 'week'} on:click={() => view = 'week'}>Week</button>
				<button type="button" class:selected={view === 'month'} on:click={() => view = 'month'}>Month</button>
			</div>
		</div>

		{#if view === 'week'}
			<div class="week-strip">
				{#each weekDays as day, i (day)}
					{@const count = tasksOn(day).length}
					<button
						type="button"
						class="day-cell"
						class:today={day === today}
						class:selected={day === selectedDay}
						aria-label="{day}, {count} tasks"
						on:click={() => selectDay(day)}
						on:dragover|preventDefault={() => {}}
						on:drop|preventDefault={() => { if (dragId) { applyMove(dragId, day); dragId = null; } }}
					>
						<small>{WEEKDAYS[i]}</small>
						<span class="num">{parseKey(day).getDate()}</span>
						{#if count}<em class="count">{count}</em>{/if}
						{#if day === selectedDay}<span class="plan-day">Plan this day</span>{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="month-grid">
				{#each WEEKDAYS as w}<small>{w}</small>{/each}
				{#each monthDays as day (day)}
					{@const d = parseKey(day)}
					{@const outside = d.getMonth() !== cursor.getMonth()}
					<button
						type="button"
						class="month-cell"
						class:outside
						class:today={day === today}
						class:selected={day === selectedDay}
						on:click={() => selectDay(day)}
						on:dragover|preventDefault={() => {}}
						on:drop|preventDefault={() => { if (dragId) { applyMove(dragId, day); dragId = null; } }}
					>
						<span class="num">{d.getDate()}</span>
						{#if tasksOn(day).length}<span class="dots">{#each tasksOn(day).slice(0, 4) as t}<i style="background: {TASK_COLORS[(t.col ?? 0) % TASK_COLORS.length]}"></i>{/each}</span>{/if}
					</button>
				{/each}
			</div>
		{/if}

		<div class="planner-grid">
			<section class="day-detail">
				<header>
					<span class="month-badge">{selMonth}</span>
					<div class="day-head">
						<b>{sel.getDate()}</b>
						<small>{selWeekday} · {dayDone}/{dayTasks.length} tasks</small>
					</div>
					<div class="day-actions">
						<button type="button" class="tool" on:click={() => libraryOpen = true}><NavIcon name="library" size={13} /> Library</button>
						<button type="button" class="tool" on:click={onSaveRoutine}><NavIcon name="plus" size={13} /> Save</button>
					</div>
				</header>

				<div class="list-tools">
					<span class="search"><NavIcon name="search" size={14} /><input type="text" placeholder="Search tasks..." bind:value={query} aria-label="Search tasks" /></span>
					<span class="funnel">
						<NavIcon name="funnel" size={13} />
						<select bind:value={subjectFilter} aria-label="Filter by subject">
							<option value="">All Subjects</option>
							{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
						</select>
					</span>
				</div>

				{#if dayTasks.length}
					<ul class="task-list">
						{#each dayTasks as task (task.id)}
							<li
								class="task-row"
								class:done={task.done}
								class:missed={isMissed(task)}
								draggable={!task.done}
								on:dragstart={() => dragId = task.id}
								on:dragend={() => dragId = null}
								on:dragover|preventDefault={() => {}}
								on:drop|preventDefault={() => { if (dragId && dragId !== task.id) { reorder(dragId, task.id); } dragId = null; }}
							>
								<span class="grip" aria-hidden="true"><NavIcon name="drag" size={14} /></span>
								<button type="button" class="circle-check" class:checked={task.done} aria-label="Toggle task" on:click={() => onToggle(task.id)}>
									{#if task.done}<NavIcon name="check" size={12} />{/if}
								</button>
								<span class="color-bar" style="background: {TASK_COLORS[(task.col ?? 0) % TASK_COLORS.length]}"></span>
								<button type="button" class="task-copy" on:click={() => openDetail(task)}>
									<b>{task.title}</b>
									<small>
										{#if task.st}{fmtTime(task.st)}{#if task.en} – {fmtTime(task.en)}{/if} · {/if}
										{#if task.hrs}{task.hrs}h · {/if}
										{#if task.s}<i class="dot" style="background: {subjectColor(task.s)}"></i>{subjectName(task.s)}{/if}
										{#if task.test}<span class="test-tag">Test</span>{/if}
										{#if isMissed(task)}<span class="missed-tag">Missed</span>{/if}
									</small>
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="empty-day">
						<b>Nothing scheduled</b>
						<p>Add a task using the form{dayTasks.length === 0 && tasksOn(selectedDay).length === 0 ? ' on the right' : ''}, or clear your filters.</p>
					</div>
				{/if}

				<ReflectionJournal day={selectedDay} />
			</section>

			<aside class="form-col">
				<TaskForm day={selectedDay} />
				<section class="your-goals">
					<p class="label">Upcoming this week</p>
					{#each weekDays.filter((d) => d !== selectedDay && tasksOn(d).length).slice(0, 4) as day}
						<button type="button" class="mini-day" on:click={() => selectDay(day)}>
							<b>{parseKey(day).toLocaleDateString('en-US', { weekday: 'short' })} {parseKey(day).getDate()}</b>
							<span>{tasksOn(day).length} tasks</span>
							<NavIcon name="arrow-right" size={13} />
						</button>
					{:else}
						<p class="mini-empty">No other days planned this week.</p>
					{/each}
				</section>
			</aside>
		</div>
	{:else}
		<GoalsTracker />
	{/if}
</div>

<PlannerGuide bind:open={guideOpen} />
<TaskDetail bind:open={detailOpen} task={detailTask} />

<Modal bind:open={libraryOpen} title="Task Library" width="480px">
	{#if $tracker.lib.length}
		<ul class="lib-list">
			{#each $tracker.lib as routine (routine.id)}
				<li>
					<div>
						<b>{routine.n}</b>
						<small>{routine.tasks.length} tasks{#if routine.tasks[0]?.s} · starts with {subjectName(routine.tasks[0].s)}{/if}</small>
					</div>
					<button type="button" class="apply" on:click={() => { applyRoutine(routine.id, selectedDay); libraryOpen = false; }}>Apply →</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="lib-empty">No routines saved yet. Plan a day, then hit <b>+ Save</b> to store it here for reuse.</p>
	{/if}
</Modal>

<Modal bind:open={balancerOpen} title="✨ AI Schedule Balancer" width="400px">
	<div style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
		{#if aiBalancing}
			<div class="gemini-loader-container gemini-glow-box">
				<div class="gemini-orb"></div>
				<p class="gemini-shimmer-text">Gemini is balancing your schedule...</p>
			</div>
		{:else}
			<p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0; line-height: 1.5;">
				Gemini will gather your overdue and pending tasks and intelligently distribute them across the upcoming days, prioritizing subjects where your Elo is weakest.
			</p>
			{#if aiError}
				<div style="color: #e0455a; background: color-mix(in srgb, #e0455a 15%, transparent); padding: 0.6rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700;">
					{aiError}
				</div>
			{/if}
			<label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary);">
				Distribute across how many days?
				<input type="number" bind:value={balanceDays} min="1" max="30" style="padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-primary);" />
			</label>
		{/if}
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="text-btn" disabled={aiBalancing} on:click={() => balancerOpen = false} style="padding: 0.6rem 1rem; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-weight: 600;">Cancel</button>
		<button type="button" class="primary-btn" disabled={aiBalancing} on:click={runAutoBalance} style="padding: 0.6rem 1.25rem; background: var(--accent); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;"><NavIcon name="sparkles" size={14} /> Balance Now</button>
	</svelte:fragment>
</Modal>


<style>
	.plan { display: grid; gap: 1.1rem; }
	.tabs { display: inline-flex; gap: .3rem; justify-self: start; padding: .28rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-panel); }
	.tabs button { width: 140px; height: 44px; padding: 0 1rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .78rem; font-weight: 750; letter-spacing: .02em; cursor: pointer; font-family: inherit; }
	.tabs button.selected { color: white; background: var(--accent); box-shadow: 0 6px 14px color-mix(in srgb, var(--accent), transparent 68%); }

	.toolbar { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
	.legend { display: inline-flex; align-items: center; gap: .4rem; color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.missed-dot { width: 9px; height: 9px; border: 1.6px solid var(--text-secondary); border-radius: 99px; background: transparent; }
	.tool { display: inline-flex; align-items: center; gap: .35rem; height: 44px; padding: 0 .75rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); color: var(--text-secondary); font-size: .72rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .16s ease; }
	.tool:hover { color: var(--text-primary); border-color: var(--accent); }
	.tool.icon { width: 34px; justify-content: center; padding: 0; }
	.flip { display: grid; transform: rotate(180deg); }
	.cursor-label { font-size: .86rem; letter-spacing: -.02em; }
	.view-toggle { display: inline-flex; margin-left: auto; padding: .25rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); }
	.view-toggle button { height: 44px; padding: 0 .8rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .7rem; font-weight: 750; cursor: pointer; font-family: inherit; transition: all .16s ease; }
	.view-toggle button.selected { color: var(--accent); background: var(--accent-soft); }

	.week-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: .5rem; }
	.day-cell { position: relative; display: grid; gap: .3rem; justify-items: center; padding: .8rem .4rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); color: var(--text-primary); cursor: pointer; font-family: inherit; transition: border-color .14s ease, transform .14s ease; min-height: 90px; }
	.day-cell:hover { transform: translateY(-2px); }
	.day-cell.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
	.day-cell small { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .08em; }
	.day-cell .num { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 99px; font-size: .84rem; font-weight: 750; }
	.day-cell.today .num { color: white; background: var(--accent); }
	.day-cell.selected:not(.today) .num { border: 2px solid var(--accent); }
	.count { padding: .12rem .5rem; border-radius: 99px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .6rem; font-style: normal; font-weight: 800; }
	.plan-day { position: absolute; bottom: .4rem; left: 50%; transform: translateX(-50%); padding: .12rem .5rem; border-radius: 99px; background: var(--accent); color: white; font-size: .54rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }

	.month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: .35rem; }
	.month-grid > small { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .08em; text-align: center; padding: .2rem 0; }
	.month-cell { display: grid; gap: .25rem; justify-items: center; min-height: 58px; padding: .45rem .2rem; border: 1px solid transparent; border-radius: 11px; background: var(--surface-panel); color: var(--text-primary); cursor: pointer; font-family: inherit; }
	.month-cell.outside { opacity: .35; }
	.month-cell.selected { border-color: var(--accent); }
	.month-cell.today .num { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 99px; color: white; background: var(--accent); }
	.month-cell .num { font-size: .74rem; font-weight: 700; }
	.dots { display: flex; gap: 3px; }
	.dots i { width: 6px; height: 6px; border-radius: 99px; }

	.planner-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); gap: 1rem; align-items: start; }
	@media (max-width: 980px) { .planner-grid { grid-template-columns: 1fr; } }

	.day-detail { display: grid; gap: .8rem; padding: 1.05rem 1.15rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); }
	.day-detail header { display: flex; align-items: center; gap: .75rem; }
	.month-badge { padding: .3rem .55rem; border-radius: 9px; background: var(--accent-soft); color: var(--accent); font-size: .62rem; font-weight: 850; letter-spacing: .08em; }
	.day-head { display: grid; }
	.day-head b { font-size: 1.05rem; line-height: 1.1; letter-spacing: -.02em; }
	.day-head small { color: var(--text-secondary); font-size: .68rem; }
	.day-actions { display: flex; gap: .45rem; margin-left: auto; }
	.day-actions .tool { height: 32px; padding: 0 .65rem; font-size: .7rem; }

	.list-tools { display: flex; gap: .5rem; flex-wrap: wrap; }
	.search { display: flex; align-items: center; gap: .5rem; flex: 1; min-width: 170px; height: 44px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-subtle); color: var(--text-secondary); }
	.search input { flex: 1; border: 0; background: transparent; color: var(--text-primary); font-size: .78rem; font-family: inherit; }
	.search input:focus { outline: none; }
	.funnel { display: inline-flex; align-items: center; gap: .4rem; height: 34px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-subtle); color: var(--text-secondary); }
	.funnel select { border: 0; background: transparent; color: var(--text-primary); font-size: .76rem; font-weight: 650; font-family: inherit; cursor: pointer; }
	.funnel select:focus { outline: none; }

	.task-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
	.task-row { display: flex; align-items: center; gap: .55rem; padding: .55rem .6rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.task-row:active { cursor: grabbing; }
	.grip { color: var(--border-subtle); cursor: grab; }
	.circle-check { display: grid; flex: 0 0 19px; place-items: center; width: 19px; height: 19px; border: 2px solid var(--border-subtle); border-radius: 99px; background: transparent; color: white; cursor: pointer; }
	.circle-check.checked { border-color: #2f9e6e; background: #2f9e6e; }
	.color-bar { flex: 0 0 4px; align-self: stretch; border-radius: 99px; }
	.task-copy { display: grid; flex: 1; gap: .18rem; min-width: 0; border: 0; background: transparent; text-align: left; color: inherit; cursor: pointer; font-family: inherit; }
	.task-copy b { font-size: .82rem; letter-spacing: -.01em; }
	.task-copy small { display: flex; align-items: center; gap: .35rem; color: var(--text-secondary); font-size: .66rem; flex-wrap: wrap; }
	.task-row.done .task-copy b { color: var(--text-secondary); text-decoration: line-through; }
	.task-row.missed { border-style: dashed; }
	.dot { width: 8px; height: 8px; border-radius: 99px; }
	.test-tag, .missed-tag { padding: .1rem .45rem; border-radius: 99px; font-size: .56rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
	.test-tag { color: var(--accent); background: var(--accent-soft); }
	.missed-tag { color: var(--text-secondary); border: 1px solid var(--border-subtle); }

	.empty-day { display: grid; gap: .3rem; justify-items: center; padding: 1.8rem 1rem; border: 1px dashed var(--border-subtle); border-radius: 14px; text-align: center; }
	.empty-day b { font-size: .84rem; }
	.empty-day p { margin: 0; color: var(--text-secondary); font-size: .74rem; }

	.form-col { display: grid; gap: .8rem; }
	.your-goals { display: grid; gap: .45rem; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel); }
	.label { margin: 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.mini-day { display: flex; align-items: center; gap: .55rem; padding: .55rem .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: .74rem; }
	.mini-day b { font-size: .74rem; }
	.mini-day span { margin-left: auto; color: var(--text-secondary); font-size: .68rem; }
	.mini-day:hover { border-color: var(--accent); }
	.mini-empty { margin: 0; color: var(--text-secondary); font-size: .72rem; }

	.lib-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
	.lib-list li { display: flex; align-items: center; gap: .7rem; padding: .7rem .8rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.lib-list b { display: block; font-size: .8rem; }
	.lib-list small { color: var(--text-secondary); font-size: .68rem; }
	.apply { margin-left: auto; height: 44px; padding: 0 .75rem; border: 0; border-radius: 9px; background: var(--accent); color: white; font-size: .72rem; font-weight: 750; cursor: pointer; }
	.lib-empty { margin: 0; color: var(--text-secondary); font-size: .8rem; line-height: 1.6; }
</style>
