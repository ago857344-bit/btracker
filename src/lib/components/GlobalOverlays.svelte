<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import confetti from 'canvas-confetti';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RevisionDueModal from '$lib/components/RevisionDueModal.svelte';
	import { addPlannerTask, celebration, plannerPrompt, tracker } from '$lib/stores/tracker';
	import { todayKey } from '$lib/state/dates';
	import { getLevelData } from '$lib/state/gamification';

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

	$: if ($tracker && $tracker.gamification) {
		const { level, title, currentTierXp, nextTierXp, progress } = getLevelData($tracker.gamification.xp);
		if (currentLevel > 0 && level > currentLevel) {
			levelUpData = { level, title, currentTierXp, nextTierXp, progress };
			showLevelUp = true;
			fireConfetti();
		}
		currentLevel = level;
	}

	let showUpdateModal = false;
	onMount(() => {
		if (browser && !localStorage.getItem('btracker_seen_v29_update')) {
			setTimeout(() => {
				showUpdateModal = true;
			}, 800);
		}
	});

	function dismissUpdateModal() {
		localStorage.setItem('btracker_seen_v29_update', 'true');
		showUpdateModal = false;
		fireConfetti(); // Give them a little celebration for the update!
	}

	function fireConfetti() {
		const duration = 2.5 * 1000;
		const end = Date.now() + duration;
		const interval: any = setInterval(() => {
			if (Date.now() > end) return clearInterval(interval);
			confetti({ particleCount: 30, spread: 60, origin: { x: Math.random(), y: Math.random() - 0.2 }, zIndex: 10000, colors: ['#6d5dfc', '#d99a2b', '#ffffff'] });
		}, 250);
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

<Modal open={showUpdateModal} title="" width="480px" on:close={dismissUpdateModal}>
	<div class="update-box">
		<span class="update-icon"><NavIcon name="sparkles" size={42} /></span>
		<h2>BTracker v3 is Here</h2>
		<p class="update-sub">The Gamification Engine update has arrived.</p>
		
		<div class="update-features">
			<div class="feat">
				<span class="fic" style="color: #6d5dfc; background: #6d5dfc22"><NavIcon name="trend" size={18} /></span>
				<div class="ftext">
					<b>RPG Leveling System</b>
					<span>Earn XP automatically for every minute of Deep Work. Watch your rank grow from 'Initiate' to 'JEE Conqueror'.</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic" style="color: #ff9d00; background: #ff9d0022"><NavIcon name="target" size={18} /></span>
				<div class="ftext">
					<b>Subject Elo Ratings</b>
					<span>Your performance in Mock Tests and Questions now dynamically impacts your Subject Elo. Aim for Grandmaster!</span>
				</div>
			</div>
			<div class="feat">
				<span class="fic" style="color: #00d2ff; background: #00d2ff22"><NavIcon name="clock" size={18} /></span>
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
	.lu-labels { display: flex; justify-content: space-between; font-size: .72rem; color: var(--text-secondary); margin-bottom: .6rem; }
	.lu-labels b { color: var(--text-primary); font-weight: 850; }
	.xp-bar { height: 8px; background: color-mix(in srgb, var(--text-primary), transparent 90%); border-radius: 99px; overflow: hidden; }
	.xp-fill { height: 100%; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 80%, white)); transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); }

	.update-box { display: flex; flex-direction: column; align-items: center; padding: .5rem 0 1rem; }
	.update-icon { color: var(--accent); margin-bottom: .8rem; }
	.update-box h2 { font-size: 1.8rem; font-weight: 900; letter-spacing: -.03em; color: var(--text-primary); margin: 0 0 .3rem; line-height: 1; }
	.update-sub { font-size: .85rem; color: var(--text-secondary); margin: 0 0 1.8rem; text-align: center; }
	.update-features { display: grid; gap: 1rem; width: 100%; }
	.feat { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; border-radius: 14px; background: var(--surface-subtle); border: 1px solid var(--border-subtle); }
	.fic { flex: 0 0 36px; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; }
	.ftext { display: grid; gap: .25rem; }
	.ftext b { color: var(--text-primary); font-size: .88rem; font-weight: 800; letter-spacing: -.01em; }
	.ftext span { color: var(--text-secondary); font-size: .78rem; line-height: 1.4; }
</style>
