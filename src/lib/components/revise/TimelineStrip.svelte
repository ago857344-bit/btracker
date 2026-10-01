<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { StudyBlock } from '$lib/types/tracker';
	
	export let blocks: StudyBlock[] = [];
	
	const dispatch = createEventDispatcher<{ schedule: { time: string }; nest: { blockId: string } }>();

	const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

	function getOffset(isoStart: string) {
		const d = new Date(isoStart);
		const h = d.getHours() + d.getMinutes() / 60;
		if (h < 6) return -100;
		return (h - 6) * 80;
	}

	function getWidth(start: string, end: string) {
		const d1 = new Date(start);
		const d2 = new Date(end);
		const diff = (d2.getTime() - d1.getTime()) / 3600000;
		return diff * 80;
	}

	function handleEmptyClick(e: MouseEvent) {
		const track = e.currentTarget as HTMLElement;
		const rect = track.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const h = 6 + (clickX / 80);
		
		const today = new Date();
		today.setHours(Math.floor(h), Math.floor((h % 1) * 60), 0, 0);
		dispatch('schedule', { time: today.toISOString() });
	}
</script>

<div class="timeline-wrapper">
	<div class="timeline-scroll">
		<div class="timeline-track" on:click={handleEmptyClick}>
			{#each hours as h}
				<div class="hour-marker" style="left: {(h - 6) * 80}px">
					<span>{h > 12 ? h - 12 : (h === 12 ? 12 : h)} {h >= 12 && h < 24 ? 'PM' : 'AM'}</span>
				</div>
			{/each}

			{#each blocks as block}
				<button 
					type="button"
					class="block" 
					style="left: {getOffset(block.start)}px; width: {getWidth(block.start, block.end)}px"
					on:click|stopPropagation={() => dispatch('nest', { blockId: block.id })}
					title="Click to nest revision inside {block.title || 'Study Block'}"
				>
					<div class="block-title">{block.title || 'Study Block'}</div>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.timeline-wrapper { width: 100%; overflow-x: auto; overflow-y: hidden; background: var(--surface-subtle); border-radius: 12px; border: 1px solid var(--border-subtle); padding: 2.5rem 0 1rem; }
	.timeline-scroll { min-width: 100%; width: max-content; padding: 0 1.5rem; }
	.timeline-track { position: relative; width: 1440px; height: 60px; background: color-mix(in srgb, var(--text-primary), transparent 96%); border-radius: 8px; cursor: pointer; border: 1px dashed var(--border-subtle); }
	.timeline-track:hover { background: color-mix(in srgb, var(--text-primary), transparent 94%); }
	.hour-marker { position: absolute; top: -1.6rem; transform: translateX(-50%); font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); pointer-events: none; white-space: nowrap; }
	.hour-marker::after { content: ''; position: absolute; top: 1.7rem; left: 50%; width: 1px; height: 60px; background: var(--border-subtle); }
	
	.block { position: absolute; top: 4px; height: 52px; background: color-mix(in srgb, var(--accent), transparent 80%); border: 1px solid var(--accent); border-radius: 6px; padding: 0.3rem; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: crosshair; transition: all 0.15s ease; }
	.block:hover { transform: scaleY(1.05); background: color-mix(in srgb, var(--accent), transparent 60%); box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 70%); }
	.block-title { font-size: 0.7rem; font-weight: 800; color: var(--accent); white-space: nowrap; text-overflow: ellipsis; }
</style>
