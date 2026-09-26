<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { logManualMinutes, recentActivity } from '$lib/stores/tracker';
	import { SUBJECTS, subjectName } from '$lib/state/subjects';

	let logOpen = false;
	let minutes = 30;
	let subject = '';

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
</script>

<div class="activity">
	<div class="head-row">
		<p class="count">{$recentActivity.length} entries</p>
		<button type="button" class="log-btn" on:click={() => logOpen = true}><NavIcon name="plus" size={13} /> Log time</button>
	</div>

	{#if $recentActivity.length}
		<ul>
			{#each $recentActivity as entry (entry.id)}
				<li>
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
		<p class="none">No activity yet. Finish a focus session or log time manually to populate your feed.</p>
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
	.activity { display: grid; gap: .55rem; height: 100%; align-content: start; }
	.head-row { display: flex; align-items: center; justify-content: space-between; }
	.count { margin: 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.log-btn { display: inline-flex; align-items: center; gap: .35rem; height: 29px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-secondary); font-size: .7rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.log-btn:hover { color: var(--accent); border-color: var(--accent); }
	ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
	li { display: flex; align-items: center; gap: .6rem; padding: .5rem .6rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); }
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
