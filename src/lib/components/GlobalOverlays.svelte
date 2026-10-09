<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import confetti from 'canvas-confetti';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RevisionDueModal from '$lib/components/RevisionDueModal.svelte';
	import { addPlannerTask, celebration, hydration, plannerPrompt, tracker, updateTracker } from '$lib/stores/tracker';
	import { loadout, unlockCtx } from '$lib/stores/cosmetics';
	import { todayKey } from '$lib/state/dates';
	import { getLevelData } from '$lib/state/gamification';
	import { allUnlockables, reqLabel, reqMet, type Unlockable, type UnlockCtx } from '$lib/state/cosmetics';
	import { presetOf, syncThemeWallpaper } from '$lib/state/themes';
	import type { ThemeId } from '$lib/types/tracker';

	let timer: ReturnType<typeof setTimeout>;
	$: if ($celebration) {
		clearTimeout(timer);
		timer = setTimeout(() => celebration.set(null), 2400);
	}

	let promptOpen = false;
	$: promptOpen = Boolean($plannerPrompt);

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

	let showAIUpdateModal = false;
	
	function dismissAIUpdateModal() {
		localStorage.setItem('btracker_seen_ai_update', 'true');
		showAIUpdateModal = false;
	}

	let tourStep = -1;
	let targetRect: DOMRect | null = null;
	
	const tourSteps = [
		{ target: '.orb', text: 'This is your AI Observer. It physically transforms based on your Elo theme and actively monitors your progress.', align: 'left' },
		{ action: () => { const o = document.querySelector('.orb') as HTMLElement; if (o && !document.querySelector('.chat-panel')) o.click(); }, delay: 400, target: '.chat-panel', text: 'Clicking it awakens your AI Mentor. It streams responses blazingly fast using Gemini.', align: 'left' },
		{ target: '.chat-input-area', text: 'It has full access to your live Elo scores and study logs. Ask it to analyze your weaknesses or explain a tough concept!', align: 'top' },
		{ action: () => { const o = document.querySelector('.orb') as HTMLElement; if (o && document.querySelector('.chat-panel')) o.click(); goto('/stats'); }, delay: 600, target: '.sec-head', text: 'Over in Stats, the AI Weakness Analyzer runs game theory on your Elo ratings to find exactly where you are losing marks.', align: 'bottom' },
		{ action: () => { goto('/todo'); }, delay: 600, target: '.btn-triage', text: 'In your To-Do list, hit AI Smart Triage to instantly rank your tasks by ROI (Return on Investment) so you study what matters most.', align: 'bottom' },
		{ action: () => { goto('/plan'); }, delay: 600, target: '.toolbar', text: 'In the Planner, you can click "Auto Balance" to let the AI instantly build a perfect, balanced schedule based on your current stamina.', align: 'bottom' },
		{ action: () => { goto('/settings'); setTimeout(() => document.getElementById('cosmetics')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }, delay: 600, target: '#cosmetics', text: 'Finally, head to Settings to manually mix-and-match your AI Orbs, Glass Opacity, and Particle effects. Enjoy the new engine!', align: 'left' }
	];

	function advanceTour() {
		tourStep++;
		if (tourStep >= tourSteps.length) {
			tourStep = -1;
			targetRect = null;
			// close chat if it was opened by the tour
			const o = document.querySelector('.orb') as HTMLElement;
			if (o) o.click();
			return;
		}
		
		const step = tourSteps[tourStep];
		if (step.action) step.action();
		
		setTimeout(() => {
			const el = document.querySelector(step.target);
			if (el) targetRect = el.getBoundingClientRect();
		}, step.delay || 50);
	}

	function startAITutorial() {
		dismissAIUpdateModal();
		setTimeout(() => {
			tourStep = -1;
			advanceTour();
		}, 300);
	}

	onMount(() => {
		if (browser && !localStorage.getItem('btracker_seen_v29_update')) {
			setTimeout(() => {
				showUpdateModal = true;
			}, 800);
		} else if (browser && !localStorage.getItem('btracker_seen_ai_update')) {
			setTimeout(() => {
				showAIUpdateModal = true;
			}, 800);
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

	let showUpdateModal = false;

	function dismissUpdateModal() {
		localStorage.setItem('btracker_seen_v29_update', 'true');
		showUpdateModal = false;
	}

	function fireConfetti(colors?: string[]) {
		const palette = colors ?? $loadout.confetti;
		const duration = 2.5 * 1000;
		const end = Date.now() + duration;
		const interval: any = setInterval(() => {
			if (Date.now() > end) return clearInterval(interval);
			confetti({ particleCount: 30, spread: 60, origin: { x: Math.random(), y: Math.random() - 0.2 }, zIndex: 10000, colors: palette });
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
	<div class="celebration" transition:fly={{ y: -18, duration: 220 }} role="status">
		<span class="check"><NavIcon name="check-circle" size={22} /></span>
		<div><b>{$celebration}</b><small>Great work — streak secured.</small></div>
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

{#if tourStep >= 0 && targetRect}
	<!-- Block all background clicks during the tour -->
	<div class="tour-backdrop"></div>
	
	<!-- The glowing spotlight cutout -->
	<div class="tour-spotlight" style="
		top: {targetRect.top - 8}px; 
		left: {targetRect.left - 8}px; 
		width: {targetRect.width + 16}px; 
		height: {targetRect.height + 16}px;
	"></div>
	
	<!-- The tooltip -->
	<div class="tour-tooltip" style="
		{tourSteps[tourStep].align === 'top' 
			? `top: ${Math.max(24, targetRect.top - 160)}px; left: ${targetRect.left + targetRect.width / 2}px; transform: translateX(-50%);`
			: tourSteps[tourStep].align === 'bottom'
			? `top: ${targetRect.bottom + 16}px; left: ${targetRect.left + targetRect.width / 2}px; transform: translateX(-50%);`
			: `bottom: 24px; top: auto; left: ${Math.max(24, targetRect.left - 330)}px; transform: none;`
		}
	">
		<h4>Feature Discovery</h4>
		<p>{tourSteps[tourStep].text}</p>
		<div class="tour-foot">
			<span>Step {tourStep + 1} of {tourSteps.length}</span>
			<button type="button" on:click={advanceTour}>{tourStep === tourSteps.length - 1 ? 'Finish' : 'Next →'}</button>
		</div>
	</div>
{/if}

<Modal open={showUpdateModal} title="" width="480px" on:close={dismissUpdateModal}>
	<div class="update-box">
		<span class="update-icon"><NavIcon name="sparkles" size={42} /></span>
		<span class="update-date">OCTOBER 2026</span>
		<h2>BTracker v3 is Here</h2>
		<p class="update-sub">The Gamification Engine update has arrived.</p>
		
		<div class="update-features">
			<div class="feat">
				<span class="fic"><NavIcon name="trend" size={18} /></span>
				<div class="ftext">
					<b>RPG Leveling System</b>
					<span>Earn XP automatically for every minute of Deep Work. Watch your rank grow from 'Initiate' to 'JEE Conqueror'.</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic"><NavIcon name="target" size={18} /></span>
				<div class="ftext">
					<b>Subject Elo Ratings</b>
					<span>Your performance in Mock Tests and Questions now dynamically impacts your Subject Elo. Aim for Grandmaster!</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic"><NavIcon name="history" size={18} /></span>
				<div class="ftext">
					<b>Retroactive Rewards</b>
					<span>We already scanned your entire study history! You've been instantly credited your rightful XP and baseline Elo.</span>
				</div>
			</div>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn solid" style="width: 100%" on:click={dismissUpdateModal}>Let's go!</button>
	</svelte:fragment>
</Modal>



<Modal open={showAIUpdateModal} title="" width="480px" solid={true} on:close={dismissAIUpdateModal}>
	<div class="update-box">
		<span class="update-icon"><NavIcon name="sparkles" size={42} /></span>
		<span class="update-date">LATEST UPDATE</span>
		<h2>Intelligent Theming & AI</h2>
		<p class="update-sub">Your study environment just got a lot smarter.</p>
		
		<div class="update-features">
			<div class="feat">
				<span class="fic"><NavIcon name="brain" size={18} /></span>
				<div class="ftext">
					<b>AI Mentor & Groq Integration</b>
					<span>Your rank-tracking orb has awakened! Click it anytime to open a chat interface powered by your local Groq API. It instantly knows your Elo stats and can resolve doubts on the fly.</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic"><NavIcon name="palette" size={18} /></span>
				<div class="ftext">
					<b>Live Wallpapers & 0% Glass</b>
					<span>Themes now support native .mp4 background videos. Drop the new Glass Opacity slider to 0% in Settings to make your widgets perfectly crystal clear!</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic"><NavIcon name="crown" size={18} /></span>
				<div class="ftext">
					<b>Shape-shifting Elo Orbs</b>
					<span>The AI Orb now physically transforms to match your equipped Elo theme — from the sacred Golden Diamond to the Cyberpunk Square.</span>
				</div>
			</div>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<a href="/settings" class="btn ghost" style="display:inline-flex;align-items:center;text-decoration:none;" on:click={dismissAIUpdateModal}>Go to Settings</a>
		<button type="button" class="btn solid" style="flex:1" on:click={startAITutorial}>Guided AI Tutorial</button>
	</svelte:fragment>
</Modal>

<style>
	.celebration { position: fixed; z-index: 150; top: 1.1rem; left: 50%; display: flex; align-items: center; gap: .7rem; padding: .75rem 1.15rem; border-radius: 16px; background: #0f2e1c; border: 1px solid #245c3a; color: #d8ffe7; box-shadow: 0 18px 44px rgb(4 20 10 / 45%); transform: translateX(-50%); }
	.celebration .check { display: grid; place-items: center; color: #4ade80; }
	.celebration b { display: block; font-size: .88rem; letter-spacing: -.01em; }
	.celebration small { color: #8fd6a8; font-size: .68rem; }

	.prompt-copy { margin: 0; color: var(--text-secondary); font-size: .85rem; }
	.prompt-copy b { color: var(--text-primary); }
	.btn { height: 44px; padding: 0 .95rem; border-radius: 11px; font-size: .78rem; font-weight: 750; border: 1px solid transparent; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.ghost:hover { color: var(--text-primary); }
	.btn.solid { color: white; background: var(--accent); }

	.level-up-box { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1rem 0 2rem; }
	.lu-icon { color: var(--accent); margin-bottom: 1rem; filter: drop-shadow(0 0 12px color-mix(in srgb, var(--accent), transparent 60%)); }
	.level-up-box h2 { font-size: 2.2rem; font-weight: 900; letter-spacing: -.03em; color: var(--text-primary); margin: 0 0 .5rem; line-height: 1; }
	.level-up-box p { font-size: .9rem; color: var(--text-secondary); margin: 0 0 1.5rem; }
	.level-up-box p b { color: var(--text-primary); }
	.lu-rank { margin: 0 !important; font-size: .8rem !important; font-weight: 700; color: var(--text-secondary) !important; text-transform: uppercase; letter-spacing: .08em; }
	.lu-rank span { display: block; font-size: 1.6rem; font-weight: 900; letter-spacing: -.04em; color: var(--accent); margin-top: .4rem; text-transform: none; }

	.lu-progress { width: 100%; margin-top: 1.8rem; background: var(--surface-subtle); padding: 1.2rem; border-radius: 14px; border: 1px solid var(--border-subtle); text-align: left; }

	.unlock-box { display: flex; flex-direction: column; align-items: center; text-align: center; padding: .8rem 0 1.4rem; }
	.unlock-icon { filter: drop-shadow(0 0 14px currentColor); margin-bottom: .7rem; }
	.unlock-kicker { margin: 0 0 .7rem; padding: .22rem .6rem; border-radius: 7px; font-size: .64rem; font-weight: 850; letter-spacing: .12em; }
	.unlock-box h2 { margin: 0 0 .4rem; font-size: 1.9rem; font-weight: 900; letter-spacing: -.03em; line-height: 1.05; text-shadow: 0 0 18px currentColor; }
	.unlock-sub { margin: 0 0 1.1rem; color: var(--text-secondary); font-size: .86rem; }
	.unlock-wp { width: 100%; height: 96px; border-radius: 14px; border: 1px solid var(--border-subtle); }
	.also { margin: 1rem 0 .45rem; color: var(--text-secondary); font-size: .62rem; font-weight: 850; letter-spacing: .12em; }
	.also-list { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem; }
	.also-chip { display: inline-flex; align-items: center; gap: .4rem; padding: .3rem .6rem .3rem .35rem; border: 1px solid var(--border-subtle); border-radius: 99px; background: var(--surface-subtle); color: var(--text-primary); font-size: .72rem; font-weight: 750; }
	.also-chip i { width: 16px; height: 16px; border-radius: 99px; }
	.also-chip small { color: var(--text-secondary); font-size: .6rem; font-weight: 650; }
	.loadout-link { margin-top: 1rem; color: var(--accent); font-size: .74rem; font-weight: 750; text-decoration: none; }
	.loadout-link:hover { text-decoration: underline; }
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

	.tour-backdrop { position: fixed; inset: 0; z-index: 10000; pointer-events: auto; }
	.tour-spotlight { position: fixed; z-index: 10001; border-radius: 16px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.7), 0 0 20px var(--accent); pointer-events: none; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
	.tour-tooltip { position: fixed; z-index: 10002; width: 300px; background: var(--surface-canvas); color: var(--text-primary); border: 1px solid var(--accent); border-radius: 12px; padding: 1.2rem; box-shadow: 0 16px 40px rgba(0,0,0,0.4); color: var(--text-primary); transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
	.tour-tooltip h4 { margin: 0 0 0.5rem; color: var(--accent); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; }
	.tour-tooltip p { margin: 0 0 1.2rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); }
	.tour-foot { display: flex; justify-content: space-between; align-items: center; }
	.tour-foot span { font-size: 0.75rem; color: var(--text-secondary); font-weight: 700; }
	.tour-foot button { background: var(--accent); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; transition: transform 0.2s; }
	.tour-foot button:active { transform: scale(0.95); }

</style>
