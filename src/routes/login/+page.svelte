<script lang="ts">
	import { goto } from '$app/navigation';
	import { hasSkippedLogin } from '$lib/stores/auth';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	function continueWithoutAccount() {
		hasSkippedLogin.set(true);
		void goto('/', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Sign in · BTracker</title>
	<meta name="robots" content="noindex" />
	<meta name="description" content="Sign in to BTracker with Google to pick up your JEE question log, revision queue and mock test analytics on any device." />
</svelte:head>

<div class="auth-stage">
	<div class="ambient a1" aria-hidden="true"></div>
	<div class="ambient a2" aria-hidden="true"></div>
	<div class="grid" aria-hidden="true"></div>

	<header class="auth-top">
		<BrandLogo href="/" size="md" subtitle="JEE Study OS" label="BTracker — home" />
		<p class="top-note"><span class="live-dot"></span> Free with Google <i></i> No credit card</p>
	</header>

	<main class="auth-main">
		<section class="story" aria-labelledby="story-title">
			<p class="eyebrow"><span></span> Your JEE study OS</p>
			<h1 id="story-title">Sign in. <span>Pick up where you left off.</span></h1>
			<p class="lede">
				Every question, focus session and mock test you've logged is waiting — synced across
				every device you study on.
			</p>

			<ul class="benefits">
				<li>
					<span class="ico"><NavIcon name="list" size={16} /></span>
					<div><b>Your whole log, in sync</b><span>Modules, DPPs, PYQs and tests in one timeline.</span></div>
				</li>
				<li>
					<span class="ico"><NavIcon name="revise" size={16} /></span>
					<div><b>A revision queue that remembers</b><span>Spaced repeats built from the questions you got wrong.</span></div>
				</li>
				<li>
					<span class="ico"><NavIcon name="stats" size={16} /></span>
					<div><b>Rank analytics that update</b><span>Elo, percentile and chapter strengths after every mock test.</span></div>
				</li>
			</ul>

			<div class="preview-wrap" aria-hidden="true">
				<div class="preview">
					<div class="pv-top">
						<div><small>Saturday, 24 October</small><b>Good evening, Atharv</b></div>
						<span class="pv-sync"><i></i> Synced</span>
					</div>
					<div class="pv-stats">
						<div><small>Solved today</small><b>42</b><em>+18% vs yesterday</em></div>
						<div><small>Focus time</small><b>3h 20m</b><em>of 5h target</em></div>
						<div><small>Rank trend</small><b>#1,284</b><em>↑ 112 this month</em></div>
					</div>
					<div class="pv-queue">
						<div class="pv-qrow"><span class="q-dot p"></span>Rotational Dynamics<b>Today</b></div>
						<div class="pv-qrow"><span class="q-dot c"></span>Chemical Bonding<b>Tomorrow</b></div>
					</div>
				</div>
				<span class="streak-chip"><NavIcon name="flame" size={14} /> 12-day streak</span>
			</div>

			<p class="story-foot">
				<span><NavIcon name="check-circle" size={14} /> Cloud sync</span>
				<i></i>
				<span><NavIcon name="download" size={14} /> Installable PWA</span>
				<i></i>
				<span><NavIcon name="shield" size={14} /> Your data stays yours</span>
			</p>
		</section>

		<section class="signin-panel" aria-label="Sign in">
			<div class="card-wrap">
				<AuthCard onSkip={continueWithoutAccount} />
			</div>
			<p class="panel-note"><NavIcon name="lock" size={13} /> Secure sign-in through Google. No password to remember.</p>
		</section>
	</main>

	<p class="fineprint">© 2026 BTracker · Made in India for JEE aspirants</p>
</div>

<style>
	.auth-stage {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		overflow: hidden;
		background: #f7f9fd;
		color: #0f172a;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	.ambient {
		position: absolute;
		border-radius: 50%;
		filter: blur(12px);
		pointer-events: none;
	}

	.a1 {
		top: -260px;
		left: -180px;
		width: 720px;
		height: 720px;
		background: radial-gradient(circle, rgba(0, 102, 255, 0.13), transparent 64%);
	}

	.a2 {
		right: -220px;
		bottom: -300px;
		width: 760px;
		height: 760px;
		background: radial-gradient(circle, rgba(125, 211, 252, 0.18), transparent 64%);
	}

	.grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: radial-gradient(ellipse 78% 62% at 50% 30%, #000 28%, transparent 76%);
		-webkit-mask-image: radial-gradient(ellipse 78% 62% at 50% 30%, #000 28%, transparent 76%);
		pointer-events: none;
	}

	.auth-top {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		width: min(100% - 48px, 1240px);
		margin: 0 auto;
		padding: 26px 0 10px;
	}

	.top-note {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 8px 14px;
		border: 1px solid #e4eaf3;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(10px);
		color: #475569;
		font-size: 11px;
		font-weight: 650;
	}

	.live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.14);
	}

	.top-note i {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #cbd5e1;
	}

	.auth-main {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: minmax(0, 1.06fr) minmax(420px, 0.94fr);
		align-items: center;
		gap: clamp(40px, 6vw, 92px);
		width: min(100% - 48px, 1200px);
		margin: auto;
		padding: 32px 0 44px;
	}

	.story {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		max-width: 620px;
		animation: rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 18px;
		color: #0066ff;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.eyebrow span {
		width: 18px;
		height: 2px;
		border-radius: 2px;
		background: #0066ff;
	}

	h1 {
		margin: 0;
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: clamp(2.5rem, 3.9vw, 3.55rem);
		font-weight: 800;
		letter-spacing: -0.05em;
		line-height: 1.03;
	}

	h1 span {
		color: #0066ff;
	}

	.lede {
		max-width: 540px;
		margin: 18px 0 0;
		color: #475569;
		font-size: 15.5px;
		line-height: 1.65;
	}

	.benefits {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin: 28px 0 0;
		padding: 0;
		list-style: none;
	}

	.benefits li {
		display: flex;
		align-items: flex-start;
		gap: 13px;
	}

	.ico {
		display: grid;
		place-items: center;
		flex: none;
		width: 36px;
		height: 36px;
		border: 1px solid #e4ecf8;
		border-radius: 11px;
		background: #eff6ff;
		color: #0066ff;
	}

	.benefits div {
		display: grid;
		gap: 2px;
		padding-top: 1px;
	}

	.benefits b {
		color: #0f172a;
		font-size: 13.5px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.benefits div span {
		color: #64748b;
		font-size: 12.5px;
		line-height: 1.5;
	}

	.preview-wrap {
		position: relative;
		width: min(100%, 540px);
		margin-top: 32px;
		animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
	}

	.preview {
		position: relative;
		padding: 18px;
		border: 1px solid #e6ebf3;
		border-radius: 22px;
		background: #fff;
		box-shadow:
			0 30px 60px -36px rgba(15, 23, 42, 0.28),
			0 8px 20px -16px rgba(0, 102, 255, 0.16);
	}

	.pv-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 14px;
		border-bottom: 1px solid #eef2f8;
	}

	.pv-top div {
		display: grid;
		gap: 2px;
	}

	.pv-top small {
		color: #94a3b8;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.pv-top b {
		color: #0f172a;
		font-size: 13.5px;
		letter-spacing: -0.02em;
	}

	.pv-sync {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 8px;
		border-radius: 999px;
		background: #ecfdf5;
		color: #059669;
		font-size: 9px;
		font-weight: 800;
	}

	.pv-sync i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #10b981;
	}

	.pv-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 12px;
	}

	.pv-stats div {
		display: grid;
		gap: 2px;
		padding: 11px 12px;
		border: 1px solid #eef2f8;
		border-radius: 13px;
		background: #fbfcfe;
	}

	.pv-stats small {
		color: #94a3b8;
		font-size: 8.5px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.pv-stats b {
		color: #0f172a;
		font-size: 19px;
		font-weight: 800;
		letter-spacing: -0.035em;
		line-height: 1.15;
	}

	.pv-stats em {
		color: #059669;
		font-size: 8.5px;
		font-style: normal;
		font-weight: 700;
	}

	.pv-stats div:nth-child(2) em {
		color: #94a3b8;
	}

	.pv-queue {
		margin-top: 12px;
		padding: 4px 12px;
		border: 1px solid #eef2f8;
		border-radius: 14px;
		background: #fff;
	}

	.pv-qrow {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 0;
		color: #334155;
		font-size: 10.5px;
		font-weight: 600;
	}

	.pv-qrow + .pv-qrow {
		border-top: 1px solid #f2f5fa;
	}

	.pv-qrow b {
		margin-left: auto;
		color: #94a3b8;
		font-size: 8.5px;
		font-weight: 700;
	}

	.q-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex: none;
	}

	.q-dot.p {
		background: #0066ff;
	}

	.q-dot.c {
		background: #10b981;
	}

	.streak-chip {
		position: absolute;
		top: -14px;
		right: 18px;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 7px 11px;
		border: 1px solid #fde8c8;
		border-radius: 999px;
		background: #fffbf2;
		color: #b45309;
		font-size: 10px;
		font-weight: 800;
		box-shadow: 0 8px 18px -10px rgba(180, 83, 9, 0.4);
	}

	.streak-chip :global(svg) {
		color: #f59e0b;
	}

	.story-foot {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		margin: 26px 0 0;
		color: #94a3b8;
		font-size: 10.5px;
		font-weight: 600;
	}

	.story-foot span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.story-foot :global(svg) {
		color: #10b981;
	}

	.story-foot i {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #cbd5e1;
	}

	.signin-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
	}

	.card-wrap {
		position: relative;
		display: flex;
		justify-content: center;
		width: 100%;
	}

	.card-wrap::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 470px;
		height: 470px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(0, 102, 255, 0.11), transparent 64%);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.card-wrap :global(.login-card) {
		position: relative;
		z-index: 1;
	}

	.panel-note {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 22px 0 0;
		color: #849389;
		font-size: 10.5px;
		font-weight: 600;
		text-align: center;
	}

	.panel-note :global(svg) {
		color: #536259;
	}

	.fineprint {
		position: relative;
		z-index: 1;
		margin: 0;
		padding: 0 24px 24px;
		color: #849389;
		font-size: 10px;
		text-align: center;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (max-width: 1180px) {
		h1 {
			font-size: clamp(2.35rem, 4.2vw, 3rem);
		}

		.auth-main {
			gap: 48px;
		}
	}

	@media (max-width: 980px) {
		.auth-top {
			justify-content: center;
			padding-top: 22px;
		}

		.top-note {
			display: none;
		}

		.auth-main {
			grid-template-columns: minmax(0, 1fr);
			gap: 30px;
			justify-items: center;
			width: min(100% - 40px, 520px);
			margin: 0 auto;
			padding: 22px 0 36px;
		}

		.story {
			align-items: center;
			max-width: 480px;
			text-align: center;
		}

		.eyebrow {
			margin-bottom: 14px;
		}

		.eyebrow span {
			display: none;
		}

		h1 {
			font-size: clamp(2.1rem, 5.4vw, 2.65rem);
		}

		.lede {
			margin-top: 14px;
			font-size: 14.5px;
		}

		.benefits,
		.preview-wrap,
		.story-foot {
			display: none;
		}

		.signin-panel {
			width: 100%;
		}

		.panel-note {
			margin-top: 18px;
		}


		.card-wrap::before {
			display: none;
		}

		.fineprint {
			padding-bottom: 28px;
		}
	}

	@media (min-width: 981px) and (max-height: 860px) {
		.preview-wrap {
			display: none;
		}

		.story-foot {
			margin-top: 24px;
		}

		.auth-top {
			padding-top: 20px;
		}

		.auth-main {
			padding: 20px 0 30px;
		}
	}

	@media (max-width: 560px) {
		.auth-top {
			padding-top: 18px;
		}

		.auth-main {
			gap: 24px;
			padding-top: 16px;
		}

		h1 {
			font-size: 1.95rem;
			letter-spacing: -0.045em;
		}

		.lede {
			font-size: 13.5px;
		}

		.eyebrow {
			font-size: 9.5px;
		}

		.panel-note {
			font-size: 10px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.story,
		.signin-panel,
		.preview-wrap {
			animation: none;
		}
	}
</style>
