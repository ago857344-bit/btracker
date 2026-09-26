import { SYLLABUS } from '$lib/state/syllabus';

export interface ChapterRef {
	code: string; subName: string; moduleName: string; no: number; name: string;
}
export interface ChapterMatch extends ChapterRef {
	score: number; line: string;
}

const STOPWORDS = new Set(['of', 'and', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'its', 'part', 'chapter', 'no', 'unit']);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => norm(s).split(' ').filter((w) => w && !STOPWORDS.has(w));

/** Flat list of every syllabus chapter across Physics / Chemistry / Maths. */
export function allSyllabusChapters(): ChapterRef[] {
	const out: ChapterRef[] = [];
	for (const subject of SYLLABUS) {
		for (const module of subject.modules) {
			for (const chapter of module.chapters) {
				out.push({ code: subject.code, subName: subject.name, moduleName: module.name, no: chapter.no, name: chapter.name });
			}
		}
	}
	return out;
}

function scoreLine(chapterTokens: string[], chapterNorm: string, line: string): number {
	const lineNorm = norm(line);
	if (!lineNorm) return 0;
	if (lineNorm === chapterNorm) return 1;
	if (lineNorm.includes(chapterNorm) && chapterNorm.length >= 6) return 0.96;
	const lineTokens = new Set(tokens(line));
	if (!lineTokens.size || !chapterTokens.length) return 0;
	let hit = 0;
	for (const token of chapterTokens) if (lineTokens.has(token)) hit += 1;
	return hit / chapterTokens.length;
}

/**
 * Matches syllabus chapters against raw PDF text. Each chapter is scored against
 * every candidate line; the best line above the threshold wins. Returns matches
 * ordered by syllabus appearance, de-duplicated per chapter.
 */
export function matchChapters(text: string, threshold = 0.72): ChapterMatch[] {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length >= 3 && l.length <= 140);
	if (!lines.length) return [];

	const matches: ChapterMatch[] = [];
	for (const chapter of allSyllabusChapters()) {
		const chapterNorm = norm(chapter.name);
		const chapterTokens = tokens(chapter.name);
		let best: ChapterMatch | null = null;
		for (const line of lines) {
			const score = scoreLine(chapterTokens, chapterNorm, line);
			if (score >= threshold && (!best || score > best.score)) {
				best = { ...chapter, score, line };
			}
			if (best && best.score === 1) break;
		}
		if (best) matches.push(best);
	}
	return matches;
}

/** Extracts the plain text of a PDF file (client-side, via pdfjs-dist). */
export async function extractPdfText(file: File): Promise<string> {
	const pdfjs = await import('pdfjs-dist');
	const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
	pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
	const data = await file.arrayBuffer();
	const doc = await pdfjs.getDocument({ data }).promise;
	let text = '';
	for (let page = 1; page <= doc.numPages; page += 1) {
		const content = await doc.getPage(page);
		const chunk = await content.getTextContent();
		let lastY: number | null = null;
		let line = '';
		for (const item of chunk.items as { str: string; transform: number[] }[]) {
			const y = item.transform?.[5] ?? 0;
			if (lastY !== null && Math.abs(y - lastY) > 3) { text += `${line}\n`; line = ''; }
			line += item.str;
			lastY = y;
		}
		text += `${line}\n`;
	}
	return text;
}
