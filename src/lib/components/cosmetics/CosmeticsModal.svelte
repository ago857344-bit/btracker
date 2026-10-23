<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, updateTracker } from '$lib/stores/tracker';
	import { unlockCtx } from '$lib/stores/cosmetics';
	import { syncThemeWallpaper } from '$lib/state/themes';
	import { COSMETIC_SLOTS, AURORA_REQ, reqMet, reqLabel, reqStatus, type Slot } from '$lib/state/cosmetics';

	export let open = false;

	$: equipped = $tracker.ui?.cosmetics ?? {};

	function equip(slot: Slot, id: string | undefined) {
		updateTracker((s) => {
			const next = { ...s.ui.cosmetics };
			if (id === undefined) delete next[slot];
			else next[slot] = id as any;
			s.ui.cosmetics = next;
			if (slot === 'wallpaper') syncThemeWallpaper(s);
		});
	}

	function setAurora(on: boolean) {
		updateTracker((s) => {
			s.ui.cosmetics = { ...s.ui.cosmetics, aurora: on };
		});
	}
</script>

<Modal bind:open title="COSMETICS LOADOUT" width="620px">
	<div class="cosmetics-modal-body">
		<p class="modal-sub">
			Mix and match rewards you've earned across Elo milestones and streaks. Elo unlocks remain permanent (tracking your peak), while streak effects stay active while your streak holds.
		</p>

		<div class="slots-container">
			{#each COSMETIC_SLOTS as group (group.slot)}
				<div class="slot-block">
					<div class="slot-header">
						<span class="slot-title">{group.label.toUpperCase()}</span>
						<span class="slot-hint">{group.hint}</span>
					</div>
					<div class="cos-grid">
						{#if group.slot !== 'timer' && group.slot !== 'frame' && group.slot !== 'title'}
							<button
								type="button"
								class="cos"
								class:on={!equipped[group.slot]}
								on:click={() => equip(group.slot, undefined)}
							>
								<i class="sw match"><NavIcon name="palette" size={11} /></i>
								<span>Match theme</span>
							</button>
						{/if}
						{#each group.items as item (item.id)}
							{@const isUnlocked = reqMet(item.unlock, $unlockCtx)}
							{@const isOn = (equipped[group.slot] ?? (group.slot === 'timer' ? 'classic' : group.slot === 'frame' ? 'none' : group.slot === 'title' ? 'level' : undefined)) === item.id}
							<button
								type="button"
								class="cos"
								class:on={isOn}
								class:locked={!isUnlocked}
								title={isUnlocked ? item.label : `${reqLabel(item.unlock!)} · ${reqStatus(item.unlock!, $unlockCtx)}`}
								on:click={() => equip(group.slot, item.id)}
							>
								<i class="sw" style="background: {item.swatch}; background-size: cover;">
									{#if !isUnlocked}<NavIcon name="lock" size={10} />{/if}
								</i>
								<span>
									{item.label}
									{#if !isUnlocked}<small>{reqLabel(item.unlock!)}</small>{/if}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}

			<label class="aurora-check" class:dim={!reqMet(AURORA_REQ, $unlockCtx)}>
				<input
					type="checkbox"
					disabled={!reqMet(AURORA_REQ, $unlockCtx)}
					checked={reqMet(AURORA_REQ, $unlockCtx) && equipped.aurora !== false}
					on:change={(e) => setAurora(e.currentTarget.checked)}
				/>
				<div class="aurora-info">
					<div class="aurora-title">
						<span>Aurora Northern Lights</span>
						{#if !reqMet(AURORA_REQ, $unlockCtx)}<NavIcon name="lock" size={11} />{/if}
					</div>
					<small class="aurora-sub">
						{reqMet(AURORA_REQ, $unlockCtx)
							? 'Slow-drifting northern lights behind the app, active while your streak holds.'
							: `Needs a ${reqLabel(AURORA_REQ)} — ${reqStatus(AURORA_REQ, $unlockCtx)}.`}
					</small>
				</div>
			</label>
		</div>
	</div>

	<svelte:fragment slot="footer">
		<button type="button" class="btn-done" on:click={() => (open = false)}>
			Done
		</button>
	</svelte:fragment>
</Modal>

<style>
	.cosmetics-modal-body {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		max-height: 68vh;
		overflow-y: auto;
		padding-right: 4px;
		scrollbar-width: thin;
	}
	.modal-sub {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.8rem;
		line-height: 1.55;
	}
	.slots-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.slot-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 70%, transparent);
	}
	.slot-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.slot-title {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}
	.slot-hint {
		font-size: 0.7rem;
		color: var(--text-secondary);
		opacity: 0.8;
	}
	.cos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.45rem;
	}
	.cos {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.76rem;
		font-weight: 650;
		cursor: pointer;
		text-align: left;
		transition: all 0.16s var(--ease-ios-spring);
	}
	.cos:hover:not(.locked) {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.cos.on {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, var(--surface-subtle));
		color: var(--text-primary);
		box-shadow: 0 0 0 1px var(--accent);
	}
	.cos.locked {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.cos .sw {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		flex: 0 0 22px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		font-style: normal;
	}
	.cos .sw.match {
		background: var(--surface-panel);
		color: var(--accent);
	}
	.cos span {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cos small {
		font-size: 0.64rem;
		color: var(--text-secondary);
		font-weight: 500;
	}
	.aurora-check {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-subtle);
		cursor: pointer;
		margin-top: 0.3rem;
	}
	.aurora-check.dim {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.aurora-check input {
		margin-top: 0.2rem;
		accent-color: var(--accent);
		width: 16px;
		height: 16px;
	}
	.aurora-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.aurora-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		font-weight: 750;
		color: var(--text-primary);
	}
	.aurora-sub {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}
	.btn-done {
		height: 36px;
		padding: 0 1.25rem;
		border: 0;
		border-radius: 10px;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.82rem;
		font-weight: 750;
		cursor: pointer;
		transition: transform 0.16s var(--ease-ios-press);
	}
	.btn-done:active {
		transform: scale(0.96);
	}
</style>
