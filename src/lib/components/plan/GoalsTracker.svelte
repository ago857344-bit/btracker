<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import GoalForm from '$lib/components/plan/GoalForm.svelte';
	import { deleteGoal, goalProgress, goalStatus, patchGoal, toggleMilestone, tracker } from '$lib/stores/tracker';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import { relativeDue } from '$lib/state/dates';

	let query = '';
	let filter: 'all' | 'in-progress' | 'overdue' | 'completed' = 'all';
	let formOpen = false;
	let expanded: string | null = null;

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
		<div class="chips">
			{#each [{ id: 'all', label: 'All' }, { id: 'in-progress', label: 'In Progress' }, { id: 'overdue', label: 'Overdue' }, { id: 'completed', label: 'Completed' }] as chip (chip.id)}
				<button type="button" class="chip" class:selected={filter === chip.id} on:click={() => filter = chip.id as typeof filter}>
					{chip.label} <em>{counts[chip.id as keyof typeof counts]}</em>
				</button>
			{/each}
		</div>
	</div>

	{#if filtered.length}
		<ul class="goal-list">
			{#each filtered as goal (goal.id)}
				{@const status = goalStatus(goal)}
				{@const progress = goalProgress(goal)}
				<li class="goal" style="--goal-color: {goal.sub ? subjectColor(goal.sub) : 'var(--accent)'}">
					<div class="goal-main">
						<span class="drag" aria-hidden="true"><NavIcon name="drag" size={14} /></span>
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
							<button type="button" class="del" on:click={() => { deleteGoal(goal.id); expanded = null; }}><NavIcon name="trash" size={13} /> Delete goal</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty">
			<p>{goals.length ? 'No goals matching filter.' : 'No goals yet — create your first target.'}</p>
			<button type="button" class="add-goal" on:click={() => formOpen = true}><NavIcon name="plus" size={15} /> Create your first goal</button>
		</div>
	{/if}
</section>

<GoalForm bind:open={formOpen} />

<style>
	.goals { display: grid; gap: 1rem; }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
	h3 { margin: 0; font-size: 1rem; letter-spacing: -.02em; }
	header p { margin: .25rem 0 0; color: var(--text-secondary); font-size: .76rem; }
	.add-goal { display: inline-flex; align-items: center; gap: .4rem; height: 36px; padding: 0 .9rem; border: 0; border-radius: 11px; color: white; background: var(--accent); font-size: .78rem; font-weight: 750; cursor: pointer; white-space: nowrap; }
	.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .6rem; }
	.stat-card { display: grid; gap: .15rem; padding: .85rem 1rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); text-align: left; cursor: pointer; font-family: inherit; }
	.stat-card.selected { border-color: var(--accent); background: var(--accent-soft); }
	.stat-card b { font-size: 1.3rem; letter-spacing: -.03em; }
	.stat-card small { color: var(--text-secondary); font-size: .62rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
	.filters { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
	.search { display: flex; align-items: center; gap: .5rem; flex: 1; min-width: 200px; height: 38px; padding: 0 .75rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); color: var(--text-secondary); }
	.search input { flex: 1; border: 0; background: transparent; color: var(--text-primary); font-size: .8rem; font-family: inherit; }
	.search input:focus { outline: none; }
	.chips { display: flex; gap: .35rem; flex-wrap: wrap; }
	.chip { display: inline-flex; align-items: center; gap: .35rem; height: 30px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 99px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 700; cursor: pointer; }
	.chip em { font-style: normal; opacity: .65; }
	.chip.selected { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	.goal-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
	.goal { border: 1px solid var(--border-subtle); border-left: 3px solid var(--goal-color); border-radius: 14px; background: var(--surface-panel); overflow: hidden; }
	.goal-main { display: flex; align-items: center; gap: .65rem; padding: .75rem .9rem; }
	.drag { color: var(--border-subtle); cursor: grab; }
	.circle-check { display: grid; flex: 0 0 20px; place-items: center; width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-radius: 99px; background: transparent; color: white; cursor: pointer; }
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
	.ms-check { display: grid; flex: 0 0 16px; place-items: center; width: 16px; height: 16px; border: 1.6px solid var(--border-subtle); border-radius: 99px; background: transparent; color: white; cursor: pointer; }
	.ms-check.checked { border-color: var(--accent); background: var(--accent); }
	.ms-list span.done { color: var(--text-secondary); text-decoration: line-through; }
	.no-ms { margin: 0; color: var(--text-secondary); font-size: .74rem; }
	.del { display: inline-flex; align-items: center; gap: .35rem; justify-self: start; height: 28px; padding: 0 .65rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: transparent; color: var(--danger, #e0455a); font-size: .7rem; font-weight: 700; cursor: pointer; }
	.del:hover { border-color: var(--danger, #e0455a); }
	.empty { display: grid; gap: .7rem; justify-items: center; padding: 2.4rem 1rem; border: 1px dashed var(--border-subtle); border-radius: 16px; color: var(--text-secondary); font-size: .82rem; }
	.empty p { margin: 0; }
</style>
