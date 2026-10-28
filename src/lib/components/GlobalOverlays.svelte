<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RevisionDueModal from '$lib/components/RevisionDueModal.svelte';
	import { addPlannerTask, celebration, hydration, plannerPrompt, tracker, updateTracker, targetsModalOpen } from '$lib/stores/tracker';
	import { loadout, unlockCtx } from '$lib/stores/cosmetics';
	import { todayKey } from '$lib/state/dates';
	import { getLevelData } from '$lib/state/gamification';
	import { allUnlockables, reqLabel, reqMet, type Unlockable, type UnlockCtx } from '$lib/state/cosmetics';
	import { presetOf, syncThemeWallpaper } from '$lib/state/themes';
	import type { ThemeId } from '$lib/types/tracker';

	let timer: ReturnType<typeof setTimeout>;
	$: if ($celebration) {
		clearTimeout(timer);
		const isActionable = typeof $celebration === 'object' && Boolean($celebration?.onAction);
		timer = setTimeout(() => celebration.set(null), isActionable ? 5500 : 2400);
	}

	let promptOpen = false;
	$: promptOpen = Boolean($plannerPrompt);

	onDestroy(() => {
		clearTimeout(timer);
	});

	function confirmPrompt() {
		const title = $plannerPrompt;
		plannerPrompt.set(null);
		if (title) addPlannerTask(todayKey(), { title, col: 0, s: '', st: '', en: '', rec: 'once', hrs: 1, test: false });
	}

	let currentLevel = 0;
	let showLevelUp = false;
	let levelUpData = { level: 1, title: '', currentTierXp: 0, nextTierXp: 500, progress: 0 };

	let readyToCelebrate = false;
	const LEGACY_THEME_KEY = 'btracker_theme_unlocks_seen';
	const UNLOCK_KEY = 'btracker_cosmetic_unlocks_seen';
	const UNLOCKABLES = allUnlockables();
	/** null until seeded, so upgrading users are not flooded with items they already earned. */
	let seenUnlocks: Set<string> | null = null;
	let unlockBatch: Unlockable[] = [];
	$: primaryUnlock = unlockBatch[0] ?? null;
	$: primaryTheme = primaryUnlock?.kind === 'theme' ? presetOf(primaryUnlock.id) : null;

	let showSetupWizardUpdateModal = false;

	function dismissSetupWizardUpdateModal() {
		if (browser) {
			try {
				localStorage.setItem('btracker_seen_setup_wizard_v1', 'true');
			} catch {}
		}
		showSetupWizardUpdateModal = false;
	}

	function launchSetupWizardFromUpdateModal() {
		dismissSetupWizardUpdateModal();
		targetsModalOpen.set(true);
	}

	onMount(() => {
		if (browser && !localStorage.getItem('btracker_seen_setup_wizard_v1')) {
			setTimeout(() => {
				if ($tracker.onboarded) {
					showSetupWizardUpdateModal = true;
				}
			}, 700);
		}
		if (browser) {
			try {
				const raw = localStorage.getItem(UNLOCK_KEY);
				if (raw) seenUnlocks = new Set(JSON.parse(raw));
			} catch {}
		}
		setTimeout(() => { readyToCelebrate = true; }, 2000); // Prevent confetti on initial DB hydration
	});

	$: if ($tracker && $tracker.gamification) {
		const { level, title, currentTierXp, nextTierXp, progress } = getLevelData($tracker.gamification.xp);
		if (readyToCelebrate && currentLevel > 0 && level > currentLevel) {
			levelUpData = { level, title, currentTierXp, nextTierXp, progress };
			showLevelUp = true;
			fireConfetti();
		}
		currentLevel = level;
	}

	$: if (browser && readyToCelebrate && $hydration === 'ready' && unlockBatch.length === 0) checkUnlocks($unlockCtx);

	function persistSeen() {
		localStorage.setItem(UNLOCK_KEY, JSON.stringify([...(seenUnlocks ?? [])]));
	}

	function checkUnlocks(ctx: UnlockCtx) {
		const met = UNLOCKABLES.filter((u) => reqMet(u.unlock, ctx));
		if (!seenUnlocks) {
			let legacy = new Set<string>();
			try { legacy = new Set(JSON.parse(localStorage.getItem(LEGACY_THEME_KEY) || '[]')); } catch {}
			// Keep pending theme ceremonies the old tracker hadn't shown yet; everything else already earned is silent.
			seenUnlocks = new Set(met.filter((u) => u.kind !== 'theme' || legacy.has(u.id)).map((u) => u.key));
			persistSeen();
		}
		const fresh = met.filter((u) => !seenUnlocks!.has(u.key));
		if (!fresh.length) return;
		for (const u of fresh) seenUnlocks.add(u.key);
		persistSeen();
		unlockBatch = fresh.sort((a, b) => Number(a.kind !== 'theme') - Number(b.kind !== 'theme') || b.unlock.min - a.unlock.min);
		const lead = unlockBatch[0];
		fireConfetti(lead.kind === 'theme' ? presetOf(lead.id).confetti : undefined);
	}

	async function fireConfetti(colors?: string[]) {
		const confettiMod = (await import('canvas-confetti')).default;
		const palette = colors ?? $loadout.confetti;
		const duration = 2.5 * 1000;
		const end = Date.now() + duration;
		const interval: any = setInterval(() => {
			if (Date.now() > end) return clearInterval(interval);
			confettiMod({ particleCount: 30, spread: 60, origin: { x: Math.random(), y: Math.random() - 0.2 }, zIndex: 10000, colors: palette });
		}, 250);
	}

	function applyUnlock() {
		const lead = primaryUnlock;
		if (lead) {
			updateTracker((s) => {
				if (lead.kind === 'theme') {
					const id = lead.id as ThemeId;
					s.theme = id;
					s.ui.accent = presetOf(id).accent;
				} else if (lead.kind === 'aurora') {
					s.ui.cosmetics = { ...s.ui.cosmetics, aurora: true };
				} else {
					s.ui.cosmetics = { ...s.ui.cosmetics, [lead.kind]: lead.id };
				}
				syncThemeWallpaper(s);
			});
		}
		unlockBatch = [];
	}
</script>

{#if $celebration}
	{@const toast = typeof $celebration === 'string' ? { text: $celebration, actionLabel: undefined, onAction: undefined } : $celebration}
	<div class="celebration" transition:fly={{ y: -18, duration: 220 }} role="status">
		<span class="check"><NavIcon name="check-circle" size={22} /></span>
		<div><b>{toast.text}</b><small>{toast.onAction ? 'Action completed' : 'Great work — streak secured.'}</small></div>
		{#if toast.onAction}
			<button
				type="button"
				class="undo-toast-btn"
				on:click={() => {
					toast.onAction?.();
					celebration.set(null);
				}}
			>
				{toast.actionLabel || 'Undo'}
			</button>
		{/if}
	</div>
{/if}

<RevisionDueModal />

<Modal open={promptOpen} title="Add to Planner?" width="420px" on:close={() => plannerPrompt.set(null)}>
	<p class="prompt-copy">Add <b>{$plannerPrompt}</b> to today's planner?</p>
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => plannerPrompt.set(null)}>No, thanks</button>
		<button type="button" class="btn solid" on:click={confirmPrompt}>Add task</button>
	</svelte:fragment>
</Modal>

<Modal open={showLevelUp} title="" width="420px" on:close={() => showLevelUp = false}>
	<div class="level-up-box">
		<span class="lu-icon"><NavIcon name="trophy" size={48} /></span>
		<h2>LEVEL UP!</h2>
		<p>Congratulations, <b>{$tracker?.meta?.name || 'My Account'}</b>!<br/>You've officially reached <b>Level {levelUpData.level}</b>!</p>
		<p class="lu-rank">You are now a<br/><span>{levelUpData.title}</span></p>

		<div class="lu-progress">
			<div class="lu-labels">
				<span><b>Lv {levelUpData.level}</b> ({levelUpData.currentTierXp} XP)</span>
				<span><b>Lv {levelUpData.level + 1}</b> ({levelUpData.nextTierXp} XP)</span>
			</div>
			<div class="xp-bar">
				<div class="xp-fill" style="width: {levelUpData.progress}%"></div>
			</div>
		</div>
	</div>
		<svelte:fragment slot="footer">
			<button type="button" class="btn solid" style="width: 100%" on:click={() => showLevelUp = false}>Awesome!</button>
		</svelte:fragment>
	</Modal>

<Modal open={showSetupWizardUpdateModal} title="" width="490px" on:close={dismissSetupWizardUpdateModal}>
	<div class="update-box">
		<span class="update-icon"><NavIcon name="sparkles" size={42} /></span>
		<span class="update-date">NEW FEATURE • SETUP WIZARD</span>
		<h2>Battle Station Setup Wizard</h2>
		<p class="update-sub">Personalize your study space with our brand-new interactive setup wizard.</p>
		
		<div class="update-features">
			<div class="feat">
				<span class="fic"><NavIcon name="grid" size={18} /></span>
				<div class="ftext">
					<b>3 Dashboard Layout Structures</b>
					<span>Switch seamlessly between Classic 3-Column, Ultra-Sleek Minimalist, or Asymmetric Deep Work Focus presets with live device previews.</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic"><NavIcon name="target" size={18} /></span>
				<div class="ftext">
					<b>Exam Targets &amp; Daily Quotas</b>
					<span>Select your exams (JEE Mains, Advanced, BITSAT) and configure realistic daily question goals and weekday/weekend focus hours.</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic"><NavIcon name="trend" size={18} /></span>
				<div class="ftext">
					<b>Interactive Streak Simulation</b>
					<span>Test out BTracker's single-day streak freeze shield to understand consistency protection before you begin.</span>
				</div>
			</div>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={dismissSetupWizardUpdateModal}>Skip for now</button>
		<button type="button" class="btn solid" style="flex: 1" on:click={launchSetupWizardFromUpdateModal}>
			Launch Setup Wizard 🚀
		</button>
	</svelte:fragment>
</Modal>

<style>
	.celebration { position: fixed; z-index: 150; top: max(env(safe-area-inset-top, 0px) + 0.6rem, 1.1rem); left: 50%; display: flex; align-items: center; gap: .7rem; padding: .75rem 1.15rem; border-radius: 16px; background: #0f2e1c; border: 1px solid #245c3a; color: #d8ffe7; box-shadow: 0 18px 44px rgb(4 20 10 / 45%); transform: translateX(-50%); width: max-content; max-width: calc(100vw - 2rem); box-sizing: border-box; }
	.celebration .check { display: grid; place-items: center; color: #4ade80; flex-shrink: 0; }
	.celebration b { display: block; font-size: .88rem; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.celebration small { color: #8fd6a8; font-size: .68rem; }
	.undo-toast-btn {
		margin-left: 0.6rem;
		padding: 0.28rem 0.65rem;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: 8px;
		background: rgba(74, 222, 128, 0.22);
		color: #4ade80;
		border: 1px solid rgba(74, 222, 128, 0.45);
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}
	.undo-toast-btn:hover {
		background: rgba(74, 222, 128, 0.35);
		color: #ffffff;
		transform: scale(1.04);
	}

	.prompt-copy { margin: 0; color: var(--text-secondary); font-size: .85rem; }
	.prompt-copy b { color: var(--text-primary); }
	.btn { height: 44px; padding: 0 .95rem; border-radius: 11px; font-size: .78rem; font-weight: 750; border: 1px solid transparent; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.ghost:hover { color: var(--text-primary); }
	.btn.solid { color: var(--accent-contrast, white); background: var(--accent); }

	.level-up-box { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1rem 0 2rem; }
	.lu-icon { color: var(--accent); margin-bottom: 1rem; filter: drop-shadow(0 0 12px color-mix(in srgb, var(--accent), transparent 60%)); }
	.level-up-box h2 { font-size: 2.2rem; font-weight: 900; letter-spacing: -.03em; color: var(--text-primary); margin: 0 0 .5rem; line-height: 1; }
	.level-up-box p { font-size: .9rem; color: var(--text-secondary); margin: 0 0 1.5rem; }
	.level-up-box p b { color: var(--text-primary); }
	.lu-rank { margin: 0 !important; font-size: .8rem !important; font-weight: 700; color: var(--text-secondary) !important; text-transform: uppercase; letter-spacing: .08em; }
	.lu-rank span { display: block; font-size: 1.6rem; font-weight: 900; letter-spacing: -.04em; color: var(--accent); margin-top: .4rem; text-transform: none; }

	.lu-progress { width: 100%; margin-top: 1.8rem; background: var(--surface-subtle); padding: 1.2rem; border-radius: 14px; border: 1px solid var(--border-subtle); text-align: left; }

	.lu-labels { display: flex; justify-content: space-between; font-size: .72rem; color: var(--text-secondary); margin-bottom: .6rem; }
	.lu-labels b { color: var(--text-primary); font-weight: 850; }
	.xp-bar { height: 8px; background: color-mix(in srgb, var(--text-primary), transparent 90%); border-radius: 99px; overflow: hidden; }
	.xp-fill { height: 100%; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 80%, white)); transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); }

	.update-box { display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; background: var(--surface-canvas);  }
	.update-icon { color: var(--accent); margin-bottom: .8rem; }
	.update-date { font-size: .65rem; font-weight: 800; letter-spacing: .1em; color: var(--accent); margin-bottom: .4rem; text-transform: uppercase; background: color-mix(in srgb, var(--accent) 15%, transparent); padding: .2rem .5rem; border-radius: 6px; }
	.update-box h2 { font-size: 1.8rem; font-weight: 900; letter-spacing: -.03em; color: var(--text-primary); margin: 0 0 .3rem; line-height: 1; }
	.update-sub { font-size: .85rem; color: var(--text-secondary); margin: 0 0 1.8rem; text-align: center; }
	.update-features { display: grid; gap: 1rem; width: 100%; }
	.feat { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; border-radius: 14px; background: var(--surface-subtle); border: 1px solid var(--border-subtle); }
	.fic { flex: 0 0 36px; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); }
	.ftext { display: grid; gap: .25rem; }
	.ftext b { color: var(--text-primary); font-size: .88rem; font-weight: 800; letter-spacing: -.01em; }
	.ftext span { color: var(--text-secondary); font-size: .78rem; line-height: 1.4; }
</style>
