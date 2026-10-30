<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { celebrateConfetti } from '$lib/utils/confetti';
	import { celebration, hydration, intelligence, streakDays, tracker, updateTracker, triggerToast, useStreakFreeze, earnStreakFreeze, isStreakDayMet } from '$lib/stores/tracker';
	import { todayKey, addDaysKey, focusMinutesOn } from '$lib/state/dates';

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

	$: yesterday = addDaysKey(todayKey(), -1);
	$: dayBeforeYesterday = addDaysKey(todayKey(), -2);
	$: streakNeed = ($tracker.meta?.streakGoalH || 1) * 60;
	$: yesterdayMet = isStreakDayMet($tracker, yesterday);
	$: dayBeforeMet = isStreakDayMet($tracker, dayBeforeYesterday);
	$: todayMet = isStreakDayMet($tracker, todayKey());
	$: yesterdayFrozen = ($tracker.streakFreezes?.usedDates || []).includes(yesterday);
	$: canShieldYesterday = ($tracker.streakFreezes?.available ?? 0) > 0 && !yesterdayMet && !yesterdayFrozen && dayBeforeMet;

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

	$: currentStreak = $streakDays;
	$: lastClaimStreak = $tracker.streakFreezes?.lastFreezeClaimStreak ?? 0;
	$: nextMilestoneStreak = Math.floor(lastClaimStreak / 7) * 7 + 7;
	$: canClaimFree = currentStreak >= 7 && currentStreak >= nextMilestoneStreak;
	$: userXp = $tracker.gamification?.xp || 0;
	$: canBuyWithXp = userXp >= 500;

	function handleClaimFreeze() {
		if (($tracker.streakFreezes?.available ?? 2) >= 4) {
			triggerToast('Freeze inventory full (max 4 shields).');
			return;
		}

		if (canClaimFree) {
			updateTracker((state) => {
				if (!state.streakFreezes) state.streakFreezes = { available: 2, usedDates: [] };
				state.streakFreezes.available = Math.min(4, state.streakFreezes.available + 1);
				state.streakFreezes.lastFreezeClaimStreak = currentStreak;
			});
			celebration.set(`🎉 Milestone reached! Claimed 1 free Streak Freeze for your ${currentStreak}-day streak!`);
			celebrateConfetti({ count: 60 });
		} else if (canBuyWithXp) {
			updateTracker((state) => {
				if (!state.streakFreezes) state.streakFreezes = { available: 2, usedDates: [] };
				if (!state.gamification) state.gamification = { xp: 0, level: 1, elo: { P: 300, C: 300, M: 300 } };
				if (state.gamification) {
					state.gamification.xp = Math.max(0, state.gamification.xp - 500);
				}
				state.streakFreezes.available = Math.min(4, state.streakFreezes.available + 1);
			});
			celebration.set('🛡️ Claimed 1 Streak Freeze (spent 500 XP)!');
			celebrateConfetti({ count: 40 });
		} else {
			triggerToast(`Need 500 XP or a 7-day streak milestone to claim a freeze (Current: ${currentStreak}d streak, ${userXp} XP).`);
		}
	}
</script>

<button class="streak-button" class:lost={$streakDays === 0} class:frozen={$streakDays > 0 && (yesterdayFrozen || (!yesterdayMet && dayBeforeMet))} type="button" aria-label="Streak and badges" on:click={() => (open = true)}>
	<span class="flame">
		{#if $streakDays === 0}
			<NavIcon name="flame" size={16} />
		{:else if yesterdayFrozen || (!yesterdayMet && dayBeforeMet)}
			<span style="font-size: 13px;">🛡️</span>
		{:else}
			<NavIcon name="flame" size={16} />
		{/if}
	</span>
	<span class="count">{$streakDays}</span>
</button>

<Modal open={open} title="STREAK &amp; BADGES" width="560px" on:close={close}>
	<div class="hero">
		<div class="stat main" class:lost={$streakDays === 0} class:frozen={$streakDays > 0 && (yesterdayFrozen || (!yesterdayMet && dayBeforeMet))}>
			<span class="flame big">
				{#if $streakDays === 0}
					<NavIcon name="flame" size={22} />
				{:else if yesterdayFrozen || (!yesterdayMet && dayBeforeMet)}
					<span style="font-size: 18px;">🛡️</span>
				{:else}
					<NavIcon name="flame" size={22} />
				{/if}
			</span>
			<div><b>{$streakDays}</b><small>day streak</small></div>
		</div>
		<div class="stat"><div><b>{$intelligence.maxStreak}</b><small>best ever</small></div></div>
		<div class="stat"><div><b>{$intelligence.lifetimeHours}h</b><small>focused</small></div></div>
	</div>

	<!-- Live Streak Status Banner -->
	{#if $streakDays === 0}
		<div class="streak-alert lost">
			<span class="alert-icon">💔</span>
			<div>
				<b>Streak Lost (0 Days)</b>
				<small>You missed 2 or more consecutive days without studying. Log at least {$tracker.meta?.streakGoalH || 1}h of focus today to light a new streak!</small>
			</div>
		</div>
	{:else if yesterdayFrozen || (!yesterdayMet && dayBeforeMet)}
		<div class="streak-alert frozen">
			<span class="alert-icon">🛡️</span>
			<div>
				<b>Streak Freeze Active</b>
				<small>Yesterday was shielded with a Streak Freeze! Your {$streakDays}-day flame is safe. Complete today's goal to keep growing.</small>
			</div>
		</div>
	{:else if todayMet}
		<div class="streak-alert secured">
			<span class="alert-icon">🔥</span>
			<div>
				<b>Today's Streak Secured!</b>
				<small>You met today's goal ({focusMinutesOn($tracker.log, todayKey())}m focused). Your {$streakDays}-day streak is burning bright!</small>
			</div>
		</div>
	{:else}
		<div class="streak-alert active">
			<span class="alert-icon">⚡</span>
			<div>
				<b>{$streakDays}-Day Streak on the Line</b>
				<small>Study at least {$tracker.meta?.streakGoalH || 1}h today. Single missed days are shielded by Streak Freeze; missing 2+ days loses your streak.</small>
			</div>
		</div>
	{/if}

	<!-- Streak Freeze Protection Card -->
	<div class="freeze-card">
		<div class="freeze-left">
			<span class="shield-icon">🛡️</span>
			<div>
				<b>Streak Freeze Protection: {$tracker.streakFreezes?.available ?? 2} available</b>
				<small>Rule: 1 missed day is shielded by Streak Freeze. Missing 2+ consecutive days loses your streak.</small>
			</div>
		</div>
		<div class="freeze-actions">
			{#if ($tracker.streakFreezes?.available ?? 2) < 4}
				<button
					type="button"
					class="btn-freeze"
					on:click={handleClaimFreeze}
					title={canClaimFree ? `Free claim at ${currentStreak}-day milestone!` : canBuyWithXp ? `Spend 500 XP to claim a freeze` : `Requires 500 XP or a 7-day streak milestone`}
				>
					{#if canClaimFree}
						+ Claim Free (7d Milestone)
					{:else if canBuyWithXp}
						+ Claim Freeze (500 XP)
					{:else}
						+ Claim (500 XP or 7d)
					{/if}
				</button>
			{/if}
			{#if canShieldYesterday}
				<button type="button" class="btn-freeze shield" on:click={() => { useStreakFreeze(yesterday); celebration.set('Yesterday shielded with a Streak Freeze!'); }}>
					Shield Yesterday
				</button>
			{/if}
		</div>
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
	.streak-button {
		display: inline-flex;
		align-items: center;
		gap: .34rem;
		height: 36px;
		padding: 0 .72rem;
		border: 1.5px solid color-mix(in srgb, var(--accent) 60%, var(--border-subtle));
		border-radius: 11px;
		color: var(--text-primary);
		background: color-mix(in srgb, var(--accent) 24%, var(--surface-panel));
		font-family: inherit;
		box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: all 0.2s var(--ease-ios-spring, ease);
	}
	.streak-button:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 34%, var(--surface-panel));
		box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
	}
	.streak-button .flame {
		display: grid;
		place-items: center;
		color: var(--accent, #f59e0b);
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 75%, transparent));
	}
	.streak-button .count {
		font-size: .82rem;
		font-weight: 850;
		letter-spacing: -.02em;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		text-shadow: 0 0 8px color-mix(in srgb, var(--accent) 70%, transparent);
	}

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

	.freeze-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		margin: 0.85rem 0 0.4rem;
		border-radius: 14px;
		background: color-mix(in srgb, #38bdf8 10%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, #38bdf8 30%, var(--border-subtle));
	}
	.freeze-left {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.shield-icon {
		font-size: 1.4rem;
		line-height: 1;
	}
	.freeze-left b {
		display: block;
		font-size: 0.84rem;
		color: var(--text-primary);
	}
	.freeze-left small {
		display: block;
		font-size: 0.7rem;
		color: var(--text-secondary);
	}
	.freeze-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.btn-freeze {
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, #38bdf8 40%, var(--border-subtle));
		background: var(--surface-panel);
		color: #38bdf8;
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}
	.btn-freeze:hover {
		background: #38bdf8;
		color: #071720;
	}
	.streak-button.lost {
		border-color: color-mix(in srgb, var(--accent) 40%, var(--border-subtle));
		opacity: 0.9;
	}
	.streak-button.lost .flame {
		color: color-mix(in srgb, var(--accent) 55%, var(--text-tertiary));
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent) 40%, transparent));
	}
	.streak-button.frozen {
		border-color: #38bdf8;
		background: color-mix(in srgb, #38bdf8 20%, var(--surface-panel));
	}
	.streak-button.frozen .count {
		color: #38bdf8;
	}

	.stat.main.lost {
		border-color: var(--border-subtle);
		background: var(--surface-subtle);
	}
	.stat.main.lost .flame.big {
		color: var(--text-tertiary);
		filter: grayscale(1);
	}
	.stat.main.frozen {
		border-color: color-mix(in srgb, #38bdf8, transparent 40%);
		background: color-mix(in srgb, #38bdf8, transparent 90%);
	}
	.stat.main.frozen b {
		color: #38bdf8;
	}

	.streak-alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.95rem;
		border-radius: 12px;
		margin: 0.75rem 0 0.25rem;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
	}
	.streak-alert.lost {
		border-color: color-mix(in srgb, #ef4444 40%, var(--border-subtle));
		background: color-mix(in srgb, #ef4444 10%, var(--surface-subtle));
	}
	.streak-alert.lost b { color: #ef4444; }
	.streak-alert.frozen {
		border-color: color-mix(in srgb, #38bdf8 40%, var(--border-subtle));
		background: color-mix(in srgb, #38bdf8 10%, var(--surface-subtle));
	}
	.streak-alert.frozen b { color: #38bdf8; }
	.streak-alert.secured {
		border-color: color-mix(in srgb, #22c55e 40%, var(--border-subtle));
		background: color-mix(in srgb, #22c55e 10%, var(--surface-subtle));
	}
	.streak-alert.secured b { color: #22c55e; }
	.streak-alert.active {
		border-color: color-mix(in srgb, #f59e0b 40%, var(--border-subtle));
		background: color-mix(in srgb, #f59e0b 10%, var(--surface-subtle));
	}
	.streak-alert.active b { color: #f59e0b; }
	.alert-icon { font-size: 1.35rem; line-height: 1; flex-shrink: 0; }
	.streak-alert b { display: block; font-size: 0.82rem; font-weight: 750; }
	.streak-alert small { display: block; font-size: 0.72rem; color: var(--text-secondary); line-height: 1.35; }

	@media (max-width: 480px) {
		.hero {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.stat.main {
			justify-content: center;
		}
		.badges {
			grid-template-columns: repeat(2, 1fr);
		}
		.freeze-card {
			flex-direction: column;
			align-items: stretch;
			gap: 0.6rem;
		}
		.freeze-actions {
			justify-content: flex-end;
		}
	}
</style>
