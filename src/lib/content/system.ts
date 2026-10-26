export type SystemCategoryId = 'all' | 'retention' | 'mock' | 'focus';
export type SystemCategory = Exclude<SystemCategoryId, 'all'>;

export interface SystemCategoryMeta {
	id: SystemCategoryId;
	label: string;
}

export const systemCategories: SystemCategoryMeta[] = [
	{ id: 'all', label: 'All' },
	{ id: 'retention', label: 'Retention' },
	{ id: 'mock', label: 'Mock Strategy' },
	{ id: 'focus', label: 'Focus' }
];

export interface SystemPlaybookLink {
	label: string;
	href: string;
}

export interface SystemStrategy {
	id: string;
	number: string;
	category: SystemCategory;
	categoryLabel: string;
	title: string;
	parenthetical: string;
	demoTitle: string;
	principle: string;
	failure: string;
	benchmark: string;
	playbook: SystemPlaybookLink;
}

export const systemStrategies: SystemStrategy[] = [
	{
		id: 'spaced-repetition',
		number: '01',
		category: 'retention',
		categoryLabel: 'Retention',
		title: 'Spaced Repetition',
		parenthetical: 'The Forgetting Curve',
		demoTitle: 'Revision queue',
		principle:
			'Memory is not a filing cabinet. It fades on a predictable curve, and every successful retrieval flattens that curve. The mistake is treating revision as a yearly project instead of a repeating system.',
		failure:
			'An Excel sheet can store deadlines, but someone has to remember to open it. Logging gets skipped on tired nights, and maintaining the sheet quietly becomes the task.',
		benchmark:
			'Every logged question returns at 1, 3, 7, and 21 days — scheduled by the system, not by memory.',
		playbook: {
			label: 'Read the spaced-revision playbook',
			href: '/playbooks/spaced-revision-engine'
		}
	},
	{
		id: 'post-mortem',
		number: '02',
		category: 'mock',
		categoryLabel: 'Mock Strategy',
		title: 'Post-Mortem Diagnostics',
		parenthetical: 'Error Taxonomy',
		demoTitle: 'Mistake log',
		principle:
			'A mock score is a symptom. The cause usually sits in one of four places: a missing concept, a calculation slip, a time trap, or a misread question. You cannot fix a cause you never named.',
		failure:
			'A notebook of wrong answers slowly becomes a diary. Without categories, the same error hides inside a different question — and when the week gets tight, logging is the first habit dropped.',
		benchmark:
			'Every wrong answer is classified within 48 hours and paired with one corrective action.',
		playbook: {
			label: 'Read the mock post-mortem playbook',
			href: '/playbooks/mock-post-mortem'
		}
	},
	{
		id: 'interleaving',
		number: '03',
		category: 'retention',
		categoryLabel: 'Retention',
		title: 'Interleaving Practice',
		parenthetical: 'Cross-Chapter Retrieval',
		demoTitle: 'Cross-chapter sprint',
		principle:
			'Blocked practice feels productive because the chapter label tells you which formula to use. Interleaving removes that clue, so your brain practises choosing the tool — which is what the exam actually tests.',
		failure:
			'Chapter-wise DPPs are necessary, but they leave you fluent in one topic at a time. Nothing in the real paper arrives with its chapter printed above the question.',
		benchmark:
			'At least two mixed-chapter sets per week, with the topic hidden until after the attempt.',
		playbook: {
			label: 'Read the attempt-order playbook',
			href: '/playbooks/attempt-order'
		}
	},
	{
		id: 'deep-work',
		number: '04',
		category: 'focus',
		categoryLabel: 'Focus',
		title: 'Ultradian Deep Work',
		parenthetical: 'High-Yield Focus Blocks',
		demoTitle: 'Deep work queue',
		principle:
			'Attention holds for roughly 90 minutes before it needs a real break. Deep work is not a longer to-do list; it is one protected block with one target and no switching.',
		failure:
			'Timers get started and abandoned, and blocks nobody recorded may as well not have happened. Focus becomes a mood you hope for rather than a habit you can see.',
		benchmark:
			'Two protected 90-minute blocks on school days and three on free days, each logged against the chapter it moved.',
		playbook: {
			label: 'Read the deep-work playbook',
			href: '/playbooks/deep-work-blocks'
		}
	}
];

export type AuditCategory = 'retention' | 'mock' | 'interleaving' | 'focus';

export const auditCategoryOrder: AuditCategory[] = ['retention', 'mock', 'interleaving', 'focus'];

export interface AuditOption {
	label: string;
	category: AuditCategory;
}

export interface AuditQuestion {
	id: string;
	prompt: string;
	hint: string;
	options: AuditOption[];
}

export const auditQuestions: AuditQuestion[] = [
	{
		id: 'leak',
		prompt: 'When the week gets tight, what breaks first?',
		hint: 'Pick the pattern you actually recognise, not the one you wish were true.',
		options: [
			{ label: 'Revision gets pushed to later.', category: 'retention' },
			{ label: 'I take mocks, but the score doesn’t move.', category: 'mock' },
			{ label: 'Mixed-chapter questions freeze me.', category: 'interleaving' },
			{ label: 'I sit down, then drift between tabs.', category: 'focus' }
		]
	},
	{
		id: 'record',
		prompt: 'What does your record really capture?',
		hint: 'Think about the last two weeks, not the ideal system.',
		options: [
			{ label: 'Questions logged, never revisited.', category: 'retention' },
			{ label: 'Marks and solutions, not error causes.', category: 'mock' },
			{ label: 'One chapter at a time, always in order.', category: 'interleaving' },
			{ label: 'Hours studied, not what got done.', category: 'focus' }
		]
	},
	{
		id: 'symptom',
		prompt: 'Which symptom costs you the most marks?',
		hint: 'Choose the one that shows up in the exam hall.',
		options: [
			{ label: 'Older chapters have quietly vanished.', category: 'retention' },
			{ label: 'The same mistake returns in a new disguise.', category: 'mock' },
			{ label: 'I know the chapter, but not which tool to use.', category: 'interleaving' },
			{ label: 'Focus dies before the paper ends.', category: 'focus' }
		]
	}
];

export interface AuditRecommendation {
	eyebrow: string;
	profileLabel: string;
	strategy: string;
	headline: string;
	body: string;
	automates: string[];
	playbook: SystemPlaybookLink;
}

export const auditRecommendations: Record<AuditCategory, AuditRecommendation> = {
	retention: {
		eyebrow: 'Dominant leak — Retention',
		profileLabel: 'Retention',
		strategy: 'Spaced Repetition',
		headline: 'Build a queue, not a backlog.',
		body:
			'You are already doing the work; it just isn’t coming back at the right time. A small, automatic queue will keep old chapters in circulation without another spreadsheet to maintain.',
		automates: [
			'A revision queue built from every question you log',
			'1 / 3 / 7 / 21-day intervals that reset when a chapter slips',
			'One daily answer to “what should I revise today?”'
		],
		playbook: {
			label: 'Read the spaced-revision playbook',
			href: '/playbooks/spaced-revision-engine'
		}
	},
	mock: {
		eyebrow: 'Dominant leak — Diagnostics',
		profileLabel: 'Diagnostics',
		strategy: 'Post-Mortem Diagnostics',
		headline: 'Turn scores into causes.',
		body:
			'You are measuring outcomes without recording the reasons. Classify each miss once and the next mock stops being a verdict — it becomes a short list of repairs.',
		automates: [
			'A mistake log with the cause attached to every wrong answer',
			'Score and accuracy trends split by subject',
			'A 48-hour post-mortem prompt after each test'
		],
		playbook: {
			label: 'Read the mock post-mortem playbook',
			href: '/playbooks/mock-post-mortem'
		}
	},
	interleaving: {
		eyebrow: 'Dominant leak — Transfer',
		profileLabel: 'Interleaving',
		strategy: 'Interleaving Practice',
		headline: 'Practise choosing the tool.',
		body:
			'Chapter practice has trained you to use whatever the section title suggests. Mixed retrieval feels worse before it feels faster, because it trains the decision the exam actually asks for.',
		automates: [
			'A queue that mixes chapters instead of siloing them',
			'Chapter-level accuracy side by side',
			'A weekly review that flags one-topic fluency'
		],
		playbook: {
			label: 'Read the attempt-order playbook',
			href: '/playbooks/attempt-order'
		}
	},
	focus: {
		eyebrow: 'Dominant leak — Attention',
		profileLabel: 'Attention',
		strategy: 'Ultradian Deep Work',
		headline: 'Protect one block at a time.',
		body:
			'Your plan is not short of hours; it is short of protected attention. One recorded 90-minute block beats a day of interrupted study.',
		automates: [
			'A built-in focus timer for 90 / 20-minute cycles',
			'Blocks recorded against the chapter they moved',
			'A daily view that shows where attention actually went'
		],
		playbook: {
			label: 'Read the deep-work playbook',
			href: '/playbooks/deep-work-blocks'
		}
	}
};
