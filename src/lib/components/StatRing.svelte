<script lang="ts">
	/** Circular progress ring used by the Home dashboard and the Focus dial. */
	export let value = 0; // 0..1
	export let size = 180;
	export let stroke = 14;
	export let color = 'var(--accent)';
	export let trackColor = 'var(--surface-subtle)';
	export let rounded = true;
	/** Focus-timer cosmetic skin (see COSMETIC_SLOTS timer items). */
	export let skin = 'classic';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	const tValue = tweened(0, { duration: 1200, easing: cubicOut });
	$: tValue.set(Math.max(0, Math.min(1, value)));

	const uid = `ring-${Math.random().toString(36).slice(2, 9)}`;
	const GRADIENTS: Record<string, string[]> = {
		sweep: ['#a5d8ff', '#4dabf7', '#1864ab'],
		gilded: ['#fff3b0', '#ffd700', '#b8860b'],
		blaze: ['#ffd43b', '#ff6b00', '#e03131'],
		orbit: ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc']
	};

	$: radius = (size - stroke) / 2;
	$: circumference = 2 * Math.PI * radius;
	$: dashOffset = circumference * (1 - $tValue);
	$: center = size / 2;
	$: stops = GRADIENTS[skin];
	$: strokePaint = stops ? `url(#${uid}-g)` : color;
	$: segments = skin === 'segmented' ? 60 : 0;
	$: segLen = segments ? circumference / segments : 0;
	$: headAngle = 2 * Math.PI * $tValue - Math.PI / 2;
	$: headX = center + radius * Math.cos(headAngle);
	$: headY = center + radius * Math.sin(headAngle);
</script>

<div class="ring skin-{skin}" style="width:{size}px;height:{size}px;--ring-color:{color}">
	<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
		<defs>
			{#if stops}
				<linearGradient id="{uid}-g" x1="0" y1="0" x2="1" y2="1">
					{#each stops as stop, i (i)}<stop offset="{(i / (stops.length - 1)) * 100}%" stop-color={stop} />{/each}
				</linearGradient>
			{/if}
			{#if segments}
				<mask id="{uid}-m" maskUnits="userSpaceOnUse" x="0" y="0" width={size} height={size}>
					<circle cx={center} cy={center} r={radius} fill="none" stroke="#fff" stroke-width={stroke + 2}
						stroke-dasharray="{segLen * 0.72} {segLen * 0.28}" transform="rotate(-90 {center} {center})" />
				</mask>
			{/if}
		</defs>
		<g mask={segments ? `url(#${uid}-m)` : undefined}>
			<circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} stroke-width={stroke} />
			<circle
				class="progress"
				cx={center} cy={center} r={radius} fill="none"
				stroke={strokePaint} stroke-width={stroke}
				stroke-linecap={rounded && !segments ? 'round' : 'butt'}
				stroke-dasharray={circumference}
				stroke-dashoffset={dashOffset}
				transform="rotate(-90 {center} {center})"
			/>
		</g>
		{#if skin === 'orbit' && $tValue > 0}
			<circle class="head" cx={headX} cy={headY} r={stroke * 0.55} fill="#fff" />
		{/if}
	</svg>
	<div class="content"><slot /></div>
</div>

<style>
	.ring { position: relative; display: grid; place-items: center; }
	svg { position: absolute; inset: 0; overflow: visible; }
	.content { position: relative; display: grid; place-items: center; text-align: center; }
	.skin-neon .progress { filter: drop-shadow(0 0 6px var(--ring-color)) drop-shadow(0 0 14px var(--ring-color)); }
	.skin-gilded .progress { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.55)); }
	.skin-blaze .progress { animation: blaze 1.6s ease-in-out infinite; }
	.skin-orbit .head { filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 12px #b197fc); }
	.skin-orbit .progress { filter: drop-shadow(0 0 6px rgba(177, 151, 252, 0.5)); }
	@keyframes blaze {
		0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 107, 0, 0.6)); }
		30% { filter: drop-shadow(0 0 14px rgba(255, 140, 0, 0.75)); }
		55% { filter: drop-shadow(0 0 8px rgba(224, 49, 49, 0.6)); }
		80% { filter: drop-shadow(0 0 16px rgba(255, 212, 59, 0.6)); }
	}
	:global(:root[data-reduced-motion='true']) .skin-blaze .progress { animation: none; filter: drop-shadow(0 0 10px rgba(255, 107, 0, 0.6)); }
	@media (prefers-reduced-motion: reduce) { .skin-blaze .progress { animation: none; } }
</style>
