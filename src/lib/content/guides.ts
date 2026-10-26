export type GuideCategoryId = 'system' | 'tests' | 'focus';

export interface GuideCategory {
	id: GuideCategoryId;
	label: string;
	short: string;
	blurb: string;
	icon: 'layers' | 'target' | 'bolt';
	accent: 'blue' | 'violet' | 'green';
}

export interface GuideStep {
	title: string;
	text: string;
}

export interface GuideSection {
	id: string;
	heading: string;
	paragraphs?: string[];
	bullets?: string[];
	steps?: GuideStep[];
	callout?: { label: string; text: string };
}

export interface Guide {
	slug: string;
	title: string;
	menuTitle: string;
	description: string;
	category: GuideCategoryId;
	readTime: number;
	level: 'Core' | 'Deep dive' | 'Quick win';
	updated: string;
	takeaways: string[];
	sections: GuideSection[];
}

export const guideCategories: GuideCategory[] = [
	{
		id: 'system',
		label: 'Study System',
		short: 'System',
		blurb: 'Logging, revision and daily practice that compound.',
		icon: 'layers',
		accent: 'blue'
	},
	{
		id: 'tests',
		label: 'Tests & Mocks',
		short: 'Tests',
		blurb: 'Turn scores and PYQs into specific fixes.',
		icon: 'target',
		accent: 'violet'
	},
	{
		id: 'focus',
		label: 'Focus & Energy',
		short: 'Focus',
		blurb: 'Attention, resets and habits that protect output.',
		icon: 'bolt',
		accent: 'green'
	}
];

export const guides: Guide[] = [
	{
		slug: 'weekly-review',
		title: 'The 20-minute weekly review that fixes your next week',
		menuTitle: 'The 20-minute weekly review',
		description:
			'A 20-minute Sunday reset that turns a week of logs into one clear change for the next seven days.',
		category: 'system',
		readTime: 6,
		level: 'Core',
		updated: 'October 2026',
		takeaways: [
			'Review inputs — time, questions and test errors — not just how you felt.',
			'Leave with one change for next week, not five.',
			'Put the review on the calendar before the week starts.'
		],
		sections: [
			{
				id: 'why',
				heading: 'Why daily tracking stalls',
				paragraphs: [
					`Daily logging tells you what happened. A weekly review tells you what to change. Those are different jobs, and most students stop logging because they never do the second one.`,
					`Without a review, a tracker turns into a scoreboard. You see hours and question counts, feel briefly guilty or proud, and start the next week with the same plan. The review is the short, fixed appointment where seven days of data become one decision.`
				],
				callout: {
					label: 'The one-change rule',
					text: `If you leave a review with a five-point overhaul, you will keep none of it. Pick the change that removes the biggest leak and give it the next seven days.`
				}
			},
			{
				id: 'agenda',
				heading: 'The 20-minute agenda',
				steps: [
					{
						title: 'Clear the week — 4 minutes',
						text: `Close open questions, add missing sessions, fix obviously wrong tags. Do not chase perfect data. A review of roughly correct logs beats an audit that never finishes.`
					},
					{
						title: 'Read the pattern — 4 minutes',
						text: `Look at three things: which chapters got time, which got none, and where accuracy dropped. Write those three observations down before you explain them away.`
					},
					{
						title: 'Name one leak — 4 minutes',
						text: `Choose the gap that cost the most marks or the most time — not the one that feels most dramatic. "Integrals took 40% of physics time and produced 4 correct answers" is a useful leak.`
					},
					{
						title: 'Write next week — 5 minutes',
						text: `Turn the leak into two concrete blocks. "Rotational dynamics: 25 PYQs, Tuesday and Thursday, 45 minutes each" is a plan. "Do more mechanics" is a mood.`
					},
					{
						title: 'Schedule the first block — 3 minutes',
						text: `Put the first block on the calendar before you close the review. A plan you have not started within 24 hours is usually a wish.`
					}
				]
			},
			{
				id: 'questions',
				heading: 'Five questions that surface the truth',
				bullets: [
					`Where did planned time and actual time disagree the most?`,
					`Which chapter received attention but almost no questions?`,
					`Which test error repeated more than once?`,
					`What did I avoid this week, and what was I afraid it would show?`,
					`What is the smallest action I can start tomorrow?`
				],
				paragraphs: [
					`Answer each question in one line. If an answer needs a paragraph, it is probably a decision for the review after next — not this one.`
				]
			},
			{
				id: 'bad-week',
				heading: 'When the week went badly',
				paragraphs: [
					`A bad week is not a failed review. The temptation is to rebuild the entire plan, change every subject and promise a new schedule from Monday. That usually lasts three days.`,
					`Keep the existing routine, replace one block, and give it seven days. If a test went badly, handle the paper in a separate mock post-mortem and bring only the follow-up action into the weekly review.`,
					`If the same leak has appeared for three weeks, the problem is not motivation; it is the practice you chose. Change the format: shorter blocks, fewer questions, a different source, or direct help.`
				]
			},
			{
				id: 'repeatable',
				heading: 'Keep it small enough to repeat',
				paragraphs: [
					`Put a recurring 20-minute slot at a time when you are normally free — Sunday afternoon works for most people. Keep a one-page note with three lines: what worked, what leaked, next week's change.`,
					`After a month you will have four decisions and a record of whether they worked. That is far more useful than four weeks of logs with no interpretation.`
				]
			}
		]
	},
	{
		slug: 'revision-system',
		title: 'Build a revision system that survives a busy week',
		menuTitle: 'A revision system for busy weeks',
		description:
			'Space revision by forgetting risk, not by the calendar — and keep the active deck small enough to finish.',
		category: 'system',
		readTime: 7,
		level: 'Deep dive',
		updated: 'October 2026',
		takeaways: [
			'Retrieval — not re-reading — is what makes revision count.',
			'A short, honest deck built from mistakes beats a giant deck you never touch.',
			'If recall is still shaky, reset the interval instead of moving on.'
		],
		sections: [
			{
				id: 'rereading',
				heading: 'Why re-reading feels like revision',
				paragraphs: [
					`Re-reading a chapter feels productive because the text is familiar. Familiarity is not recall. In an exam you have to rebuild the idea with no text in front of you, and that is a different skill.`,
					`The useful test is simple: close the notes and reproduce the method, the derivation or the setup from memory. If you cannot, you have recognised the chapter, not revised it.`
				],
				callout: {
					label: 'The retrieval rule',
					text: `Every revision pass should begin with a blank page or a closed book. Use the notes only after you have tried to rebuild the idea.`
				}
			},
			{
				id: 'rhythm',
				heading: 'The 1–3–7 rhythm',
				paragraphs: [
					`Instead of revising "when you get time", give every chapter a small series of three passes. The spacing is driven by how likely you are to forget, not by a fixed timetable.`,
					`The intervals below are a starting point. If a chapter is still shaky at the first check, ignore the schedule and revisit it sooner.`
				],
				bullets: [
					`Day 1 — rebuild the idea from memory, then check your notes.`,
					`Day 3 — solve two fresh questions without notes.`,
					`Day 7 — mix the chapter into a timed set with older topics.`
				]
			},
			{
				id: 'deck',
				heading: 'Build the deck from mistakes',
				paragraphs: [
					`Your revision list should come from questions you got wrong or could not finish, not from every line of your notes. Mistakes are already prioritised by where you actually lose marks.`,
					`When you log a wrong answer, write the cause in one line: a formula you forgot, a method you chose late, a sign you missed, a condition you misread. That line becomes the card — not the full solution.`,
					`Aim for a deck small enough to finish in 20 minutes. If the deck keeps growing, you are probably adding questions instead of causes.`
				]
			},
			{
				id: 'block',
				heading: 'The 20-minute revision block',
				steps: [
					{
						title: 'Choose three cards',
						text: `Pick them deliberately: one from a recent mistake, one from last week and one older topic that keeps slipping.`
					},
					{
						title: 'Answer before checking',
						text: `Say the method out loud or write the first two lines. No peeking at the solution until you have produced something.`
					},
					{
						title: 'Solve one fresh question',
						text: `Retrieval is not enough — use the idea once in a question you have not seen before.`
					},
					{
						title: 'Mark an honest status',
						text: `Easy, shaky or lost. "Shaky" is the most useful label because it tells you to shorten the interval.`
					},
					{
						title: 'Schedule the next touch',
						text: `Put the card back into the calendar — three days for shaky, seven for easy. The block ends with a date, not a feeling.`
					}
				]
			},
			{
				id: 'measure',
				heading: 'Measure retention, not coverage',
				paragraphs: [
					`A chapter is revised when you can use it without notes — not when you have looked at it three times. Count chapters you can retrieve, not pages you have re-read.`,
					`A quick check at the end of the week: pick two chapters at random and solve one mid-level question from each. If you can start the solution without hunting for the formula, the system is working. If not, the deck is too large or the practice is too passive.`
				]
			}
		]
	},
	{
		slug: 'dpp-strategy',
		title: 'How to make daily practice problems actually stick',
		menuTitle: 'Make DPPs actually stick',
		description:
			'A repeatable DPP routine: attempt under time, review the misses, tag the cause and schedule the retry.',
		category: 'system',
		readTime: 5,
		level: 'Core',
		updated: 'October 2026',
		takeaways: [
			'A DPP you never review is a test you never analysed.',
			'Tag the cause of every miss, not just the chapter.',
			'Retry the same questions from scratch in three days.'
		],
		sections: [
			{
				id: 'trap',
				heading: 'The DPP trap',
				paragraphs: [
					`Most students treat a DPP as a completion task: finish the set, check the answers, feel good or bad, move on. The real value is in the misses — and they disappear if you do not process them within a day.`,
					`A DPP is a diagnostic, not a scoreboard. One reviewed set with five tagged misses teaches more than three sets skimmed for the correct option.`
				]
			},
			{
				id: 'timer',
				heading: 'Set the timer before the first question',
				paragraphs: [
					`Give the set a realistic exam pace. A typical single-correct question should take roughly 1.5–2 minutes; multi-step problems can reasonably take more. For a 20-question set, set the timer for 35–40 minutes.`,
					`When the timer ends, stop solving and mark where you stopped. The questions you never reached are part of the diagnosis, even though they feel invisible.`
				]
			},
			{
				id: 'passes',
				heading: 'The three-pass attempt',
				steps: [
					{
						title: 'Pass 1 — clean sweep',
						text: `Answer what you know. Skip anything that stalls for more than about 90 seconds and mark it. Do not let one stubborn question consume the set.`
					},
					{
						title: 'Pass 2 — deliberate retry',
						text: `Return to the skipped questions. Use the smallest hint you can get away with — a formula name, a diagram, a first line.`
					},
					{
						title: 'Pass 3 — close the set',
						text: `For what is still stuck, solve with notes and write one line about why you were stuck. That line is the input for revision.`
					}
				]
			},
			{
				id: 'review',
				heading: 'The ten-minute review is the real work',
				paragraphs: [
					`For every wrong or skipped question, record three things: the idea being tested, the cause, and the retry date. The cause should be one of five labels: concept, method, calculation, misread or time.`,
					`Do not rewrite the full solution. Write the step where your attempt broke. "Forgot to resolve tension along the incline" is more useful than two pages of neat working you will never read again.`
				]
			},
			{
				id: 'retry',
				heading: 'Retry, don’t just move on',
				paragraphs: [
					`Schedule the missed questions again in three days. Same questions, blank page, no hints. If you get them right from scratch, the gap is closed. If not, your cause label was wrong — open the concept before adding new problems.`,
					`At the end of the week, bring the repeat causes into your weekly review. A single repeated cause is worth more than a long list of one-off mistakes.`
				]
			}
		]
	},
	{
		slug: 'mock-post-mortem',
		title: 'The 25-minute post-mortem after every mock',
		menuTitle: 'The 25-minute mock post-mortem',
		description:
			'Turn a score into a list of fixable causes with a four-bucket error audit and one experiment for the week.',
		category: 'tests',
		readTime: 6,
		level: 'Core',
		updated: 'October 2026',
		takeaways: [
			'Only review a mock when you can be curious instead of defensive.',
			'Tag every lost mark as knowledge, method, execution or timing.',
			'Choose one experiment for the next mock — not a new life plan.'
		],
		sections: [
			{
				id: 'symptom',
				heading: 'A score is a symptom',
				paragraphs: [
					`A mock result tells you how that paper went. It does not tell you why. Two students with the same score can have completely different problems: one missed concepts, the other lost marks to rushed arithmetic.`,
					`A post-mortem converts the number into causes you can act on. It is the highest-value 25 minutes you can spend after a test, but only if you do it before memory fades.`
				]
			},
			{
				id: 'buckets',
				heading: 'The four buckets',
				bullets: [
					`Knowledge — you did not know the concept or could not recall it.`,
					`Method — you knew the concept but chose a slow or wrong route.`,
					`Execution — sign errors, unit slips, misread options, messy algebra.`,
					`Timing — the method was right, but you did not reach or finish it in time.`
				],
				paragraphs: [
					`Tag every lost mark with exactly one bucket. If a question lost marks for more than one reason, choose the earliest cause in the sequence. That is the one you can fix first.`
				]
			},
			{
				id: 'audit',
				heading: 'The 25-minute audit',
				steps: [
					{
						title: 'Mark the paper — 5 minutes',
						text: `Score it, but resist ranking yourself against everyone else for now. You need the raw marks and the locations of the misses.`
					},
					{
						title: 'Tag lost marks — 8 minutes',
						text: `Use the four buckets. Include questions you got right for the wrong reason — a lucky guess is a miss that paid out this time.`
					},
					{
						title: 'Find the repeat — 5 minutes',
						text: `Group by chapter and cause. The pattern worth fixing maximises repeated frequency and marks lost, not the single most dramatic mistake.`
					},
					{
						title: 'Choose one experiment — 5 minutes',
						text: `Turn the repeat into a concrete trial before the next mock: 10 timed questions, a new checking habit, or a strict per-question cap.`
					},
					{
						title: 'Schedule the retest — 2 minutes',
						text: `Put the experiment on the calendar with a date. A fix without a time slot is only an intention.`
					}
				]
			},
			{
				id: 'score',
				heading: 'What to do with the score',
				paragraphs: [
					`Compare accuracy by section and difficulty, not just rank. One mock's percentile moves with the cohort; your own trend over three mocks is more stable and more useful.`,
					`If the score dropped but accuracy and timing improved on your targeted topics, the preparation is working. If the score rose but guesses carried the paper, the next test may expose it.`
				],
				callout: {
					label: 'Keep it to one',
					text: `One experiment per week is enough. Five experiments is a new plan you will not follow.`
				}
			},
			{
				id: 'when-not',
				heading: 'When not to analyse',
				paragraphs: [
					`If you are angry, exhausted or comparing yourself with friends, wait. Collect only the facts for five minutes, then do the full audit the next morning with a clear head.`,
					`For a pure silly error, fix the habit rather than the whole plan: underline the question, check units explicitly, or write the final answer on a separate line. Prefer small procedural fixes to dramatic declarations.`
				]
			}
		]
	},
	{
		slug: 'pyq-strategy',
		title: 'Use PYQs three times, not once',
		menuTitle: 'Use PYQs three times',
		description:
			'Split past-year questions across learning, topic drills and exam simulation — and log what each pass teaches you.',
		category: 'tests',
		readTime: 5,
		level: 'Core',
		updated: 'October 2026',
		takeaways: [
			'PYQs are a map of how concepts are asked, not just a final test.',
			'Use separate passes for learning, drilling and full-paper simulation.',
			'Save at least two recent years untouched for timed papers.'
		],
		sections: [
			{
				id: 'waste',
				heading: 'Why a single pass wastes PYQs',
				paragraphs: [
					`Solving every past-year question at the end of preparation turns a map into a mock you cannot learn from. You get one snapshot of your readiness and no exposure to the question style while you are still learning.`,
					`A better model uses the same pool three times, with a different job each time: learn the language, drill the pattern, then simulate the paper.`
				]
			},
			{
				id: 'pass1',
				heading: 'Pass 1 — learn with the solution nearby',
				paragraphs: [
					`While learning a chapter, solve a small set of PYQs with notes and solutions available. The aim is to see how the concept is asked, not to test yourself.`,
					`Read the question like an examiner: what is given, what is hidden, what is the shortest legitimate route? Log the question type and source. This pass should feel like guided practice, not a test.`
				]
			},
			{
				id: 'pass2',
				heading: 'Pass 2 — drill by topic',
				paragraphs: [
					`After you have revised the chapter, solve topic-wise PYQs under light time pressure with no notes. This is where patterns appear: the same trap, the same limiting case, the same calculation shortcut.`,
					`Tag errors the way you would in a DPP. A repeated cause across three questions is a signal to reopen the concept before moving to the next topic.`
				]
			},
			{
				id: 'pass3',
				heading: 'Pass 3 — simulate the paper',
				paragraphs: [
					`Keep at least two recent years untouched for full timed papers. Treat them like a real mock: one sitting, no pauses, no notes, then a proper post-mortem.`,
					`Do not use your last two years as casual practice in the week before the exam. They are most useful when the result can still change your plan.`
				]
			},
			{
				id: 'timeline',
				heading: 'A simple timeline',
				steps: [
					{
						title: 'Now — pass 1',
						text: `Use PYQs in the learning window only. Keep them close to the concept and keep solutions nearby.`
					},
					{
						title: '4–6 weeks later — pass 2',
						text: `Run topic drills after revision. No notes, timed lightly, errors logged.`
					},
					{
						title: '2–3 weeks before a test — pass 3',
						text: `Run a full paper in one sitting. Then spend 25 minutes on the mock post-mortem.`
					}
				],
				callout: {
					label: 'Don’t memorise year tags',
					text: `The goal is exposure at the right stage, not finishing a numbered checklist. If a chapter is weak, more pass-2 questions matter more than a new year.`
				}
			}
		]
	},
	{
		slug: 'attempt-order',
		title: 'Choose your exam-day attempt order in advance',
		menuTitle: 'Pick your exam-day attempt order',
		description:
			'Decide how you move through a paper before the timer starts, so accuracy is protected when it matters.',
		category: 'tests',
		readTime: 4,
		level: 'Quick win',
		updated: 'October 2026',
		takeaways: [
			'Every live decision costs time and attention; pre-decide the big ones.',
			'Start by banking sure marks, not by warming up on the hardest question.',
			'Use a per-question cap so moving on is a rule, not a mood.'
		],
		sections: [
			{
				id: 'live',
				heading: 'Deciding live costs marks',
				paragraphs: [
					`During a paper you make hundreds of small decisions: which question next, whether to keep going, when to guess. Each one consumes attention that should go to the problem.`,
					`A pre-decided order reduces the number of choices. You still adapt to the paper, but you are not redesigning your strategy under the clock.`
				]
			},
			{
				id: 'start',
				heading: 'The safe-start rule',
				paragraphs: [
					`Start with five to eight questions you are confident you can solve cleanly. This builds rhythm and banks marks before the paper can shake your confidence.`,
					`Do not start with the hardest section to "warm up". That is not a warm-up; it is a stress test with no score yet on the board.`
				]
			},
			{
				id: 'loops',
				heading: 'A simple three-loop order',
				steps: [
					{
						title: 'Loop 1 — bank the sure shots',
						text: `Move through all sections answering only the questions you can finish cleanly. Skip anything that stalls.`
					},
					{
						title: 'Loop 2 — work the middle',
						text: `Return to familiar but slower questions with a per-question time cap. Mark each question as attempted or abandoned.`
					},
					{
						title: 'Loop 3 — deliberate guesses and review',
						text: `Make calculated guesses, check that answers are transferred correctly, and review flagged questions. Do not leave blanks where there is no negative marking.`
					}
				]
			},
			{
				id: 'switching',
				heading: 'Set switching rules',
				paragraphs: [
					`Avoid switching subjects after every question. Batch by section or by question type so your brain holds one mode for longer.`,
					`If a question stalls beyond your cap, mark and leave. The cap is a decision made before the exam, not a judgement call under pressure.`
				]
			},
			{
				id: 'rehearse',
				heading: 'Rehearse the order',
				paragraphs: [
					`Test your order in at least two mocks. Keep a simple note of where the time disappeared and which loop produced most marks.`,
					`The best order is the one you have practised, not the theoretically optimal one you invented the night before.`
				],
				callout: {
					label: 'Write it down in minute one',
					text: `Put your attempt order on the rough sheet in the first minute. Then follow it until the paper gives you a reason to change it.`
				}
			}
		]
	},
	{
		slug: 'focus-blocks',
		title: 'A focus block that fits real JEE prep',
		menuTitle: 'A focus block for real prep',
		description:
			'Forty-five minutes, one chapter, no open tabs — a repeatable block that survives a full study day.',
		category: 'focus',
		readTime: 5,
		level: 'Core',
		updated: 'October 2026',
		takeaways: [
			'Match the block length to the task, not to a productivity meme.',
			'One concrete target per block is the whole system.',
			'A block counts when you can name what you finished.'
		],
		sections: [
			{
				id: 'pomodoro',
				heading: 'Why 25/5 can fail',
				paragraphs: [
					`A 25-minute block is excellent for starting and for tasks you keep postponing. It is less useful for a multi-step JEE problem that needs a longer runway of attention.`,
					`Use 25/5 for memorisation, admin or revision cards. Use 45/10 for problem sets. The timer serves the task; the task does not serve the timer.`
				]
			},
			{
				id: 'block',
				heading: 'The 45/10 block',
				paragraphs: [
					`Work for 45 minutes on one concrete target, then leave the desk for 10 minutes. The target must be finishable today: "solve 12 rotational dynamics PYQs and mark the misses", not "study physics".`,
					`Ten minutes away from the screen is part of the block, not a reward you skip. Walk, drink water, stretch, look out of a window. Do not open the phone and slide into a feed.`
				]
			},
			{
				id: 'setup',
				heading: 'A 90-second setup',
				steps: [
					{
						title: 'Write the target on paper',
						text: `A number and a task. If you cannot write it in one line, the target is too vague.`
					},
					{
						title: 'Open only the tabs you need',
						text: `Question set and formula sheet if allowed. Close the rest. Reopen them after the block if you still need them.`
					},
					{
						title: 'Move the phone away',
						text: `Another room or a drawer. Face-down on the desk is still a notification machine within reach.`
					},
					{
						title: 'Start the timer and record the start time',
						text: `The visible timer reduces the "just five more minutes" drift at the end.`
					},
					{
						title: 'Plan the break',
						text: `Decide now what you will do in the ten minutes so the break does not become a screen break.`
					}
				]
			},
			{
				id: 'distraction',
				heading: 'Decide what counts as a distraction',
				paragraphs: [
					`A quick formula lookup is part of the work. Checking a notification is not. The difference is whether the action serves the target you wrote down.`,
					`Keep a parking note beside you for intrusive thoughts: a message you need to send, a doubt about another subject, a task for later. Write it down and return to the problem.`
				]
			},
			{
				id: 'protect',
				heading: 'Protect the block',
				paragraphs: [
					`Tell the people around you what a focus block means, especially if you study in a shared room. Headphones or a visible timer can act as a signal.`,
					`Stack blocks with real breaks. Two or three focused blocks beat six hours of half-attention. On a tired day, do one block well and stop; a fake block only teaches you that studying feels bad.`
				],
				callout: {
					label: 'The honest test',
					text: `A block is successful if you can name what you finished. Not if the timer ran out.`
				}
			}
		]
	},
	{
		slug: 'bad-test-reset',
		title: 'The reset routine after a bad test',
		menuTitle: 'The reset after a bad test',
		description:
			'A 48-hour protocol to extract the lesson from a bad paper without losing the following week.',
		category: 'focus',
		readTime: 4,
		level: 'Quick win',
		updated: 'October 2026',
		takeaways: [
			'Do not make decisions in the first hour after a bad paper.',
			'Collect facts before interpretations.',
			'Repair one content fix and one process fix, then return to normal.'
		],
		sections: [
			{
				id: 'spiral',
				heading: 'The spiral is the real cost',
				paragraphs: [
					`A bad score can cost an evening of rumination, then two days of avoidance. The paper itself is 3 hours; the spiral can take a week.`,
					`The aim of a reset is not to feel great immediately. It is to stop the score from becoming a verdict and to get back to useful practice quickly.`
				]
			},
			{
				id: 'first-hour',
				heading: 'First hour — no analysis',
				paragraphs: [
					`Close the paper. Eat something, walk, or sleep if you can. Do not compare answers with friends or rebuild your entire plan while emotional.`,
					`If you need to write something, write one sentence: "I feel ___ because ___." That is enough processing for the first hour. Analysis can wait; it will be better with a clear head.`
				]
			},
			{
				id: 'facts',
				heading: 'Same day — facts only',
				paragraphs: [
					`Give yourself 10 minutes to count: how many you attempted, how many were correct, which sections lost time. No judgements, no labels about being "bad at physics".`,
					`Facts give your brain something concrete to hold. Interpretations without facts are how a single test turns into a story about your entire preparation.`
				]
			},
			{
				id: 'repair',
				heading: 'Next 48 hours — repair two things',
				steps: [
					{
						title: 'One content fix',
						text: `The chapter or cause that repeated. Schedule a focused block and a retry date.`
					},
					{
						title: 'One process fix',
						text: `Attempt order, a per-question time cap, or a checking habit. Choose one you can rehearse in the next mock.`
					},
					{
						title: 'One normal block',
						text: `Do an ordinary study block unrelated to the test. This breaks the avoidance loop and proves the week is not over.`
					}
				]
			},
			{
				id: 'return',
				heading: 'Return to the plan',
				paragraphs: [
					`Bring the two fixes into your next weekly review. If the same issue repeats across three tests, change the practice, not just the intention.`,
					`If a score is affecting sleep, appetite or mood for more than a few days, talk to someone you trust — a teacher, parent or mentor. That is part of preparation, not a detour from it.`
				],
				callout: {
					label: 'Permission slip',
					text: `You are allowed to be disappointed. You are not required to make any decisions in the first hour.`
				}
			}
		]
	},
	{
		slug: 'energy-routine',
		title: 'Sleep and energy habits that protect study quality',
		menuTitle: 'Protect your study energy',
		description:
			'Study quality drops before study hours do. Fix sleep, light, food and wind-down before adding another hour.',
		category: 'focus',
		readTime: 5,
		level: 'Core',
		updated: 'October 2026',
		takeaways: [
			'Attention and error rate matter more than raw hours.',
			'Keep a sleep floor and a consistent wake time.',
			'Build a wind-down that starts before you are already tired.'
		],
		sections: [
			{
				id: 'input',
				heading: 'Hours are not the real input',
				paragraphs: [
					`Two students can sit for the same six hours. One solves 40 questions with two careless errors; the other reads the same paragraph four times. The difference is attention, working memory and error rate — not time on the chair.`,
					`Before adding another hour, check the basics that make the existing hours count: sleep, light, food and movement.`
				]
			},
			{
				id: 'sleep',
				heading: 'Protect the sleep floor',
				paragraphs: [
					`Most teenagers need roughly 8–10 hours of sleep. Most JEE aspirants run a debt for months and call it discipline. A 7-hour floor on school days is a compromise, not a target.`,
					`Keep your wake time fixed and move bedtime earlier. Avoid all-nighters before tests: memory consolidation happens in sleep, and a tired brain makes more careless errors in the first hour than an extra hour of revision can recover.`
				]
			},
			{
				id: 'caffeine',
				heading: 'Caffeine and the afternoon crash',
				paragraphs: [
					`If you use chai or coffee to study, set a cutoff well before bed — a common rule is 8–10 hours. A second cup at 5 pm can still be in your system at midnight.`,
					`A short walk and daylight beat a second cup after 4 pm. If you need a stimulant to start every block, fix the routine before adding more study hours.`
				]
			},
			{
				id: 'daylight',
				heading: 'Morning light and movement',
				paragraphs: [
					`Ten minutes of daylight after waking helps set your body clock and makes an earlier bedtime easier. Open a window, step outside, or walk to school without headphones for a few minutes.`,
					`Between long blocks, five minutes of stretching or walking reduces restlessness. Movement is not a break from studying; it is part of keeping the next block usable.`
				]
			},
			{
				id: 'wind-down',
				heading: 'A wind-down that works',
				steps: [
					{
						title: 'Set a study cutoff',
						text: `Stop stimulating problem-solving at least 30 minutes before bed. Revision cards or light reading are fine; new mock papers are not.`
					},
					{
						title: 'Lower the light',
						text: `Dim the room and reduce screen brightness. The goal is to signal wind-down, not to finish one more video.`
					},
					{
						title: 'Brain-dump tomorrow',
						text: `Write tomorrow's first task and any open loops on paper so your brain does not rehearse them in bed.`
					},
					{
						title: 'Keep the phone out of bed',
						text: `Use a separate alarm if needed. The phone is the most common reason a planned 11 pm sleep becomes 12:30 am.`
					},
					{
						title: 'Keep wake time stable',
						text: `A consistent wake time is the anchor. Weekends with a four-hour shift make Monday feel like jet lag.`
					}
				],
				callout: {
					label: 'One change first',
					text: `Pick the sleep floor or the wake-time anchor and hold it for two weeks. Adding all five steps at once usually produces none.`
				}
			}
		]
	}
];

export const featuredGuide = guides[0];
export const guideCount = guides.length;
export const totalReadTime = guides.reduce((sum, guide) => sum + guide.readTime, 0);

export function getCategory(id: GuideCategoryId): GuideCategory {
	return guideCategories.find((category) => category.id === id) ?? guideCategories[0];
}

export function getGuidesByCategory(id: GuideCategoryId): Guide[] {
	return guides.filter((guide) => guide.category === id);
}

export function getGuide(slug: string): Guide | undefined {
	return guides.find((guide) => guide.slug === slug);
}

export function getRelatedGuides(guide: Guide, count = 2): Guide[] {
	const sameCategory = guides.filter((item) => item.category === guide.category && item.slug !== guide.slug);
	const rest = guides.filter((item) => item.category !== guide.category && item.slug !== guide.slug);
	return [...sameCategory, ...rest].slice(0, count);
}

export function getAdjacentGuides(guide: Guide): { prev: Guide; next: Guide } {
	const index = guides.findIndex((item) => item.slug === guide.slug);
	return {
		prev: guides[(index - 1 + guides.length) % guides.length],
		next: guides[(index + 1) % guides.length]
	};
}
