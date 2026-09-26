<script lang="ts">
	export let text = '';
</script>

<span class="tip" tabindex="0" aria-label={text}>
	<i>i</i>
	<span class="tip-bubble" role="tooltip">{text}</span>
</span>

<style>
	.tip { position: relative; display: inline-grid; place-items: center; width: 15px; height: 15px; border-radius: 99px; color: var(--text-secondary); border: 1px solid var(--border-subtle); cursor: help; }
	.tip i { font-size: .58rem; font-style: normal; font-weight: 800; line-height: 1; }
	.tip-bubble { position: absolute; bottom: calc(100% + 7px); left: 50%; z-index: 40; width: max-content; max-width: 220px; padding: .5rem .62rem; border-radius: 9px; background: var(--text-primary); color: var(--surface-panel); font-size: .62rem; font-weight: 600; letter-spacing: .02em; line-height: 1.45; opacity: 0; pointer-events: none; transform: translate(-50%, 4px); transition: opacity .14s ease, transform .14s ease; }
	.tip:hover .tip-bubble, .tip:focus-visible .tip-bubble { opacity: 1; transform: translate(-50%, 0); }
</style>
