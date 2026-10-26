export type PlaybookCategoryId = 'revision' | 'mock-strategy' | 'time-blocks';

export interface PlaybookCategory {
	id: PlaybookCategoryId;
	label: string;
	blurb: string;
}

export interface PlaybookStep {
	title: string;
	text: string;
}

export interface PlaybookSection {
	id: string;
	heading: string;
	paragraphs?: string[];
	bullets?: string[];
	steps?: PlaybookStep[];
	callout?: { label: string; text: string };
}

export interface Playbook {
	slug: string;
	title: string;
	menuTitle: string;
	description: string;
	category: PlaybookCategoryId;
	readTime: number;
	level: 'Foundation' | 'Core' | 'Advanced';
	updated: string;
	dek: string;
	takeaways: string[];
	sections: PlaybookSection[];
	cta: { title: string; text: string; label: string; href: string };
	related: string[];
}

export const categories: PlaybookCategory[] = [
	{
		id: 'revision',
		label: 'Revision',
		blurb: 'Schedules and systems that stop syllabus from quietly leaking out of memory.'
	},
	{
		id: 'mock-strategy',
		label: 'Mock Strategy',
		blurb: 'How to sit a paper, read the scorecard, and turn a bad attempt into next week\u2019s plan.'
	},
	{
		id: 'time-blocks',
		label: 'Time Blocks',
		blurb: 'Daily and weekly structures for people who have a syllabus and no spare hours.'
	}
];

export const playbooks: Playbook[] = [
	{
		slug: 'spaced-revision-engine',
		title: 'The spaced revision engine that survives a real JEE week',
		menuTitle: 'Spaced revision engine',
		description:
			'Build a 1-3-7-21 revision cycle that runs on a queue instead of willpower, so weak chapters resurface before they disappear.',
		category: 'revision',
		readTime: 8,
		level: 'Core',
		updated: 'October 2026',
		dek: 'Most revision plans die on day four. This one runs on a queue, not on how motivated you feel after school.',
		takeaways: [
			'One queue, four intervals, zero decisions at revision time',
			'Every logged question seeds its own revision date',
			'Weak topics graduate and leave the queue instead of haunting it forever'
		],
		sections: [
			{
				id: 'problem',
				heading: 'Revision fails because it is a decision, not a habit',
				paragraphs: [
					'Open a chapter and ask \u201cwhat should I revise today?\u201d and you have already lost. The question requires memory, judgement and energy, and on a Tuesday night after six hours of class you have none of those. So you default to the chapter you already know, feel productive, and let the weak one drift another week.',
					'A revision engine removes the decision. You do not pick subjects; the queue picks for you. Your job is to show up, clear today\u2019s card, and leave.'
				],
				callout: {
					label: 'The rule',
					text: 'If a revision plan requires you to choose what to study each day, it is not a plan. It is a suggestion.'
				}
			},
			{
				id: 'intervals',
				heading: 'Four intervals, one queue',
				paragraphs: [
					'Every topic you study enters the queue and comes back at four fixed checkpoints: the next day, day three, day seven, and day twenty-one. Those are not magic numbers, but they are spaced widely enough to force recall and close enough that forgetting has not fully set in.',
					'At each checkpoint you attempt a cold recall \u2014 a couple of questions, a blank page, a formula from memory \u2014 with no notes open. Pass and the topic moves to the next interval. Fail and it resets to day one. The queue only grows as fast as you feed it, so honesty is cheaper than optimism.'
				],
				steps: [
					{ title: 'Same day', text: 'Log what you studied and let the tracker stamp the first revision date for tomorrow. No extra work today.' },
					{ title: 'Day 1', text: 'Close the notes and attempt two questions from the topic. If both are clean, move on.' },
					{ title: 'Day 3 and day 7', text: 'Use mixed questions from adjacent chapters. Recognition should not be enough.' },
					{ title: 'Day 21', text: 'Take a timed mini-set. Anything below your threshold resets to day one at the back of the queue.' }
				]
			},
			{
				id: 'logging',
				heading: 'Let the log schedule the revision',
				paragraphs: [
					'The biggest failure mode is a revision system that lives beside your study system. You study in one place and track revision in another, and the two drift until revision is a notebook you open once a fortnight.',
					'Log in the same surface you revise in. When a question goes into the tracker, tag the chapter and mark whether it was correct, a careless slip, or genuinely unknown. That one field decides how soon it returns.'
				],
				bullets: [
					'Correct and confident: full interval sequence',
					'Correct but slow: repeat at day three before advancing',
					'Careless: return tomorrow with a time limit',
					'Unknown: return tomorrow and the day after, then resume'
				],
				callout: {
					label: 'Keep it small',
					text: 'One tag per question is enough. A revision engine with six dropdowns is a data-entry job, not a study habit.'
				}
			},
			{
				id: 'load',
				heading: 'Cap the daily load so the queue stays clearable',
				paragraphs: [
					'A queue you cannot clear is worse than no queue, because it teaches you that the system is something you are behind on. Cap daily revisions at a number you can actually finish in twenty to thirty minutes: eight to twelve cards for most Class 11 students, twelve to eighteen for droppers with full days.',
					'When new topics pile up faster than you clear old ones, slow the intake. That means logging fewer new chapters, not skipping revision. The queue is the priority; the syllabus will wait a day.'
				],
				bullets: [
					'Class 11: 8\u201312 revision cards a day, six days a week',
					'Class 12: 10\u201315 cards, with a lighter Sunday',
					'Droppers: 15\u201320 cards, split across two shorter sittings',
					'If you miss a day, clear the backlog before adding anything new'
				]
			},
			{
				id: 'graduation',
				heading: 'Let strong topics leave',
				paragraphs: [
					'At some point a chapter has to graduate. If a topic clears day twenty-one twice in a row, move it to a maintenance sweep \u2014 once a month, in a mixed set \u2014 and free the queue for something that needs attention. A system that holds every chapter forever collapses under its own weight.',
					'Graduation is also the emotional payoff. You can see the pile of genuinely weak topics getting smaller, which is a far better signal than the number of hours you sat at a desk.'
				],
				callout: {
					label: 'Twenty-one days is the point',
					text: 'If a topic has survived four spaced checks, it is no longer a revision problem. Stop feeding it daily slots and spend them on the topics that keep failing.'
				}
			}
		],
		cta: {
			title: 'Let the tracker hold the queue for you',
			text: 'Log a chapter, and BTracker stamps the revision dates, surfaces the due cards, and keeps the intervals honest. It takes about ten seconds per question.',
			label: 'Open the tracker',
			href: '/login'
		},
		related: ['error-log-that-sticks', 'weekly-review-45', 'mock-post-mortem']
	},
	{
		slug: 'error-log-that-sticks',
		title: 'The error log that actually changes your next attempt',
		menuTitle: 'An error log that sticks',
		description:
			'Stop collecting mistakes like stamps. Classify each error, fix the cause, and re-test it at the right interval.',
		category: 'revision',
		readTime: 7,
		level: 'Foundation',
		updated: 'October 2026',
		dek: 'A list of wrong answers is a diary. An error log is a work order \u2014 each entry names a cause and a retest date.',
		takeaways: [
			'Four error types, four different fixes',
			'An error you cannot classify is an error you will repeat',
			'Close the loop with a re-test, not a re-read'
		],
		sections: [
			{
				id: 'diary',
				heading: 'Most error logs are diaries in disguise',
				paragraphs: [
					'The standard advice is to maintain a mistakes notebook. So students copy out wrong questions in beautiful handwriting, feel virtuous, and never open the notebook again. The copying was the entire activity, and it did nothing for the next exam.',
					'An error log only earns its place if it changes a behaviour. That means every entry needs a cause you can act on, and a scheduled moment to prove the fix worked.'
				]
			},
			{
				id: 'taxonomy',
				heading: 'Classify before you fix',
				paragraphs: [
					'Not every mistake deserves the same response. A silly sign error and a chapter you never understood both produce a red cross, but treating them the same wastes energy on one and underserves the other.',
					'Split every error into one of four buckets, and let the bucket choose the remedy.'
				],
				steps: [
					{ title: 'Concept gap', text: 'You could not start, or you produced a plausible but wrong method. Fix: revisit the idea, then do three graduated questions.' },
					{ title: 'Application slip', text: 'You knew the method but chose the wrong one under pressure. Fix: mixed-topic practice with a short time cap.' },
					{ title: 'Execution error', text: 'Sign, units, arithmetic, copying the question wrong. Fix: a written checklist for the first and last minute of every problem.' },
					{ title: 'Reading error', text: 'You answered a different question than the one asked. Fix: underline the actual ask before touching the solution.' }
				],
				callout: {
					label: 'One bucket per entry',
					text: 'If you cannot decide between two buckets, the honest answer is usually concept gap. Choose that and move on.'
				}
			},
			{
				id: 'entry',
				heading: 'What one entry should contain',
				paragraphs: [
					'Four lines are enough: the question, the cause, the specific fix, and the date you will attempt a sibling question. Not the same question \u2014 a sibling. Re-solving a question you have just seen tests memory of the solution, not the underlying skill.',
					'Keep the writing short enough that you will still do it after a bad test. Two minutes per entry is the target; if you are spending longer, you are journaling.'
				],
				bullets: [
					'The question, clipped or referenced \u2014 not recopied',
					'The bucket and the exact moment it went wrong',
					'The fix, written as an instruction to yourself',
					'A re-test date, ideally within 72 hours'
				]
			},
			{
				id: 'loop',
				heading: 'Close the loop or the entry is decoration',
				paragraphs: [
					'The re-test is the whole point. Three days later, attempt a sibling question cold. If it is clean, mark the entry resolved and let it fade. If the same cause appears, the fix was too vague and needs rewriting.',
					'Track resolutions, not entries. A log with sixty open mistakes and three resolutions is a monument to guilt. A log with twelve entries and nine resolutions is a working system.'
				],
				callout: {
					label: 'The weekly question',
					text: 'Which single error type appeared most often this week? That is the only thing you need to target on Sunday.'
				}
			},
			{
				id: 'review',
				heading: 'Read the log before every mock',
				paragraphs: [
					'Ten minutes before a test, do not open a formula sheet. Read the last two weeks of your error log and count the buckets. If execution errors dominate, slow down in the first five minutes and use the checklist. If concept gaps dominate, plan to skip those questions fast instead of bleeding time on them.',
					'That is the difference between a mistake log and a strategy input. One is a record of the past; the other changes how you sit the next paper.'
				]
			}
		],
		cta: {
			title: 'Log errors with a cause, not just a red cross',
			text: 'BTracker lets you tag a question as careless, unknown, or slow, then pulls those mistakes back into review on schedule.',
			label: 'Start an error log',
			href: '/login'
		},
		related: ['spaced-revision-engine', 'mock-post-mortem', 'deep-work-blocks']
	},
	{
		slug: 'mock-post-mortem',
		title: 'The 48-hour mock post-mortem that sets up your next week',
		menuTitle: 'Mock post-mortem',
		description:
			'A repeatable protocol for reviewing a mock: score by category, separate knowledge from execution, and convert findings into three concrete actions.',
		category: 'mock-strategy',
		readTime: 9,
		level: 'Core',
		updated: 'October 2026',
		dek: 'The score is the least useful thing a mock produces. The useful part is the forty minutes you spend the next day.',
		takeaways: [
			'Review within 48 hours, while the reasoning is still visible',
			'Separate marks lost to knowledge from marks lost to execution',
			'Finish with three actions, not a feeling'
		],
		sections: [
			{
				id: 'why',
				heading: 'Review the reasoning, not just the answer key',
				paragraphs: [
					'Most students check the score, read the solutions for the ones they got wrong, nod, and close the paper. Two weeks later they make the same mistakes with the same questions in a different font.',
					'The post-mortem exists to capture the reasoning while it is still recoverable. A question you abandoned at minute forty has a story: you read it twice, tried a formula, got a mess, and left. That story is more useful than the solution.'
				],
				callout: {
					label: 'Deadline',
					text: 'Do not let a mock sit for more than two days. After that, you remember the answer, not the mistake.'
				}
			},
			{
				id: 'step-one',
				heading: 'Step one: score the paper by category',
				paragraphs: [
					'Total marks hide everything. Break the paper into topics or chapters and note marks available versus marks scored. Do the same for question type: single correct, multiple correct, numerical, and subjective if your paper has them.',
					'You are looking for patterns, not a verdict. A paper where mechanics is clean and electromagnetism collapses is a very different week of work than one where every numerical question ran long.'
				],
				steps: [
					{ title: 'Map the paper', text: 'List each question, its chapter, and its marks. Ten minutes.' },
					{ title: 'Mark the attempt', text: 'Correct, wrong, blank, or ran out of time \u2014 four outcomes, no commentary yet.' },
					{ title: 'Group and count', text: 'Total marks lost per chapter and per question type. Look for the two largest columns.' }
				]
			},
			{
				id: 'step-two',
				heading: 'Step two: split knowledge loss from execution loss',
				paragraphs: [
					'For every wrong or blank question, decide whether the loss was knowledge or execution. Knowledge means you could not produce the idea even with time. Execution means you had it and lost it to arithmetic, misreading, or the clock.',
					'This split decides your next week. Knowledge gaps need study blocks and fresh questions. Execution losses need timed practice and a checklist, not more content.'
				],
				bullets: [
					'Knowledge loss: no starting point, wrong concept, forgotten formula',
					'Execution loss: wrong arithmetic, misread, units, bubbling a wrong option',
					'Clock loss: left blank despite knowing how to do it',
					'Strategy loss: spent too long somewhere the paper did not reward'
				],
				callout: {
					label: 'Be strict',
					text: '\u201cI would have got it with more time\u201d is almost always a clock loss. Write it down and plan for it instead of excusing it.'
				}
			},
			{
				id: 'step-three',
				heading: 'Step three: read the attempt order',
				paragraphs: [
					'The order you attempted questions is data. Find the first moment the paper went wrong: a question that ate eight minutes, a section you left too late, a decision to push through instead of marking and moving.',
					'Write down the one decision you would change. Not five \u2014 one. You cannot hold a new rule for every situation, but you can hold a single rule for the next paper.'
				],
				steps: [
					{ title: 'Mark the time sinks', text: 'Any question over 1.5 times its fair share. Note whether you eventually solved it.' },
					{ title: 'Find the first bad decision', text: 'The moment that cascaded. Usually a stubborn question in the first third.' },
					{ title: 'Set one rule', text: 'Write a sentence you can act on: \u201cIf a question is not started in 90 seconds, mark it and go.\u201d' }
				]
			},
			{
				id: 'actions',
				heading: 'Finish with a page you can execute',
				paragraphs: [
					'The post-mortem ends with three actions for the next week: one knowledge repair, one execution drill, one timing rule. Each must be specific enough to schedule, with a day and a duration attached.',
					'Then file the review and close the paper. The value is in the next seven days, not in rereading the analysis.'
				],
				bullets: [
					'Knowledge: \u201cRe-derive ray optics, Tue and Thu, 40 minutes each\u201d',
					'Execution: \u201cTwo 45-minute mixed sets with the arithmetic checklist\u201d',
					'Timing: \u201cSkip rule at 90 seconds; test it in Saturday\u2019s paper\u201d'
				],
				callout: {
					label: 'Do not skip this',
					text: 'A post-mortem without scheduled actions is a mood. Schedule the three blocks before you close the notebook.'
				}
			}
		],
		cta: {
			title: 'Keep every mock\u2019s analysis in one place',
			text: 'Record the attempt, tag lost marks by chapter, and see whether the same topics keep costing you across papers.',
			label: 'Log your next mock',
			href: '/login'
		},
		related: ['attempt-order', 'error-log-that-sticks', 'deep-work-blocks']
	},
	{
		slug: 'attempt-order',
		title: 'Attempt order: how to spend a 3-hour paper like a resource',
		menuTitle: 'Attempt order',
		description:
			'A practical section strategy for JEE Main and Advanced papers: three passes, a skip rule, and an accuracy threshold for each pass.',
		category: 'mock-strategy',
		readTime: 6,
		level: 'Advanced',
		updated: 'October 2026',
		dek: 'Marks per minute falls off a cliff when you force a question. Order matters as much as knowledge.',
		takeaways: [
			'Three passes, each with a different success bar',
			'A numeric skip rule that removes the argument',
			'Accuracy targets that stop a high attempt count from backfiring'
		],
		sections: [
			{
				id: 'economics',
				heading: 'The paper is a budget, not a test',
				paragraphs: [
					'Every paper gives you roughly the same number of minutes and a variable number of doable questions. Your job is to buy as many correct marks as possible with the minutes you have. That is an allocation problem, not a bravery problem.',
					'A question that takes six minutes to earn marks worth two is a bad purchase, even if you eventually solve it. Reading the price before you commit is most of the skill.'
				],
				callout: {
					label: 'Fair share',
					text: 'Total minutes divided by total questions. For a 75-question, 180-minute paper, that is about 2.4 minutes per question. Anything at 1.5x that needs a reason.'
				}
			},
			{
				id: 'passes',
				heading: 'Three passes with different bars',
				paragraphs: [
					'Do not attempt the paper in order, and do not chase the paper\u2019s difficulty curve. Run three passes, each with a deliberately different standard.',
					'Pass one is a harvest: only questions you can finish quickly. Pass two is the working middle. Pass three is salvage \u2014 speculative attempts, clean-up, and checking.'
				],
				steps: [
					{ title: 'Pass 1 \u2014 harvest (40\u201350%)', text: 'Read every question. Attempt only those with an obvious route. Target near-perfect accuracy and a fast pace. Do not linger even if you like the question.' },
					{ title: 'Pass 2 \u2014 the real work (35\u201345%)', text: 'Return to questions with a known method but a longer execution. Time-box each one and abandon at the cap.' },
					{ title: 'Pass 3 \u2014 salvage (10\u201315%)', text: 'Guess strategically where negative marking allows, check transferred answers, and settle anything you marked for a second look.' }
				],
				callout: {
					label: 'Do not mix passes',
					text: 'The urge to solve one hard question in pass one is exactly how the clock disappears. Park it.'
				}
			},
			{
				id: 'skip',
				heading: 'Make the skip rule mechanical',
				paragraphs: [
					'Deciding whether to stay is exhausting and biased. Replace the decision with a rule you set before the paper starts. For example: if I have not written a route within sixty seconds, mark it and move.',
					'Rules like this work because they remove the negotiation at the worst possible moment. You are not deciding whether to give up; you are following a pre-agreed procedure.'
				],
				bullets: [
					'A 60-second read cap before the first mark on the page',
					'A hard time cap per question in pass two',
					'An immediate move after a second dead end',
					'A rule that frozen questions are returned to only in pass three'
				]
			},
			{
				id: 'accuracy',
				heading: 'Protect accuracy while you raise attempts',
				paragraphs: [
					'Higher attempt counts only help if accuracy holds. Track both after every mock. A student attempting 62 questions at 80% accuracy scores better than one attempting 72 at 65%, and the second student often feels like they worked harder.',
					'Set an accuracy floor for yourself. If a mock falls below it, the next paper should focus on the floor, not on attempting more.'
				],
				callout: {
					label: 'One metric to watch',
					text: 'Marks per attempted question, not attempts. It tells you whether extra questions are earning or costing you.'
				}
			},
			{
				id: 'practice',
				heading: 'Practise the order, not just the content',
				paragraphs: [
					'You would not run a race strategy for the first time on race day. Use every sectional test to rehearse the same passes and the same skip rule until it is automatic.',
					'After each attempt, write one line about where the plan broke. If it broke at the same point twice, change the rule rather than resolving to be more disciplined.'
				]
			}
		],
		cta: {
			title: 'Track attempt order against the score',
			text: 'Log mock attempts with timing notes and see which chapters and question types keep forcing you into the wrong pass.',
			label: 'Review your mock history',
			href: '/login'
		},
		related: ['mock-post-mortem', 'error-log-that-sticks', 'deep-work-blocks']
	},
	{
		slug: 'deep-work-blocks',
		title: 'The 90/20 study block, and how to stack four of them',
		menuTitle: 'The 90/20 block',
		description:
			'Design a repeatable day of deep study using 90-minute blocks, a hard off-switch, and a short shutdown routine that ends the day cleanly.',
		category: 'time-blocks',
		readTime: 8,
		level: 'Core',
		updated: 'October 2026',
		dek: 'The block is not the trick. The trick is deciding what a block is for before you sit down.',
		takeaways: [
			'One block, one deliverable, written in advance',
			'Ninety minutes of work followed by twenty minutes genuinely away',
			'A ten-minute shutdown that ruins the temptation to \u201cdo a bit more\u201d'
		],
		sections: [
			{
				id: 'unit',
				heading: 'Use blocks, not hours',
				paragraphs: [
					'\u201cStudy for four hours\u201d is a container, not a task. It has no definition of done, so it expands to fill the evening and still feels incomplete. A block has a specific deliverable, a start, and an end.',
					'Ninety minutes is long enough to get past the first uncomfortable ten minutes and short enough to stay sharp. Twenty minutes off is long enough to actually reset, provided you leave the desk.'
				],
				callout: {
					label: 'One sentence before you start',
					text: '\u201cBy 6:30 I will have finished twelve rotational dynamics problems and logged the errors.\u201d If you cannot write the sentence, the block is not ready.'
				}
			},
			{
				id: 'design',
				heading: 'Design the block around a deliverable',
				paragraphs: [
					'Choose outputs you can count: questions solved, a chapter summarised from memory, a formula set re-derived, a mock section attempted. \u201cRevise organic chemistry\u201d is not a deliverable; \u201credraw the eight named reactions and do six questions on them\u201d is.',
					'Put the hardest material in the first block of the day, not the last. By evening, most students are doing maintenance work whether they admit it or not.'
				],
				steps: [
					{ title: 'Write the deliverable', text: 'A number, a page, or a completed set. No vague verbs.' },
					{ title: 'Set the two clocks', text: '90 minutes on, 20 minutes off. The break starts on time even if you are behind.' },
					{ title: 'Close with a line', text: 'One sentence: what got done, what remains, what confused you.' }
				]
			},
			{
				id: 'stack',
				heading: 'Stack four blocks without burning the day',
				paragraphs: [
					'A full study day can hold three or four blocks. That sounds modest until you count the real work inside them. Two hundred minutes of genuine problem-solving beats eight hours of sitting near a book.',
					'Mixing block types prevents the flatness that comes from doing the same subject all day. A typical stack pairs a heavy problem block with a revision block, a test block, and an analysis block.'
				],
				bullets: [
					'Block 1: hard new material \u2014 highest energy',
					'Block 2: mixed problem set from recent chapters',
					'Block 3: timed section or mock',
					'Block 4: review, error log, and next-day preparation'
				],
				callout: {
					label: 'Cap the stack',
					text: 'If a day has no non-study hours, it has no recovery and no memory consolidation. Four blocks is the ceiling, not the starting line.'
				}
			},
			{
				id: 'break',
				heading: 'Take breaks that actually reset attention',
				paragraphs: [
					'The twenty-minute break is where most blocks are quietly ruined. A phone feed does not restore attention; it spends it. Move, eat something, look at something far away, or walk.',
					'If a break consistently runs long, make it physically separate from the study space. The desk is a cue for work; if you scroll at the desk, the cue weakens.'
				],
				bullets: [
					'Leave the room',
					'No social feeds inside the break',
					'Water and a snack, not a second coffee',
					'Set a timer for the restart before you stand up'
				]
			},
			{
				id: 'shutdown',
				heading: 'End the day with a shutdown, not a fade',
				paragraphs: [
					'The last ten minutes decide whether the next morning starts clean. Write the three things tomorrow\u2019s first block must cover, log the day, and close the books.',
					'A shutdown also protects you from the fantasy of \u201cone more hour\u201d. The plan is already captured, so carrying it in your head overnight is pointless.'
				],
				steps: [
					{ title: 'Log the day', text: 'Questions, chapters, and anything that needs revision.' },
					{ title: 'Write tomorrow\u2019s first block', text: 'One deliverable, on paper or in the tracker.' },
					{ title: 'Close the desk', text: 'Books away, notifications off. The day is done.' }
				],
				callout: {
					label: 'The evening test',
					text: 'If you cannot state tomorrow\u2019s first deliverable in one sentence, the shutdown is not finished.'
				}
			}
		],
		cta: {
			title: 'Give every block a number',
			text: 'Log questions as you finish them and BTracker turns a vague day of study into a countable record you can actually compare week to week.',
			label: 'Start logging blocks',
			href: '/login'
		},
		related: ['weekly-review-45', 'spaced-revision-engine', 'mock-post-mortem']
	},
	{
		slug: 'weekly-review-45',
		title: 'The 45-minute weekly review that keeps the plan honest',
		menuTitle: 'The weekly review',
		description:
			'A Sunday routine for reading the week\u2019s data, choosing next week\u2019s three priorities, and fixing the plan before it drifts.',
		category: 'time-blocks',
		readTime: 7,
		level: 'Foundation',
		updated: 'October 2026',
		dek: 'Plans do not fail dramatically. They drift, one unexamined week at a time.',
		takeaways: [
			'Review data before setting intentions',
			'Three priorities, not a rebuilt timetable',
			'Fix one structural problem per week'
		],
		sections: [
			{
				id: 'drift',
				heading: 'Why a plan quietly dies',
				paragraphs: [
					'A study plan rarely collapses in one day. It drifts: one missed revision block becomes three, a weak chapter stays untouched because the timetable is full, and by the end of the month the plan describes a student who no longer exists.',
					'The weekly review catches drift while it is still cheap to correct. It takes less than an hour and prevents the fortnightly crisis where you throw out the whole system and start again.'
				],
				callout: {
					label: 'Same time, same place',
					text: 'Pick a fixed slot \u2014 Sunday evening works for most students \u2014 and protect it. A review that happens \u201cwhen needed\u201d never happens.'
				}
			},
			{
				id: 'data',
				heading: 'First fifteen minutes: read the week',
				paragraphs: [
					'Open the log before you open your feelings. Count what actually happened: questions solved, chapters touched, revision cards cleared, mocks attempted. Compare it to what you intended last Sunday.',
					'You are not grading yourself. You are looking for a mismatch big enough to explain. If you planned twenty hours and logged eleven, the plan is wrong for your life, not your character.'
				],
				bullets: [
					'Questions logged per subject',
					'Revision cards cleared versus due',
					'Tests attempted and their section scores',
					'Days where the first block started after noon'
				]
			},
			{
				id: 'three',
				heading: 'Next fifteen minutes: choose three priorities',
				paragraphs: [
					'Do not rebuild the timetable from scratch. A full rewrite feels productive and is usually abandoned by Wednesday. Instead, choose three priorities for the coming week: one knowledge gap, one execution habit, one maintenance area.',
					'Each priority needs a session count and a day, not just an intention. \u201cFinish thermodynamics\u201d becomes \u201cthree 90-minute blocks, Monday, Wednesday, Friday.\u201d'
				],
				steps: [
					{ title: 'Knowledge gap', text: 'The chapter that cost the most marks or keeps appearing in the error log.' },
					{ title: 'Execution habit', text: 'One behaviour to rehearse: skip rule, arithmetic check, reading the full question.' },
					{ title: 'Maintenance', text: 'The subject you are tempted to ignore because it is currently fine.' }
				],
				callout: {
					label: 'Three is a ceiling',
					text: 'A fourth priority is a wish. If everything is a priority, the week has no shape.'
				}
			},
			{
				id: 'structure',
				heading: 'Last fifteen minutes: fix one structural problem',
				paragraphs: [
					'Some problems are not about discipline at all. The 7 a.m. block fails because you sleep at 1 a.m. Revision gets skipped because the queue is too large. Mock analysis never happens because it has no slot.',
					'Pick one structural fix per week and change the schedule, not the intention. Move the block, shrink the queue, or attach the review to an existing anchor like dinner.'
				],
				bullets: [
					'Move a block to a time you are actually awake',
					'Cut the daily revision cap until you clear it consistently',
					'Attach mock analysis to the same evening as the mock',
					'Delete one recurring commitment that produces nothing'
				]
			},
			{
				id: 'close',
				heading: 'Close with the first block',
				paragraphs: [
					'End the review by writing Monday\u2019s first block in full: the deliverable, the start time, and the materials on the desk. Specificity on Sunday removes the Monday morning negotiation.',
					'Then stop planning. The week is set; the remaining work is to show up and let the next review correct the course.'
				],
				callout: {
					label: 'The review is done when',
					text: 'You can state Monday\u2019s first deliverable without opening anything. If you cannot, stay for five more minutes.'
				}
			}
		],
		cta: {
			title: 'Review the week from real data',
			text: 'The tracker\u2019s stats page shows what you actually logged, how revision is tracking, and where the week\u2019s effort went.',
			label: 'See your stats',
			href: '/login'
		},
		related: ['deep-work-blocks', 'spaced-revision-engine', 'error-log-that-sticks']
	}
];

export function getPlaybook(slug: string): Playbook | undefined {
	return playbooks.find((playbook) => playbook.slug === slug);
}

export function getCategory(id: PlaybookCategoryId): PlaybookCategory {
	return categories.find((category) => category.id === id) ?? categories[0];
}
