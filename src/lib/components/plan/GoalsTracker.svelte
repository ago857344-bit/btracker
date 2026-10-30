<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import GoalForm from '$lib/components/plan/GoalForm.svelte';
	import { deleteGoal, goalProgress, goalStatus, patchGoal, toggleMilestone, tracker, updateTracker, triggerToast } from '$lib/stores/tracker';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import { relativeDue, todayKey } from '$lib/state/dates';
	import type { TrackerGoal } from '$lib/types/tracker';

	let query = '';
	let filter: 'all' | 'in-progress' | 'overdue' | 'completed' = 'all';
	let formOpen = false;
	let expanded: string | null = null;
	let dragId: string | null = null;

	$: goals = $tracker.gt;
	$: statuses = goals.map((goal) => goalStatus(goal));
	$: counts = {
		all: goals.length,
		'in-progress': statuses.filter((s) => s === 'in-progress').length,
		overdue: statuses.filter((s) => s === 'overdue').length,
		completed: statuses.filter((s) => s === 'completed').length
	};
	$: filtered = goals.filter((goal, i) => {
		if (filter !== 'all' && statuses[i] !== filter) return false;
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return `${goal.title} ${subjectName(goal.sub)} ${goal.ch}`.toLowerCase().includes(q);
	});

	const statCards = [
		{ key: 'all', label: 'Total Targets', color: 'var(--accent)' },
		{ key: 'in-progress', label: 'In Progress', color: '#d99a2b' },
		{ key: 'completed', label: 'Completed', color: '#2f9e6e' },
		{ key: 'overdue', label: 'Overdue', color: '#e0455a' }
	] as const;

	const statusColor = (s: string) => s === 'completed' ? '#2f9e6e' : s === 'overdue' ? '#e0455a' : '#d99a2b';

	function handleDragStart(e: DragEvent, id: string) {
		dragId = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(targetId: string) {
		if (!dragId || dragId === targetId) {
			dragId = null;
			return;
		}
		updateTracker((t) => {
			const fromIdx = t.gt.findIndex((g) => g.id === dragId);
			const toIdx = t.gt.findIndex((g) => g.id === targetId);
			if (fromIdx !== -1 && toIdx !== -1) {
				const [moved] = t.gt.splice(fromIdx, 1);
				t.gt.splice(toIdx, 0, moved);
			}
		});
		dragId = null;
	}

	function scheduleMilestoneToday(goal: TrackerGoal) {
		const uncompleted = goal.milestones?.find((m) => !m.done);
		const title = uncompleted ? `${goal.title}: ${uncompleted.t}` : goal.title;
		const today = todayKey();
		const alreadyScheduled = [...($tracker.h || []), ...($tracker.hd || [])].some(
			(item) => ((item as any).date === today || item.due === today) && item.title === `🎯 ${title}`
		);
		if (alreadyScheduled) {
			triggerToast('Already scheduled for today');
			return;
		}
		updateTracker((t) => {
			if (!t.h) t.h = [];
			t.h.push({
				id: 'g-hw-' + Date.now(),
				title: `🎯 ${title}`,
				s: (goal.sub as any) || undefined,
				due: today,
				date: today,
				hrs: 1,
				done: false
			} as any);
		});
		triggerToast(`Scheduled "${title}" into today's planner! 🎯`);
	}
</script>

<section class="goals">
	<header>
		<div>
			<h3>Your Goals</h3>
			<p>Long-term targets with milestones, deadlines and PYQ counts.</p>
		</div>
		<button type="button" class="add-goal" on:click={() => formOpen = true}><NavIcon name="plus" size={15} /> Add goal</button>
	</header>

	<div class="stat-cards">
		{#each statCards as card}
			<button type="button" class="stat-card" class:selected={filter === card.key} on:click={() => filter = card.key}>
				<b style="color: {card.color}">{counts[card.key]}</b>
				<small>{card.label}</small>
			</button>
		{/each}
	</div>

	<div class="filters">
		<span class="search"><NavIcon name="search" size={14} /><input type="text" placeholder="Search goals or subjects..." bind:value={query} aria-label="Search goals" /></span>
		<div class="segmented-control" role="tablist">
			{#each [{ id: 'all', label: 'All' }, { id: 'in-progress', label: 'In Progress' }, { id: 'overdue', label: 'Overdue' }, { id: 'completed', label: 'Completed' }] as chip (chip.id)}
				<button
					type="button"
					class="segmented-btn"
					class:active={filter === chip.id}
					on:click={() => filter = chip.id as typeof filter}
					role="tab"
					aria-selected={filter === chip.id}
				>
					<span>{chip.label}</span>
					<span class="count-pill">{counts[chip.id as keyof typeof counts]}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if filtered.length}
		<ul class="goal-list">
			{#each filtered as goal (goal.id)}
				{@const status = goalStatus(goal)}
				{@const progress = goalProgress(goal)}
				<li
					class="goal"
					class:dragging={dragId === goal.id}
					style="--goal-color: {goal.sub ? subjectColor(goal.sub) : 'var(--accent)'}"
					draggable="true"
					on:dragstart={(e) => handleDragStart(e, goal.id)}
					on:dragover={handleDragOver}
					on:drop={() => handleDrop(goal.id)}
				>
					<div class="goal-main">
						<span class="drag" aria-label="Drag to reorder"><NavIcon name="drag" size={14} /></span>
						<button
							type="button"
							class="circle-check"
							class:checked={progress >= 1}
							aria-label={progress >= 1 ? 'Goal completed' : 'Expand goal'}
							on:click={() => {
								if (progress >= 1) return;
								const next = goal.milestones.find((m) => !m.done);
								if (next) toggleMilestone(goal.id, next.id);
								else if (goal.type === 'pyq' && goal.solved < goal.target) patchGoal(goal.id, { solved: goal.target });
								else expanded = expanded === goal.id ? null : goal.id;
							}}
						>
							{#if progress >= 1}<NavIcon name="check" size={12} />{/if}
						</button>
						<button type="button" class="goal-copy" on:click={() => expanded = expanded === goal.id ? null : goal.id}>
							<b>{goal.title}</b>
							<small>
								{#if goal.sub}{subjectName(goal.sub)}{#if goal.ch} · {goal.ch}{/if} · {/if}
								{goal.deadline ? relativeDue(goal.deadline) : 'No deadline'}
								<span class="status" style="color: {statusColor(status)}">{status.replace('-', ' ')}</span>
							</small>
							<span class="bar"><i style="width: {Math.round(progress * 100)}%"></i></span>
						</button>
						<span class="pct">{Math.round(progress * 100)}%</span>
					</div>

					{#if expanded === goal.id}
						<div class="goal-detail">
							{#if goal.type === 'pyq'}
								<div class="pyq-row">
									<small>PYQs solved</small>
									<div class="stepper">
										<button type="button" aria-label="Decrease" on:click={() => patchGoal(goal.id, { solved: Math.max(0, goal.solved - 1) })}><NavIcon name="minus" size={12} /></button>
										<b>{goal.solved} / {goal.target}</b>
										<button type="button" aria-label="Increase" on:click={() => patchGoal(goal.id, { solved: Math.min(goal.target, goal.solved + 1) })}><NavIcon name="plus" size={12} /></button>
									</div>
								</div>
							{:else if goal.milestones.length}
								<ul class="ms-list">
									{#each goal.milestones as m (m.id)}
										<li>
											<button type="button" class="ms-check" class:checked={m.done} aria-label="Toggle milestone" on:click={() => toggleMilestone(goal.id, m.id)}>
												{#if m.done}<NavIcon name="check" size={11} />{/if}
											</button>
											<span class:done={m.done}>{m.t}</span>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="no-ms">No milestones on this goal yet.</p>
							{/if}
							
							<div class="goal-detail-actions">
								<button type="button" class="btn-schedule-milestone" on:click={() => scheduleMilestoneToday(goal)}>
									<NavIcon name="calendar-check" size={13} />
									<span>+ Schedule Next Milestone Today</span>
								</button>
								<button type="button" class="del" on:click={() => { deleteGoal(goal.id); expanded = null; }}>
									<NavIcon name="trash" size={13} /> Delete goal
								</button>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty-state">
			<div class="empty-state-icon">
				<NavIcon name="target" size={28} />
			</div>
			<b class="empty-state-title">{goals.length ? 'No matching targets' : 'No long-term targets yet'}</b>
			<p class="empty-state-desc">{goals.length ? 'Try adjusting your search query or status filter.' : 'Create your first academic target with milestones, deadlines, and PYQ trackers.'}</p>
			<button type="button" class="add-goal" on:click={() => formOpen = true}>
				<NavIcon name="plus" size={15} />
				<span>Create your first goal</span>
			</button>
		</div>
	{/if}
</section>

<GoalForm bind:open={formOpen} />

<style>
	.goals { display: grid; gap: 1rem; }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
	h3 { margin: 0; font-size: 1rem; letter-spacing: -.02em; }
	header p { margin: .25rem 0 0; color: var(--text-secondary); font-size: .76rem; }
	.add-goal { display: inline-flex; align-items: center; gap: .4rem; height: 36px; padding: 0 .9rem; border: 0; border-radius: 11px; color: var(--accent-contrast, white); background: var(--accent); font-size: .78rem; font-weight: 750; cursor: pointer; white-space: nowrap; }
	.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .6rem; }
	.stat-card { display: grid; gap: .15rem; padding: .85rem 1rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); text-align: left; cursor: pointer; font-family: inherit; }
	.stat-card.selected { border-color: var(--accent); background: var(--accent-soft); }
	.stat-card b { font-size: 1.3rem; letter-spacing: -.03em; }
	.stat-card small { color: var(--text-secondary); font-size: .62rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
	.filters { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
	.search { display: flex; align-items: center; gap: .5rem; flex: 1; min-width: 200px; height: 38px; padding: 0 .75rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); color: var(--text-secondary); }
	.search input { flex: 1; border: 0; background: transparent; color: var(--text-primary); font-size: .8rem; font-family: inherit; }
	.search input:focus { outline: none; }
	
	.segmented-control {
		display: inline-flex;
		align-items: center;
		padding: 3px;
		border-radius: 12px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		gap: 2px;
	}

	.segmented-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		height: 30px;
		padding: 0 0.65rem;
		border-radius: 9px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.segmented-btn:hover {
		color: var(--text-primary);
	}

	.segmented-btn.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		border-color: var(--border-subtle);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.count-pill {
		font-size: 0.64rem;
		padding: 0.1rem 0.35rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--text-secondary) 15%, transparent);
		color: inherit;
		font-variant-numeric: tabular-nums;
	}

	.segmented-btn.active .count-pill {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
	}

	.goal-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
	.goal { border: 1px solid var(--border-subtle); border-left: 3px solid var(--goal-color); border-radius: 14px; background: var(--surface-panel); overflow: hidden; transition: transform 0.15s ease, opacity 0.15s ease; }
	.goal.dragging { opacity: 0.45; border-style: dashed; }
	.goal-main { display: flex; align-items: center; gap: .65rem; padding: .75rem .9rem; }
	.drag { color: var(--border-subtle); cursor: grab; display: grid; place-items: center; }
	.drag:active { cursor: grabbing; }
	.circle-check { display: grid; flex: 0 0 20px; place-items: center; width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-radius: 99px; background: transparent; color: var(--accent-contrast, #fff); cursor: pointer; }
	.circle-check.checked { border-color: #2f9e6e; background: #2f9e6e; }
	.goal-copy { display: grid; flex: 1; gap: .28rem; min-width: 0; border: 0; background: transparent; text-align: left; cursor: pointer; font-family: inherit; color: inherit; }
	.goal-copy b { font-size: .84rem; letter-spacing: -.01em; }
	.goal-copy small { display: flex; align-items: center; gap: .4rem; color: var(--text-secondary); font-size: .68rem; }
	.status { font-weight: 800; letter-spacing: .05em; text-transform: uppercase; font-size: .6rem; }
	.bar { display: block; height: 5px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.bar i { display: block; height: 100%; border-radius: 99px; background: var(--goal-color); transition: width .3s ease; }
	.pct { color: var(--text-secondary); font-size: .74rem; font-weight: 750; }
	.goal-detail { display: grid; gap: .6rem; padding: .2rem .9rem .9rem 2.9rem; }
	.pyq-row { display: flex; align-items: center; justify-content: space-between; gap: .6rem; }
	.pyq-row small { color: var(--text-secondary); font-size: .66rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.stepper { display: flex; align-items: center; gap: .5rem; }
	.stepper button { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--border-subtle); border-radius: 8px; background: transparent; color: var(--text-secondary); cursor: pointer; }
	.stepper b { font-size: .8rem; min-width: 58px; text-align: center; }
	.ms-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; }
	.ms-list li { display: flex; align-items: center; gap: .5rem; font-size: .76rem; }
	.ms-check { display: grid; flex: 0 0 16px; place-items: center; width: 16px; height: 16px; border: 1.6px solid var(--border-subtle); border-radius: 99px; background: transparent; color: var(--accent-contrast, #fff); cursor: pointer; }
	.ms-check.checked { border-color: var(--accent); background: var(--accent); }
	.ms-list span.done { color: var(--text-secondary); text-decoration: line-through; }
	.no-ms { margin: 0; color: var(--text-secondary); font-size: .74rem; }
	
	.goal-detail-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--border-subtle);
		flex-wrap: wrap;
	}

	.btn-schedule-milestone {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		height: 28px;
		padding: 0 0.7rem;
		border-radius: 8px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-schedule-milestone:hover {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
	}

	.del { display: inline-flex; align-items: center; gap: .35rem; justify-self: start; height: 28px; padding: 0 .65rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: transparent; color: var(--danger, #e0455a); font-size: .7rem; font-weight: 700; cursor: pointer; }
	.del:hover { border-color: var(--danger, #e0455a); }

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 0.5rem;
		padding: 3rem 1.5rem;
		border: 1px dashed var(--border-subtle);
		border-radius: 16px;
		background: var(--surface-panel);
	}

	.empty-state-icon {
		display: grid;
		place-items: center;
		width: 50px;
		height: 50px;
		border-radius: 14px;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		margin-bottom: 0.3rem;
	}

	.empty-state-title {
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.empty-state-desc {
		font-size: 0.76rem;
		color: var(--text-secondary);
		max-width: 320px;
		margin: 0 0 0.8rem;
		line-height: 1.45;
	}
</style>