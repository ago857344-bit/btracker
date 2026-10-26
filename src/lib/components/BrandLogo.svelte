<script lang="ts">
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let href = '/';
	export let subtitle = '';
	export let wordmark = 'BTracker';
	export let label = 'BTracker — home';
</script>

<a class="brand-logo {size}" {href} aria-label={label}>
	<span class="mark" aria-hidden="true">B</span>
	<span class="wordmark">
		{wordmark}
		{#if subtitle}<small>{subtitle}</small>{/if}
	</span>
</a>

<style>
	.brand-logo {
		display: inline-flex;
		align-items: center;
		color: var(--brand-ink, #0f172a);
		font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		font-weight: 800;
		letter-spacing: -0.035em;
		text-decoration: none;
		line-height: 1.1;
	}

	.mark {
		display: grid;
		place-items: center;
		flex: none;
		border: 1px solid #e5eaf2;
		background: #fff;
		color: #000;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.055em;
		padding-right: 0.02em;
		box-shadow:
			0 6px 14px -7px rgba(15, 23, 42, 0.3),
			0 1px 2px rgba(15, 23, 42, 0.06);
		transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.2s ease;
	}

	.brand-logo:hover .mark {
		transform: translateY(-1px) rotate(-2deg);
		box-shadow:
			0 10px 18px -8px rgba(15, 23, 42, 0.34),
			0 1px 2px rgba(15, 23, 42, 0.06);
	}

	.wordmark {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.wordmark small {
		display: block;
		margin-top: 2px;
		color: var(--brand-muted, #64748b);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.sm {
		gap: 8px;
		font-size: 16px;
	}

	.sm .mark {
		width: 30px;
		height: 30px;
		border-radius: 9px;
		font-size: 16px;
	}

	.sm small {
		font-size: 7.5px;
	}

	.md {
		gap: 10px;
		font-size: 19px;
	}

	.md .mark {
		width: 38px;
		height: 38px;
		border-radius: 12px;
		font-size: 20px;
	}

	.md small {
		font-size: 8.5px;
	}

	.lg {
		gap: 13px;
		font-size: 25px;
	}

	.lg .mark {
		width: 52px;
		height: 52px;
		border-radius: 16px;
		font-size: 28px;
	}

	.lg small {
		font-size: 9px;
	}

	@media (prefers-reduced-motion: reduce) {
		.mark {
			transition: none;
		}
	}
</style>
