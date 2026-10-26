export type GoalGroupId = 'exam' | 'year';

export interface GoalGroup {
	id: GoalGroupId;
	label: string;
	short: string;
	blurb: string;
	icon: 'target' | 'calendar-check';
	accent: 'blue' | 'violet';
}

export interface GoalPhase {
	label: string;
	window: string;
	heading: string;
	text: string;
	targets: string[];
}

export interface GoalSection {
	id: string;
	heading: string;
	paragraphs?: string[];
	bullets?: string[];
	steps?: { title: string; text: string }[];
	callout?: { label: string; text: string };
}

export interface Goal {
	slug: string;
	menuTitle: string;
	title: string;
	description: string;
	group: GoalGroupId;
	badge: string;
	window: string;
	weeklyHours: string;
	target: string;
	icon: 'target' | 'calendar-check' | 'clock' | 'layers' | 'book' | 'flame';
	phases: GoalPhase[];
	checkpoints: string[];
	sections: GoalSection[];
	setup: { title: string; text: string }[];
	related: string[];
}

export const goalGroups: GoalGroup[] = [
	{
		id: 'exam',
		label: 'Main & Advanced',
		short: 'Exams',
		blurb: 'Dated targets with paper-specific plans.',
		icon: 'target',
		accent: 'blue'
	},
	{
		id: 'year',
		label: 'Class & year',
		short: 'Year',
		blurb: 'Plans built around school, boards and gap years.',
		icon: 'calendar-check',
		accent: 'violet'
	}
];

export const goals: Goal[] = [
	{
		slug: 'jee-main-2027',
		menuTitle: 'JEE Main 2027',
		title: 'JEE Main 2027: the plan from now to Session 2',
		description:
			'A two-session plan that treats Session 1 as a measured diagnostic and uses Session 2 to repair exactly what it exposes.',
		group: 'exam',
		badge: 'Class 12 · 2027',
		window: '24 weeks · Nov → Apr',
		weeklyHours: '20–26 hrs/week',
		target: 'Clear cutoff in Session 1 · add 15–25 percentile in Session 2',
		icon: 'target',
		phases: [
			{
				label: 'Phase 1',
				window: 'November · 3 weeks',
				heading: 'Audit before you add hours',
				text: `Take one full JEE Main paper under exam conditions before changing your timetable. Score it by chapter, not by subject, and write down the five places where marks leaked. This is the only diagnostic that matters for the next six months.`,
				targets: [
					'One timed Main PYQ scored chapter-wise',
					'A confidence rating from 1–5 for every chapter in P, C and M',
					'The five biggest leaks written into the question log',
					'One error cause tag on every wrong question: silly, concept, time or guess'
				]
			},
			{
				label: 'Phase 2',
				window: 'December · 4 weeks',
				heading: 'Cover the high-weight remainder',
				text: `Finish the chapters that carry marks and that you can realistically secure. This is not the month to read every line of the NCERT or start a new advanced book. It is the month to convert partial chapters into question-solving chapters.`,
				targets: [
					'All high-weight pending chapters seen through PYQs',
					'100–120 questions a week, logged with source and outcome',
					'One full mock every week with a written post-mortem',
					'Two revision passes over chapters you already score well in'
				]
			},
			{
				label: 'Phase 3',
				window: 'January · 3 weeks',
				heading: 'Peak for Session 1',
				text: `The last three weeks before Session 1 are for speed, accuracy and sleep — not new material. Two full papers a week, a daily error-log review, and a fixed bedtime matter more than another chapter.`,
				targets: [
					'Two full mocks a week, both analysed the next morning',
					'No new chapters after January 15',
					'Twenty minutes a day on formula sheets and the error log',
					'Sleep and wake times fixed to match exam day'
				]
			},
			{
				label: 'Phase 4',
				window: 'February · 3 weeks',
				heading: 'Repair from the response sheet',
				text: `Session 1 gives you something no mock can: a real response sheet with time and accuracy per section. Do not restart the syllabus. Repair the six chapters that cost the most marks and keep the rest on a maintenance cycle.`,
				targets: [
					'Chapter-wise breakdown from the official response sheet',
					'Six weakest chapters revisited with 30 PYQs each',
					'Two sectional tests a day, alternating subjects',
					'One full mock a week to protect exam rhythm'
				]
			},
			{
				label: 'Phase 5',
				window: 'March – early April · 7 weeks',
				heading: 'Session 2 peak',
				text: `The second attempt rewards precision. Your coverage is done; the remaining work is repeated testing, a second pass through weak-chapter PYQs, and refusing to chase brand-new topics in the final fortnight.`,
				targets: [
					'Three mocks a week from mid-March',
					'Second PYQ pass on every weak chapter',
					'Every repeated error removed from the log before April',
					'The final ten days: revision only, no new chapters'
				]
			}
		],
		checkpoints: [
			'One timed Main paper scored by chapter in the first week',
			'Every wrong question carries a cause tag',
			'Two full mocks per week through January',
			'Session 1 broken down chapter-wise, not just as a percentile',
			'Zero new chapters in the last ten days before each attempt'
		],
		sections: [
			{
				id: 'two-sessions',
				heading: 'Why the two-session plan works',
				paragraphs: [
					`Most aspirants treat Session 1 as the exam and Session 2 as a bonus. The calendar suggests the opposite: Session 1 forces you to cover the syllabus under a deadline, and Session 2 gives you ten weeks to repair what the first paper exposed.`,
					`That only works if you keep the two attempts connected. If you change books, coaching batches and test series after January, you throw away the best diagnostic data you will ever get. Keep the system, change the weak chapters.`
				],
				callout: {
					label: 'One plan, two peaks',
					text: `Train for Session 1 as if it is the real exam, then treat the result as a chapter-level report. The peak that matters is the second one.`
				}
			},
			{
				id: 'week',
				heading: 'The weekly rhythm',
				paragraphs: [
					`Six study days, one lighter day. On a school day, two 90-minute question blocks plus a 45-minute revision block is enough. On a full day, add a third question block and a 30-minute error-log review.`,
					`One day a week is a full mock in exam conditions: 9 am to 12 pm, no pauses, no phone. The next morning is for the post-mortem, not another mock. Two mocks without analysis is entertainment; one mock with a written fix is progress.`
				],
				bullets: [
					`Question blocks: 90 minutes, one source, one chapter, no switching`,
					`Revision block: 45 minutes on repeats due that day, not re-reading`,
					`Mock day: full paper, then 30 minutes noting the first three fixes`,
					`Review day: one hour turning the week's errors into next week's blocks`
				]
			},
			{
				id: 'marks',
				heading: 'Where the marks actually are',
				paragraphs: [
					`JEE Main is an accuracy and speed paper. The majority of marks sit in easy and medium questions, so a plan built only on difficult problems leaves the cheapest marks exposed. In the final eight weeks, every difficult-problem session should be paired with a timed easy-medium set.`,
					`Physics rewards formula recall and clean application: mechanics, electrodynamics and modern physics carry a large share. Chemistry rewards recall and speed in inorganic, numerical accuracy in physical chemistry, and reaction maps in organic. Mathematics rewards pattern recognition in calculus, coordinate geometry and algebra. Your own PYQ breakdown should override any generic list.`
				]
			},
			{
				id: 'session-two',
				heading: 'How to use Session 1 without wasting Session 2',
				steps: [
					{
						title: 'Categorise every lost mark',
						text: `Silly, concept, time or guess. A chapter with three silly errors needs timed practice, not re-learning. A chapter with three concept errors needs a fresh pass.`
					},
					{
						title: 'Pick six chapters, not sixteen',
						text: `Choose the chapters with the largest gap between marks available and marks scored. Six chapters repaired properly will move a percentile; a full re-read will not.`
					},
					{
						title: 'Keep the book and the test series',
						text: `Changing materials mid-year resets your familiarity. Use the same sources and change the pace, the difficulty mix and the review depth.`
					},
					{
						title: 'Protect the last ten days',
						text: `Revision, formula sheets, error log, sleep. New chapters in the final fortnight create anxiety and rarely add marks.`
					}
				]
			},
			{
				id: 'last-days',
				heading: 'The last ten days',
				paragraphs: [
					`One full mock, one sectional, and revision for the rest of the time. Walk through the exam-day sequence: what you carry, how you read the paper in the first five minutes, and the order in which you attempt sections. Rehearse the boring logistics so the day feels familiar.`,
					`If a mock goes badly in this window, do not rebuild the plan. Note the top three errors, revise those chapters, and move on. The last ten days are for confidence and precision, not reinvention.`
				]
			}
		],
		setup: [
			{
				title: 'Tag every question by module → chapter → exercise',
				text: 'The question log becomes your leak detector. A chapter with time but no questions, or questions with no correct answers, is visible immediately.'
			},
			{
				title: 'Attach a chapter to every focus session',
				text: 'Time per chapter tells you where the hours actually went, which is often different from where you think they went.'
			},
			{
				title: 'Log each full mock as a test with section scores',
				text: 'The percentile trend and error tags show whether a bad score came from difficulty, timing or a specific chapter.'
			},
			{
				title: 'Send every wrong question into spaced revision',
				text: 'The repeat schedule is the difference between recognising a solution and reproducing it under pressure.'
			}
		],
		related: ['pyq-strategy', 'mock-post-mortem', 'revision-system', 'weekly-review']
	},
	{
		slug: 'jee-advanced-2027',
		menuTitle: 'JEE Advanced 2027',
		title: 'JEE Advanced 2027: turn a Main score into an Advanced rank',
		description:
			'Advanced is a different paper, not a harder Main. A 16-week bridge built on depth, partial marking and paper craft.',
		group: 'exam',
		badge: 'After Main · 2027',
		window: '16 weeks · Feb → May',
		weeklyHours: '24–30 hrs/week',
		target: 'Top 5,000 · stretch target top 1,000',
		icon: 'layers',
		phases: [
			{
				label: 'Phase 1',
				window: 'February · 3 weeks',
				heading: 'Rebuild depth',
				text: `Go back to the derivations and assumptions behind your weakest chapters. Advanced questions combine two or three ideas; if the basics are memorised rather than understood, the combination collapses.`,
				targets: [
					'Three weak chapters re-derived from first principles',
					'15–20 multi-concept problems a day',
					'One multi-correct set daily',
					'A written reason for every wrong answer'
				]
			},
			{
				label: 'Phase 2',
				window: 'March · 4 weeks',
				heading: 'Advanced PYQs, chapter by chapter',
				text: `Work through Advanced papers chapter-wise before you attempt them as full papers. The goal is to learn the question language: multi-correct combinations, match-the-column, integer answers and multi-step numericals.`,
				targets: [
					'50 Advanced PYQs a week, tagged by chapter',
					'One full paper a week from the last week of March',
					'Error log separated by question type',
					'Every formula sheet rebuilt in your own words'
				]
			},
			{
				label: 'Phase 3',
				window: 'April · 4 weeks',
				heading: 'Paper craft',
				text: `Advanced is won in selection and retention. Practise the three-pass paper: sure questions first, conceptual questions second, partial-marking picks last. A question you cannot finish still has value if you can secure part of it.`,
				targets: [
					'Two full papers a week, both with an attempt-order review',
					'Zero rushed guesses in the last twenty minutes',
					'A repeatable three-pass strategy for all three subjects',
					'Subject-wise score distribution checked after every paper'
				]
			},
			{
				label: 'Phase 4',
				window: 'May · 2–3 weeks',
				heading: 'Taper',
				text: `The final weeks are for consolidation. One full paper a week, revision of your own error log, formula sheets and sleep. Stop measuring yourself against new problems you have never seen.`,
				targets: [
					'One full paper a week maximum',
					'Error log revised three times',
					'Formula sheets and reaction maps only',
					'Sleep and wake times matched to the paper'
				]
			}
		],
		checkpoints: [
			'Every weak chapter re-derived, not just re-read',
			'Advanced PYQs solved chapter-wise before full papers',
			'A written three-pass plan you use in every mock',
			'At least eight full Advanced papers with post-mortems',
			'No new problems in the final week'
		],
		sections: [
			{
				id: 'different-paper',
				heading: 'Main accuracy does not transfer automatically',
				paragraphs: [
					`Main asks for fast, accurate single answers. Advanced asks for combinations, multi-step reasoning and the judgement to leave a question. A student who scores well in Main can still lose marks in Advanced by attempting too many questions and by treating multi-correct as a lottery.`,
					`The bridge is not more hours. It is a different kind of practice: fewer questions, each examined for every concept it touches, with explicit attention to where partial marks can be secured.`
				],
				callout: {
					label: 'Depth over volume',
					text: `One Advanced problem understood at every step is worth more than ten solutions recognised on the surface.`
				}
			},
			{
				id: 'three-pass',
				heading: 'The three-pass paper',
				steps: [
					{
						title: 'Pass 1 — sure marks',
						text: `Read the whole paper and solve only what you can finish cleanly. This secures a floor and tells you how much time is left.`
					},
					{
						title: 'Pass 2 — conceptual work',
						text: `Return to questions where you know the concept but need two or three steps. Work them in order of confidence, not paper order.`
					},
					{
						title: 'Pass 3 — partial marking',
						text: `Pick up defensible parts: one correct option in multi-correct, a sensible numerical estimate, an elimination in match-the-column. Never guess blindly to fill time.`
					}
				]
			},
			{
				id: 'partial',
				heading: 'Partial marking is a skill',
				paragraphs: [
					`Multi-correct questions reward judgement. Mark only the options you can defend; a half-correct multi-correct can still earn partial credit, while a reckless extra option can erase it. In numerical questions, units, order of magnitude and limiting cases often rule out two possibilities before the full calculation.`,
					`Practise this deliberately in mocks. After each paper, count how many partial marks you left on the table and how many you lost by adding an option you were not sure about. That number improves faster than raw accuracy.`
				],
				bullets: [
					`Multi-correct: mark defensible options, never fill all four`,
					`Numerical: check units and magnitude before the long calculation`,
					`Match-the-column: eliminate pairs you are certain about`,
					`Paragraph questions: read the passage once, then answer in order`
				]
			},
			{
				id: 'chapter-depth',
				heading: 'A chapter, three levels',
				paragraphs: [
					`For each weak chapter, work at three levels. First, derive the core results and write the assumptions. Second, solve ten multi-concept problems that mix the chapter with another topic. Third, solve five Advanced PYQs under time pressure.`,
					`If the third level fails, the problem is usually in the first level — not in exam strategy. Go back one level instead of collecting more questions.`
				]
			}
		],
		setup: [
			{
				title: 'Tag difficulty on every question',
				text: 'Separate Main-level, multi-concept and Advanced PYQ. A full log of Advanced questions reveals whether depth is improving or just volume.'
			},
			{
				title: 'Log question type, not just chapter',
				text: 'Multi-correct, numerical, match-the-column and paragraph questions fail for different reasons. Track them separately.'
			},
			{
				title: 'Record time per paper section',
				text: 'Advanced papers reward selection. Time distribution tells you whether you spent too long on a low-yield section.'
			},
			{
				title: 'Keep a partial-marking tally',
				text: 'After each mock, note marks gained and lost through option selection. It turns paper craft into a measurable skill.'
			}
		],
		related: ['attempt-order', 'pyq-strategy', 'mock-post-mortem', 'bad-test-reset']
	},
	{
		slug: 'jee-main-90-day-sprint',
		menuTitle: '90-day Main sprint',
		title: 'The 90-day JEE Main sprint for a late start',
		description:
			'You are three months out and not starting from zero. Freeze new chapters, secure reachable marks, and let mocks decide what to fix.',
		group: 'exam',
		badge: 'Late start · 2027',
		window: '12 weeks',
		weeklyHours: '26–32 hrs/week',
		target: 'Clear the cutoff · maximise percentile from the chapters you already have',
		icon: 'clock',
		phases: [
			{
				label: 'Phase 1',
				window: 'Weeks 1–2',
				heading: 'Triage',
				text: `You cannot finish the whole syllabus in twelve weeks, and pretending otherwise wastes the twelve weeks. Rate every chapter from 1 to 5, pick the twelve with the best combination of weight and existing base, and freeze the rest without guilt.`,
				targets: [
					'Confidence rating for every chapter',
					'Twelve target chapters chosen: four per subject',
					'One diagnostic paper scored chapter-wise',
					'A written list of chapters you will not touch'
				]
			},
			{
				label: 'Phase 2',
				window: 'Weeks 3–6',
				heading: 'Secure',
				text: `Two chapters a week, each taken from recall to timed questions. Thirty PYQs per chapter, a daily error log, and a sectional every other day. The goal is reliable marks, not full coverage.`,
				targets: [
					'Two chapters a week, thirty PYQs each',
					'One sectional test every two days',
					'Error log reviewed every night',
					'One revision pass over already-strong chapters each week'
				]
			},
			{
				label: 'Phase 3',
				window: 'Weeks 7–10',
				heading: 'Simulate',
				text: `Mocks become the plan. Two full papers a week, each followed by a chapter-level post-mortem. Between papers, only revise what the last paper exposed.`,
				targets: [
					'Two full mocks a week',
					'A written post-mortem within 24 hours of each',
					'Every repeated error removed from the log',
					'Six chapters on a rolling revision cycle'
				]
			},
			{
				label: 'Phase 4',
				window: 'Weeks 11–12',
				heading: 'Taper',
				text: `No new chapters, no new books. One mock, formula sheets, the error log and sleep. The work is done; protect it.`,
				targets: [
					'One final mock at exam time',
					'Formula sheets revised daily',
					'Error log revised twice',
					'No new material after day 78'
				]
			}
		],
		checkpoints: [
			'Twelve target chapters chosen and written down',
			'A diagnostic paper completed in week one',
			'Ten full mocks completed before the exam',
			'No new chapters after week ten',
			'The final week spent only on revision'
		],
		sections: [
			{
				id: 'accept',
				heading: 'Accept the syllabus you have',
				paragraphs: [
					`A late start creates one destructive instinct: trying to cover everything at low quality. A chapter half-learned in the final month rarely survives exam pressure, and it steals time from chapters that could have become reliable.`,
					`Triage is not giving up. It is choosing where the next 300 hours go. Twelve chapters secured properly can produce a better result than thirty chapters visited once.`
				],
				callout: {
					label: 'The 12-chapter rule',
					text: `Four chapters per subject, chosen for weight plus your existing base. Defend them from every shiny new chapter that tries to enter the plan.`
				}
			},
			{
				id: 'chapter-choice',
				heading: 'How to choose the twelve',
				steps: [
					{
						title: 'Score weight',
						text: `Use your own PYQ breakdown: how many marks has this chapter produced in recent papers? High-weight chapters come first.`
					},
					{
						title: 'Score your base',
						text: `A chapter you half-know can be secured faster than one you have never opened. Prefer the shortest distance to reliable marks.`
					},
					{
						title: 'Score the cost',
						text: `Some chapters need weeks of prerequisites. If the route is long and the weight is moderate, leave it out.`
					},
					{
						title: 'Write the exclusions',
						text: `A physical list of chapters you will not study is a stress-management tool. It stops the daily guilt of an impossible syllabus.`
					}
				]
			},
			{
				id: 'mocks',
				heading: 'Mocks are the plan',
				paragraphs: [
					`With limited coverage, mocks do two jobs: they teach exam timing, and they show which of your twelve chapters are actually reliable. A chapter that scores in practice but collapses in a paper needs timed practice, not more notes.`,
					`Do not wait until the syllabus feels complete to start full papers. There is no complete syllabus in this plan. Start mock simulation in week seven, even if two chapters are still shaky.`
				]
			},
			{
				id: 'ignore',
				heading: 'What to ignore',
				bullets: [
					`New reference books — switching sources now resets familiarity`,
					`Every test series invitation — more papers is not more progress`,
					`Advanced-level puzzles — Main is accuracy and speed`,
					`All-nighters — a broken sleep cycle costs more marks than one extra chapter`,
					`Other people's coverage — their plan is not your diagnostic`
				],
				paragraphs: [
					`The sprint is a focus exercise. The fewer decisions you make each day, the more time goes into the twelve chapters and the papers.`
				]
			}
		],
		setup: [
			{
				title: 'Mark the twelve chapters as the active syllabus',
				text: 'Use the chapter list itself as your plan so the exclusions are visible and the daily choice is already made.'
			},
			{
				title: 'Log PYQ accuracy per chapter',
				text: 'Accuracy from timed PYQs is the truest measure of a chapter you can rely on in the exam.'
			},
			{
				title: 'Run two mocks a week and log section scores',
				text: 'The trend matters more than any single percentile. Section scores show where time is being lost.'
			},
			{
				title: 'Use the error queue instead of re-reading',
				text: 'In a short sprint, repeats of wrong questions produce more marks than another full pass through the notes.'
			}
		],
		related: ['pyq-strategy', 'mock-post-mortem', 'bad-test-reset', 'revision-system']
	},
	{
		slug: 'class-11-jee-foundation',
		menuTitle: 'Class 11 foundation',
		title: 'Class 11 JEE foundation: build the base that survives Class 12',
		description:
			'Class 11 is where JEE is quietly won. Build chapter mastery and a logging habit now, so Class 12 is new chapters plus revision — not a rescue mission.',
		group: 'year',
		badge: 'Class 11 · JEE 2028',
		window: '12 months · Nov → Oct',
		weeklyHours: '12–18 hrs/week',
		target: 'Chapter mastery, a clean question log, and a weekly review habit',
		icon: 'book',
		phases: [
			{
				label: 'Phase 1',
				window: 'November – February',
				heading: 'First pass, one chapter at a time',
				text: `Follow school pace but finish every chapter with questions, not just notes. Twenty to thirty questions per chapter, logged with source and outcome, is enough to expose whether the concept is actually usable.`,
				targets: [
					'One chapter completed at a time',
					'20–30 questions per chapter, logged',
					'Every wrong answer given a cause tag',
					'A short weekly review of chapters covered'
				]
			},
			{
				label: 'Phase 2',
				window: 'March – April',
				heading: 'Consolidate',
				text: `Before summer, revisit the chapters that did not settle. Use easy and medium PYQs to test recall across chapters. Clear the backlog now; it becomes expensive in Class 12.`,
				targets: [
					'One revision pass over every completed chapter',
					'Easy and medium PYQs for each chapter',
					'Backlog list reduced to zero before May',
					'One mixed chapter test every two weeks'
				]
			},
			{
				label: 'Phase 3',
				window: 'May – June',
				heading: 'Summer depth',
				text: `The long break is for depth, not for racing ahead. Pick two subjects and go deeper on their foundational chapters: mechanics, organic basics and calculus are the usual leverage points.`,
				targets: [
					'Two-week deep dive per subject',
					'One subject test a week',
					'Derivations written from memory',
					'First multi-concept problems attempted'
				]
			},
			{
				label: 'Phase 4',
				window: 'July – October',
				heading: 'Transition to Class 12',
				text: `Class 12 starts while Class 11 fades. Keep one weekly revision block for Class 11 chapters and one mixed set. The students who lose marks in Class 12 are usually the ones who never went back.`,
				targets: [
					'One Class 11 revision block each week',
					'One mixed Class 11 + 12 set each week',
					'Question log maintained five days a week',
					'Weekly review kept on the calendar'
				]
			}
		],
		checkpoints: [
			'A question log that survives a full month',
			'Every chapter finished with questions, not just notes',
			'One revision pass completed before summer',
			'No backlog carried into Class 12',
			'A weekly review habit you can keep during Class 12'
		],
		sections: [
			{
				id: 'why',
				heading: 'Why Class 11 matters more than it feels',
				paragraphs: [
					`Class 11 is the only year without a visible deadline. That makes it easy to postpone depth until Class 12, when every chapter suddenly has to be learned twice — once for school and once for JEE.`,
					`The chapters that cause the most damage in Class 12 are usually Class 11 chapters: mechanics, the basics of organic chemistry, functions and calculus. They are prerequisites, so a weak base keeps charging interest.`
				],
				callout: {
					label: 'Depth now, speed later',
					text: `Class 11 is for understanding and question trails. Full-paper speed can wait until Class 12.`
				}
			},
			{
				id: 'trail',
				heading: 'One chapter, one trail of questions',
				paragraphs: [
					`A chapter is finished when you can solve questions from it, not when the notebook is full. Use a simple trail: ten direct questions, ten mixed questions, five PYQs. Log every wrong answer.`,
					`If the mixed set collapses, the direct set was probably pattern-matching rather than understanding. Go back to the concept before adding another question source.`
				],
				bullets: [
					`Direct questions: confirms the concept works in isolation`,
					`Mixed questions: tests whether you can choose the right idea`,
					`PYQs: shows the language the exam actually uses`,
					`Error log: tells you which of the three stages failed`
				]
			},
			{
				id: 'pyq',
				heading: 'When to start PYQs',
				paragraphs: [
					`Start early, but not with full papers. Use chapter-wise easy and medium PYQs in Class 11 to learn how JEE asks questions. Save full-paper simulation for Class 12, when enough of the syllabus is available to make a paper meaningful.`,
					`A student who has seen chapter-wise PYQs for a year arrives in Class 12 with a large advantage: the questions are familiar, and the revision queue is already built.`
				]
			},
			{
				id: 'habit',
				heading: 'The habit that matters',
				paragraphs: [
					`Logging five days a week for a year beats a perfect tracker used for three weeks. Keep the system small enough to survive a busy school week: a focus session, the questions you attempted, and a twenty-minute weekly review.`,
					`The weekly review is where the system pays you back. It turns a week of school and coaching into one decision for the next week, and it builds the habit you will rely on when the stakes rise.`
				]
			}
		],
		setup: [
			{
				title: 'Log questions by chapter from day one',
				text: 'A year of chapter-level data shows exactly which foundations need revision before Class 12.'
			},
			{
				title: 'Use the focus timer for school + coaching blocks',
				text: 'Even 25-minute blocks add up. Tagging them by chapter reveals where the week actually went.'
			},
			{
				title: 'Keep a weekly review on the calendar',
				text: 'A twenty-minute review is the smallest habit that keeps a year-long plan alive.'
			},
			{
				title: 'Put every wrong question into revision',
				text: 'Building the revision queue in Class 11 means Class 12 starts with material to revise, not a blank slate.'
			}
		],
		related: ['dpp-strategy', 'weekly-review', 'focus-blocks', 'revision-system']
	},
	{
		slug: 'class-12-boards-and-jee',
		menuTitle: 'Class 12 + boards',
		title: 'Class 12: boards and JEE without splitting focus',
		description:
			'Boards and JEE overlap more than they conflict. Map the overlap, write answers for school, and keep the JEE question habit alive through February.',
		group: 'year',
		badge: 'Class 12 · 2027',
		window: '12 months · Nov → May',
		weeklyHours: '18–24 hrs/week',
		target: '90%+ in boards · Main cutoff secured',
		icon: 'calendar-check',
		phases: [
			{
				label: 'Phase 1',
				window: 'November',
				heading: 'Map the overlap',
				text: `List every board chapter and mark it as JEE-deep, JEE-light or board-only. Most chapters are shared; the real conflicts are presentation, practicals and a small set of board-only topics.`,
				targets: [
					'Overlap map for all three subjects',
					'Board-only topics identified',
					'Practical file and project dates on the calendar',
					'One board answer-writing session each week'
				]
			},
			{
				label: 'Phase 2',
				window: 'December – January',
				heading: 'JEE-first term',
				text: `Keep JEE question practice as the main academic work while school is still teaching. Add board-style writing once a week so the format does not become a February surprise.`,
				targets: [
					'Three JEE question blocks a day on full days',
					'One board writing practice a week',
					'One full mock every week in January',
					'Practicals and files kept current'
				]
			},
			{
				label: 'Phase 3',
				window: 'February – March',
				heading: 'Board peak',
				text: `Boards become the priority for a short, fixed window. Keep 30% of study time on JEE maintenance: PYQs and error-log revision, not new chapters.`,
				targets: [
					'Board papers under timed conditions twice a week',
					'Derivations and presentation practised',
					'Thirty percent of time on JEE maintenance',
					'No JEE syllabus expansion during board weeks'
				]
			},
			{
				label: 'Phase 4',
				window: 'March – May',
				heading: 'Post-boards JEE sprint',
				text: `The day boards end, switch back to full JEE mode. Use the session gap for repair and the remaining weeks for Session 2 and, if eligible, Advanced.`,
				targets: [
					'Full JEE mode within three days of the last board paper',
					'Session 1 response sheet reviewed chapter-wise',
					'Two mocks a week through April',
					'Advanced bridge started if eligible'
				]
			}
		],
		checkpoints: [
			'An overlap map for all three subjects',
			'Board writing practised weekly, not in February panic',
			'Practical files complete before the school deadline',
			'JEE question practice never paused for more than a week',
			'A clean switch back to full JEE mode after boards'
		],
		sections: [
			{
				id: 'overlap',
				heading: 'The 70% overlap',
				paragraphs: [
					`Most of the Class 12 board syllabus is also JEE syllabus. The conflict is rarely the content; it is the way marks are earned. Boards reward complete, well-presented answers and derivations. JEE rewards correct final answers under time pressure.`,
					`Treat board preparation as a presentation layer on top of JEE depth. You do not need a second syllabus; you need a second way of writing the same material.`
				],
				callout: {
					label: 'One syllabus, two outputs',
					text: `Solve for JEE, write for boards. The chapter list is not the problem.`
				}
			},
			{
				id: 'write',
				heading: 'Write for boards, solve for JEE',
				paragraphs: [
					`Once a week, take one board question and write it the way a board examiner expects: given, formula, steps, units, a boxed answer. Do it by hand, timed. This is a different skill from choosing an option, and it degrades without practice.`,
					`Keep JEE practice in parallel. If board writing replaces all question solving for two months, the speed and accuracy built in the first term disappear.`
				],
				bullets: [
					`Board block: one long answer written in full, every week`,
					`JEE block: timed questions, daily`,
					`Derivations: written from memory once a chapter`,
					`Diagrams: practised, not just read`
				]
			},
			{
				id: 'maintain',
				heading: 'Maintain, don’t pause',
				paragraphs: [
					`A common mistake is to stop JEE work completely during boards. The return is harder than the maintenance would have been. Thirty percent of your study time is enough: PYQs from chapters already covered, the error log, and one mock every ten days.`,
					`Keep new chapters out of the board window. Maintenance means protecting what exists, not expanding the syllabus.`
				]
			},
			{
				id: 'practicals',
				heading: 'The practical file is not optional',
				paragraphs: [
					`Board practicals carry real marks and have hard deadlines. Keep the file current through the term instead of rebuilding it in February. Record readings, diagrams and viva questions as you go.`,
					`The same applies to projects and internal assessments. These are predictable commitments, so they belong on the calendar before they become emergencies.`
				]
			}
		],
		setup: [
			{
				title: 'Tag board-only work separately',
				text: 'Board writing practice, practicals and presentation should not disappear inside JEE time. Separate tags keep the split honest.'
			},
			{
				title: 'Log board answer practice as a session',
				text: 'One timed written answer a week is enough, but it only happens if it is scheduled and visible.'
			},
			{
				title: 'Protect the JEE maintenance block',
				text: 'Thirty percent during boards is a floor, not a target. A visible weekly total stops the slide to zero.'
			},
			{
				title: 'Use the weekly review to switch modes',
				text: 'The review is where you decide the board/JEE split for the coming week instead of letting the loudest deadline choose.'
			}
		],
		related: ['energy-routine', 'weekly-review', 'revision-system', 'mock-post-mortem']
	},
	{
		slug: 'dropper-year-jee',
		menuTitle: 'Dropper year',
		title: 'The dropper year: a full-time JEE plan that does not drift',
		description:
			'A full-time year is an advantage only when the calendar has edges. A six-day week, a fixed test day, and a plan built on last year’s papers.',
		group: 'year',
		badge: 'Gap year · 2027',
		window: '12 months · May → May',
		weeklyHours: '35–45 hrs/week',
		target: 'Clear the cutoff · a rank that justifies the year',
		icon: 'flame',
		phases: [
			{
				label: 'Phase 1',
				window: 'May – June',
				heading: 'Diagnose and design',
				text: `Start with last year's papers, not a fresh syllabus. Find the pattern in what went wrong — coverage, timing, accuracy or consistency — and design a timetable with fixed edges rather than an open calendar.`,
				targets: [
					'Last year’s papers reviewed question by question',
					'Root causes written down, not guessed',
					'A six-day timetable with one full rest day',
					'A fixed weekly test slot'
				]
			},
			{
				label: 'Phase 2',
				window: 'July – October',
				heading: 'Cover, with PYQs attached',
				text: `A full syllabus pass is possible this year, but only if every chapter ends in questions. Attach PYQs to each chapter as you finish it; a coverage pass without testing is just reading.`,
				targets: [
					'Every chapter finished with 30+ logged questions',
					'One test every week, even during coverage',
					'Revision queue updated daily',
					'A weekly review that fixes the next week'
				]
			},
			{
				label: 'Phase 3',
				window: 'November – January',
				heading: 'Test season',
				text: `Shift from coverage to performance. Two full mocks a week, post-mortems, and revision cycles. The first Main attempt is close; the plan should now look like the exam.`,
				targets: [
					'Two full mocks a week',
					'A post-mortem within 24 hours of each',
					'Rolling revision through the error log',
					'Sleep schedule matched to exam day'
				]
			},
			{
				label: 'Phase 4',
				window: 'February – March',
				heading: 'Repair',
				text: `Use the Session 1 response sheet to repair specific chapters. Do not restart the syllabus, and do not change materials. The advantage of a dropper year is time to go deep on exactly what failed.`,
				targets: [
					'Response-sheet breakdown by chapter',
					'Weak chapters rebuilt with fresh question sets',
					'Three mocks a week by March',
					'No new reference books'
				]
			},
			{
				label: 'Phase 5',
				window: 'April – May',
				heading: 'Final push',
				text: `Session 2, then Advanced if eligible. The final month is revision and paper craft only. Protect sleep, keep the test day fixed, and avoid comparing your schedule to anyone else's.`,
				targets: [
					'Revision-only final fortnight',
					'Advanced bridge if eligible',
					'Test-day routine unchanged',
					'One rest day protected every week'
				]
			}
		],
		checkpoints: [
			'Root causes from last year written down',
			'A timetable with a fixed rest day and test day',
			'Every chapter covered with logged questions',
			'A fixed mock cadence from September onward',
			'Session 1 result used for repair, not panic'
		],
		sections: [
			{
				id: 'time',
				heading: 'Time is not the plan',
				paragraphs: [
					`A dropper year offers something rare: hours. It also removes the structure that school and coaching provided. Without edges, those hours dissolve into long, low-intensity days that feel like work and produce very little.`,
					`The plan has to replace the missing structure. Fixed start time, fixed blocks, fixed test day, fixed rest day. The calendar is the advantage — not the extra hours by themselves.`
				],
				callout: {
					label: 'Edges, not intentions',
					text: `A timetable that says "study more" is not a timetable. Write the start time, the block length and the test day.`
				}
			},
			{
				id: 'open-calendar',
				heading: 'The open-calendar trap',
				paragraphs: [
					`When every day looks the same, urgent-but-unimportant tasks take over: reorganising notes, watching a new lecture series, browsing test papers instead of solving them. The day feels busy and the week has no output.`,
					`A weekly test and a weekly review create consequences. The test exposes the week; the review turns it into a change. Together they stop a bad week from becoming a bad month.`
				],
				bullets: [
					`Fixed start time, even on low-motivation days`,
					`One test every week from the first month`,
					`One rest day that is actually taken`,
					`One weekly review that ends with a single change`
				]
			},
			{
				id: 'last-year',
				heading: 'Use last year’s data',
				paragraphs: [
					`You already have the most valuable diagnostic a first-time aspirant does not: a real exam result and, usually, a response sheet. Reconstruct the paper. Mark every question as knew it, rushed it, guessed it or avoided it.`,
					`That breakdown should decide the first three months. A student who lost marks to timing does not need more syllabus coverage. A student who left whole chapters untouched needs coverage, not more mocks.`
				]
			},
			{
				id: 'rest',
				heading: 'Protect the rest day',
				paragraphs: [
					`A full-time year can become a 365-day guilt cycle. The rest day is part of the plan, not a reward for finishing everything — because everything never finishes.`,
					`Sleep is also part of the plan. The exam has a start time; training your body to think clearly at that hour matters more than one extra late-night session each week.`
				]
			},
			{
				id: 'comparison',
				heading: 'Avoid the comparison trap',
				paragraphs: [
					`Droppers are surrounded by other droppers, each broadcasting a version of their day. Someone is always ahead in coverage or scoring higher in a test series. Their plan is not your diagnostic.`,
					`Use your own question log, your own mock trend and your own review. The only useful comparison is this week against last month.`
				]
			}
		],
		setup: [
			{
				title: 'Log every mock as a test with sections',
				text: 'A year of test scores and error tags shows whether the plan is actually moving, not just whether the days feel full.'
			},
			{
				title: 'Keep a visible weekly review',
				text: 'The review is the structure that replaces school. It turns a week of effort into one change for the next week.'
			},
			{
				title: 'Track focus hours by chapter',
				text: 'Hours alone can flatter a week. Chapter-level time shows whether the hard chapters are being avoided.'
			},
			{
				title: 'Schedule revision repeats, not re-reading',
				text: 'A dropper year has enough time to revise properly. Use spaced repeats so the months do not become repeated first passes.'
			}
		],
		related: ['weekly-review', 'mock-post-mortem', 'focus-blocks', 'energy-routine', 'bad-test-reset']
	}
];

export const goalCount = goals.length;

export function getGoal(slug: string): Goal | undefined {
	return goals.find((goal) => goal.slug === slug);
}

export function getGoalGroup(id: GoalGroupId): GoalGroup {
	return goalGroups.find((group) => group.id === id) ?? goalGroups[0];
}

export function getGoalsByGroup(id: GoalGroupId): Goal[] {
	return goals.filter((goal) => goal.group === id);
}

export function getRelatedGoals(goal: Goal): Goal[] {
	return goals.filter((candidate) => candidate.group === goal.group && candidate.slug !== goal.slug).slice(0, 2);
}

export const featuredGoal = goals[0];
