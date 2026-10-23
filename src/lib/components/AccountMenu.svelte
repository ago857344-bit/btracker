<script lang="ts">
	import { goto } from '$app/navigation';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { currentUser, initials, signOut, syncStatus, hasSkippedLogin } from '$lib/stores/auth';

	export let showSignIn = true;

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
	function goToLogin() {
		hasSkippedLogin.set(false);
		void goto('/login');
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
	{:else if showSignIn}
		<button type="button" class="signin" on:click={goToLogin}><NavIcon name="shield" size={16} /><span>Sign in</span></button>
	{:else}
		<div class="avatar-btn static-avatar">
			<span class="initials">{$initials || 'ME'}</span>
		</div>
	{/if}
</div>

<style>
	.account { position: relative; }
	.avatar-btn {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 1.5px solid color-mix(in srgb, var(--accent) 60%, var(--border-subtle));
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 24%, var(--surface-panel));
		overflow: hidden;
		box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: all 0.2s var(--ease-ios-spring, ease);
	}
	.avatar-btn:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 34%, var(--surface-panel));
		box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
	}
	.avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
	.initials { color: var(--text-primary); font-size: .76rem; font-weight: 850; letter-spacing: .02em; text-shadow: 0 0 8px color-mix(in srgb, var(--accent) 80%, transparent); }
	.signin {
		display: inline-flex;
		align-items: center;
		gap: .42rem;
		height: 36px;
		padding: 0 .8rem;
		border: 1.5px solid color-mix(in srgb, var(--accent) 60%, var(--border-subtle));
		border-radius: 11px;
		background: color-mix(in srgb, var(--accent) 24%, var(--surface-panel));
		color: var(--text-primary);
		font-size: .78rem;
		font-weight: 750;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: all 0.2s var(--ease-ios-spring, ease);
	}
	.signin:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 34%, var(--surface-panel));
		box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
	}
	.menu { position: absolute; z-index: 70; top: calc(100% + .5rem); right: 0; width: 230px; padding: .5rem; border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16)); border-radius: 16px; background: color-mix(in srgb, var(--surface-panel, #121020) 96%, transparent); backdrop-filter: blur(36px) saturate(210%); -webkit-backdrop-filter: blur(36px) saturate(210%); box-shadow: 0 18px 48px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15); }
	.who { display: grid; gap: .12rem; padding: .5rem .6rem .6rem; border-bottom: 1px solid var(--border-subtle); }
	.who strong { color: var(--text-primary); font-size: .86rem; }
	.who span { color: var(--text-secondary); font-size: .72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sync { display: flex; align-items: center; gap: .42rem; padding: .55rem .6rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.sync i { width: 7px; height: 7px; border-radius: 99px; background: var(--success); }
	.sync.err i { background: var(--danger); }
	.menu a, .menu button { display: flex; align-items: center; gap: .55rem; width: 100%; padding: .55rem .6rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-primary); font-size: .82rem; font-weight: 600; text-decoration: none; text-align: left; }
	.menu a:hover, .menu button:hover { background: var(--surface-subtle); color: var(--accent); }
	:global(.sidebar-bottom) .menu {
		top: auto;
		bottom: calc(100% + .6rem);
		left: 0;
		right: auto;
	}
</style>
