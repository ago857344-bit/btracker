<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { celebration, hydration, intelligence, streakDays } from '$lib/stores/tracker';

	interface Badge { id: string; icon: string; name: string; need: number; unit: 'day' | 'hour'; label: string }

	const BADGES: Badge[] = [
		{ id: 's3', icon: '🔥', name: 'Kindling', need: 3, unit: 'day', label: '3-day streak' },
		{ id: 's7', icon: '⚡', name: 'On Fire', need: 7, unit: 'day', label: '7-day streak' },
		{ id: 's14', icon: '🌋', name: 'Blaze', need: 14, unit: 'day', label: '14-day streak' },
		{ id: 's30', icon: '🚀', name: 'Inferno', need: 30, unit: 'day', label: '30-day streak' },
		{ id: 's60', icon: '💎', name: 'Unstoppable', need: 60, unit: 'day', label: '60-day streak' },
		{ id: 's100', icon: '👑', name: 'Legendary', need: 100, unit: 'day', label: '100-day streak' },
		{ id: 'h10', icon: '🌱', name: 'Warm-Up', need: 10, unit: 'hour', label: '10h focused' },
		{ id: 'h50', icon: '⏱️', name: 'Grinder', need: 50, unit: 'hour', label: '50h focused' },
		{ id: 'h100', icon: '💯', name: 'Centurion', need: 100, unit: 'hour', label: '100h focused' },
		{ id: 'h250', icon: '🏃', name: 'Marathoner', need: 250, unit: 'hour', label: '250h focused' },
		{ id: 'h500', icon: '🏔️', name: 'Titan', need: 500, unit: 'hour', label: '500h focused' },
		{ id: 'h1000', icon: '🧠', name: 'Obsessed', need: 1000, unit: 'hour', label: '1000h focused' }
	];

	let open = false;
	let seen: string[] | null = null;

	// Badges are derived from never-decreasing figures (best-ever streak, lifetime hours),
	// so an unlock is permanent without persisting anything extra.
	$: unlockedSet = new Set(
		BADGES.filter((b) => (b.unit === 'day' ? $intelligence.maxStreak : $intelligence.lifetimeHours) >= b.need).map((b) => b.id)
	);

	// Celebrate only unlocks that happen live; the first post-hydration evaluation is the baseline.
	$: if ($hydration === 'ready' || $hydration === 'error') {
		const keys = unlockedSet ? [...unlockedSet] : [];
		if (seen === null) {
			seen = keys;
		} else {
			const fresh = keys.filter((k) => !seen!.includes(k));
			if (fresh.length) {
				seen = keys;
				const badge = BADGES.find((b) => b.id === fresh[0]);
				celebration.set(`Badge unlocked — ${badge?.icon ?? '🏆'} ${badge?.name ?? fresh[0]}!`);
			}
		}
	}

	const close = () => { open = false; };
</script>

<button class="streak-button" type="button" aria-label="Streak and badges" on:click={() => (open = true)}>
	<span class="flame"><NavIcon name="flame" size={16} /></span>
	<span class="count">{$streakDays}</span>
</button>

<Modal open={open} title="STREAK &amp; BADGES" width="560px" on:close={close}>
	<div class="hero">
		<div class="stat main">
			<span class="flame big"><NavIcon name="flame" size={22} /></span>
			<div><b>{$streakDays}</b><small>day streak</small></div>
		</div>
		<div class="stat"><div><b>{$intelligence.maxStreak}</b><small>best ever</small></div></div>
		<div class="stat"><div><b>{$intelligence.lifetimeHours}h</b><small>focused</small></div></div>
	</div>

	<p class="label">STREAK MILESTONES</p>
	<div class="badges">
		{#each BADGES.filter((b) => b.unit === 'day') as b (b.id)}
			<div class="badge" class:on={unlockedSet.has(b.id)}>
				<span class="emoji">{unlockedSet.has(b.id) ? b.icon : '🔒'}</span>
				<b>{b.name}</b>
				<small>{b.label}</small>
			</div>
		{/each}
	</div>

	<p class="label">FOCUS HOURS</p>
	<div class="badges">
		{#each BADGES.filter((b) => b.unit === 'hour') as b (b.id)}
			<div class="badge" class:on={unlockedSet.has(b.id)}>
				<span class="emoji">{unlockedSet.has(b.id) ? b.icon : '🔒'}</span>
				<b>{b.name}</b>
				<small>{b.label}</small>
			</div>
		{/each}
	</div>
</Modal>

<style>
	.streak-button { display: inline-flex; align-items: center; gap: .34rem; height: 36px; padding: 0 .72rem; border: 1px solid var(--border-subtle); border-radius: 11px; color: var(--text-primary); background: var(--surface-panel); font-family: inherit; }
	.streak-button:hover { border-color: #f59e0b; }
	.streak-button .flame { display: grid; place-items: center; color: #f59e0b; }
	.streak-button .count { font-size: .82rem; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }

	.hero { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: .6rem; margin-bottom: .4rem; }
	.stat { display: flex; align-items: center; justify-content: center; gap: .6rem; padding: .85rem .9rem; border: 1px solid var(--border-subtle); border-radius: 15px; background: var(--surface-subtle); }
	.stat.main { justify-content: flex-start; border-color: color-mix(in srgb, #f59e0b, transparent 55%); background: color-mix(in srgb, #f59e0b, transparent 92%); }
	.stat.main .flame.big { display: grid; place-items: center; color: #f59e0b; }
	.stat b { display: block; font-size: 1.25rem; font-weight: 850; letter-spacing: -.03em; line-height: 1.05; }
	.stat small { color: var(--text-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
	.stat.main b { font-size: 1.55rem; }

	.label { margin: 1rem 0 .5rem; color: var(--text-secondary); font-size: .63rem; font-weight: 800; letter-spacing: .09em; }
	.badges { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }
	.badge { display: grid; gap: .12rem; justify-items: center; padding: .7rem .5rem .6rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-subtle); text-align: center; filter: grayscale(1); opacity: .62; }
	.badge .emoji { font-size: 1.3rem; line-height: 1.2; }
	.badge b { font-size: .72rem; font-weight: 800; letter-spacing: -.01em; }
	.badge small { color: var(--text-secondary); font-size: .62rem; }
	.badge.on { filter: none; opacity: 1; border-color: color-mix(in srgb, #f59e0b, transparent 45%); background: color-mix(in srgb, #f59e0b, transparent 94%); box-shadow: 0 4px 14px color-mix(in srgb, #f59e0b, transparent 86%); }
</style>
