<script lang="ts">
	/** Circular progress ring used by the Home dashboard and the Focus dial. */
	export let value = 0; // 0..1
	export let size = 180;
	export let stroke = 14;
	export let color = 'var(--accent)';
	export let trackColor = 'var(--surface-subtle)';
	export let rounded = true;

	$: radius = (size - stroke) / 2;
	$: circumference = 2 * Math.PI * radius;
	$: clamped = Math.max(0, Math.min(1, value));
	$: dashOffset = circumference * (1 - clamped);
	$: center = size / 2;
</script>

<div class="ring" style="width:{size}px;height:{size}px">
	<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
		<circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} stroke-width={stroke} />
		<circle
			class="progress"
			cx={center} cy={center} r={radius} fill="none"
			stroke={color} stroke-width={stroke}
			stroke-linecap={rounded ? 'round' : 'butt'}
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 {center} {center})"
		/>
	</svg>
	<div class="content"><slot /></div>
</div>

<style>
	.ring { position: relative; display: grid; place-items: center; }
	svg { position: absolute; inset: 0; }
	.progress { transition: stroke-dashoffset .5s cubic-bezier(.4, 0, .2, 1); }
	.content { position: relative; display: grid; place-items: center; text-align: center; }
</style>
