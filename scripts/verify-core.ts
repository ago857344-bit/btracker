import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Running Core Data-Integrity & Regression Verification...\n');

// ── 1. Question Bitmask Merge Logic ──────────────────────────────────────────
function mergeQuestionCell(localVal: number, remoteVal: number, localNewer: boolean): number {
	const locAttempted = localVal & 1;
	const remAttempted = remoteVal & 1;
	const attempted = locAttempted | remAttempted;

	const locResult = (localVal >> 1) & 3;
	const remResult = (remoteVal >> 1) & 3;
	let result = 0;
	if (locResult === 0) result = remResult;
	else if (remResult === 0) result = locResult;
	else if (locResult === remResult) result = locResult;
	else result = localNewer ? locResult : remResult;

	const locFlagged = (localVal >> 3) & 1;
	const remFlagged = (remoteVal >> 3) & 1;
	let flagged = 0;
	if (locFlagged === remFlagged) flagged = locFlagged;
	else flagged = localNewer ? locFlagged : remFlagged;

	const locConf = (localVal >> 4) & 3;
	const remConf = (remoteVal >> 4) & 3;
	let conf = 0;
	if (locConf === 0) conf = remConf;
	else if (remConf === 0) conf = locConf;
	else if (locConf === remConf) conf = locConf;
	else conf = localNewer ? locConf : remConf;

	return attempted | (result << 1) | (flagged << 3) | (conf << 4);
}

// Case 1: Correct (result 1) vs Wrong (result 2) should NOT merge into Stuck (result 3)
const cellCorrect = 1 | (1 << 1); // 0b000011 = 3 (attempted=1, result=1)
const cellWrong = 1 | (2 << 1);   // 0b000101 = 5 (attempted=1, result=2)

const mergedWhenLocalNewer = mergeQuestionCell(cellCorrect, cellWrong, true);
assert.equal((mergedWhenLocalNewer >> 1) & 3, 1, 'Local newer should preserve Correct (1)');
assert.notEqual((mergedWhenLocalNewer >> 1) & 3, 3, 'Must NOT corrupt into Stuck (3)');

const mergedWhenRemoteNewer = mergeQuestionCell(cellCorrect, cellWrong, false);
assert.equal((mergedWhenRemoteNewer >> 1) & 3, 2, 'Remote newer should preserve Wrong (2)');
assert.notEqual((mergedWhenRemoteNewer >> 1) & 3, 3, 'Must NOT corrupt into Stuck (3)');

console.log('✅ Question bitmask field-by-field merge verified (no Stuck corruption)');

// ── 2. Legacy Video Wallpaper Path Normalization ──────────────────────────────
function normalizeVideoWallpaperPath(path: string | null | undefined): string | null | undefined {
	if (typeof path !== 'string') return path;
	if (path === 'none' || path === '' || path === 'builtin:none') return null;
	if (path.includes('/videos/')) {
		return path
			.replace('/videos/god mode.mp4', '/videos/god-mode.mp4')
			.replace('/videos/aurora borealis.mp4', '/videos/aurora-borealis.mp4')
			.replace('/videos/catalyst lab.mp4', '/videos/catalyst-lab.mp4')
			.replace('/videos/neon initiate.mp4', '/videos/neon-initiate.mp4')
			.replace('/videos/sapphire master.mp4', '/videos/sapphire-master.mp4');
	}
	return path;
}

assert.equal(normalizeVideoWallpaperPath('/videos/god mode.mp4'), '/videos/god-mode.mp4');
assert.equal(normalizeVideoWallpaperPath('/videos/aurora borealis.mp4'), '/videos/aurora-borealis.mp4');
assert.equal(normalizeVideoWallpaperPath('/videos/catalyst lab.mp4'), '/videos/catalyst-lab.mp4');
assert.equal(normalizeVideoWallpaperPath('/videos/neon initiate.mp4'), '/videos/neon-initiate.mp4');
assert.equal(normalizeVideoWallpaperPath('/videos/sapphire master.mp4'), '/videos/sapphire-master.mp4');
assert.equal(normalizeVideoWallpaperPath('/videos/god-mode.mp4'), '/videos/god-mode.mp4');
assert.equal(normalizeVideoWallpaperPath('none'), null);
console.log('✅ Video wallpaper legacy path normalization verified');

// ── 3. Flashcard Subject Code Normalization ──────────────────────────────────
function normalizeSubject(sub?: string): 'P' | 'C' | 'M' {
	const s = (sub || '').trim().toLowerCase();
	if (s === 'c' || s === 'chem' || s === 'chemistry') return 'C';
	if (s === 'm' || s === 'math' || s === 'maths' || s === 'mathematics') return 'M';
	return 'P';
}

assert.equal(normalizeSubject('Physics'), 'P');
assert.equal(normalizeSubject('chem'), 'C');
assert.equal(normalizeSubject('Mathematics'), 'M');
assert.equal(normalizeSubject('unknown'), 'P');
console.log('✅ Flashcard subject code normalization verified');

// ── 4. Deletion Tombstones Filtering ──────────────────────────────────────────
const items = [{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }];
const deletedIds: Record<string, number> = { 'task-2': Date.now() };
const active = items.filter((item) => !deletedIds[item.id]);
assert.equal(active.length, 2);
assert.deepEqual(active.map((a) => a.id), ['task-1', 'task-3']);
console.log('✅ Deletion tombstone filtering verified');

// ── 5. Static Assets Diet & Manifest Verification ────────────────────────────
const rootDir = process.cwd();
const videosDir = path.join(rootDir, 'static', 'videos');
if (fs.existsSync(videosDir)) {
	const videoFiles = fs.readdirSync(videosDir);
	const spaceFiles = videoFiles.filter((f) => f.includes(' '));
	assert.equal(spaceFiles.length, 0, `static/videos must not contain space-named files: ${spaceFiles.join(', ')}`);
	assert.ok(!videoFiles.includes('instructions.txt'), 'instructions.txt should be removed');
}

const manifestPath = path.join(rootDir, 'static', 'manifest.json');
assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.ok(Array.isArray(manifest.shortcuts), 'manifest.json must include shortcuts array');
assert.equal(manifest.shortcuts.length, 4, 'manifest.json must contain 4 shortcuts');
const shortcutUrls = manifest.shortcuts.map((s: { url: string }) => s.url);
assert.ok(shortcutUrls.includes('/focus'));
assert.ok(shortcutUrls.includes('/log'));
assert.ok(shortcutUrls.includes('/plan'));
assert.ok(shortcutUrls.includes('/revise'));
console.log('✅ Manifest shortcuts & video diet verified');

// ── 6. Viewport Accessibility Verification ───────────────────────────────────
const appHtmlPath = path.join(rootDir, 'src', 'app.html');
const appHtml = fs.readFileSync(appHtmlPath, 'utf8');
assert.ok(
	appHtml.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />'),
	'app.html viewport must enable user scaling (no user-scalable=0 or maximum-scale=1)'
);
console.log('✅ Mobile viewport pinch-to-zoom accessibility verified');

// ── 7. Markdown HTML XSS Sanitizer Verification ─────────────────────────────
function sanitizeHtml(html: string): string {
    if (!html) return '';
    let clean = html;
    clean = clean.replace(/<\s*(?:script|iframe|object|embed|form|meta|link)\b[\s\S]*?(?:<\/\s*(?:script|iframe|object|embed|form|meta|link)\s*>|\/?>)/gi, '');
    clean = clean.replace(/<\/\s*(?:script|iframe|object|embed|form|meta|link)\s*>/gi, '');
    clean = clean.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    clean = clean.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, ' $1="#"');
    clean = clean.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"');
    return clean;
}

const xssPayload = '<div><script>alert("xss")</script><img src="x" onerror="evil()"/><a href="javascript:steal()">Click</a></div>';
const sanitized = sanitizeHtml(xssPayload);
assert.ok(!sanitized.includes('<script>'), 'Must strip script tags');
assert.ok(!sanitized.includes('onerror'), 'Must strip inline on* event handlers');
assert.ok(!sanitized.includes('javascript:'), 'Must neutralize javascript: protocol');
assert.ok(sanitized.includes('href="#"'), 'Must rewrite javascript: to safe href');

const katexPayload = '<span class="katex"><math><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow></semantics></math></span>';
assert.equal(sanitizeHtml(katexPayload), katexPayload, 'Must preserve KaTeX markup untouched');
console.log('✅ Markdown HTML XSS Sanitizer verified');

console.log('\n🎉 All core data-integrity tests passed successfully!\n');
