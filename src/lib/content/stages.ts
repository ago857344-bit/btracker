export interface StagePhase {
	label: string;
	window: string;
	heading: string;
	text: string;
	targets: string[];
}

export interface StageCadence {
	label: string;
	rhythm: string;
	detail: string;
}

export interface StageLimit {
	label: string;
	value: string;
	unit: string;
	detail: string;
}

export interface Stage {
	id: 'class-11' | 'class-12' | 'dropper';
	tab: string;
	tabSub: string;
	eyebrow: string;
	title: string;
	description: string;
	duration: string;
	focus: string[];
	phases: StagePhase[];
	cadence: { intro: string; rows: StageCadence[]; note: string };
	limits: { intro: string; cards: StageLimit[]; rules: string[] };
	pitfalls: string[];
	metaDescription: string;
}

export const stages: Stage[] = [
	{
		id: 'class-11',
		tab: 'Class 11',
		tabSub: 'Foundation',
		eyebrow: 'Class 11 · Foundation year',
		title: 'Build the base you will actually use in Class 12.',
		description:
			'Class 11 is the only year with enough slack to fix fundamentals. The goal is not maximum marks yet \u2014 it is chapters you can build on without re-learning them later.',
		duration: '12 months · roughly 3\u20134 self-study hours a day',
		focus: [
			'Mechanics and algebra fluency',
			'Organic basics and mole concept',
			'Calculus before it becomes a tool elsewhere',
			'A revision habit that survives school weeks'
		],
		phases: [
			{
				label: 'Phase 01',
				window: 'Months 1\u20133',
				heading: 'Settle the fundamentals',
				text: 'Cover the first third of the syllabus slowly enough that derivations make sense. Speed is not the target; a clean first pass is.',
				targets: [
					'Finish mechanics, basic maths, and the first organic chapters',
					'20\u201330 questions logged on a normal school day',
					'One chapter test every weekend',
					'Zero chapters carried forward unexplained'
				]
			},
			{
				label: 'Phase 02',
				window: 'Months 4\u20136',
				heading: 'Widen the base',
				text: 'Add the second block of chapters while keeping the first block warm. This is where most students drop revision and quietly lose the first three months.',
				targets: [
					'Complete electromagnetism, thermochemistry, and algebra-heavy chapters',
					'Two mixed revision sessions each week',
					'One full-syllabus test per month',
					'30\u201340 questions logged on full study days'
				]
			},
			{
				label: 'Phase 03',
				window: 'Months 7\u20139',
				heading: 'Add difficulty, not volume',
				text: 'Shift from finishing chapters to solving harder problems within them. A chapter is not done when you have read it; it is done when the hard questions stop being surprising.',
				targets: [
					'Finish the Class 11 syllabus with room for revision',
					'Weekly timed sectional tests',
					'Error log reviewed every Sunday',
					'Identify the three weakest chapters and schedule repairs'
				]
			},
			{
				label: 'Phase 04',
				window: 'Months 10\u201312',
				heading: 'Consolidate before promotion',
				text: 'Do not rush into Class 12 content. Use the last quarter to make Class 11 automatic, because Class 12 assumes it is.',
				targets: [
					'Two full revision sweeps of the Class 11 syllabus',
					'One full mock per fortnight with a written post-mortem',
					'Formula and reaction recall without notes',
					'Maintain a 15\u201325 card daily revision queue'
				]
			}
		],
		cadence: {
			intro:
				'Class 11 revision should be light, frequent, and almost invisible. Four short touches a week beat one heroic Sunday.',
			rows: [
				{
					label: 'Same day',
					rhythm: '10 minutes',
					detail: 'Close the chapter and write down the two ideas you would struggle to reproduce tomorrow.'
				},
				{
					label: 'Day 3',
					rhythm: '20 minutes',
					detail: 'Attempt three or four questions on the topic with notes closed. Log the outcome.'
				},
				{
					label: 'Weekly',
					rhythm: '45 minutes',
					detail: 'Mixed set from the last two weeks. The goal is switching between topics without warning.'
				},
				{
					label: 'Monthly',
					rhythm: '90 minutes',
					detail: 'Full-syllabus sweep so far. Anything failed resets in the queue instead of quietly disappearing.'
				}
			],
			note: 'A 21-day interval can wait until Class 12. In Class 11, consistency matters more than depth of spacing.'
		},
		limits: {
			intro:
				'These are logging limits, not study limits. If you cross them, you are recording more than you are learning.',
			cards: [
				{ label: 'Questions logged', value: '20\u201340', unit: 'per day', detail: 'On full study days. On school-heavy days, 15 is plenty.' },
				{ label: 'Focused study', value: '3\u20134', unit: 'hours per day', detail: 'Excluding school and coaching contact hours.' },
				{ label: 'Tests', value: '1\u20132', unit: 'per week', detail: 'One chapter test plus a monthly full-syllabus paper.' }
			],
			rules: [
				'Log questions in under 10 seconds each \u2014 a title, chapter, and outcome is enough',
				'Cap the revision queue at 12\u201315 cards so it always gets cleared',
				'Never log a chapter you have not at least attempted to revise',
				'If logging takes more than 10 minutes a day, cut fields, not questions'
			]
		},
		pitfalls: [
			'Chasing Class 12 content early instead of fixing Class 11 fundamentals',
			'Maintaining a mistakes notebook that is never reopened',
			'Studying only the chapters you already like',
			'Letting a school-week backlog turn into a permanent revision debt'
		],
		metaDescription:
			'A Class 11 JEE foundation plan: realistic monthly targets, a light revision cadence, and sensible daily logging limits.'
	},
	{
		id: 'class-12',
		tab: 'Class 12',
		tabSub: 'Board + JEE',
		eyebrow: 'Class 12 · Boards and JEE together',
		title: 'Run two syllabi without running two lives.',
		description:
			'Class 12 asks you to prepare for boards and JEE at the same time, with a school timetable in the middle. The plan has to share work between them instead of duplicating it.',
		duration: '12 months · roughly 5\u20136 self-study hours a day',
		focus: [
			'Board answer quality and JEE problem speed',
			'Mock analysis, not mock volume',
			'Revision that keeps Class 11 alive',
			'Board practicals and JEE theory on one calendar'
		],
		phases: [
			{
				label: 'Phase 01',
				window: 'Months 1\u20133',
				heading: 'Cover while consolidating',
				text: 'Move through Class 12 chapters while keeping a weekly revision slot for Class 11. The two must share a timetable from day one.',
				targets: [
					'Complete the first third of the Class 12 syllabus',
					'30\u201345 questions logged on regular days',
					'One Class 11 revision block every week',
					'One sectional test per fortnight'
				]
			},
			{
				label: 'Phase 02',
				window: 'Months 4\u20136',
				heading: 'Full syllabus, first pass',
				text: 'Finish teaching yourself the whole syllabus and begin the transition from chapter tests to full papers. Analysis quality decides whether the mocks help.',
				targets: [
					'Full Class 12 syllabus covered once',
					'One full mock every two weeks, with a written post-mortem',
					'Revision queue running at 15\u201320 cards a day',
					'Error log balanced between knowledge and execution losses'
				]
			},
			{
				label: 'Phase 03',
				window: 'Months 7\u20139',
				heading: 'Boards and mocks in parallel',
				text: 'Board preparation is not a detour if it is scheduled. Use board writing practice to lock derivation clarity, then return to timed JEE practice.',
				targets: [
					'Board-style written answers practised weekly',
					'Two mocks a week by the end of the phase',
					'All Class 11 weak chapters revisited once',
					'Question logging capped so analysis always happens'
				]
			},
			{
				label: 'Phase 04',
				window: 'Months 10\u201312',
				heading: 'Peak, then taper',
				text: 'Board exams interrupt rhythm, so protect a reduced revision minimum through them. After boards, return to JEE with greater intensity and fewer new topics.',
				targets: [
					'Maintain a 10-card daily revision floor during boards',
					'Two full mocks per week after board exams',
					'Only targeted new learning, no fresh syllabus binges',
					'Post-mortem within 48 hours of every full mock'
				]
			}
		],
		cadence: {
			intro:
				'Class 12 revision has to run on a queue because decisions are the first thing to go when boards and mocks collide.',
			rows: [
				{
					label: 'Same day',
					rhythm: '15 minutes',
					detail: 'Log the day\u2019s chapters and let the tracker stamp the first revision date.'
				},
				{
					label: 'Day 3',
					rhythm: '30 minutes',
					detail: 'Mixed questions from the last week. Anything careless returns tomorrow.'
				},
				{
					label: 'Day 7',
					rhythm: '45 minutes',
					detail: 'Timed mini-set across two subjects. Compare accuracy, not just marks.'
				},
				{
					label: 'Day 21',
					rhythm: '60 minutes',
					detail: 'Chapter-level check on the oldest open items, scheduled before the next mock.'
				}
			],
			note: 'During board exams, halve the queue rather than abandoning it. Clearing ten cards a day is enough to keep the habit alive.'
		},
		limits: {
			intro:
				'The ceiling exists to protect revision and analysis time. Logging is support work; it is not the study itself.',
			cards: [
				{ label: 'Questions logged', value: '30\u201350', unit: 'per day', detail: 'Drop to 20\u201325 on school and board weeks.' },
				{ label: 'Focused study', value: '5\u20136', unit: 'hours per day', detail: 'Beyond school hours, including problem practice.' },
				{ label: 'Mocks', value: '1\u20132', unit: 'per week', detail: 'Peak at two full papers, never four half-analysed ones.' }
			],
			rules: [
				'Analysis is part of the mock: schedule 40 minutes after every full paper',
				'Do not raise question volume to compensate for a low score',
				'One revision block per week must cover Class 11 only',
				'Stop adding new error-log entries if the open list is over 40 \u2014 resolve first'
			]
		},
		pitfalls: [
			'Dropping revision entirely for two months to \u201cfinish the syllabus\u201d',
			'Sitting mocks without doing written post-mortems',
			'Treating board writing practice as wasted JEE time',
			'Comparing mock scores instead of tracking the same error types'
		],
		metaDescription:
			'A Class 12 board + JEE plan: shared-syllabus phases, a queue-based revision cadence, and daily logging limits that protect analysis time.'
	},
	{
		id: 'dropper',
		tab: 'Dropper',
		tabSub: 'High velocity',
		eyebrow: 'Dropper · High velocity year',
		title: 'One year, one syllabus, no room for drift.',
		description:
			'A drop year gives you time and takes away excuses. The winning pattern is a fast but honest first pass, then an unusually disciplined mock-and-repair cycle.',
		duration: '12 months · roughly 7\u20139 focused hours a day',
		focus: [
			'A full-syllabus pass by month five',
			'Mock volume with real analysis',
			'Error repair over fresh content',
			'Protecting sleep and energy for the full year'
		],
		phases: [
			{
				label: 'Phase 01',
				window: 'Months 1\u20133',
				heading: 'Reset and cover the gaps',
				text: 'Start with the chapters that cost you marks last year, not page one of the textbook. A diagnostic mock in week one decides the order.',
				targets: [
					'Six to eight diagnostic sections to locate weaknesses',
					'40\u201360 questions logged on a normal day',
					'One full mock per fortnight',
					'Every logged mistake classified by cause'
				]
			},
			{
				label: 'Phase 02',
				window: 'Months 4\u20135',
				heading: 'Finish the first pass',
				text: 'Complete the entire syllabus once. Speed matters here, but only if every chapter gets at least one timed problem set before you move on.',
				targets: [
					'Full syllabus covered with a question set per chapter',
					'Two full mocks per month',
					'Revision queue at 20\u201325 cards a day',
					'No chapter marked complete without a timed attempt'
				]
			},
			{
				label: 'Phase 03',
				window: 'Months 6\u20138',
				heading: 'Mock and repair',
				text: 'The centre of the year. Sit papers, analyse them within 48 hours, and spend the following week repairing exactly what the analysis names.',
				targets: [
					'Two to three mocks per week',
					'Every mock has a written post-mortem and three actions',
					'Weekly repair blocks aimed at the top two error types',
					'Seventy percent of study time on weak areas'
				]
			},
			{
				label: 'Phase 04',
				window: 'Months 9\u201312',
				heading: 'Peak, then hold the line',
				text: 'Reduce new content to almost nothing. Protect accuracy, sleep, and the revision queue while increasing paper exposure in the final eight weeks.',
				targets: [
					'Three full mocks per week in the final month',
					'Daily error-log review before the next paper',
					'No new chapters after month ten unless a mock demands it',
					'A fixed sleep schedule through exam week'
				]
			}
		],
		cadence: {
			intro:
				'A dropper year can afford the full 1-3-7-21 cycle. It cannot afford to skip the daily review that decides what enters it.',
			rows: [
				{
					label: 'Daily',
					rhythm: '20 minutes',
					detail: 'Close the error log: classify new mistakes, schedule re-tests, and clear today\u2019s due cards.'
				},
				{
					label: 'Every 3 days',
					rhythm: '45 minutes',
					detail: 'Mixed problem set across two weak chapters, timed, with no notes.'
				},
				{
					label: 'Weekly',
					rhythm: '2 hours',
					detail: 'Full revision sweep of everything touched that week plus the oldest open queue items.'
				},
				{
					label: 'Monthly',
					rhythm: 'Half day',
					detail: 'Audit the mock data: which chapters repeatedly cost marks, and which \u201cfinished\u201d chapters have gone cold.'
				}
			],
			note: 'Revision is not a break from mock preparation. The repair work you do after a paper is the revision cycle doing its job.'
		},
		limits: {
			intro:
				'A high-velocity year makes it easy to confuse volume with progress. These caps force the analysis to happen.',
			cards: [
				{ label: 'Questions logged', value: '40\u201360', unit: 'per day', detail: 'Quality of tagging matters more than the exact number.' },
				{ label: 'Focused study', value: '7\u20139', unit: 'hours per day', detail: 'Split into blocks with real breaks; do not count passive video time.' },
				{ label: 'Mocks', value: '2\u20133', unit: 'per week', detail: 'During the mock-and-repair phase, with one lighter week per month.' }
			],
			rules: [
				'Cap admin and logging at 30 minutes a day \u2014 use bulk entry where possible',
				'Never sit a mock you do not have time to analyse',
				'One full rest day per fortnight, scheduled in advance',
				'If the open error list exceeds 60 items, pause new mocks until it halves'
			]
		},
		pitfalls: [
			'Re-studying from page one instead of targeting last year\u2019s weak chapters',
			'Collecting mock scores as a personality rather than as data',
			'Trading sleep for study hours and losing accuracy in every paper',
			'Ignoring the revision queue because \u201cthere is time later\u201d'
		],
		metaDescription:
			'A dropper-year JEE plan with high-velocity phases, a full spaced revision cadence, and daily logging limits that keep mock analysis honest.'
	}
];
