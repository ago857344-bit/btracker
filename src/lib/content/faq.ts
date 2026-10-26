export type FaqCategoryId = 'product' | 'data' | 'syllabus';

export interface FaqCategory {
	id: FaqCategoryId;
	label: string;
	description: string;
}

export interface FaqItem {
	id: string;
	category: FaqCategoryId;
	question: string;
	answer: string;
	keywords?: string[];
	links?: { label: string; href: string }[];
}

export const faqCategories: FaqCategory[] = [
	{
		id: 'product',
		label: 'Product Mechanics',
		description: 'What the tracker does, how to use it, and what it costs.'
	},
	{
		id: 'data',
		label: 'Data & Sync',
		description: 'Where your work lives, how it moves between devices, and how to get it out.'
	},
	{
		id: 'syllabus',
		label: 'JEE Syllabi Coverage',
		description: 'Exams, chapters, boards, and how the tracker maps to your preparation.'
	}
];

export const faqItems: FaqItem[] = [
	{
		id: 'free',
		category: 'product',
		question: 'Is BTracker really free?',
		answer:
			'Yes. The question log, revision queue, flashcards, mock analytics, AI Mentor, cloud sync, and the desktop app are all included. There is no Pro plan, no credit card, and no trial clock.',
		keywords: ['price', 'cost', 'paid', 'subscription', 'pro', 'trial', 'card', 'money']
	},
	{
		id: 'try-without-account',
		category: 'product',
		question: 'Do I need an account to try it?',
		answer:
			'No. You can continue into the tracker without an account and your work is saved in this browser. Sign in with Google when you want the same data on another device; Google is used for identity only, so there is no new password to remember.',
		keywords: ['login', 'sign in', 'google', 'account', 'guest', 'skip', 'try']
	},
	{
		id: 'what-to-log',
		category: 'product',
		question: 'What do I actually log each day?',
		answer:
			'Most days it is just the questions you attempted: subject, chapter, and whether each one was correct, careless, slow, or unknown. You can also log study time, mock tests, tasks, and revision outcomes. A normal question entry takes about ten seconds.',
		keywords: ['log', 'daily', 'questions', 'time', 'entry', 'how to use']
	},
	{
		id: 'revision-queue',
		category: 'product',
		question: 'How does the revision queue decide what is due?',
		answer:
			'Each chapter and topic carries a decay score that falls as time passes since your last revision, weighted by exam importance. The review screen surfaces topics that have crossed the fading threshold, so the queue is ordered by risk rather than by whatever you feel like opening.',
		keywords: ['revision', 'spaced repetition', 'queue', 'decay', 'priority', 'due', 'flashcards']
	},
	{
		id: 'ai-mentor',
		category: 'product',
		question: 'What can the AI Mentor do?',
		answer:
			'It is a chat assistant that can see your study logs, Elo rating, and mock data, so questions can be grounded in your actual preparation rather than generic advice. It can also bulk-log questions when you ask it to. It runs on free-tier AI infrastructure, so at busy times a reply may take a little longer.',
		keywords: ['ai', 'mentor', 'chat', 'help', 'assistant', 'gpt']
	},
	{
		id: 'devices',
		category: 'product',
		question: 'Does BTracker work on a phone?',
		answer:
			'Yes. It is a responsive web app that works on phones, tablets, and laptops, and it can be installed to your home screen as a PWA. There is also a standalone desktop app for macOS and Windows if you prefer a dedicated window.',
		keywords: ['phone', 'mobile', 'tablet', 'ipad', 'pwa', 'app', 'download', 'desktop'],
		links: [
			{ label: 'Download the desktop app', href: '/download' }
		]
	},
	{
		id: 'coaching',
		category: 'product',
		question: 'I follow a coaching institute. Does this fit their schedule?',
		answer:
			'Yes. During setup you can name your institute or choose self-study, and the tracker adapts its labels without forcing a different timetable. Log modules, DPPs, and test-series papers as they come; the revision queue and analytics work from what you log, not from a fixed plan.',
		keywords: ['coaching', 'allen', 'resonance', 'pw', 'fiitjee', 'institute', 'dpp', 'module']
	},
	{
		id: 'where-stored',
		category: 'data',
		question: 'Where is my data stored?',
		answer:
			'Every change is written to your browser first using IndexedDB, so the tracker keeps working even when the network does not. When you are signed in, the same state is mirrored to cloud storage and merged across devices.',
		keywords: ['storage', 'indexeddb', 'cloud', 'supabase', 'saved', 'local', 'database']
	},
	{
		id: 'sync',
		category: 'data',
		question: 'Does it sync across my devices?',
		answer:
			'Yes. Sync is automatic and debounced, and it merges local and cloud records rather than replacing one with the other. The save indicator in the top bar tells you whether the latest change has reached the cloud.',
		keywords: ['sync', 'devices', 'laptop', 'phone', 'merge', 'multi-device']
	},
	{
		id: 'offline',
		category: 'data',
		question: 'Can I use it without internet?',
		answer:
			'Yes. Logging and studying happen against local storage, so a dropped connection does not stop you. Changes sync when the connection returns. Installing the PWA also caches the app shell for faster offline starts.',
		keywords: ['offline', 'internet', 'connection', 'network', 'pwa', 'airplane']
	},
	{
		id: 'export',
		category: 'data',
		question: 'Can I export or import my data?',
		answer:
			'Yes. Settings has an Export backup button that downloads a plain JSON file, and an Import backup control that restores one. The file contains your tracker state, so keep it somewhere private.',
		keywords: ['export', 'import', 'backup', 'json', 'download', 'restore', 'move']
	},
	{
		id: 'clear-data',
		category: 'data',
		question: 'What happens if I clear my browser data or switch browsers?',
		answer:
			'If you are signed in, sign in again on the new browser and your cloud state is pulled down. If you never created an account, the local copy is all there is, so export a backup before clearing site data or changing browsers.',
		keywords: ['clear', 'browser', 'cache', 'switch', 'new device', 'lost', 'restore', 'backup']
	},
	{
		id: 'privacy',
		category: 'data',
		question: 'Do you sell my data or run ads?',
		answer:
			'No. BTracker does not run ads or sell personal data. Your study data is used to run the tracker and sync it across your devices. When you use the AI Mentor, the study context needed to answer your question is sent to the AI provider; everything can still be exported from Settings.',
		keywords: ['privacy', 'ads', 'sell', 'share', 'security', 'data policy']
	},
	{
		id: 'exams',
		category: 'syllabus',
		question: 'Which exams does the tracker support?',
		answer:
			'It is built first for JEE Main and JEE Advanced. Setup also lets you pick BITSAT, MHT-CET, WBJEE, COMEDK, VITEEE, or another state engineering exam, and records your board as CBSE, ICSE, IB, or a state board.',
		keywords: ['exams', 'jee main', 'jee advanced', 'bitsat', 'mht-cet', 'wbjee', 'comedk', 'viteee', 'board']
	},
	{
		id: 'chapters',
		category: 'syllabus',
		question: 'Is the syllabus mapped chapter by chapter?',
		answer:
			'Yes. Physics, Chemistry, and Maths are broken into chapter checklists you can mark off as you cover them. Chapters carry an importance weight that feeds the revision queue, so the chapters that matter more come back sooner.',
		keywords: ['chapters', 'syllabus', 'checklist', 'physics', 'chemistry', 'maths', 'weightage']
	},
	{
		id: 'class-11-12',
		category: 'syllabus',
		question: 'Does it cover Class 11, Class 12, and a dropper year?',
		answer:
			'All three. Setup asks which stage you are in, and goals are organised by stage, from early Class 11 through a full-time drop year. Every chapter remains available regardless of your year, so you can revise Class 11 topics during Class 12.',
		keywords: ['class 11', 'class 12', 'dropper', 'year', 'stage', 'foundation']
	},
	{
		id: 'boards',
		category: 'syllabus',
		question: 'Can I prepare for boards and JEE in the same place?',
		answer:
			'Yes. Board preparation shares the same syllabus checklists and logging, and the stage guidance describes how to sequence board writing practice alongside timed JEE papers. You can also record board-style practice as part of your study log.',
		keywords: ['boards', 'cbse', 'icse', 'state board', 'exams', 'class 12']
	},
	{
		id: 'mock-coverage',
		category: 'syllabus',
		question: 'How do mock tests map onto the syllabus?',
		answer:
			'You log a test with its scores, then tag the mistakes it produced. The analytics show accuracy and the error patterns behind your score, and those mistakes flow back into the same revision and error systems as everyday questions. The tracker is designed around objective, JEE-pattern papers.',
		keywords: ['mock', 'test', 'analytics', 'score', 'accuracy', 'mistakes', 'paper']
	},
	{
		id: 'custom-chapters',
		category: 'syllabus',
		question: 'What if my coaching or board covers an extra topic?',
		answer:
			'You can add custom chapters wherever the built-in list is missing one. Custom chapters behave like any other chapter in the log, revision queue, and analytics, so an unusual module does not break the system.',
		keywords: ['custom', 'extra', 'topic', 'add', 'coaching', 'chapter']
	},
	{
		id: 'neet',
		category: 'syllabus',
		question: 'Does it work for NEET or non-PCM preparation?',
		answer:
			'No. BTracker is built around the Physics, Chemistry, and Maths syllabus for JEE and other engineering entrance exams. It has no biology syllabus or NEET-specific analytics, and the revision weighting reflects JEE priorities.',
		keywords: ['neet', 'biology', 'medical', 'non-pcm', 'support']
	}
];
