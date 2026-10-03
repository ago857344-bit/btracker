<svelte:head><title>Reminders · BTracker</title></svelte:head>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { subjectColor, subjectName, SUBJECTS } from '$lib/state/subjects';
	import { addDaysKey, dayKeyOf, parseKey, todayKey } from '$lib/state/dates';
	import { tracker, updateTracker } from '$lib/stores/tracker';
	import { chaptersDueToday } from '$lib/stores/recall-selectors';

	type IconKind = 'reminders' | 'clock' | 'calendar-check' | 'brain' | 'target' | 'flame';

	interface ReminderCard {
		id: string;
		group: 'overdue' | 'today' | 'week';
		icon: IconKind;
		tone: 'danger' | 'accent' | 'warning' | 'success';
		title: string;
		blurb: string;
		when: string;
		sub?: string;
		source?: 'homework' | 'revision' | 'deadline' | 'custom';
		linkId?: string;
		dismissed?: boolean;
		createdAt?: number;
	}

	/* ---------------- modal state ---------------- */
	let newOpen = false;
	let draftKind: 'deadline' | 'spaced' | 'nudge' = 'nudge';
	let draftTitle = '';
	let draftSub = '';
	let draftWhen = '';
	let draftTime = '09:00';
	let draftBlurb = '';
	let customReminders: ReminderCard[] = [];

	const snoozeOptions = ['10 min', '1 hour', 'Tomorrow'] as const;
	let snoozeMenu: string | null = null;

	/* ---------------- derived groups ---------------- */
	const now = new Date();
	const today = todayKey();
	const weekEnd = addDaysKey(today, 6);

	let revCards: ReminderCard[] = [];
	let hwCards: ReminderCard[] = [];
	let dlCards: ReminderCard[] = [];
	let allCards: ReminderCard[] = [];
	let overdue: ReminderCard[] = [];
	let todayGroup: ReminderCard[] = [];
	let week: ReminderCard[] = [];

	$: {
		revCards = $chaptersDueToday.map((item) => {
				const chParts = item.chapterKey.split('-');
				const s = chParts[0] ?? '';
				const ch = chParts[1] ?? '';
				const overdue_ = item.currentScore < 30;
				return {
					id: `rev-${item.chapterKey}`,
					group: overdue_ ? 'overdue' : 'today',
					icon: 'brain' as IconKind,
					tone: overdue_ ? 'danger' : 'warning',
					title: `Revise ${subjectName(s) || s} · Ch. ${ch}`,
					blurb: `Spaced repetition nudge — Score is at ${Math.round(item.currentScore)}% (Health: ${overdue_ ? 'Critical' : 'Fading'})`,
					when: today,
					sub: s,
					source: 'revision',
					linkId: item.chapterKey
				} as ReminderCard;
			});

		hwCards = [...$tracker.h, ...$tracker.hd]
			.filter((t) => !t.done && t.due)
			.map((t) => {
				const due = t.due!;
				const overdue_ = due < today;
				const sameDay = due === today;
				return {
					id: `hw-${t.id}`,
					group: overdue_ ? 'overdue' : sameDay ? 'today' : due <= weekEnd ? 'week' : null,
					icon: 'calendar-check' as IconKind,
					tone: overdue_ ? 'danger' : sameDay ? 'accent' : 'warning',
					title: t.title ?? `${subjectName(t.s) || t.s || 'Task'} ${t.ch ? `· Ch.${t.ch}` : ''}`,
					blurb: [
					t.st && t.en ? `${t.st}–${t.en}` : t.st ? t.st : null,
					t.hrs ? `${t.hrs}h budget` : null,
					t.test ? 'Test-weighted' : null,
					Array.isArray(t.subs) && t.subs.length ? `${t.subs.length} sub-tasks` : null
				].filter(Boolean).join(' · ') || 'Planned homework',
					when: due,
					sub: t.s,
					source: 'homework',
					linkId: t.id
				} as ReminderCard;
			})
			.filter((c) => c.group !== null) as ReminderCard[];

		dlCards = $tracker.dl
			.filter((d) => !d.hidden)
			.map((d) => {
				const due = d.date;
				const overdue_ = due < today;
				const sameDay = due === today;
				const wk = due <= weekEnd && due > today;
				if (!overdue_ && !sameDay && !wk) return null;
				return {
					id: `dl-${d.id}`,
					group: overdue_ ? 'overdue' : sameDay ? 'today' : 'week',
					icon: 'target' as IconKind,
					tone: overdue_ ? 'danger' : sameDay ? 'accent' : 'warning',
					title: d.name,
					blurb: [d.time && `At ${d.time}`, d.goals && `${d.goals}`, d.reflect && `Reflect: ${d.reflect}`].filter(Boolean).join(' · ') || 'Scheduled deadline',
					when: due,
					source: 'deadline',
					linkId: d.id
				} as ReminderCard;
			})
			.filter((c) => c !== null) as ReminderCard[];

		allCards = [
			...customReminders.filter((c) => !c.dismissed),
			...revCards,
			...hwCards,
			...dlCards
		].sort((a, b) => (a.when > b.when ? 1 : a.when < b.when ? -1 : 0));

		overdue = allCards.filter((c) => c.group === 'overdue');
		todayGroup = allCards.filter((c) => c.group === 'today');
		week = allCards.filter((c) => c.group === 'week');
	}

	/* ---------------- actions ---------------- */
	function dismiss(id: string) {
		if (id.startsWith('rev-') && id.includes(':')) {
			const key = id.slice(4);
			updateTracker((s) => {
				if (s.rev.items[key]) s.rev.items[key].remindDone = true;
			});
			return;
		}
		if (id.startsWith('hw-')) {
			const hwId = id.slice(3);
			updateTracker((s) => {
				const found = s.h.find((h) => h.id === hwId) || s.hd.find((h) => h.id === hwId);
				if (found) found.keep = true;
			});
			customReminders = customReminders.map((c) => c.id === id ? { ...c, dismissed: true } : c);
			return;
		}
		if (id.startsWith('dl-')) {
			const dlId = id.slice(3);
			updateTracker((s) => {
				const found = s.dl.find((d) => d.id === dlId);
				if (found) found.hidden = true;
			});
			return;
		}
		customReminders = customReminders.map((c) => c.id === id ? { ...c, dismissed: true } : c);
		snoozeMenu = null;
	}

	function snooze(id: string, _option: typeof snoozeOptions[number]) {
		dismiss(id);
	}

	function toneClasses(tone: ReminderCard['tone']) {
		switch (tone) {
			case 'danger':  return { bg: 'color-mix(in srgb, var(--danger), transparent 88%)', fg: 'var(--danger)', ring: 'color-mix(in srgb, var(--danger), transparent 60%)' };
			case 'warning': return { bg: 'color-mix(in srgb, var(--warning), transparent 86%)', fg: 'var(--warning)', ring: 'color-mix(in srgb, var(--warning), transparent 60%)' };
			case 'success': return { bg: 'color-mix(in srgb, var(--success), transparent 86%)', fg: 'var(--success)', ring: 'color-mix(in srgb, var(--success), transparent 60%)' };
			default:        return { bg: 'var(--accent-soft)', fg: 'var(--accent)', ring: 'var(--accent)' };
		}
	}

	function formatWhen(iso: string) {
		if (!iso) return '';
		const d = parseKey(iso);
		const diffDays = Math.round((+d - +parseKey(today)) / 86400000);
		if (diffDays === 0) return 'Today';
		if (diffDays === -1) return 'Yesterday';
		if (diffDays === 1) return 'Tomorrow';
		if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
		if (diffDays < 7) return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function sourcePill(source?: ReminderCard['source']) {
		switch (source) {
			case 'revision': return { label: 'Spaced', cls: 'pill spaced' };
			case 'homework': return { label: 'Task', cls: 'pill task' };
			case 'deadline': return { label: 'Deadline', cls: 'pill deadline' };
			case 'custom':   return { label: 'Nudge', cls: 'pill nudge' };
			default:         return null;
		}
	}

	function submitNew() {
		const title = draftTitle.trim();
		if (!title) return;
		const when = draftWhen || today;
		const overdue = when < today;
		const sameDay = when === today;
		const card: ReminderCard = {
			id: `cus-${Date.now()}`,
			group: overdue ? 'overdue' : sameDay ? 'today' : when <= weekEnd ? 'week' : 'week',
			icon: draftKind === 'spaced' ? 'brain' : draftKind === 'deadline' ? 'target' : 'flame',
			tone: overdue ? 'danger' : sameDay ? 'accent' : 'warning',
			title,
			blurb: draftBlurb.trim() || (draftKind === 'spaced' ? 'Spaced repetition reminder' : draftKind === 'deadline' ? 'Scheduled deadline' : 'Quick nudge for later'),
			when: `${when}T${draftTime}`,
			sub: draftSub || undefined,
			source: 'custom',
			createdAt: Date.now()
		};
		customReminders = [...customReminders, card];
		newOpen = false;
		draftTitle = ''; draftBlurb = ''; draftWhen = ''; draftSub = ''; draftTime = '09:00'; draftKind = 'nudge';
	}
</script>

<section class="reminders" in:fade={{ duration: 260 }}>
	<header class="page-head">
		<div class="titles">
			<h1>Reminders</h1>
			<p class="sub">Time-sensitive alerts and scheduled nudges — revision triggers, deadlines, and nudges you set for yourself.</p>
		</div>
		<div class="head-actions">
			<div class="count-chip" title="Active alerts">
				<span class="pulse"></span>
				<b>{allCards.length}</b>
				<small>active</small>
			</div>
			<button type="button" class="set-reminder" on:click={() => (newOpen = true)}>
				<NavIcon name="plus" size={15} />
				<span>Set reminder</span>
			</button>
		</div>
	</header>

	{#each (['overdue', 'today', 'week'] as const) as key}
		{@const cards = key === 'overdue' ? overdue : key === 'today' ? todayGroup : week}
		{@const head = key === 'overdue' ? 'Overdue' : key === 'today' ? 'Today' : 'Later this week'}
		{@const count = cards.length}
		<section class="group">
			<div class="group-head">
				<h2 class:urgent={key === 'overdue'}>
					{#if key === 'overdue'}<NavIcon name="flame" size={14} />
					{:else if key === 'today'}<NavIcon name="clock" size={14} />
					{:else}<NavIcon name="calendar-check" size={14} />{/if}
					{head}
				</h2>
				<span class="count">{count}</span>
			</div>

			{#if count}
				<div class="card-stack">
					{#each cards as card (card.id)}
						{@const tone = toneClasses(card.tone)}
						{@const pill = sourcePill(card.source)}
						<article class="r-card" class:leaving={card.dismissed} style="--card-tone-ring: {tone.ring}">
							<span class="icon-wrap" style="background: {tone.bg}; color: {tone.fg}">
								<NavIcon name={card.icon} size={19} />
							</span>
							<div class="r-copy">
								<div class="r-head">
									<div class="r-title-row">
										<h3>{card.title}</h3>
										{#if pill}<span class={pill.cls}>{pill.label}</span>{/if}
									</div>
									<span class="when" style="color: {tone.fg}">
										<NavIcon name={card.group === 'overdue' ? 'clock' : 'calendar-check'} size={12} />
										{formatWhen(card.when.slice(0, 10))}
										{#if card.when.length > 11 && /T\d\d:\d\d/.test(card.when)}
											· {card.when.slice(11, 16)}
										{/if}
									</span>
								</div>
								<p class="r-blurb">
									{#if card.sub}<i class="sdot" style="background: {subjectColor(card.sub)}"></i><b>{subjectName(card.sub) || card.sub}</b> · {/if}
									{card.blurb}
								</p>
							</div>
							<div class="r-actions">
								<div class="snooze-wrap" on:click|stopPropagation={() => {}}>
									<button type="button" class="link snooze-btn" on:click={() => (snoozeMenu = snoozeMenu === card.id ? null : card.id)}>
										<NavIcon name="clock" size={13} />
										Snooze
										<NavIcon name="chevron-down" size={12} />
									</button>
									{#if snoozeMenu === card.id}
										<div class="snooze-pop" role="menu" on:click|stopPropagation={() => {}}>
											{#each snoozeOptions as opt}
												<button type="button" role="menuitem" on:click={() => { snooze(card.id, opt); snoozeMenu = null; }}>{opt}</button>
											{/each}
										</div>
									{/if}
								</div>
								{#if card.source === 'revision'}
										<a href="/revise" class="link snooze-btn" style="color: var(--accent); font-weight: 700; text-decoration: none;">
											<NavIcon name="arrow-right" size={13} /> Open Hub
										</a>
									{/if}
									<button type="button" class="link dismiss" on:click={() => dismiss(card.id)}>
									<NavIcon name="x" size={13} />
									Dismiss
								</button>
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<div class="empty-block">
					<NavIcon name={key === 'overdue' ? 'check-circle' : key === 'today' ? 'sunrise' : 'shield'} size={22} />
					<div>
						<b>No {key === 'overdue' ? 'overdue' : key === 'today' ? 'alerts for today' : 'upcoming reminders'}</b>
						<p>{key === 'overdue'
							? 'You are all caught up — nothing has slipped past.'
							: key === 'today'
							? 'Nothing scheduled for today. Hit "Set reminder" to add one.'
							: 'Nothing queued for the next 6 days.'}</p>
					</div>
				</div>
			{/if}
		</section>
	{/each}
</section>

<Modal bind:open={newOpen} title="Set a reminder" width="520px">
	<div class="form">
		<div class="kind-row" role="tablist">
			{#each (['nudge', 'spaced', 'deadline'] as const) as k}
				<button type="button" role="tab" aria-selected={draftKind === k} class:selected={draftKind === k} on:click={() => (draftKind = k)}>
					{#if k === 'nudge'}<NavIcon name="flame" size={13} /> Quick nudge
					{:else if k === 'spaced'}<NavIcon name="brain" size={13} /> Spaced review
					{:else}<NavIcon name="target" size={13} /> Deadline{/if}
				</button>
			{/each}
		</div>

		<label class="field">
			<small>Title</small>
			<input type="text" bind:value={draftTitle} placeholder="e.g. Finish Thermodynamics formulas" />
		</label>

		<div class="row-2">
			<label class="field">
				<small>Date</small>
				<input type="date" bind:value={draftWhen} min={today} />
			</label>
			<label class="field">
				<small>Time</small>
				<input type="time" bind:value={draftTime} />
			</label>
		</div>

		<label class="field">
			<small>Subject (optional)</small>
			<select bind:value={draftSub}>
				<option value="">— No subject —</option>
				{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
			</select>
		</label>

		<label class="field">
			<small>Notes (optional)</small>
			<textarea rows="3" bind:value={draftBlurb} placeholder="What should you remember when this fires?"></textarea>
		</label>
	</div>

	<svelte:fragment slot="footer">
		<button type="button" class="ghost" on:click={() => { newOpen = false; draftTitle = ''; draftBlurb = ''; draftWhen = ''; draftSub = ''; }}>Cancel</button>
		<button type="button" class="solid" disabled={!draftTitle.trim()} on:click={submitNew}>
			<NavIcon name="plus" size={14} /> Create reminder
		</button>
	</svelte:fragment>
</Modal>

<style>
	.reminders { display: grid; gap: 1.5rem; }

	.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	.titles { max-width: 620px; }
	h1 { margin: 0; font-size: clamp(1.7rem, 3.4vw, 2.2rem); font-weight: 850; letter-spacing: -.055em; }
	.sub { margin: .5rem 0 0; color: var(--text-secondary); font-size: .92rem; line-height: 1.6; }
	.head-actions { display: flex; align-items: center; gap: .7rem; }
	.count-chip { display: inline-flex; align-items: center; gap: .45rem; height: 38px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); font-size: .74rem; color: var(--text-secondary); }
	.count-chip b { color: var(--text-primary); font-size: .94rem; font-weight: 800; letter-spacing: -.02em; }
	.count-chip .pulse { display: block; width: 8px; height: 8px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent), transparent 50%); animation: pulse 2.2s infinite; }
	@keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent), transparent 60%); } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
	.set-reminder { display: inline-flex; align-items: center; gap: .45rem; height: 38px; padding: 0 1rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); color: var(--text-primary); font-size: .8rem; font-weight: 750; transition: all .16s ease; }
	.set-reminder:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

	.group { display: grid; gap: .6rem; }
	.group-head { display: flex; align-items: center; gap: .55rem; padding: 0 .25rem .15rem; }
	.group-head h2 { display: inline-flex; align-items: center; gap: .4rem; margin: 0; font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--text-secondary); }
	.group-head h2.urgent { color: var(--danger, #e0455a); }
	.group-head .count { margin-left: auto; display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .66rem; font-weight: 800; }

	.card-stack { display: grid; gap: .6rem; }
	.r-card { position: relative; display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: 1rem; padding: .95rem 1rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); transition: all .2s ease; overflow: hidden; }
	.r-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--card-tone-ring); opacity: .8; }
	.r-card:hover { border-color: color-mix(in srgb, var(--card-tone-ring), var(--border-subtle) 50%); transform: translateY(-1px); box-shadow: 0 10px 26px rgb(0 0 0 / 6%); }
	.r-card.leaving { opacity: 0; transform: translateX(10px); }
	.icon-wrap { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; flex: 0 0 44px; }
	.r-copy { min-width: 0; display: grid; gap: .28rem; }
	.r-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
	.r-title-row { display: inline-flex; align-items: center; gap: .5rem; flex-wrap: wrap; min-width: 0; }
	.r-title-row h3 { margin: 0; font-size: .9rem; font-weight: 750; letter-spacing: -.015em; line-height: 1.25; }
	.pill { padding: .12rem .5rem; border-radius: 999px; font-size: .58rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.pill.spaced   { color: #b45f06; background: color-mix(in srgb, var(--warning, #f6ad55), transparent 86%); }
	.pill.task     { color: var(--accent); background: var(--accent-soft); }
	.pill.deadline { color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 88%); }
	.pill.nudge    { color: var(--success, #42b883); background: color-mix(in srgb, var(--success, #42b883), transparent 86%); }
	:global([data-theme='dark']) .pill.spaced, :global([data-theme='red']) .pill.spaced, :global([data-theme='green']) .pill.spaced, :global([data-theme='obsidian']) .pill.spaced, :global([data-theme='quizlet']) .pill.spaced { color: #f6ad55; }
	.when { display: inline-flex; align-items: center; gap: .32rem; font-size: .7rem; font-weight: 750; white-space: nowrap; }
	.r-blurb { margin: 0; color: var(--text-secondary); font-size: .78rem; line-height: 1.55; display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
	.r-blurb b { color: var(--text-primary); font-weight: 650; }
	.sdot { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 999px; }

	.r-actions { display: inline-flex; align-items: center; gap: .25rem; position: relative; }
	.link { display: inline-flex; align-items: center; gap: .35rem; height: 32px; padding: 0 .6rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 720; cursor: pointer; font-family: inherit; transition: all .15s ease; }
	.link:hover { color: var(--accent); background: var(--accent-soft); }
	.link.dismiss:hover { color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 90%); }
	.snooze-wrap { position: relative; }
	.snooze-pop { position: absolute; z-index: 10; right: 0; top: 100%; margin-top: 4px; display: grid; min-width: 120px; padding: .3rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); box-shadow: 0 14px 30px rgb(0 0 0 / 14%); }
	.snooze-pop button { display: flex; align-items: center; height: 32px; padding: 0 .7rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 650; cursor: pointer; text-align: left; font-family: inherit; }
	.snooze-pop button:hover { color: var(--accent); background: var(--accent-soft); }

	.empty-block { display: grid; grid-template-columns: 36px 1fr; align-items: center; gap: .85rem; padding: 1.2rem 1.2rem; border: 1.4px dashed var(--border-subtle); border-radius: 16px; background: var(--surface-panel); color: var(--text-secondary); }
	.empty-block > :global(svg) { justify-self: center; color: var(--text-secondary); opacity: .65; }
	.empty-block b { display: block; font-size: .84rem; color: var(--text-primary); }
	.empty-block p { margin: .2rem 0 0; font-size: .74rem; line-height: 1.55; }

	/* -------- modal form -------- */
	.form { display: grid; gap: .85rem; }
	.kind-row { display: inline-flex; gap: .3rem; padding: .28rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.kind-row button { display: inline-flex; align-items: center; gap: .38rem; height: 34px; padding: 0 .85rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.kind-row button.selected { color: #fff; background: var(--accent); box-shadow: 0 6px 14px color-mix(in srgb, var(--accent), transparent 68%); }
	.field { display: grid; gap: .3rem; }
	.field > small { color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.field input, .field select, .field textarea {
		width: 100%; padding: .6rem .75rem; border: 1px solid var(--border-subtle); border-radius: 12px;
		background: var(--surface-subtle); color: var(--text-primary); font-size: .84rem; font-family: inherit;
	}
	.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); background: var(--surface-panel); }
	.field textarea { resize: vertical; min-height: 62px; }
	.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }

	.ghost, .solid { display: inline-flex; align-items: center; gap: .4rem; height: 36px; padding: 0 .9rem; border-radius: 11px; font-size: .76rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.ghost { border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); }
	.ghost:hover { color: var(--text-primary); border-color: var(--accent); }
	.solid { border: 0; background: var(--accent); color: #fff; box-shadow: 0 8px 18px color-mix(in srgb, var(--accent), transparent 65%); }
	.solid:disabled { opacity: .45; cursor: default; box-shadow: none; }

	@media (max-width: 760px) {
		.r-card { grid-template-columns: 38px 1fr; }
		.r-card::before { width: 2.5px; }
		.icon-wrap { width: 38px; height: 38px; border-radius: 12px; flex: 0 0 38px; }
		.r-actions { grid-column: 1 / -1; justify-content: flex-end; padding-top: .2rem; border-top: 1px dashed var(--border-subtle); margin-top: .1rem; }
		.row-2 { grid-template-columns: 1fr; }
	}
</style>
