<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { getPetEvolution, type PetEvolutionInfo } from '$lib/state/focusPet';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let running = false;
	export let size: 'compact' | 'standard' | 'large' = 'standard';
	export let interactive = true;
	export let showStats = false;

	$: baseKind = $tracker.settings?.focusPet || 'orb';
	$: pet = getPetEvolution($tracker, running);

	let isPetted = false;
	let petTimeout: ReturnType<typeof setTimeout> | undefined;

	function handlePet() {
		if (!interactive) return;
		isPetted = true;
		clearTimeout(petTimeout);
		petTimeout = setTimeout(() => {
			isPetted = false;
		}, 1400);
	}
</script>

<div
	class="focus-pet-wrapper size-{size}"
	class:hibernating={pet.isHibernating}
	class:running
	class:petted={isPetted}
	style="--pet-aura: {pet.auraColor};"
	on:click={handlePet}
	role="button"
	tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && handlePet()}
	title="{pet.stageName} (Stage {pet.stage}/5) • {pet.auraName} • Mood: {pet.mood}"
>
	<!-- Floating Dormancy Indicator -->
	{#if pet.isHibernating}
		<div class="sleep-cloud" aria-label="Hibernating">
			<span class="z z1">Z</span>
			<span class="z z2">z</span>
			<span class="z z3">z</span>
		</div>
	{/if}

	<!-- Dynamic Visual Creature Container -->
	<div class="pet-canvas stage-{pet.stage} kind-{baseKind}">
		<!-- Ambient Aura Field -->
		<div class="aura-field"></div>

		<!-- Stage 1: Spark (Nascent Ember) -->
		{#if pet.stage === 1}
			<div class="spark-creature">
				{#if baseKind === 'orb'}
					<div class="spark-core"></div>
					<div class="spark-flicker"></div>
				{:else if baseKind === 'crystal'}
					<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2L6 10l6 12 6-12-6-10z" fill="var(--pet-aura)" />
					</svg>
				{:else}
					<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2c0 0-4 5-4 9a4 4 0 0 0 8 0c0-4-4-9-4-9z" fill="var(--pet-aura)" />
					</svg>
				{/if}
			</div>

		<!-- Stage 2: Proto-Star (Condensing Core) -->
		{:else if pet.stage === 2}
			<div class="proto-star-creature">
				<div class="proto-ring"></div>
				<div class="proto-core">
					{#if baseKind === 'crystal'}
						<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2L4 10l8 12 8-12-8-10z" fill="var(--pet-aura)" />
						</svg>
					{:else if baseKind === 'flame'}
						<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2c0 0-5 6-5 11a5 5 0 0 0 10 0c0-5-5-11-5-11z" fill="var(--pet-aura)" />
						</svg>
					{:else}
						<div class="orb-sphere"></div>
					{/if}
				</div>
			</div>

		<!-- Stage 3: Pulsar (Relativistic Beamer) -->
		{:else if pet.stage === 3}
			<div class="pulsar-creature">
				<div class="pulsar-beam beam-v"></div>
				<div class="pulsar-beam beam-h"></div>
				<div class="pulsar-core">
					{#if baseKind === 'crystal'}
						<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2L4 10l8 12 8-12-8-10z" fill="var(--pet-aura)" />
							<path d="M12 2v20l8-12-8-10z" fill="#ffffff" opacity="0.5" />
						</svg>
					{:else if baseKind === 'flame'}
						<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2c0 0-6 6-6 12a6 6 0 0 0 12 0c0-6-6-12-6-12z" fill="var(--pet-aura)" />
							<path d="M12 7c0 0-3 3-3 7a3 3 0 0 0 6 0c0-4-3-7-3-7z" fill="#fff" />
						</svg>
					{:else}
						<div class="orb-sphere pulsing"></div>
					{/if}
				</div>
				<div class="magnetic-field"></div>
			</div>

		<!-- Stage 4: Quasar (Accretion Dynamo) -->
		{:else if pet.stage === 4}
			<div class="quasar-creature">
				<div class="accretion-disc"></div>
				<div class="relativistic-jet jet-up"></div>
				<div class="relativistic-jet jet-down"></div>
				<div class="quasar-core">
					{#if baseKind === 'crystal'}
						<svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 1L3 10l9 13 9-13-9-13z" fill="var(--pet-aura)" />
							<path d="M12 1v23l9-13-9-10z" fill="#ffffff" opacity="0.65" />
						</svg>
					{:else if baseKind === 'flame'}
						<svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 1c0 0-7 7-7 13a7 7 0 0 0 14 0c0-6-7-13-7-13z" fill="var(--pet-aura)" />
							<path d="M12 6c0 0-3.5 3.5-3.5 8a3.5 3.5 0 0 0 7 0c0-4.5-3.5-8-3.5-8z" fill="#fff" />
						</svg>
					{:else}
						<div class="black-hole-singularity">
							<div class="event-horizon"></div>
						</div>
					{/if}
				</div>
			</div>

		<!-- Stage 5: Supernova (Cosmic Singularity) -->
		{:else}
			<div class="supernova-creature">
				<div class="supernova-burst ring-1"></div>
				<div class="supernova-burst ring-2"></div>
				<div class="supernova-burst ring-3"></div>
				<div class="stellar-corona"></div>
				<div class="supernova-core">
					{#if baseKind === 'crystal'}
						<svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 1L2 10l10 13 10-13-10-13z" fill="var(--pet-aura)" />
							<path d="M12 1v23l10-13-10-10z" fill="#ffffff" opacity="0.75" />
						</svg>
					{:else if baseKind === 'flame'}
						<svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 1c0 0-8 8-8 14a8 8 0 0 0 16 0c0-6-8-14-8-14z" fill="var(--pet-aura)" />
							<path d="M12 5c0 0-4 4-4 9a4 4 0 0 0 8 0c0-5-4-9-4-9z" fill="#ffffff" />
						</svg>
					{:else}
						<div class="supernova-orb"></div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Optional Stats Callout -->
	{#if showStats}
		<div class="pet-stats-panel">
			<div class="pet-header-line">
				<span class="pet-stage-tag">Stage {pet.stage}: {pet.stageName}</span>
				<span class="pet-mood-pill mood-{pet.mood}">
					{#if pet.isHibernating}
						💤 Hibernating
					{:else if running}
						⚡ Deep Focus
					{:else}
						🟢 {pet.mood}
					{/if}
				</span>
			</div>

			<div class="pet-aura-line">
				<span class="aura-dot" style="background: {pet.auraColor};"></span>
				<span class="aura-label">{pet.auraName}</span>
			</div>

			<div class="pet-progress-wrap">
				<div class="progress-bar-bg">
					<div class="progress-bar-fill" style="width: {pet.progressPercent}%; background: {pet.auraColor};"></div>
				</div>
				<div class="progress-numbers">
					<span>{pet.currentHours}h focused</span>
					{#if pet.nextStageHours}
						<span>Next: {pet.nextStageHours}h</span>
					{:else}
						<span>Max Evolution! 🌟</span>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.focus-pet-wrapper {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		user-select: none;
		cursor: pointer;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.focus-pet-wrapper:hover {
		transform: scale(1.05);
	}

	.focus-pet-wrapper.petted {
		animation: petWiggle 0.6s ease-in-out;
	}

	@keyframes petWiggle {
		0%, 100% { transform: scale(1.05) rotate(0deg); }
		25% { transform: scale(1.18) rotate(-6deg); }
		75% { transform: scale(1.15) rotate(6deg); }
	}

	/* Sizes */
	.size-compact .pet-canvas { width: 44px; height: 44px; }
	.size-standard .pet-canvas { width: 72px; height: 72px; }
	.size-large .pet-canvas { width: 110px; height: 110px; }

	/* Hibernation Style (dimmed, grayed, sleepy) */
	.focus-pet-wrapper.hibernating .pet-canvas {
		opacity: 0.38;
		filter: grayscale(65%);
		animation: hibernateBreathe 4s ease-in-out infinite;
	}

	@keyframes hibernateBreathe {
		0%, 100% { transform: scale(0.94); }
		50% { transform: scale(1.02); }
	}

	.sleep-cloud {
		position: absolute;
		top: -12px;
		right: -6px;
		display: flex;
		gap: 2px;
		pointer-events: none;
		z-index: 5;
	}

	.z {
		font-family: inherit;
		font-weight: 850;
		color: var(--text-secondary, #9ca3af);
		animation: floatZ 2.5s infinite ease-out;
		opacity: 0;
	}

	.z1 { font-size: 0.7rem; animation-delay: 0s; }
	.z2 { font-size: 0.85rem; animation-delay: 0.8s; }
	.z3 { font-size: 1rem; animation-delay: 1.6s; }

	@keyframes floatZ {
		0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
		50% { opacity: 0.8; }
		100% { opacity: 0; transform: translate(8px, -18px) scale(1.2); }
	}

	/* Pet Canvas */
	.pet-canvas {
		position: relative;
		display: grid;
		place-items: center;
	}

	.aura-field {
		position: absolute;
		inset: -14px;
		border-radius: 50%;
		background: radial-gradient(circle, color-mix(in srgb, var(--pet-aura) 35%, transparent) 0%, transparent 70%);
		filter: blur(10px);
		animation: auraPulse 3s ease-in-out infinite;
	}

	.running .aura-field {
		background: radial-gradient(circle, color-mix(in srgb, var(--pet-aura) 55%, transparent) 0%, transparent 70%);
		animation: auraPulseFast 1.5s ease-in-out infinite;
	}

	@keyframes auraPulse {
		0%, 100% { opacity: 0.5; transform: scale(0.92); }
		50% { opacity: 0.85; transform: scale(1.08); }
	}

	@keyframes auraPulseFast {
		0%, 100% { opacity: 0.7; transform: scale(0.95); }
		50% { opacity: 1; transform: scale(1.22); }
	}

	/* Stage 1: Spark */
	.spark-creature {
		position: relative;
		display: grid;
		place-items: center;
	}

	.spark-core {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #ffffff;
		box-shadow: 0 0 16px var(--pet-aura), 0 0 6px #ffffff;
		animation: sparkGlow 1.2s ease-in-out infinite alternate;
	}

	@keyframes sparkGlow {
		from { transform: scale(0.85); box-shadow: 0 0 8px var(--pet-aura); }
		to { transform: scale(1.15); box-shadow: 0 0 20px var(--pet-aura), 0 0 8px #ffffff; }
	}

	/* Stage 2: Proto-Star */
	.proto-star-creature {
		position: relative;
		display: grid;
		place-items: center;
	}

	.proto-ring {
		position: absolute;
		width: 38px;
		height: 14px;
		border: 2px solid var(--pet-aura);
		border-radius: 50%;
		transform: rotate(-25deg);
		animation: ringSpin 6s linear infinite;
	}

	.orb-sphere {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: radial-gradient(circle at 30% 30%, #ffffff, var(--pet-aura));
		box-shadow: 0 0 16px var(--pet-aura);
	}

	/* Stage 3: Pulsar */
	.pulsar-creature {
		position: relative;
		display: grid;
		place-items: center;
	}

	.pulsar-beam {
		position: absolute;
		background: linear-gradient(to bottom, transparent, var(--pet-aura), transparent);
		border-radius: 99px;
		filter: blur(1px);
	}

	.beam-v {
		width: 3px;
		height: 58px;
		animation: beamVibe 0.4s ease-in-out infinite alternate;
	}

	.beam-h {
		width: 58px;
		height: 3px;
		opacity: 0.6;
		animation: beamVibe 0.5s ease-in-out infinite alternate;
	}

	.orb-sphere.pulsing {
		width: 26px;
		height: 26px;
		animation: pulsarPulse 0.8s ease-in-out infinite;
	}

	@keyframes pulsarPulse {
		0%, 100% { transform: scale(0.9); box-shadow: 0 0 10px var(--pet-aura); }
		50% { transform: scale(1.15); box-shadow: 0 0 26px var(--pet-aura), 0 0 10px #ffffff; }
	}

	/* Stage 4: Quasar */
	.quasar-creature {
		position: relative;
		display: grid;
		place-items: center;
	}

	.accretion-disc {
		position: absolute;
		width: 54px;
		height: 20px;
		border: 3px double var(--pet-aura);
		border-radius: 50%;
		transform: rotate(-20deg);
		box-shadow: 0 0 18px var(--pet-aura);
		animation: ringSpin 3s linear infinite;
	}

	.relativistic-jet {
		position: absolute;
		width: 4px;
		height: 40px;
		background: linear-gradient(to top, var(--pet-aura), #ffffff);
		border-radius: 99px;
		filter: blur(1px);
	}

	.jet-up { top: -24px; }
	.jet-down { bottom: -24px; transform: rotate(180deg); }

	.black-hole-singularity {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #000000;
		box-shadow: 0 0 14px var(--pet-aura), inset 0 0 6px var(--pet-aura);
		border: 1.5px solid var(--pet-aura);
	}

	/* Stage 5: Supernova */
	.supernova-creature {
		position: relative;
		display: grid;
		place-items: center;
	}

	.supernova-burst {
		position: absolute;
		border-radius: 50%;
		border: 1.5px dashed var(--pet-aura);
		opacity: 0.7;
	}

	.ring-1 { width: 50px; height: 50px; animation: burstRotate 10s linear infinite; }
	.ring-2 { width: 66px; height: 66px; border-style: dotted; animation: burstRotate 16s linear reverse infinite; }
	.ring-3 { width: 82px; height: 82px; border-width: 1px; animation: burstRotate 24s linear infinite; }

	@keyframes burstRotate {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.supernova-orb {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #ffffff, var(--pet-aura) 70%, #000);
		box-shadow: 0 0 30px var(--pet-aura), 0 0 12px #ffffff;
		animation: supernovaPulse 1.8s ease-in-out infinite alternate;
	}

	@keyframes supernovaPulse {
		from { transform: scale(0.92); }
		to { transform: scale(1.12); filter: brightness(1.2); }
	}

	@keyframes ringSpin {
		from { transform: rotate(-25deg) rotate(0deg); }
		to { transform: rotate(-25deg) rotate(360deg); }
	}

	/* Stats Panel */
	.pet-stats-panel {
		margin-top: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
		border: 1px solid var(--border-subtle);
		padding: 0.75rem 0.95rem;
		border-radius: 12px;
		width: 100%;
		max-width: 260px;
		box-sizing: border-box;
	}

	.pet-header-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.pet-stage-tag {
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.pet-mood-pill {
		font-size: 0.62rem;
		font-weight: 750;
		padding: 0.12rem 0.45rem;
		border-radius: 99px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.pet-mood-pill.mood-ecstatic {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		color: var(--accent);
		border-color: var(--accent);
	}

	.pet-aura-line {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.68rem;
		color: var(--text-secondary);
	}

	.aura-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.pet-progress-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.2rem;
	}

	.progress-bar-bg {
		width: 100%;
		height: 5px;
		border-radius: 99px;
		background: var(--surface-subtle);
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.3s ease;
	}

	.progress-numbers {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.64rem;
		color: var(--text-secondary);
		font-weight: 700;
	}
</style>
