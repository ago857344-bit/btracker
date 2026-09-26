<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { currentUser, initials, signOut, syncStatus } from '$lib/stores/auth';

	let open = false;
	let root: HTMLDivElement;

	const SYNC_LABEL: Record<string, string> = {
		off: 'Local only', idle: 'Ready', pulling: 'Syncing…', pushing: 'Syncing…', synced: 'All synced', error: 'Sync error'
	};
	$: syncLabel = SYNC_LABEL[$syncStatus] ?? '';

	function onDocClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}
	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}
	async function doSignOut() {
		open = false;
		await signOut();
	}
</script>

<svelte:window on:click={onDocClick} on:keydown={onKey} />

<div class="account" bind:this={root}>
	{#if $currentUser}
		<button type="button" class="avatar-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" on:click={() => (open = !open)}>
			{#if $currentUser.avatar}
				<img src={$currentUser.avatar} alt="" />
			{:else}
				<span class="initials">{$initials || 'ME'}</span>
			{/if}
		</button>
		{#if open}
			<div class="menu" role="menu">
				<div class="who">
					<strong>{$currentUser.name}</strong>
					<span>{$currentUser.email}</span>
				</div>
				<div class="sync" class:err={$syncStatus === 'error'}>
					<i></i>{syncLabel}
				</div>
				<a href="/settings" role="menuitem" on:click={() => (open = false)}><NavIcon name="settings" size={16} /> Settings</a>
				<button type="button" role="menuitem" on:click={doSignOut}><NavIcon name="lock" size={16} /> Sign out</button>
			</div>
		{/if}
	{:else}
		<a class="signin" href="/login"><NavIcon name="shield" size={16} /><span>Sign in</span></a>
	{/if}
</div>

<style>
	.account { position: relative; }
	.avatar-btn { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 1px solid var(--border-subtle); border-radius: 99px; background: var(--surface-panel); overflow: hidden; }
	.avatar-btn:hover { border-color: var(--accent); }
	.avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
	.initials { color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .02em; }
	.signin { display: inline-flex; align-items: center; gap: .42rem; height: 36px; padding: 0 .8rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-secondary); font-size: .78rem; font-weight: 700; text-decoration: none; cursor: pointer; font-family: inherit; }
	.signin:hover { color: var(--accent); border-color: var(--accent); }
	.menu { position: absolute; z-index: 70; top: calc(100% + .5rem); right: 0; width: 230px; padding: .5rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.who { display: grid; gap: .12rem; padding: .5rem .6rem .6rem; border-bottom: 1px solid var(--border-subtle); }
	.who strong { color: var(--text-primary); font-size: .86rem; }
	.who span { color: var(--text-secondary); font-size: .72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sync { display: flex; align-items: center; gap: .42rem; padding: .55rem .6rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.sync i { width: 7px; height: 7px; border-radius: 99px; background: var(--success); }
	.sync.err i { background: var(--danger); }
	.menu a, .menu button { display: flex; align-items: center; gap: .55rem; width: 100%; padding: .55rem .6rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-primary); font-size: .82rem; font-weight: 600; text-decoration: none; text-align: left; }
	.menu a:hover, .menu button:hover { background: var(--surface-subtle); color: var(--accent); }
</style>
