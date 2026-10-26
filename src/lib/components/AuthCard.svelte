<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { browser } from '$app/environment';
	import {
		authConfigured, currentUser, signInWithGoogle,
		signOut, syncStatus
	} from '$lib/stores/auth';

	export let onSkip: (() => void) | undefined = undefined;

	let busy: 'google' | null = null;
	let error = '';

	const callbackUrl = browser ? `${location.origin}/auth/callback` : '/auth/callback';

	const googleSvg = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
		<path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.6c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.7 2.9.3.1c2.4-2.2 3.8-5.4 3.8-9.7" />
		<path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-.1.1-3.8 2.9-.1.1C3.2 21.3 7.3 24 12 24" />
		<path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V9.5L1.4 6.5l-.1.1C.5 8.1 0 10 0 12s.5 3.9 1.3 5.5l4-3.1" />
		<path fill="#EA4335" d="M12 4.7c2.2 0 3.7.9 4.5 1.7l3.3-3.2C17.9 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.3 6.6l4 3.1C6.2 6.8 8.9 4.7 12 4.7" />
	</svg>`;

	async function onGoogle() {
		busy = 'google';
		error = '';
		try {
			await signInWithGoogle();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign-in failed. Try again.';
			busy = null;
		}
	}
</script>

<section class="login-card" aria-label="Sign in with Google">
	{#if $currentUser}
		<div class="head">
			<p class="kicker"><span class="dot"></span> Signed in</p>
			<h2>You're already signed in.</h2>
			<p class="sub">Your question log and revision queue are synced and up to date.</p>
		</div>

		<div class="signed">
			{#if $currentUser.avatar}
				<img src={$currentUser.avatar} alt="" />
			{:else}
				<span class="ini">{$currentUser.name.slice(0, 1)}</span>
			{/if}
			<div>
				<strong>{$currentUser.name}</strong>
				<span>{$currentUser.email}</span>
			</div>
		</div>

		<p class="ok">
			<NavIcon name="check-circle" size={15} />
			You're signed in{#if $syncStatus === 'synced'} and synced{/if}.
		</p>

		<a class="primary" href="/">Open dashboard <NavIcon name="arrow-right" size={15} /></a>
		<button type="button" class="signout" on:click={() => signOut()}>Sign out</button>
	{:else if !$authConfigured}
		<div class="head">
			<p class="kicker warn">Setup required</p>
			<h2>Google sign-in isn't set up yet</h2>
			<p class="sub">Configure Google OAuth before signing in to BTracker:</p>
		</div>

		<ol class="setup">
			<li>Create an OAuth 2.0 client in <b>Google Cloud Console</b>.</li>
			<li>Add <code>{callbackUrl}</code> to authorized redirect URIs.</li>
			<li>Add your Client ID + Secret to <code>.env</code>, then restart the dev server.</li>
		</ol>

		<p class="legal">Refresh this page after completing the setup to sign in.</p>
	{:else}
		<div class="head">
			<span class="badge"><NavIcon name="sparkles" size={12} /> Welcome back</span>
			<h2>Sign in to BTracker</h2>
			<p class="sub">Your question log, revision queue and rank analytics are one tap away.</p>
		</div>

		{#if error}<p class="err" role="alert">{error}</p>{/if}

		<button type="button" class="google" disabled={busy !== null} on:click={onGoogle}>
			<span class="g-tile">{@html googleSvg}</span>
			<span>{busy === 'google' ? 'Redirecting…' : 'Continue with Google'}</span>
			{#if busy === 'google'}
				<span class="spinner" aria-hidden="true"></span>
			{:else}
				<span class="arrow" aria-hidden="true">→</span>
			{/if}
		</button>

		{#if onSkip}
			<div class="or"><i></i><span>or</span><i></i></div>
			<button type="button" class="skip" on:click={onSkip}>Continue without account</button>
		{/if}

		<p class="secure"><NavIcon name="shield" size={13} /> We never post to your account. Your data stays yours.</p>
		<p class="legal">By continuing, you agree to our Terms and Privacy Policy.</p>
	{/if}
</section>

<style>
	.login-card {
		width: 100%;
		max-width: 440px;
		padding: 34px 32px 26px;
		border: 1px solid #e6ebf3;
		border-radius: 28px;
		background: #fff;
		color: #0f172a;
		box-shadow:
			0 40px 80px -44px rgba(15, 23, 42, 0.28),
			0 12px 28px -20px rgba(15, 23, 42, 0.1);
	}

	.head {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 999px;
		background: #eff6ff;
		color: #0066ff;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 12px;
		color: #059669;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.kicker.warn {
		color: #b45309;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	h2 {
		margin: 14px 0 0;
		font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 30px;
		line-height: 1.08;
		letter-spacing: -0.04em;
		font-weight: 800;
		color: #0f172a;
	}

	.badge + h2 {
		margin-top: 16px;
	}

	.sub {
		margin: 9px 0 0;
		color: #64748b;
		font-size: 14px;
		line-height: 1.6;
	}

	.google {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		height: 54px;
		margin-top: 26px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: #0f172a;
		color: #fff;
		font-family: inherit;
		font-size: 14.5px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 16px 30px -16px rgba(15, 23, 42, 0.6);
		transition: transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
	}

	.google:hover:not(:disabled) {
		background: #16213a;
		transform: translateY(-2px);
		box-shadow: 0 22px 36px -18px rgba(15, 23, 42, 0.62);
	}

	.google:active:not(:disabled) {
		transform: translateY(0);
	}

	.google:focus-visible {
		outline: 3px solid rgba(0, 102, 255, 0.28);
		outline-offset: 3px;
	}

	.google:disabled {
		opacity: 0.72;
		cursor: default;
	}

	.g-tile {
		display: grid;
		place-items: center;
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #fff;
	}

	.g-tile :global(svg) {
		display: block;
		width: 17px;
		height: 17px;
	}

	.arrow {
		margin-left: auto;
		font-size: 17px;
		line-height: 1;
		transition: transform 0.16s ease;
	}

	.google:hover:not(:disabled) .arrow {
		transform: translateX(3px);
	}

	.spinner {
		margin-left: auto;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.or {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 20px 0 14px;
		color: #94a3b8;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.or i {
		flex: 1;
		height: 1px;
		background: #e9eef5;
	}

	.skip {
		width: 100%;
		height: 46px;
		border: 1px solid #e5eaf2;
		border-radius: 999px;
		background: #fff;
		color: #334155;
		font-family: inherit;
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.skip:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
		color: #0f172a;
	}

	.skip:focus-visible,
	.primary:focus-visible,
	.signout:focus-visible {
		outline: 3px solid rgba(0, 102, 255, 0.28);
		outline-offset: 2px;
	}

	.secure {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin: 18px 0 0;
		color: #64748b;
		font-size: 11.5px;
		font-weight: 600;
		text-align: center;
	}

	.secure :global(svg) {
		flex: none;
		color: #10b981;
	}

	.legal {
		margin: 15px 0 0;
		padding-top: 14px;
		border-top: 1px solid #eef2f8;
		color: #94a3b8;
		font-size: 10.5px;
		line-height: 1.55;
		text-align: center;
	}

	.err {
		margin: 18px 0 0;
		padding: 10px 12px;
		border: 1px solid #fecaca;
		border-radius: 12px;
		background: #fef2f2;
		color: #b91c1c;
		font-size: 12px;
		font-weight: 600;
		line-height: 1.45;
	}

	.setup {
		margin: 20px 0 0;
		padding-left: 18px;
		color: #475569;
		font-size: 13px;
		line-height: 1.65;
	}

	.setup li {
		margin-bottom: 8px;
		padding-left: 2px;
	}

	.setup b {
		color: #0f172a;
	}

	code {
		padding: 2px 6px;
		border-radius: 6px;
		background: #f1f5f9;
		color: #0f172a;
		font-family: ui-monospace, 'SF Mono', monospace;
		font-size: 0.88em;
		overflow-wrap: anywhere;
	}

	.signed {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 22px;
		padding: 14px;
		border: 1px solid #e6ebf3;
		border-radius: 16px;
		background: #f8fafc;
	}

	.signed img {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
	}

	.ini {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #0f172a;
		color: #fff;
		font-weight: 800;
	}

	.signed div {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.signed strong {
		font-size: 14px;
		color: #0f172a;
	}

	.signed span {
		color: #64748b;
		font-size: 11.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ok {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 16px 0;
		color: #059669;
		font-size: 12.5px;
		font-weight: 700;
	}

	.ok :global(svg) {
		color: #10b981;
	}

	.primary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		height: 50px;
		border-radius: 999px;
		background: #0f172a;
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 16px 30px -16px rgba(15, 23, 42, 0.6);
		transition: transform 0.16s ease, background 0.16s ease;
	}

	.primary:hover {
		background: #16213a;
		transform: translateY(-2px);
	}

	.signout {
		display: block;
		margin: 14px auto 0;
		padding: 8px 14px;
		border: 0;
		background: none;
		color: #64748b;
		font-family: inherit;
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
	}

	.signout:hover {
		color: #0f172a;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 560px) {
		.login-card {
			padding: 28px 22px 22px;
			border-radius: 24px;
		}

		h2 {
			font-size: 26px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.google,
		.arrow,
		.skip,
		.primary {
			transition: none;
		}

		.spinner {
			animation-duration: 1.6s;
		}
	}
</style>
