<script lang="ts">
	export let text = '';
</script>

<span class="tip" role="button" tabindex="0" aria-label={text}>
	<i>i</i>
	<span class="tip-bubble" role="tooltip">{text}</span>
</span>

<style>
	.tip { position: relative; display: inline-grid; place-items: center; width: 15px; height: 15px; border-radius: 99px; color: var(--text-secondary); border: 1px solid var(--border-subtle); cursor: help; }
	.tip i { font-size: .58rem; font-style: normal; font-weight: 800; line-height: 1; }
	.tip-bubble { position: absolute; bottom: calc(100% + 7px); left: 50%; z-index: 9999; width: max-content; max-width: 240px; padding: .55rem .75rem; border-radius: 12px; background: color-mix(in srgb, var(--surface-panel, #121020) 97%, transparent); color: var(--text-primary); border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16)); backdrop-filter: blur(32px) saturate(200%); -webkit-backdrop-filter: blur(32px) saturate(200%); box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.14); font-size: .72rem; font-weight: 600; letter-spacing: -.01em; line-height: 1.45; opacity: 0; pointer-events: none; transform: translate(-50%, 4px); transition: opacity .16s ease, transform .16s ease; }
	.tip:hover .tip-bubble, .tip:focus-visible .tip-bubble { opacity: 1; transform: translate(-50%, 0); }
</style>
