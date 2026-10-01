<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { celebration, completeRevision, dueRevision, snoozeRevision } from '$lib/stores/tracker';
	import { todayKey } from '$lib/state/dates';
	import { SPACING_METHODS, subjectColor, subjectName } from '$lib/state/subjects';

	// Per-device once-a-day auto-popup marker, written the moment the modal triggers so it
	// only opens on the first load of the day (keeps the UI marker out of synced tracker state).
	const POPUP_KEY = 'last_revision_popup';

	let ready = false;
	let shownOn = '';

	onMount(() => {
		shownOn = localStorage.getItem(POPUP_KEY) ?? '';
		ready = true;
	});

	type Entry = { key: string; sub: string; ch: string; method: string; overdue: boolean };

	let entries: Entry[] = [];
	let open = false;
	$: today = todayKey();
	$: entries = $dueRevision.map(([key, item]) => ({
		key,
		sub: item.sub ?? key.split(':')[0],
		ch: item.ch ?? key.split(':').slice(1).join(':'),
		method: item.method ?? 'steady',
		overdue: (item.remindDate ?? today) < today
	}));
	$: if (ready && !open && shownOn !== today && entries.length > 0) {
		open = true;
		shownOn = today;
		localStorage.setItem(POPUP_KEY, today);
	}
	$: if (open && entries.length === 0) open = false;
	$: methodMeta = (id: string) => SPACING_METHODS.find((m) => m.id === id);

	function close() {
		open = false;
	}

	function markRevised(key: string) {
		completeRevision(key);
		celebration.set('Revision complete!');
	}
</script>

<Modal open={open} title="Revisions due today" width="500px" on:close={close}>
	<p class="hint"><NavIcon name="brain" size={14} /> {entries.length} chapter{entries.length === 1 ? '' : 's'} ready for active recall.</p>
	<ul class="queue">
		{#each entries as e (e.key)}
			<li style="--c: {subjectColor(e.sub)}">
				<div class="info">
					<span class="badge">{subjectName(e.sub).toUpperCase()}</span>
					<b>{e.ch}</b>
					<small>{methodMeta(e.method)?.emoji} {methodMeta(e.method)?.name} · <span class:overdue={e.overdue}>{e.overdue ? 'Overdue' : 'Due today'}</span></small>
				</div>
				<div class="actions">
					<button type="button" class="btn ghost" on:click={() => snoozeRevision(e.key)}><NavIcon name="clock" size={13} /> Tomorrow</button>
					<button type="button" class="btn solid" on:click={() => markRevised(e.key)}><NavIcon name="check" size={13} /> Mark revised</button>
				</div>
			</li>
		{/each}
	</ul>
	<svelte:fragment slot="footer">
		<a class="hub-link" href="/revise" on:click={close}><NavIcon name="revise" size={15} /> Open Revision Hub</a>
		<button type="button" class="btn ghost" on:click={close}>Remind me tomorrow</button>
	</svelte:fragment>
</Modal>

<style>
	.hint { display: flex; align-items: center; gap: .45rem; margin: 0 0 .9rem; color: var(--text-secondary); font-size: .8rem; font-weight: 650; }
	.queue { list-style: none; display: grid; gap: .6rem; margin: 0; padding: 0; }
	.queue li { display: flex; align-items: center; justify-content: space-between; gap: .9rem; padding: .7rem .85rem; border: 1px solid var(--border-subtle); border-left: 3px solid var(--c); border-radius: 13px; background: var(--surface-subtle); }
	.info { display: grid; gap: .2rem; min-width: 0; }
	.info b { overflow: hidden; font-size: .84rem; letter-spacing: -.01em; text-overflow: ellipsis; white-space: nowrap; }
	.badge { justify-self: start; padding: .13rem .45rem; border-radius: 7px; color: var(--c); background: color-mix(in srgb, var(--c), transparent 88%); font-size: .58rem; font-weight: 800; letter-spacing: .05em; }
	.info small { color: var(--text-secondary); font-size: .68rem; }
	.info small .overdue { color: var(--danger); font-weight: 750; }
	.actions { display: flex; flex-shrink: 0; gap: .45rem; }
	.btn { display: inline-flex; align-items: center; gap: .38rem; height: 33px; padding: 0 .8rem; border: 1px solid transparent; border-radius: 10px; font-size: .74rem; font-weight: 750; white-space: nowrap; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.ghost:hover { color: var(--text-primary); }
	.btn.solid { color: white; background: var(--accent); }
	.hub-link { display: inline-flex; align-items: center; gap: .4rem; margin-right: auto; color: var(--accent); font-size: .78rem; font-weight: 750; text-decoration: none; }
	.hub-link:hover { text-decoration: underline; }
</style>
