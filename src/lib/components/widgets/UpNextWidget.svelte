<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { toggleTask, upNextTasks } from '$lib/stores/tracker';
	import { celebration } from '$lib/stores/tracker';
	import { relativeDue } from '$lib/state/dates';

	function onToggle(id: string) {
		if (toggleTask(id)) celebration.set('Task Completed!');
	}
</script>

<div class="upnext">
	<p class="count">{$upNextTasks.length} tasks</p>
	{#if $upNextTasks.length}
		<ul>
			{#each $upNextTasks as task (task.id)}
				<li>
					<button type="button" class="check" class:done={task.done} aria-label="Toggle task" on:click={() => onToggle(task.id)}>
						{#if task.done}<NavIcon name="check" size={11} />{/if}
					</button>
					<a href="/plan" class="copy">
						<b>{task.title}</b>
						<small>{task.due ? relativeDue(task.due) : 'No date'}</small>
					</a>
					<span class="arrow"><NavIcon name="arrow-right" size={14} /></span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="none">All clear. Plan your next day from the <a href="/plan">planner</a>.</p>
	{/if}
</div>

<style>
	.upnext { display: grid; gap: .55rem; height: 100%; align-content: start; }
	.count { margin: 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
	li { display: flex; align-items: center; gap: .55rem; padding: .5rem .6rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); }
	li:hover { border-color: var(--accent); }
	.check { display: grid; flex: 0 0 18px; place-items: center; width: 18px; height: 18px; border: 2px solid var(--border-subtle); border-radius: 99px; background: transparent; color: white; cursor: pointer; }
	.check.done { border-color: #2f9e6e; background: #2f9e6e; }
	.copy { display: grid; flex: 1; min-width: 0; color: inherit; text-decoration: none; }
	.copy b { font-size: .78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.copy small { color: var(--text-secondary); font-size: .64rem; }
	.arrow { color: var(--text-secondary); }
	.none { margin: 0; color: var(--text-secondary); font-size: .78rem; line-height: 1.55; }
	.none a { color: var(--accent); font-weight: 700; }
</style>
