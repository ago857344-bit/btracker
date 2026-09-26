<script lang="ts">
	import { slide } from 'svelte/transition';
	import { dueHomework, toggleHomework } from '$lib/stores/tracker';
	import { relativeDue } from '$lib/state/dates';
	import type { HomeworkItem } from '$lib/types/tracker';

	function describe(item: HomeworkItem): string {
		if (item.title) return item.title;
		const subject = item.s ? `${item.s}` : '';
		const chapter = item.c ? ` Ch ${item.c}` : '';
		const exercise = item.e ? ` · ${item.e}` : '';
		const range = item.list?.length ? ` · ${item.list.length} Qs` : '';
		const kind = item.kind === 'back' ? 'Backlog' : item.kind === 'task' ? 'Task' : 'Homework';
		return `${kind}: ${subject}${chapter}${exercise}${range}`.trim();
	}
</script>

<div class="due">
	{#if $dueHomework.length === 0}
		<div class="empty" in:slide>
			<span class="tick">✓</span>
			<p>Nothing due today. You’re all clear — add a stretch goal or get ahead.</p>
		</div>
	{:else}
		<ul>
			{#each $dueHomework.slice(0, 6) as item (item.id)}
				<li transition:slide={{ duration: 220 }}>
					<button type="button" class="check" aria-label="Mark done" on:click={() => toggleHomework(item.id)}></button>
					<div class="text">
						<p class="title">{describe(item)}</p>
						<p class="meta" class:overdue={relativeDue(item.due ?? '').includes('overdue')}>{relativeDue(item.due ?? '')}</p>
					</div>
				</li>
			{/each}
		</ul>
		{#if $dueHomework.length > 6}
			<a class="more" href="/plan">+{$dueHomework.length - 6} more in Plan →</a>
		{/if}
	{/if}
</div>

<style>
	.due { display: flex; flex-direction: column; gap: .6rem; height: 100%; }
	.empty { display: flex; align-items: center; gap: .8rem; padding: 1.1rem; border-radius: var(--radius-control); background: var(--surface-subtle); }
	.empty p { margin: 0; color: var(--text-secondary); font-size: .88rem; line-height: 1.5; }
	.tick { display: grid; place-items: center; flex: 0 0 30px; width: 30px; height: 30px; border-radius: 99px; color: #fff; background: var(--success); font-size: .95rem; }
	ul { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
	li { display: flex; align-items: center; gap: .8rem; padding: .55rem .3rem; border-radius: 10px; }
	li:hover { background: var(--surface-subtle); }
	.check { flex: 0 0 20px; width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-radius: 7px; background: transparent; }
	.check:hover { border-color: var(--accent); background: var(--accent-soft); }
	.text { min-width: 0; }
	.title { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .88rem; font-weight: 650; }
	.meta { margin: .1rem 0 0; color: var(--text-secondary); font-size: .72rem; font-weight: 600; }
	.meta.overdue { color: var(--danger); }
	.more { color: var(--accent); font-size: .78rem; font-weight: 700; text-decoration: none; }
</style>
