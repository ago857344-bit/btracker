<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import {
		authConfigured, currentUser, signInWithGoogle,
		signOut, syncStatus
	} from '$lib/stores/auth';

	let busy: 'google' | null = null;
	let error = '';

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
			error = err instanceof Error ? err.message : 'Sign-in failed.'; 
			busy = null; 
		}
	}
</script>

<section class="auth-card" aria-label="Sign in with Google">

	{#if $currentUser}
		<div class="signed">
			{#if $currentUser.avatar}<img src={$currentUser.avatar} alt="" />{:else}<span class="ini">{$currentUser.name.slice(0, 1)}</span>{/if}
			<div>
				<strong>{$currentUser.name}</strong>
				<span>{$currentUser.email}</span>
			</div>
		</div>
		<p class="ok"><NavIcon name="check-circle" size={15} /> You're signed in{#if $syncStatus === 'synced'} and synced{/if}.</p>
		<button type="button" class="submit" on:click={() => signOut()}>Sign out</button>
	{:else if !$authConfigured}
		<h1>Google sign-in isn't set up yet</h1>
		<p class="sub">Configure Google OAuth before signing in to BTracker:</p>
		<ol class="setup">
			<li>Go to <span class="mono">Google Cloud Console</span> and create an OAuth 2.0 client.</li>
			<li>Add <span class="mono">http://localhost:1420/auth/callback</span> to authorized redirect URIs.</li>
			<li>Copy <span class="mono">.env.example</span> to <span class="mono">.env</span>, paste your Client ID + Secret, restart the dev server.</li>
		</ol>
		<p class="sub">Refresh this page after completing the setup to sign in.</p>
	{:else}
		<h1>Sign in to BTracker</h1>
		<p class="sub">Start tracking your JEE prep — free with Google account</p>

		{#if error}<p class="err">{error}</p>{/if}

		<button type="button" class="google" disabled={busy !== null} on:click={onGoogle}>
			{@html googleSvg}
			{busy === 'google' ? 'Redirecting…' : 'Continue with Google'}
		</button>

		<p class="info">By signing in, you agree to our Terms and Privacy Policy.</p>
	{/if}
</section>

<style>
	.auth-card {
		position: relative;
		width: min(100%, 410px);
		padding: 2.2rem 2rem 1.8rem;
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		background: var(--surface-panel);
		box-shadow: var(--shadow-modal, 0 24px 60px -10px rgba(44, 37, 92, 0.15));
		color: var(--text-primary);
	}
	h1 { margin: 0; font-size: 1.45rem; line-height: 1.15; letter-spacing: -.035em; font-weight: 850; color: var(--text-primary); }
	.sub { margin: .45rem 0 1.25rem; color: var(--text-secondary); font-size: .84rem; line-height: 1.55; }

	.google {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: .65rem;
		width: 100%;
		height: 46px;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: .88rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: background .14s ease, border-color .14s ease, box-shadow .14s ease, transform .14s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
	}
	.google:hover:not(:disabled) {
		background: color-mix(in srgb, var(--surface-subtle) 60%, var(--surface-panel));
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
		transform: translateY(-1px);
	}
	.google:disabled { opacity: .65; cursor: default; }

	.err { margin: 0 0 .8rem; padding: .55rem .75rem; border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--danger) 10%, transparent); color: var(--danger); font-size: .76rem; font-weight: 600; }

	.info { margin: 1.1rem 0 0; color: var(--text-secondary); font-size: .7rem; line-height: 1.5; text-align: center; }

	.setup { margin: 0 0 1.2rem; padding-left: 1.15rem; color: var(--text-secondary); font-size: .8rem; line-height: 1.65; }
	.setup li { margin-bottom: .35rem; }
	.mono { padding: .08rem .36rem; border-radius: 6px; background: color-mix(in srgb, var(--text-primary) 8%, transparent); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: .88em; }

	.signed { display: flex; align-items: center; gap: .8rem; padding: .85rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-subtle); }
	.signed img { width: 42px; height: 42px; border-radius: 99px; object-fit: cover; }
	.ini { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 99px; background: var(--accent); color: #fff; font-weight: 800; }
	.signed div { display: grid; gap: .1rem; min-width: 0; }
	.signed strong { font-size: .9rem; color: var(--text-primary); }
	.signed span { color: var(--text-secondary); font-size: .74rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ok { display: flex; align-items: center; gap: .45rem; margin: .9rem 0; color: var(--success); font-size: .8rem; font-weight: 650; }

	.submit { width: 100%; height: 44px; border: 0; border-radius: 11px; background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #e0455a 35%)); color: #fff; font-size: .86rem; font-weight: 800; letter-spacing: .01em; cursor: pointer; font-family: inherit; box-shadow: 0 10px 24px color-mix(in srgb, var(--accent), transparent 62%); transition: filter .14s ease; }
	.submit:hover:not(:disabled) { filter: brightness(1.08); }
	.submit:disabled { opacity: .7; cursor: default; }
</style>
