import type { CoachingTimetable, TimetablePeriod, TimetableDay } from '$lib/types/tracker';

const VALID_DAYS: TimetableDay[] = [
	'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const DAY_MAP: Record<string, TimetableDay> = {
	mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
	fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
	monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
	friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

const MONTH_MAP: Record<string, string> = {
	january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
	july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
	jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

export function parseTime12to24(timeStr: string, defaultAmpm?: 'am' | 'pm'): string {
	if (!timeStr) return '';
	const clean = timeStr.trim().toLowerCase();
	const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
	if (!match) return timeStr;
	let h = parseInt(match[1], 10);
	const m = match[2] ? parseInt(match[2], 10) : 0;
	let ampm = match[3] || defaultAmpm;
	if (!ampm) {
		if (h >= 1 && h <= 7) ampm = 'pm';
		else if (h >= 8 && h <= 11) ampm = 'am';
	}
	if (ampm === 'pm' && h < 12) h += 12;
	if (ampm === 'am' && h === 12) h = 0;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseIsoDate(dateStr: string): string {
	const parts = dateStr.trim().split(/\s+/);
	if (parts.length >= 3) {
		const day = String(parts[0]).padStart(2, '0');
		const month = MONTH_MAP[parts[1].toLowerCase()] || '01';
		const year = parts[2];
		return `${year}-${month}-${day}`;
	}
	return '';
}

/**
 * Specialized parser for Bakliwal Tutorials & standard Indian coaching timetables.
 * Recognizes batch header timings, dated rows, syllabus codes (M18, C02, P16),
 * and maps codes to official BTracker syllabus chapter names.
 */
export function parseBakliwalTimetable(text: string): CoachingTimetable | null {
	const hasBtSignature = /Bakliwal|COC|Time\s*Table\s*from/i.test(text);
	const hasDatedRows = /\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(text);
	const hasBtCodes = /\b[PMC]\s*\d{1,2}\b/i.test(text);

	if (!hasBtSignature && !hasDatedRows && !hasBtCodes) {
		return null;
	}

	let defaultStart = '11:15';
	let defaultEnd = '14:45';
	let batchName = '';
	let room = '';
	let dateRange = '';

	const rangeMatch = text.match(/Time\s*Table\s*from\s*([^\n]+)/i);
	if (rangeMatch) dateRange = rangeMatch[1].trim();

	// Match timing window: [11:15 am to 2:45 pm]
	const timeWindowMatch = text.match(/\[(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\]/i);
	if (timeWindowMatch) {
		defaultStart = parseTime12to24(timeWindowMatch[1], 'am');
		defaultEnd = parseTime12to24(timeWindowMatch[2], 'pm');
	}

	// Match batch line before bracketed time: e.g. "C28 Aundh Noon COC-1 [11:15 am to 2:45 pm] (2nd Floor Big)"
	const batchLineMatch = text.match(/([^\n\[]+)\[\d{1,2}:\d{2}[^\]]*\](?:\s*\(([^)]+)\))?/i);
	if (batchLineMatch) {
		batchName = batchLineMatch[1].replace(/Bakliwal\s*Tutorials|Time\s*Table[^\n]*/gi, '').trim();
		if (batchLineMatch[2]) room = batchLineMatch[2].trim();
	}

	// Match all date rows: e.g. "12 October 2026 Mon" or "12 October 2026Mon"
	const dateRowRegex = /(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi;
	const matches: { fullMatch: string; dateStr: string; dayStr: string; index: number }[] = [];
	let m: RegExpExecArray | null;

	while ((m = dateRowRegex.exec(text)) !== null) {
		matches.push({
			fullMatch: m[0],
			dateStr: m[1],
			dayStr: m[2],
			index: m.index
		});
	}

	if (matches.length === 0) {
		return null;
	}

	const periods: TimetablePeriod[] = [];

	for (let i = 0; i < matches.length; i++) {
		const curr = matches[i];
		const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
		const block = text.slice(curr.index + curr.fullMatch.length, nextIndex).trim();

		const dayKey = curr.dayStr.toLowerCase().slice(0, 3);
		const day = DAY_MAP[dayKey] || 'Monday';
		const isoDate = parseIsoDate(curr.dateStr);

		// If block is empty, holiday, or dash
		if (!block || block === '-' || block === '—' || /^(?:nil|holiday|none|off|no\s*class)$/i.test(block)) {
			continue;
		}

		// Check for Tests (Grand BTest / Paper I & II)
		if (/Grand\s*BTest|BTest|Paper\s*I/i.test(block)) {
			const p1Match = block.match(/Paper\s*I:\s*(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
			const p2Match = block.match(/Paper\s*II:\s*(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);

			if (p1Match) {
				const endAmpm = p1Match[2].toLowerCase().includes('pm') ? 'pm' : 'am';
				periods.push({
					id: `period_${isoDate || Date.now()}_test1`,
					day,
					date: isoDate || undefined,
					startTime: parseTime12to24(p1Match[1], 'am'),
					endTime: parseTime12to24(p1Match[2], endAmpm),
					subject: 'Test',
					topic: 'Grand BTest (Paper I)',
					room,
					batch: batchName,
					notes: 'Paper I: ' + p1Match[1] + '-' + p1Match[2]
				});
			}
			if (p2Match) {
				periods.push({
					id: `period_${isoDate || Date.now()}_test2`,
					day,
					date: isoDate || undefined,
					startTime: parseTime12to24(p2Match[1], 'pm'),
					endTime: parseTime12to24(p2Match[2], 'pm'),
					subject: 'Test',
					topic: 'Grand BTest (Paper II)',
					room,
					batch: batchName,
					notes: 'Paper II: ' + p2Match[1] + '-' + p2Match[2]
				});
			}
			if (!p1Match && !p2Match) {
				periods.push({
					id: `period_${isoDate || Date.now()}_test`,
					day,
					date: isoDate || undefined,
					startTime: defaultStart,
					endTime: defaultEnd,
					subject: 'Test',
					topic: 'Grand BTest',
					room,
					batch: batchName
				});
			}
			continue;
		}

		// Look for subject code (M18, C02, P16, etc.)
		const codeMatch = block.match(/\b([PMC])\s*(\d{1,2})\b/i);
		if (codeMatch) {
			const subCode = codeMatch[1].toUpperCase() as 'P' | 'C' | 'M';
			const rawCode = `${subCode}${codeMatch[2]}`;

			let startTime = defaultStart;
			let endTime = defaultEnd;

			// Check for start time override: e.g. "11:30) C02" or "(11:30 to 2:45)"
			const overrideMatch = block.match(/(?:^|\s|\()(\d{1,2}:\d{2})\s*(?:am|pm)?\)?/i);
			if (overrideMatch) {
				startTime = parseTime12to24(overrideMatch[1], 'am');
			}

			let notes = '';
			if (/\[ONLINE\]/i.test(block)) notes += 'Online Class ';
			const dueMatch = block.match(/\[DUE TO[^\]]+\]/i);
			if (dueMatch) notes += dueMatch[0] + ' ';

			periods.push({
				id: `period_${isoDate || Date.now()}_${rawCode}_${i}`,
				day,
				date: isoDate || undefined,
				startTime,
				endTime,
				subject: subCode,
				topic: rawCode,
				room,
				batch: batchName,
				notes: notes.trim() || undefined
			});
		} else {
			// Other classes or topics that don't have code (e.g. "Physics Mechanics" or "Doubt Session")
			const firstLine = block.split('\n')[0].trim();
			if (firstLine.length > 1) {
				let sub = 'P';
				const lower = firstLine.toLowerCase();
				if (lower.includes('chem')) sub = 'C';
				else if (lower.includes('math')) sub = 'M';
				else if (lower.includes('test')) sub = 'Test';

				periods.push({
					id: `period_${isoDate || Date.now()}_gen_${i}`,
					day,
					date: isoDate || undefined,
					startTime: defaultStart,
					endTime: defaultEnd,
					subject: sub,
					topic: firstLine,
					room,
					batch: batchName
				});
			}
		}
	}

	return {
		batchName: batchName || 'C28 Aundh Noon COC-1',
		institution: 'Bakliwal Tutorials',
		dateRange,
		periods,
		updatedAt: Date.now()
	};
}

/**
 * Extracts plain text from a PDF with horizontal spacing between text elements.
 */
export async function extractPdfTextWithSpacing(file: File): Promise<string> {
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
		let lastX: number | null = null;
		let line = '';

		for (const item of chunk.items as any[]) {
			const y = item.transform?.[5] ?? 0;
			const x = item.transform?.[4] ?? 0;
			if (lastY !== null && Math.abs(y - lastY) > 3) {
				text += `${line.trim()}\n`;
				line = '';
				lastX = null;
			}
			if (lastX !== null && x > lastX + 2 && !line.endsWith(' ') && !item.str.startsWith(' ')) {
				line += ' ';
			}
			line += item.str;
			lastY = y;
			lastX = x + (item.width || (item.str.length * 6));
		}
		text += `${line.trim()}\n`;
	}

	return text;
}

/**
 * Parses a timetable/schedule PDF or text into structured coaching periods.
 * Uses specialized deterministic parser first, falls back to AI or generic heuristic.
 */
export async function parseTimetableFromText(text: string): Promise<CoachingTimetable> {
	if (!text || !text.trim()) {
		throw new Error('No text found in the uploaded document.');
	}

	// 1. Try specialized Bakliwal Tutorials & Indian coaching schedule parser
	const btResult = parseBakliwalTimetable(text);
	if (btResult && btResult.periods.length > 0) {
		return btResult;
	}

	// 2. Try AI parsing via /api/gemini if keys configured
	try {
		const prompt = `
You are an expert timetable and coaching schedule parser for an Indian exam preparation app (JEE/NEET).
Analyze the following extracted text from a student's coaching schedule or batch timetable.

Extract all scheduled class periods and return a JSON object strictly matching this schema:
{
  "batchName": "Batch name or section (e.g. C28 Aundh Noon COC-1)",
  "institution": "Coaching institute name if mentioned",
  "periods": [
    {
      "day": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
      "date": "YYYY-MM-DD (if specific dates are mentioned, otherwise omit)",
      "startTime": "HH:MM (24-hour format, e.g. 11:15)",
      "endTime": "HH:MM (24-hour format, e.g. 14:45)",
      "subject": "P" (Physics) or "C" (Chemistry) or "M" (Mathematics) or "Test",
      "topic": "Code or topic name as written in timetable (e.g. M18, C02, P16, Grand BTest)",
      "room": "Room or Hall if mentioned",
      "notes": "Any special notes like [ONLINE]"
    }
  ]
}

Important Rules:
- If a default timing window is in brackets like [11:15 am to 2:45 pm], use that for periods that don't specify time.
- Subject must be "P" for Physics, "C" for Chemistry, "M" for Mathematics, "Test" for Exams.
- Return ONLY valid JSON.

Document Text:
${text.substring(0, 80000)}
`;

		const res = await fetch('/api/gemini', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				history: [{ role: 'user', parts: [{ text: prompt }] }],
				jsonMode: true
			})
		});

		if (res.ok) {
			const data = await res.json();
			if (!data.error && data.text) {
				const cleanText = data.text.replace(/^\s*```json/m, '').replace(/```\s*$/m, '').trim();
				const parsed = JSON.parse(cleanText);
				const rawPeriods = Array.isArray(parsed.periods) ? parsed.periods : [];
				const validatedPeriods: TimetablePeriod[] = [];

				for (const p of rawPeriods) {
					const dayNorm = DAY_MAP[String(p.day || '').toLowerCase().slice(0, 3)];
					if (!dayNorm) continue;

					let sub = String(p.subject || 'P').trim();
					const subUpper = sub.toUpperCase();
					if (subUpper.startsWith('PHY') || subUpper === 'P') sub = 'P';
					else if (subUpper.startsWith('CHEM') || subUpper === 'C') sub = 'C';
					else if (subUpper.startsWith('MATH') || subUpper === 'M') sub = 'M';
					else if (subUpper.includes('TEST')) sub = 'Test';

					validatedPeriods.push({
						id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `period_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
						day: dayNorm,
						date: p.date ? String(p.date) : undefined,
						startTime: String(p.startTime || '11:15').trim(),
						endTime: String(p.endTime || '14:45').trim(),
						subject: sub,
						topic: String(p.topic || 'Class Lecture').trim(),
						room: p.room ? String(p.room).trim() : undefined,
						notes: p.notes ? String(p.notes).trim() : undefined
					});
				}

				if (validatedPeriods.length > 0) {
					return {
						batchName: parsed.batchName || 'Batch Timetable',
						institution: parsed.institution || '',
						periods: validatedPeriods,
						updatedAt: Date.now()
					};
				}
			}
		}
	} catch (e) {
		console.warn('Timetable AI parse failed, falling back to heuristic parser:', e);
	}

	// 3. Fallback generic heuristic parser
	return fallbackHeuristicParser(text);
}

/**
 * Extracts timetable directly from an uploaded File (PDF or plain text).
 */
export async function parseTimetableFromFile(file: File): Promise<CoachingTimetable> {
	let rawText = '';
	if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
		rawText = await extractPdfTextWithSpacing(file);
	} else {
		rawText = await file.text();
	}
	return parseTimetableFromText(rawText);
}

function fallbackHeuristicParser(text: string): CoachingTimetable {
	const periods: TimetablePeriod[] = [];
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	let currentDay: TimetableDay = 'Monday';

	for (const line of lines) {
		const lower = line.toLowerCase();
		const matchedDayKey = Object.keys(DAY_MAP).find((k) => lower.startsWith(k));
		if (matchedDayKey) {
			currentDay = DAY_MAP[matchedDayKey];
			if (line.trim().length <= matchedDayKey.length + 2) continue;
		}

		let subject: 'P' | 'C' | 'M' | string = 'P';
		if (lower.includes('chem')) subject = 'C';
		else if (lower.includes('math')) subject = 'M';
		else if (lower.includes('phys')) subject = 'P';
		else if (lower.includes('test')) subject = 'Test';
		else {
			const hasCode = /\b[PMC]0?[1-9][0-9]?\b/i.test(line);
			const hasTime = /(\d{1,2}[:.]\d{2})/i.test(line);
			const hasLec = /lec|class|period|session|doubt|batch/i.test(line);
			if (!hasCode && !hasTime && !hasLec) continue;
		}

		const codeMatch = line.match(/\b([PMC])\s*(\d{1,2})\b/i);
		let topic = line;
		if (codeMatch) {
			const subCode = codeMatch[1].toUpperCase() as 'P' | 'C' | 'M';
			subject = subCode;
			topic = `${subCode}${codeMatch[2]}`;
		}

		const timeMatch = line.match(/(\d{1,2}[:.]\d{2})\s*(?:am|pm)?\s*(?:-|to)\s*(\d{1,2}[:.]\d{2})\s*(?:am|pm)?/i);
		const start = timeMatch ? parseTime12to24(timeMatch[1], 'am') : '11:15';
		const end = timeMatch ? parseTime12to24(timeMatch[2], 'pm') : '14:45';

		periods.push({
			id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `period_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			day: currentDay,
			startTime: start,
			endTime: end,
			subject,
			topic: topic.replace(timeMatch ? timeMatch[0] : '', '').trim() || 'Class Lecture'
		});
	}

	return {
		batchName: 'Batch Timetable',
		periods,
		updatedAt: Date.now()
	};
}
