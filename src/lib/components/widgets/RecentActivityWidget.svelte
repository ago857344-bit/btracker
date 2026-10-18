<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { logManualMinutes, recentActivity } from '$lib/stores/tracker';
	import { SUBJECTS, subjectName } from '$lib/state/subjects';

	let logOpen = false;
	let minutes = 30;
	let subject = '';
	let filter: 'all' | 'focus' | 'questions' = 'all';

	function save() {
		const m = Math.max(1, Math.round(minutes));
		logManualMinutes(m, subject || null);
		logOpen = false;
		minutes = 30; subject = '';
	}

	const timeAgo = (at: number) => {
		const mins = Math.round((Date.now() - at) / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.round(hours / 24)}d ago`;
	};

	$: filteredActivity = filter === 'all'
		? $recentActivity
		: $recentActivity.filter((entry) => entry.kind === filter);
</script>

<div class="activity">
	<div class="head-row">
		<div class="filter-tabs">
			<button type="button" class="tab-chip" class:active={filter === 'all'} on:click={() => filter = 'all'}>
				All ({$recentActivity.length})
			</button>
			<button type="button" class="tab-chip" class:active={filter === 'focus'} on:click={() => filter = 'focus'}>
				Focus
			</button>
			<button type="button" class="tab-chip" class:active={filter === 'questions'} on:click={() => filter = 'questions'}>
				Practice
			</button>
		</div>
		<button type="button" class="log-btn" on:click={() => logOpen = true}><NavIcon name="plus" size={13} /> Log time</button>
	</div>

	{#if filteredActivity.length}
		<ul class="activity-list">
			{#each filteredActivity as entry (entry.id)}
				<li class="activity-item">
					<span class="kind" style="color: {entry.color}; background: color-mix(in srgb, {entry.color}, transparent 86%)">
						<NavIcon name={entry.kind === 'questions' ? 'sigma' : 'clock'} size={13} />
					</span>
					<div class="copy">
						<b>{entry.title}</b>
						<small>
							{#if entry.sub}{subjectName(entry.sub)} · {/if}
							{entry.meta} · {timeAgo(entry.at)}
							{#if entry.badge}<span class="badge">{entry.badge}</span>{/if}
						</small>
					</div>
					<span class="right">{entry.right}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="none">No {filter === 'all' ? 'activity' : filter} entries yet. Finish a session to populate your history.</p>
	{/if}
</div>

<Modal bind:open={logOpen} title="Log Time" width="420px">
	<div class="log-form">
		<label><small>Minutes studied</small><input type="number" min="1" max="960" bind:value={minutes} /></label>
		<label><small>Subject (optional)</small>
			<select bind:value={subject}>
				<option value="">No subject</option>
				{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
			</select>
		</label>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => logOpen = false}>Cancel</button>
		<button type="button" class="btn solid" on:click={save}>Save entry</button>
	</svelte:fragment>
</Modal>

<style>
	.activity { display: flex; flex-direction: column; gap: .65rem; height: 100%; min-width: 0; }
	.head-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
	.filter-tabs { display: flex; align-items: center; gap: 0.3rem; }
	.tab-chip {
		padding: 0.22rem 0.55rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel) 80%, transparent);
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 750;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.16s ease;
	}
	.tab-chip:hover {
		color: var(--text-primary);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
	}
	.tab-chip.active {
		background: color-mix(in srgb, var(--accent) 15%, var(--surface-panel));
		border-color: var(--accent);
		color: var(--accent);
	}
	.log-btn { display: inline-flex; align-items: center; gap: .35rem; height: 28px; padding: 0 .65rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-secondary); font-size: .68rem; font-weight: 750; cursor: pointer; font-family: inherit; margin-left: auto; }
	.log-btn:hover { color: var(--accent); border-color: var(--accent); }
	.activity-list {
		list-style: none;
		margin: 0;
		padding: 0 4px 4px 0;
		display: flex;
		flex-direction: column;
		gap: .42rem;
		max-height: 380px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--accent) 30%, transparent) transparent;
	}
	.activity-list::-webkit-scrollbar { width: 4px; }
	.activity-list::-webkit-scrollbar-track { background: transparent; }
	.activity-list::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 99px; }
	.activity-list::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--accent) 60%, transparent); }
	.activity-item {
		display: flex;
		align-items: center;
		gap: .6rem;
		padding: .52rem .65rem;
		border: 1px solid var(--border-subtle);
		border-radius: 11px;
		background: var(--surface-subtle);
		flex-shrink: 0;
		transition: border-color 0.18s ease, transform 0.18s var(--ease-ios-spring);
	}
	.activity-item:hover {
		border-color: color-mix(in srgb, var(--accent) 40%, var(--border-subtle));
		transform: translateY(-1px);
	}
	.kind { display: grid; flex: 0 0 28px; place-items: center; width: 28px; height: 28px; border-radius: 9px; }
	.copy { flex: 1; min-width: 0; }
	.copy b { display: block; font-size: .78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.copy small { display: flex; align-items: center; gap: .35rem; color: var(--text-secondary); font-size: .64rem; flex-wrap: wrap; }
	.badge { padding: .08rem .4rem; border-radius: 99px; background: var(--accent-soft); color: var(--accent); font-size: .54rem; font-weight: 800; letter-spacing: .06em; }
	.right { color: var(--text-primary); font-size: .8rem; font-weight: 800; letter-spacing: -.02em; }
	.none { margin: 0; color: var(--text-secondary); font-size: .78rem; line-height: 1.55; }
	.log-form { display: grid; gap: .7rem; }
	.log-form label { display: grid; gap: .3rem; }
	.log-form small { color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.log-form input, .log-form select { height: 38px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .84rem; font-family: inherit; }
	.btn { height: 36px; padding: 0 1rem; border-radius: 11px; font-size: .78rem; font-weight: 750; border: 1px solid transparent; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.solid { color: white; background: var(--accent); }
</style>
