<script lang="ts">
	import { fade } from 'svelte/transition';
	import { QUOTES, quoteForDay } from '$lib/state/quotes';

	let index = QUOTES.indexOf(quoteForDay());
	if (index < 0) index = 0;
	$: quote = QUOTES[index];

	function shuffle() {
		index = (index + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length;
	}
</script>

<div class="quote" in:fade={{ duration: 240 }}>
	<span class="mark" aria-hidden="true">&ldquo;</span>
	{#key quote.text}
		<blockquote in:fade={{ duration: 320 }}>{quote.text}</blockquote>
	{/key}
	<p class="author">— {quote.author}</p>
	<button type="button" class="shuffle" on:click={shuffle}>Another quote</button>
</div>

<style>
	.quote { position: relative; display: flex; flex-direction: column; height: 100%; margin: 0; padding-top: .4rem; }
	.mark { position: absolute; top: -.6rem; left: -.2rem; color: var(--accent-soft); font-size: 4.5rem; font-family: Georgia, serif; line-height: 1; }
	blockquote { position: relative; margin: 0; color: var(--text-primary); font-size: 1.16rem; font-weight: 600; line-height: 1.5; letter-spacing: -.02em; }
	.author { margin: .7rem 0 0; color: var(--text-secondary); font-size: .82rem; font-weight: 650; }
	.shuffle { align-self: flex-start; margin-top: auto; padding: .5rem .8rem; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--accent); background: var(--accent-soft); font-size: .78rem; font-weight: 700; }
	.shuffle:hover { border-color: var(--accent); }
</style>
