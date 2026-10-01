<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	export let value = 0;
	export let duration = 1200;
	export let delay = 0;
	export let format = (v: number) => Math.round(v).toString();

	const displayed = tweened(0, { duration, delay, easing: cubicOut });

	$: displayed.set(value);
</script>

<span>{format($displayed)}</span>
