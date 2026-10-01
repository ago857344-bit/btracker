<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	const dispatch = createEventDispatcher<{ close: void }>();
	export let open = false;

	function handleClose() {
		open = false;
		dispatch('close');
	}
</script>

<Modal open={open} title="HOW THE ACTIVE RECALL HUB WORKS" width="600px" on:close={handleClose}>
	<div class="manual-content">
		
		<div class="card">
			<h4><NavIcon name="trend" size={16} /> Exponential Memory Decay</h4>
			<p>
				Every chapter you track is governed by the forgetting curve formula: <b>r(t) = r₀ × 2^(-t/τ)</b>. 
				This means your memory decays exponentially over time unless you revise it. The current score is visualized by the <b>Health Bar</b> on each chapter card.
			</p>
			<ul>
				<li><span style="color: var(--success); font-weight: 800;">FRESH (Optimal):</span> Score is > 60%. Your memory is strong.</li>
				<li><span style="color: var(--warning); font-weight: 800;">FADING (Warning):</span> Score is 30% - 60%. You are starting to forget.</li>
				<li><span style="color: var(--danger); font-weight: 800;">CRITICAL (Danger):</span> Score is &lt; 30%. Immediate revision recommended.</li>
			</ul>
		</div>

		<div class="card">
			<h4><NavIcon name="target" size={16} /> The Priority Algorithm</h4>
			<p>
				Chapters are automatically sorted based on an algorithm that calculates: <b>Weightage × (Max Score - Current Score)</b>.
			</p>
			<p>
				This guarantees that a highly important (High-Yield 3★) chapter with a failing memory score will always float to the top of your list over a low-priority topic.
			</p>
		</div>

		<div class="card">
			<h4><NavIcon name="calendar-check" size={16} /> Smart Scheduling & Carving</h4>
			<p>
				When you hit <b>"Revise"</b>, you can schedule the chapter on today's timeline strip. You can carve out a brand new time block, or <i>nest</i> it inside an existing study block to keep your schedule organized.
			</p>
			<p>
				The scheduler also actively scans your <b>Error Log</b> to tell you exactly how many past mistakes you made in that chapter, giving you targeted goals.
			</p>
		</div>

		<div class="card">
			<h4><NavIcon name="brain" size={16} /> The "Brain Dump" Loop</h4>
			<p>
				When you start a session, a <b>Blank Page Timer</b> (Focus Mode) begins. Once you finish writing down everything you remember, you evaluate your confidence:
			</p>
			<ul>
				<li><b>Again:</b> Score resets to 60%. Half-life shrinks (τ × 0.5).</li>
				<li><b>Hard:</b> Score resets to 75%. Half-life shrinks (τ × 0.8).</li>
				<li><b>Good:</b> Score resets to 85%. Half-life grows (τ × 1.2).</li>
				<li><b>Easy:</b> Score resets to 95%. Half-life doubles (τ × 2.0).</li>
			</ul>
		</div>

		<div class="actions">
			<button type="button" class="btn solid" on:click={handleClose}>Got it</button>
		</div>
	</div>
</Modal>

<style>
	.manual-content { display: grid; gap: 1rem; }
	.card { background: var(--surface-subtle); padding: 1rem 1.2rem; border-radius: 12px; border: 1px solid var(--border-subtle); }
	.card h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem; font-size: 0.9rem; font-weight: 800; color: var(--accent); }
	.card p { margin: 0 0 0.5rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }
	.card p:last-child { margin-bottom: 0; }
	.card ul { margin: 0; padding-left: 1.2rem; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5; }
	.card ul li { margin-bottom: 0.2rem; }
	
	.actions { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
	.btn.solid { background: var(--accent); color: #fff; padding: 0.6rem 1.4rem; border-radius: 10px; font-weight: 800; font-size: 0.85rem; border: none; cursor: pointer; box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%); }
</style>
