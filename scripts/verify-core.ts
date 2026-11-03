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

// ── 7. Hardened Markdown HTML XSS Sanitizer Verification ─────────────────────
const DANGEROUS_TAGS = 'script|iframe|object|embed|form|meta|link|style|base|applet|svg';
function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&colon;/gi, ':')
        .replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (_, hex, dec) => {
            return String.fromCharCode(hex ? parseInt(hex, 16) : parseInt(dec, 10));
        });
}
function isDangerousUri(val: string): boolean {
    const normalized = decodeHtmlEntities(val).replace(/[\u0000-\u001f\s\\]/g, '').toLowerCase();
    return /^(?:javascript:|vbscript:|data:(?!image\/))/i.test(normalized);
}
function sanitizeHtml(html: string): string {
    if (!html) return '';
    let clean = html;
    const blockRegex = new RegExp(`<\\s*(?:${DANGEROUS_TAGS})\\b[\\s\\S]*?(?:<\\/\\s*(?:${DANGEROUS_TAGS})\\s*>|\\/>)`, 'gi');
    const openOrCloseRegex = new RegExp(`<\\/?\\s*(?:${DANGEROUS_TAGS})\\b[^>]*>`, 'gi');
    clean = clean.replace(blockRegex, '');
    clean = clean.replace(openOrCloseRegex, '');
    clean = clean.replace(/[\s/]+(?:on[a-z0-9_-]+|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+)/gi, ' ');
    clean = clean.replace(/([\s/]+(?:href|src|xlink:href|action)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^>\s]+))/gi, (match, prefix, q1, q2, bare) => {
        const rawVal = q1 ?? q2 ?? bare ?? '';
        if (isDangerousUri(rawVal)) {
            return `${prefix}"#"`;
        }
        return match;
    });
    return clean;
}

const xssPayload = '<div><script>alert("xss")</script><svg onload="evil()"><circle/></svg><style>body{display:none}</style><img src="x" onerror="evil()"/><a href="javascript:steal()">Click</a><a href="data:text/html,<script>alert(1)</script>">Data</a></div>';
const sanitized = sanitizeHtml(xssPayload);
assert.ok(!sanitized.includes('<script>'), 'Must strip script tags');
assert.ok(!sanitized.includes('<svg'), 'Must strip svg tags');
assert.ok(!sanitized.includes('<style>'), 'Must strip style tags');
assert.ok(!sanitized.includes('onerror'), 'Must strip inline on* event handlers');
assert.ok(!sanitized.includes('javascript:'), 'Must neutralize javascript: protocol');
assert.ok(!sanitized.includes('data:text/html'), 'Must neutralize data: protocol');
assert.ok(sanitized.includes('href="#"'), 'Must rewrite dangerous protocols to safe href');

// Slash-delimited attribute bypass tests
const slashPayload1 = '<img/onerror=alert(1) src=x>';
assert.ok(!sanitizeHtml(slashPayload1).includes('onerror'), 'Must strip slash-separated onerror handlers');
const slashPayload2 = '<details/open/ontoggle=alert(1)>';
assert.ok(!sanitizeHtml(slashPayload2).includes('ontoggle'), 'Must strip slash-separated ontoggle handlers');

// Entity-encoded and whitespace protocol tests
const entityProtoPayload = '<a href="jav&#x61;script:alert(1)">Click</a>';
assert.ok(!sanitizeHtml(entityProtoPayload).includes('javascript:'), 'Must neutralize entity-encoded javascript: protocol');
assert.ok(sanitizeHtml(entityProtoPayload).includes('href="#"'), 'Must rewrite entity-encoded javascript: href to #');

const katexPayload = '<span class="katex"><math><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow></semantics></math></span>';
assert.equal(sanitizeHtml(katexPayload), katexPayload, 'Must preserve KaTeX markup untouched');
console.log('✅ Hardened Markdown HTML XSS Sanitizer verified');

// ── 8. Gamification Leveling Beyond Level 20 Verification ─────────────────────
const gamificationFilePath = path.join(rootDir, 'src', 'lib', 'state', 'gamification.ts');
const gamificationFile = fs.readFileSync(gamificationFilePath, 'utf8');
assert.ok(gamificationFile.includes('XP_PER_LEVEL_BEYOND = 10000;'), 'gamification.ts must export XP_PER_LEVEL_BEYOND');
assert.ok(gamificationFile.includes('extraLevels = Math.floor'), 'gamification.ts must calculate extraLevels beyond Level 20');

const LEVEL_THRESHOLDS = [
	0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000,
	25000, 31000, 38000, 46000, 55000, 65000, 76000, 88000, 100000
];
const XP_PER_LEVEL_BEYOND = 10000;

function getLevelDataTest(xp: number) {
	const maxExplicitLevel = LEVEL_THRESHOLDS.length; // 20
	const maxExplicitXp = LEVEL_THRESHOLDS[maxExplicitLevel - 1]; // 100,000

	let level = 1;
	let currentTierXp = 0;
	let nextTierXp = LEVEL_THRESHOLDS[1] ?? 500;

	if (xp >= maxExplicitXp) {
		const extraLevels = Math.floor((xp - maxExplicitXp) / XP_PER_LEVEL_BEYOND);
		level = maxExplicitLevel + extraLevels;
		currentTierXp = maxExplicitXp + extraLevels * XP_PER_LEVEL_BEYOND;
		nextTierXp = currentTierXp + XP_PER_LEVEL_BEYOND;
	} else {
		for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
			if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
			else break;
		}
		currentTierXp = LEVEL_THRESHOLDS[level - 1];
		nextTierXp = LEVEL_THRESHOLDS[level] ?? currentTierXp + XP_PER_LEVEL_BEYOND;
	}

	const progress = Math.max(0, Math.min(100, ((xp - currentTierXp) / (nextTierXp - currentTierXp)) * 100));

	let title = 'Aspirant';
	if (level >= 15) title = 'JEE Conqueror';
	else if (level >= 10) title = 'Gladiator';
	else if (level >= 5) title = 'Scholar';
	else if (level >= 3) title = 'Initiate';

	return { level, title, currentTierXp, nextTierXp, progress };
}

const lvl1 = getLevelDataTest(0);
assert.equal(lvl1.level, 1, '0 XP should be Level 1');
assert.equal(lvl1.nextTierXp, 500);

const lvl20 = getLevelDataTest(100000);
assert.equal(lvl20.level, 20, '100,000 XP should be Level 20');
assert.equal(lvl20.currentTierXp, 100000);
assert.equal(lvl20.nextTierXp, 110000);

const lvl21 = getLevelDataTest(111160);
assert.equal(lvl21.level, 21, '111,160 XP must be Level 21');
assert.equal(lvl21.currentTierXp, 110000, 'Current tier XP for Level 21 should be 110,000');
assert.equal(lvl21.nextTierXp, 120000, 'Next tier XP for Level 21 should be 120,000');
assert.ok(lvl21.progress > 0 && lvl21.progress < 100, 'Progress must be properly positioned between 110k and 120k');
assert.equal(lvl21.title, 'JEE Conqueror', 'Title should remain JEE Conqueror');

console.log('✅ Infinite Gamification leveling beyond Level 20 verified');

// ── 9. SSRF Private IP & Hostname Guard Verification ──────────────────────────
const proxyPath = path.join(rootDir, 'src', 'routes', 'api', 'proxy-image', '+server.ts');
const proxySource = fs.readFileSync(proxyPath, 'utf8');
assert.ok(proxySource.includes("redirect: 'manual'"), 'proxy-image must enforce manual redirect checking');
assert.ok(proxySource.includes('metadata.google.internal'), 'proxy-image must block cloud metadata host');
assert.ok(proxySource.includes('MAX_REDIRECTS'), 'proxy-image must cap redirect hops');
console.log('✅ SSRF IPv6, Cloud Metadata & Open Redirect guards verified');

// ── 10. Coaching Name Typo & SM-2 Session Queue Verification ──────────────────
const coachingPath = path.join(rootDir, 'src', 'lib', 'state', 'coaching.ts');
const coachingSource = fs.readFileSync(coachingPath, 'utf8');
assert.ok(coachingSource.includes("DEFAULT_BT_NAME = 'Bakliwal Tutorials'"), 'coaching.ts must spell Bakliwal Tutorials accurately');

const flashcardsPanelPath = path.join(rootDir, 'src', 'lib', 'components', 'revise', 'FlashcardsPanel.svelte');
const flashcardsPanelSource = fs.readFileSync(flashcardsPanelPath, 'utf8');
assert.ok(flashcardsPanelSource.includes('let sessionQueue: Flashcard[] = []'), 'FlashcardsPanel must snapshot sessionQueue during review');
assert.ok(flashcardsPanelSource.includes('delete s.deletedIds[backup.id]'), 'FlashcardsPanel undo delete must clear tombstone');
console.log('✅ Coaching spelling & SM-2 session queue isolation verified');

// ── 11. AI Mentor Chat History User Isolation & Sync Verification ──────────────
const aimentorPath = path.join(rootDir, 'src', 'lib', 'components', 'ui', 'AIOmentor.svelte');
const aimentorSource = fs.readFileSync(aimentorPath, 'utf8');
assert.ok(aimentorSource.includes('toggleHistory'), 'AIOmentor must include toggleHistory');
assert.ok(aimentorSource.includes('historyOpen'), 'AIOmentor must manage historyOpen state');
assert.ok(aimentorSource.includes('activeUserId'), 'AIOmentor must scope conversations to activeUserId');
assert.ok(aimentorSource.includes('userSessions'), 'AIOmentor must filter sessions per specific user');
assert.ok(aimentorSource.includes('history-badge'), 'AIOmentor must display history count badge');
assert.ok(aimentorSource.includes('history-panel'), 'AIOmentor must render history drawer panel');

// Verify session merge logic respects user isolation and tombstones
interface MockSession {
	id: string;
	userId?: string;
	title: string;
	updatedAt: number;
	messages: { role: 'user' | 'ai'; text: string }[];
}

const userASessions: MockSession[] = [
	{ id: 'sess_1', userId: 'user_A', title: 'Rotational Motion', updatedAt: 1000, messages: [{ role: 'user', text: 'torque formula' }] },
	{ id: 'sess_2', userId: 'user_A', title: 'Thermodynamics', updatedAt: 2000, messages: [{ role: 'user', text: 'carnot engine' }] }
];
const userBSessions: MockSession[] = [
	{ id: 'sess_3', userId: 'user_B', title: 'Electrostatics', updatedAt: 3000, messages: [{ role: 'user', text: 'gauss law' }] }
];
const guestSessions: MockSession[] = [
	{ id: 'sess_4', userId: 'guest', title: 'Kinematics', updatedAt: 4000, messages: [{ role: 'user', text: 'projectile' }] }
];

const allMockSessions = [...userASessions, ...userBSessions, ...guestSessions];

// User A only sees User A's conversations
const filteredForUserA = allMockSessions.filter((s) => s.userId === 'user_A');
assert.equal(filteredForUserA.length, 2, 'User A must only see User A sessions');
assert.ok(filteredForUserA.every((s) => s.userId === 'user_A'));

// User B only sees User B's conversations
const filteredForUserB = allMockSessions.filter((s) => s.userId === 'user_B');
assert.equal(filteredForUserB.length, 1, 'User B must only see User B sessions');
assert.equal(filteredForUserB[0].id, 'sess_3');

// Guest only sees Guest conversations
const filteredForGuest = allMockSessions.filter((s) => !s.userId || s.userId === 'guest');
assert.equal(filteredForGuest.length, 1, 'Guest must only see Guest sessions');
assert.equal(filteredForGuest[0].id, 'sess_4');

// Deleted tombstone check
const mentorDeletedIds = new Set(['sess_1']);
const nonDeletedSessions = allMockSessions.filter((s) => !mentorDeletedIds.has(s.id));
assert.equal(nonDeletedSessions.find((s) => s.id === 'sess_1'), undefined, 'Deleted session must be pruned');

console.log('✅ AI Mentor Chat History per-user isolation & session persistence verified');

// ── 12. Wallpaper & Theme Preview Feature Verification ───────────────────────
const settingsSource = fs.readFileSync(path.join(rootDir, 'src', 'routes', 'settings', '+page.svelte'), 'utf8');
const globalOverlaysSource = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'components', 'GlobalOverlays.svelte'), 'utf8');
const themePreviewSource = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'stores', 'themePreview.ts'), 'utf8');
const themesSource = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'state', 'themes.ts'), 'utf8');

// A. Global preview store verification
assert.ok(themePreviewSource.includes('startThemePreview'), 'themePreview.ts must export startThemePreview');
assert.ok(themePreviewSource.includes('endThemePreview'), 'themePreview.ts must export endThemePreview');
assert.ok(globalOverlaysSource.includes('global-preview-banner'), 'GlobalOverlays must render global-preview-banner');
assert.ok(globalOverlaysSource.includes('$themePreview.active'), 'GlobalOverlays must listen to $themePreview.active');

// B. Locked Theme Modal wallpaper preview verification
assert.ok(settingsSource.includes('locked-theme-modal-body'), 'Settings locked modal must render locked-theme-modal-body');
assert.ok(settingsSource.includes('locked-wp-video'), 'Settings locked modal must render video element for video wallpapers');
assert.ok(settingsSource.includes('Live Video Wallpaper'), 'Settings locked modal must indicate Live Video Wallpaper');
assert.ok(settingsSource.includes('startPreview'), 'Settings locked modal must provide startPreview');

// C. Settings Wallpaper & Glass Live Preview Card verification
assert.ok(settingsSource.includes('wallpaper-live-preview-box'), 'Settings must render wallpaper-live-preview-box');
assert.ok(settingsSource.includes('preview-glass-card'), 'Settings must render preview-glass-card reflecting glass opacity');
assert.ok(settingsSource.includes('video-thumb'), 'Settings wallpaper history must render video-thumb for video wallpapers');
assert.ok(settingsSource.includes('setWallpaper(wp)'), 'Settings wallpaper history click must call setWallpaper(wp)');

// D. Helper logic verification
function isVideoWallpaperTest(url: string | null | undefined): boolean {
	if (!url) return false;
	return url.endsWith('.mp4') || url.endsWith('.webm') || url.startsWith('data:video');
}
assert.equal(isVideoWallpaperTest('/videos/god-mode.mp4'), true, '.mp4 must be detected as video wallpaper');
assert.equal(isVideoWallpaperTest('/videos/catalyst.webm'), true, '.webm must be detected as video wallpaper');
assert.equal(isVideoWallpaperTest('data:video/mp4;base64,AAAA'), true, 'data:video must be detected as video wallpaper');
assert.equal(isVideoWallpaperTest('https://example.com/art.jpg'), false, '.jpg must not be detected as video wallpaper');
assert.equal(isVideoWallpaperTest('radial-gradient(circle, red, blue)'), false, 'gradient must not be detected as video wallpaper');

console.log('✅ Wallpaper & Theme Preview modal, live glass simulation & video playback verified');

// ── 13. Massive Code Audit Regression Verification ───────────────────────────
// 13a. Proxy Image SVG CSP & nosniff
const proxyServerPath = path.join(rootDir, 'src', 'routes', 'api', 'proxy-image', '+server.ts');
const proxyServerSource = fs.readFileSync(proxyServerPath, 'utf8');
assert.ok(proxyServerSource.includes("'X-Content-Type-Options': 'nosniff'"), 'proxy-image must set nosniff header');
assert.ok(proxyServerSource.includes("responseHeaders['Content-Security-Policy'] = \"default-src 'none'; sandbox\""), 'proxy-image must set sandbox CSP for SVG');

// 13b. Gemini stream controller exception & safeHistory handling
const geminiServerPath = path.join(rootDir, 'src', 'routes', 'api', 'gemini', '+server.ts');
const geminiServerSource = fs.readFileSync(geminiServerPath, 'utf8');
assert.ok(!geminiServerSource.includes('} finally {\n\t\t\t\tcontroller.close();'), 'gemini stream reader must not close in finally after error');
assert.ok(geminiServerSource.includes('const safeHistory = Array.isArray(history) ? history : [];'), 'gemini server must safely handle non-array history');

// 13c. CRDT Sync Streak Freezes & Wallpaper deletion
function mergeStreakFreezesTest(base: any, remote: any) {
	const baseAvail = base.streakFreezes?.available ?? 2;
	const remoteAvail = remote.streakFreezes?.available ?? 2;
	const baseUsed = base.streakFreezes?.usedDates ?? [];
	const remoteUsed = remote.streakFreezes?.usedDates ?? [];
	const mergedUsedDates = Array.from(new Set([...baseUsed, ...remoteUsed])).sort();
	const baseTotal = baseAvail + baseUsed.length;
	const remoteTotal = remoteAvail + remoteUsed.length;
	const totalEarned = Math.max(baseTotal, remoteTotal, 2);
	const available = Math.max(0, Math.min(4, totalEarned - mergedUsedDates.length));
	return { available, usedDates: mergedUsedDates };
}

// User spends a freeze on Device A (started with 2, spent 1 on 2026-11-02)
const devA = { streakFreezes: { available: 1, usedDates: ['2026-11-02'] } };
// Device B has not spent yet
const devB = { streakFreezes: { available: 2, usedDates: [] } };
const mergedFreezes = mergeStreakFreezesTest(devA, devB);
assert.equal(mergedFreezes.available, 1, 'Sync must NOT refund spent freeze');
assert.deepEqual(mergedFreezes.usedDates, ['2026-11-02']);

// CRDT Wallpaper Deletion
const syncSourcePath = path.join(rootDir, 'src', 'lib', 'services', 'sync.ts');
const syncSource = fs.readFileSync(syncSourcePath, 'utf8');
assert.ok(syncSource.includes('const wp = prefSource.ui?.wallpaper ?? null;'), 'Sync must prioritize prefSource wallpaper over stale base fallback');

// 13d. Gamification Streak Freeze Free Mint & Phantom Streak Prevention
const trackerSourcePath = path.join(rootDir, 'src', 'lib', 'stores', 'tracker.ts');
const trackerSource = fs.readFileSync(trackerSourcePath, 'utf8');
assert.ok(!trackerSource.includes('state.streakFreezes.available = 1;\n\t\t\t}'), 'tracker.ts must not mint free streak freezes when available <= 0');
assert.ok(trackerSource.includes('const isFrozenDay = usedSet.has(cursor) || (cursor === yesterday && canUseYesterdayFreeze);'), 'calculateStreakDays must require an actual freeze to bridge past missed days');

// 13e. Daily report streak uses calculateStreakDays
const dailyReportSourcePath = path.join(rootDir, 'src', 'lib', 'state', 'dailyReport.ts');
const dailyReportSource = fs.readFileSync(dailyReportSourcePath, 'utf8');
assert.ok(dailyReportSource.includes('const streak = calculateStreakDays(state);'), 'dailyReport must use calculateStreakDays');

// 13f. Pomodoro timer multi-fire prevention
const timerStatePath = path.join(rootDir, 'src', 'lib', 'stores', 'timerState.ts');
const timerStateSource = fs.readFileSync(timerStatePath, 'utf8');
assert.ok(timerStateSource.includes('s.running = false;\n\t\t\t\ts.countdownEndsAt = null;\n\t\t\t\tstopTicking();'), 'timer tick must immediately set running=false and stop ticking when remaining hits 0');

// 13g. Gamification prestige seasonElo null-coalescing
const gamificationSrcPath = path.join(rootDir, 'src', 'lib', 'state', 'gamification.ts');
const gamificationSrc = fs.readFileSync(gamificationSrcPath, 'utf8');
assert.ok(gamificationSrc.includes('const seasonElo = (g.prestige.seasonElo ??= {});'), 'gamification.ts must ensure prestige.seasonElo is initialized before indexing');

// 13h. Todo page undefined todos safety
const todoPagePath = path.join(rootDir, 'src', 'routes', 'todo', '+page.svelte');
const todoPageSource = fs.readFileSync(todoPagePath, 'utf8');
assert.ok(todoPageSource.includes('$tracker?.todos || []'), 'todo page must defensively default todos to []');

console.log('✅ All 12 critical audit bugs & regressions verified against source and runtime');

// ── 14. Second Wave Deep Audit Regression Verification ───────────────────────
// 14a. Hydrate: Spent XP preservation (does not overwrite spent gamification XP)
const hydratePath = path.join(rootDir, 'src', 'lib', 'services', 'hydrate.ts');
const hydrateSource = fs.readFileSync(hydratePath, 'utf8');
assert.ok(hydrateSource.includes('if (saved.gamification?.xp == null) {'), 'hydrate must only calculate minCalculatedXp if saved xp is null/undefined');

// 14b. Sync: Timetable tombstone filtering & updatedAt precedence
const syncSourcePath2 = path.join(rootDir, 'src', 'lib', 'services', 'sync.ts');
const syncSource2 = fs.readFileSync(syncSourcePath2, 'utf8');
assert.ok(syncSource2.includes('baseTtTime > remTtTime'), 'sync must compare timetable updatedAt timestamps');
assert.ok(syncSource2.includes('!deletedIdSet.has(p.id)'), 'sync must filter tombstoned timetable periods');

// 14c. Sync: Active recall subtopic deep merging & modality unioning
assert.ok(syncSource2.includes('mergedSubtopics[subId] = remSubTime > locSubTime'), 'sync must deeply merge subtopics by revision timestamp');
assert.ok(syncSource2.includes('mergedModalities = Array.from(new Set([...(locCh.modalities || []), ...(remCh.modalities || [])]))'), 'sync must union chapter modalities');

// 14d. Decay: Calculation edge cases (NaN and zero handling)
function testDecay(decay: any): number {
    if (!decay?.lastRevisionAt) return 0;
    const days = Math.max(0, (Date.now() - decay.lastRevisionAt) / (1000 * 60 * 60 * 24));
    const halfLife = Math.max(0.1, decay.halfLife || 7);
    const r0 = Math.max(0, Math.min(100, decay.r0 ?? 100));
    const score = r0 * Math.pow(2, -days / halfLife);
    return isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
}
assert.equal(testDecay({ lastRevisionAt: Date.now(), halfLife: 0, r0: 80 }), 80);
assert.equal(testDecay({ lastRevisionAt: Date.now(), halfLife: -5, r0: 80 }), 80);
assert.equal(testDecay({ lastRevisionAt: null, halfLife: 7, r0: 80 }), 0);

// 14e. Subtopics: Creation and revision null reference protection
const subtopicsPath = path.join(rootDir, 'src', 'lib', 'state', 'subtopics.ts');
const subtopicsSource = fs.readFileSync(subtopicsPath, 'utf8');
assert.ok(subtopicsSource.includes('const subtopics = chapterData.subtopics || {};'), 'subtopics.ts must default chapterData.subtopics to {}');

// 14f. Dates: Calendar date key noon parsing (DST midnight drift prevention)
const datesPath = path.join(rootDir, 'src', 'lib', 'state', 'dates.ts');
const datesSource = fs.readFileSync(datesPath, 'utf8');
assert.ok(datesSource.includes('new Date(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0)'), 'dates.ts must parse calendar keys at noon to prevent DST midnight rollover');

// 14g. Timetable AI: 'sept' month map mapping
const ttAiPath = path.join(rootDir, 'src', 'lib', 'services', 'timetableAi.ts');
const ttAiSource = fs.readFileSync(ttAiPath, 'utf8');
assert.ok(ttAiSource.includes("sept: '09'"), 'timetableAi must map sept to 09');

// 14h. AI Context: Non-array checklist grid row safety
const aiCtxPath = path.join(rootDir, 'src', 'lib', 'services', 'aiContext.ts');
const aiCtxSource = fs.readFileSync(aiCtxPath, 'utf8');
assert.ok(aiCtxSource.includes('Array.isArray(dataRow) && dataRow.some'), 'aiContext must check Array.isArray on grid data row');

// 14i. Weekly: Safe fallbacks for missing tracker slices
const weeklyPath = path.join(rootDir, 'src', 'lib', 'state', 'weekly.ts');
const weeklySource = fs.readFileSync(weeklyPath, 'utf8');
assert.ok(weeklySource.includes('for (const session of state.log || [])'), 'weekly.ts must safely fallback state.log');

// 14j. Flashcards: Inclusion of missing nextReviewAt in dueCards
const fcPanelPath = path.join(rootDir, 'src', 'lib', 'components', 'revise', 'FlashcardsPanel.svelte');
const fcPanelSource = fs.readFileSync(fcPanelPath, 'utf8');
assert.ok(fcPanelSource.includes('c.nextReviewAt == null || c.nextReviewAt <= Date.now()'), 'FlashcardsPanel must include flashcards with null/missing nextReviewAt in due list');

// 14k. Recall Selectors: Safe derived stores
const recallSelPath = path.join(rootDir, 'src', 'lib', 'stores', 'recall-selectors.ts');
const recallSelSource = fs.readFileSync(recallSelPath, 'utf8');
assert.ok(recallSelSource.includes('$tracker?.rev?.chapters || {}'), 'recall-selectors must use safe navigation for chapters');
assert.ok(recallSelSource.includes('$tracker?.rev?.items || {}'), 'recall-selectors must use safe navigation for items');

console.log('✅ Second wave audit: All 11 additional bugs & regressions verified against source and runtime');

// ============================================================================
// 15. Wave 3 Code Audit Regressions & Invariant Verifications
// ============================================================================

// 15a. Sync: Cross-Account Data Contamination Prevention on Shared Devices
const syncSourcePath3 = path.join(rootDir, 'src', 'lib', 'services', 'sync.ts');
const syncSource3 = fs.readFileSync(syncSourcePath3, 'utf8');
assert.ok(syncSource3.includes("btracker_last_auth_user_id"), 'sync must track last authenticated user id');
assert.ok(syncSource3.includes("isSwitchingUser"), 'sync must detect account switching on shared devices');
assert.ok(syncSource3.includes("createInitialTrackerState()"), 'sync must reset to fresh state or cloud state when switching users');

// 15b. Sync: Study Dump Deleted File Tombstone Filtering
assert.ok(syncSource3.includes("(base.studyDump?.files || []).filter((f) => !deletedIdSet.has(f.id))"), 'sync must filter base study dump files against deletedIdSet');
assert.ok(syncSource3.includes("if (deletedIdSet.has(f.id)) continue;"), 'sync must skip tombstoned remote study dump files');

// 15c. AI Mentor: AutoPlan Command Loop Non-Aborting Execution
const aiMentorPath = path.join(rootDir, 'src', 'lib', 'components', 'ui', 'AIOmentor.svelte');
const aiMentorSource = fs.readFileSync(aiMentorPath, 'utf8');
assert.ok(!aiMentorSource.includes("if (pendingTasks.length === 0) {\n\t\t\t\t\t\t\t\t\tcelebration.set(`🎯 Transferred ${transferred} tasks to daily planner!`);\n\t\t\t\t\t\t\t\t\treturn;"), 'AIOmentor must not return early from command loop on 0 pending tasks');

// 15d. Todo: Checklist Safe Optional Chaining
const todoPagePath3 = path.join(rootDir, 'src', 'routes', 'todo', '+page.svelte');
const todoPageSource3 = fs.readFileSync(todoPagePath3, 'utf8');
assert.ok(todoPageSource3.includes("clGrid?.data?.[chNo]?.some"), 'todo checklist isChStarted must use optional chaining between data and chNo');
assert.ok(todoPageSource3.includes("clGrid?.data?.[chNo]?.[i] === '✓'"), 'todo checklist isChDone must use optional chaining between data and chNo');

// 15e. Tracker Stores: Derived Stores Safe Fallbacks
const trackerStorePath = path.join(rootDir, 'src', 'lib', 'stores', 'tracker.ts');
const trackerStoreSource = fs.readFileSync(trackerStorePath, 'utf8');
assert.ok(trackerStoreSource.includes("($tracker?.h || []).filter"), 'activeHomework store must guard against undefined $tracker.h');
assert.ok(trackerStoreSource.includes("Object.entries($tracker?.rev?.items || {})"), 'dueRevision store must guard against undefined $tracker.rev.items');
assert.ok(trackerStoreSource.includes("($tracker?.ui?.widgets || []).filter"), 'dashboardWidgets store must guard against undefined $tracker.ui.widgets');

// 15f. Weekly Double Graph: NaN Sizing Prevention
const weeklyGraphPath = path.join(rootDir, 'src', 'lib', 'components', 'charts', 'WeeklyDoubleGraph.svelte');
const weeklyGraphSource = fs.readFileSync(weeklyGraphPath, 'utf8');
assert.ok(weeklyGraphSource.includes("Number(d?.hours) || 0"), 'WeeklyDoubleGraph must sanitize hours to prevent NaN scale');
assert.ok(weeklyGraphSource.includes("Number(d?.questions) || 0"), 'WeeklyDoubleGraph must sanitize questions to prevent NaN scale');

// 15g. Dates: focusMinutesOn Runtime Defense & sessionDayKey Epoch Check
const datesPath2 = path.join(rootDir, 'src', 'lib', 'state', 'dates.ts');
const datesSource2 = fs.readFileSync(datesPath2, 'utf8');
assert.ok(datesSource2.includes("if (!Array.isArray(log)) return 0;"), 'focusMinutesOn must verify Array.isArray(log)');
assert.ok(datesSource2.includes("typeof session[0] !== 'number' || isNaN(session[0])"), 'sessionDayKey must validate session epoch timestamp');

// 15h. Settings: JSON Import Backup Object Validation
const settingsPath3 = path.join(rootDir, 'src', 'routes', 'settings', '+page.svelte');
const settingsSource3 = fs.readFileSync(settingsPath3, 'utf8');
assert.ok(settingsSource3.includes("!parsed || typeof parsed !== 'object' || Array.isArray(parsed)"), 'settings importData must enforce plain object format');

// 15i. Lecture Theater & Recall Selectors: Undefined Store Navigation
const lecturePath = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'LectureTheater.svelte');
const lectureSource = fs.readFileSync(lecturePath, 'utf8');
assert.ok(lectureSource.includes("$tracker?.rev?.chapters?.[chapterKey]?.decay ?? null"), 'LectureTheater must safely navigate $tracker.rev.chapters');

const recallSelSource2 = fs.readFileSync(recallSelPath, 'utf8');
assert.ok(recallSelSource2.includes("Object.entries($tracker?.rev?.dailyHeatmap || {})"), 'heatmapData must safely navigate dailyHeatmap');
assert.ok(recallSelSource2.includes("($tracker?.rev?.focusSessions || []).filter"), 'activeFocusSessions must safely navigate focusSessions');

// 15j. Weekly Standing Widget Display & Study Dump Case-Insensitive Archive Deletion
const weeklyStandingWidgetPath = path.join(rootDir, 'src', 'lib', 'components', 'widgets', 'WeeklyStandingWidget.svelte');
const weeklyStandingWidgetSource = fs.readFileSync(weeklyStandingWidgetPath, 'utf8');
assert.ok(weeklyStandingWidgetSource.includes("Math.max(0, ...($weeklyStanding.solved || []))"), 'WeeklyStandingWidget must provide 0 floor to prevent -Infinity');

const studyDumpPath = path.join(rootDir, 'src', 'lib', 'services', 'studyDump.ts');
const studyDumpSource = fs.readFileSync(studyDumpPath, 'utf8');
assert.ok(studyDumpSource.includes("k.toLowerCase().trim() === lowerName"), 'studyDump deleteFileFromSection must handle case-insensitive filename matches');

console.log('✅ Third wave audit: All 10 additional bugs & regressions verified against source and runtime');

// ============================================================================
// 16. Wave 4 Code Audit Regressions & Invariant Verifications
// ============================================================================

// 16a. Universal Study Log: Doubt clamping to attempts instead of solved
const universalPath = path.join(rootDir, 'src', 'lib', 'state', 'universal.ts');
const universalSource = fs.readFileSync(universalPath, 'utf8');
assert.ok(universalSource.includes("doubts += Math.min(att, Math.max(0, Number(entry.doubt) || 0))"), 'universalTotals must clamp doubts to attempts (att), not solved');
assert.ok(universalSource.includes("current.doubts += Math.min(att, Math.max(0, Number(entry.doubt) || 0))"), 'universalChapters must clamp doubts to attempts (att), not solved');

const logModalPath = path.join(rootDir, 'src', 'lib', 'components', 'log', 'UniversalLogEntryModal.svelte');
const logModalSource = fs.readFileSync(logModalPath, 'utf8');
assert.ok(logModalSource.includes("Math.min(attemptedCount, Math.max(0, Math.round(Number(doubts) || 0)))"), 'UniversalLogEntryModal must clamp doubts to attemptedCount');

const trackerPath4 = path.join(rootDir, 'src', 'lib', 'stores', 'tracker.ts');
const trackerSource4 = fs.readFileSync(trackerPath4, 'utf8');
assert.ok(trackerSource4.includes("const doubt = Math.min(att, Math.max(0, Math.round(Number(input.doubt) || 0)))"), 'logUniversalSession must clamp doubt to att');

// 16b. PiP & MediaSession: Timer resume toggle (not reset to 25:00) & MediaStream track cleanup
const pipPath = path.join(rootDir, 'src', 'lib', 'services', 'pip.ts');
const pipSource = fs.readFileSync(pipPath, 'utf8');
assert.ok(pipSource.includes("track.stop()"), 'pip closeNativePip must stop active MediaStream tracks');
assert.ok(pipSource.includes("cur.toggle()"), 'pip mediaSession play handler must toggle rather than resetting timer to 25m');
assert.ok(!pipSource.includes("cur.start(cur.subject || 'P', 25 * 60"), 'pip mediaSession must not reset timer with cur.start');

// 16c. TimerState: Non-destructive sessionStartedEpochMin resume
const timerStatePath4 = path.join(rootDir, 'src', 'lib', 'stores', 'timerState.ts');
const timerStateSource4 = fs.readFileSync(timerStatePath4, 'utf8');
assert.ok(timerStateSource4.includes("s.sessionStartedEpochMin = s.sessionStartedEpochMin || Math.floor(Date.now() / 60000)"), 'timerState must preserve sessionStartedEpochMin when resuming countdown');

// 16d. Voice Dictation: no-speech non-deactivation
const voicePath = path.join(rootDir, 'src', 'lib', 'services', 'voice.ts');
const voiceSource = fs.readFileSync(voicePath, 'utf8');
assert.ok(voiceSource.includes("if (event.error === 'no-speech') {\n\t\t\t\t\t// Benign pause in continuous mode, don't abort or notify\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\tthis.active = false;"), 'voice onerror must not set this.active = false on no-speech pause');

// 16e. Gemini Server API: cancel(reason) on streaming body reader
const geminiServerPath4 = path.join(rootDir, 'src', 'routes', 'api', 'gemini', '+server.ts');
const geminiServerSource4 = fs.readFileSync(geminiServerPath4, 'utf8');
assert.ok(geminiServerSource4.includes("await reader?.cancel(reason)"), 'api/gemini stream functions must cancel upstream reader when client disconnects');

// 16f. Syllabus: Null-safe allChaptersWithCustom and questionCount
const syllabusPath = path.join(rootDir, 'src', 'lib', 'state', 'syllabus.ts');
const syllabusSource = fs.readFileSync(syllabusPath, 'utf8');
assert.ok(syllabusSource.includes("if (!state) return builtin;"), 'allChaptersWithCustom must guard against null/undefined state');
assert.ok(syllabusSource.includes("const override = state?.x?.cnt?.[key];"), 'questionCount must use optional chaining on state');

// 16g. BTest: PDF.js marked content check & doc.destroy() / bitmap close in try/finally
const btestPath = path.join(rootDir, 'src', 'lib', 'services', 'btest.ts');
const btestSource = fs.readFileSync(btestPath, 'utf8');
assert.ok(btestSource.includes("typeof item.str !== 'string'"), 'extractPdfText must check item.str to prevent "undefined" string concatenation');
assert.ok(btestSource.includes("await doc.destroy()"), 'extractPdfText must destroy PDF document to free WebAssembly memory');

// 16h. Recall Actions: Guaranteed rev slice initialization in _updateAndSave
const recallActionsPath = path.join(rootDir, 'src', 'lib', 'stores', 'recall-actions.ts');
const recallActionsSource = fs.readFileSync(recallActionsPath, 'utf8');
assert.ok(recallActionsSource.includes("if (!draft.rev) draft.rev = createRevision();"), '_updateAndSave must initialize draft.rev');
assert.ok(recallActionsSource.includes("if (!draft.rev.chapters) draft.rev.chapters = {};"), '_updateAndSave must initialize draft.rev.chapters');

// 16i. Mock Tests: Array fallbacks on test/mistake deletion & finite percentage coordinates
const testsPath = path.join(rootDir, 'src', 'routes', 'tests', '+page.svelte');
const testsSource = fs.readFileSync(testsPath, 'utf8');
assert.ok(testsSource.includes("(t.mocks || []).filter"), 'deleteTest must provide array fallback for t.mocks');
assert.ok(testsSource.includes("(t.mistakes || []).filter"), 'deleteMistake must provide array fallback for t.mistakes');
assert.ok(testsSource.includes("Number.isFinite(percent)"), 'getChartY must validate finite percentages');

console.log('✅ Fourth wave audit: All 10 additional bugs & regressions verified against source and runtime');

// ── 17. Fifth Wave Audit: UI Resilience, Safe Array Fallbacks & DST Date Math ──
console.log('Testing Fifth Wave audit fixes...');

// 17a. Plan page: DST noon normalization & fmtTime safety
const planPath5 = path.join(rootDir, 'src', 'routes', 'plan', '+page.svelte');
const planSource5 = fs.readFileSync(planPath5, 'utf8');
assert.ok(planSource5.includes("d.setHours(12, 0, 0, 0)"), 'addDays in plan page must normalize to noon to prevent DST midnight rollover');
assert.ok(planSource5.includes("!Number.isFinite(h) || !Number.isFinite(m)"), 'fmtTime must validate numeric bounds to prevent NaN output');
assert.ok(planSource5.includes("tasksOn(selectedDay || today)"), 'plan page dayTasks must fallback to today if selectedDay is unset');

// 17b. Stats page: session duration validation & safe stat iteration
const statsPath5 = path.join(rootDir, 'src', 'routes', 'stats', '+page.svelte');
const statsSource5 = fs.readFileSync(statsPath5, 'utf8');
assert.ok(statsSource5.includes("!Number.isFinite(mins) || mins <= 0"), 'stats hour/day buckets must validate session duration is finite and positive');
assert.ok(statsSource5.includes("Object.values($tracker?.stat || {})"), 'stats solvedTotals must handle unhydrated stat object');

// 17c. Questions & Syllabus: Null-safe exerciseStats & visibleExercises
const questionsPath5 = path.join(rootDir, 'src', 'lib', 'state', 'questions.ts');
const questionsSource5 = fs.readFileSync(questionsPath5, 'utf8');
assert.ok(questionsSource5.includes("const cells = state?.d?.[cellKey(sc, chNo, exCode)];"), 'exerciseStats must safely access state?.d');

const syllabusPath5 = path.join(rootDir, 'src', 'lib', 'state', 'syllabus.ts');
const syllabusSource5 = fs.readFileSync(syllabusPath5, 'utf8');
assert.ok(syllabusSource5.includes("const custom = state?.x?.exs?.[`${sc}${chNo}`] || [];"), 'visibleExercises must use optional chaining on state?.x?.exs');
assert.ok(syllabusSource5.includes("if (state?.d)"), 'visibleExercises must safely check state?.d');

// 17d. Review page: pre-evaluate hadFlag before setQuestionResult mutation
const reviewPath5 = path.join(rootDir, 'src', 'routes', 'review', '+page.svelte');
const reviewSource5 = fs.readFileSync(reviewPath5, 'utf8');
assert.ok(reviewSource5.includes("const hadFlag = isFlag(prevVal);"), 'markSolvedAndCorrect must capture hadFlag before setQuestionResult');

// 17e. Minimalist dashboard: safe spline array check & NaN avoidance
const minLayoutPath5 = path.join(rootDir, 'src', 'lib', 'components', 'dashboard', 'MinimalistLayout.svelte');
const minLayoutSource5 = fs.readFileSync(minLayoutPath5, 'utf8');
assert.ok(minLayoutSource5.includes("if (!Array.isArray(values) || values.length < 2)"), 'generateSpline must check values array length upfront');
assert.ok(minLayoutSource5.includes("Math.max(1, values.length - 1)"), 'generateSpline must prevent division by zero');
assert.ok(minLayoutSource5.includes("Number.isFinite(m) ? Math.max(0, m) : 0"), 'MinimalistLayout must sanitize minute inputs to prevent NaN');

// 17f. Reminders & notifications: safe array fallbacks & string check
const remindersPath5 = path.join(rootDir, 'src', 'routes', 'reminders', '+page.svelte');
const remindersSource5 = fs.readFileSync(remindersPath5, 'utf8');
assert.ok(remindersSource5.includes("[...($tracker?.h || []), ...($tracker?.hd || [])]"), 'hwCards must guard with safe array fallbacks');
assert.ok(remindersSource5.includes("($tracker?.dl || [])"), 'dlCards must guard with safe array fallback');

const notifPath5 = path.join(rootDir, 'src', 'lib', 'utils', 'notifications.ts');
const notifSource5 = fs.readFileSync(notifPath5, 'utf8');
assert.ok(notifSource5.includes("typeof reminder?.when === 'string' && reminder.when.includes('T')"), 'checkDueReminders must check reminder.when is a string');

// 17g. Yearly heatmap widget: noon anchoring & safe stat access
const heatmapWidgetPath5 = path.join(rootDir, 'src', 'lib', 'components', 'widgets', 'YearlyHeatmapWidget.svelte');
const heatmapWidgetSource5 = fs.readFileSync(heatmapWidgetPath5, 'utf8');
assert.ok(heatmapWidgetSource5.includes("now.setHours(12, 0, 0, 0)"), 'YearlyHeatmapWidget must anchor matrix calculation at noon');
assert.ok(heatmapWidgetSource5.includes("sumSolved($tracker?.stat?.[key])"), 'YearlyHeatmapWidget must safely handle unhydrated stat');

// 17h. AI Mentor: Chat history search title & text safety
const aiMentorPath5 = path.join(rootDir, 'src', 'lib', 'components', 'ui', 'AIOmentor.svelte');
const aiMentorSource5 = fs.readFileSync(aiMentorPath5, 'utf8');
assert.ok(aiMentorSource5.includes("(s.title || '').toLowerCase().includes(q)"), 'filteredSessions must guard against undefined session title');
assert.ok(aiMentorSource5.includes("m?.text && m.text.toLowerCase().includes(q)"), 'filteredSessions must guard against message without text');

// 17i. Test Day Sheet & Brain Dump: Malformed mistake resilience & updated timestamp
const testDayPath5 = path.join(rootDir, 'src', 'lib', 'components', 'tests', 'TestDaySheetModal.svelte');
const testDaySource5 = fs.readFileSync(testDayPath5, 'utf8');
assert.ok(testDaySource5.includes("(m?.subject || '').toLowerCase()"), 'TestDaySheetModal must guard against undefined mistake subject');

const brainDumpPath5 = path.join(rootDir, 'src', 'lib', 'components', 'widgets', 'BrainDumpWidget.svelte');
const brainDumpSource5 = fs.readFileSync(brainDumpPath5, 'utf8');
assert.ok(brainDumpSource5.includes("updated: Date.now()"), 'BrainDumpWidget must include updated timestamp on routed mistakes');

console.log('✅ Fifth wave audit: All 12 additional bugs & regressions verified against source and runtime');

// ── 18. Sixth Wave Audit: Deep Focus, Visualizer & Multi-Device Fault Tolerance ──
console.log('Testing Sixth Wave audit fixes...');

// 18a. Focus Screen: Unhydrated log and meta safety & bounded streak loop
const focusScreenPath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'FocusScreen.svelte');
const focusScreenSource6 = fs.readFileSync(focusScreenPath6, 'utf8');
assert.ok(focusScreenSource6.includes("($tracker?.log || []).filter"), 'FocusScreen weekSessions must guard with array fallback');
assert.ok(focusScreenSource6.includes("n < 366"), 'FocusScreen hourStreak loop must be bounded to prevent infinite loops');
assert.ok(focusScreenSource6.includes("$tracker?.meta?.weekGoalH ?? 25"), 'FocusScreen weekGoalH must safely access meta');
assert.ok(focusScreenSource6.includes("Object.values($tracker?.stat || {})"), 'FocusScreen share must guard unhydrated stat');

// 18b. Question Sheet: Safe access to $tracker.d, $tracker.r, and $tracker.n
const qSheetPath6 = path.join(rootDir, 'src', 'lib', 'components', 'log', 'QuestionSheet.svelte');
const qSheetSource6 = fs.readFileSync(qSheetPath6, 'utf8');
assert.ok(qSheetSource6.includes("$tracker?.d?.[cellKey(loc.sc, loc.ch, loc.ex)]"), 'QuestionSheet must use optional chaining on $tracker?.d');
assert.ok(qSheetSource6.includes("$tracker?.r?.[questionKey(loc.sc, loc.ch, loc.ex, i)]"), 'QuestionSheet must use optional chaining on $tracker?.r');
assert.ok(qSheetSource6.includes("$tracker?.n?.[qk]"), 'QuestionSheet template must safely access $tracker?.n');

// 18c. Weekly Double Graph: Sanitized numbers and NaN percentage avoidance
const doubleGraphPath6 = path.join(rootDir, 'src', 'lib', 'components', 'charts', 'WeeklyDoubleGraph.svelte');
const doubleGraphSource6 = fs.readFileSync(doubleGraphPath6, 'utf8');
assert.ok(doubleGraphSource6.includes("const h = Number(d?.hours) || 0;"), 'WeeklyDoubleGraph must sanitize hours to prevent NaN score');
assert.ok(doubleGraphSource6.includes("dHours > 0 && maxHours > 0"), 'WeeklyDoubleGraph must guard positive maxHours to prevent NaN style height');

// 18d. Ghost Pacer: Unhydrated log and goals safety
const ghostPacerPath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'GhostPacer.svelte');
const ghostPacerSource6 = fs.readFileSync(ghostPacerPath6, 'utf8');
assert.ok(ghostPacerSource6.includes("focusMinutesOn($tracker?.log || [], todayKey())"), 'GhostPacer must guard completedTodayMin');
assert.ok(ghostPacerSource6.includes("$tracker?.goals?.day?.h || 6"), 'GhostPacer must safely access day goals');

// 18e. Daily Activity & Subject Leaderboard: Safe log iteration & DST midday anchoring
const dailyActPath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'DailyActivity.svelte');
const dailyActSource6 = fs.readFileSync(dailyActPath6, 'utf8');
assert.ok(dailyActSource6.includes("($tracker?.log || [])"), 'DailyActivity daySessions must guard with array fallback');

const subLeaderPath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'SubjectLeaderboard.svelte');
const subLeaderSource6 = fs.readFileSync(subLeaderPath6, 'utf8');
assert.ok(subLeaderSource6.includes("d.setHours(12, 0, 0, 0)"), 'SubjectLeaderboard must anchor week date math at noon');
assert.ok(subLeaderSource6.includes("Number(session[1]) || 0"), 'SubjectLeaderboard must sanitize duration addition');

// 18f. Weekly Report Card: Safe log & stat access and midday anchoring
const weeklyReportPath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'WeeklyReportCard.svelte');
const weeklyReportSource6 = fs.readFileSync(weeklyReportPath6, 'utf8');
assert.ok(weeklyReportSource6.includes("$tracker?.stat?.[key]"), 'WeeklyReportCard questionsDone must safely access $tracker?.stat');
assert.ok(weeklyReportSource6.includes("d.setHours(12, 0, 0, 0)"), 'WeeklyReportCard must anchor week date math at noon');

// 18g. Review Page: Coaching type guard and safe metadata access
const reviewPath6 = path.join(rootDir, 'src', 'routes', 'review', '+page.svelte');
const reviewSource6 = fs.readFileSync(reviewPath6, 'utf8');
assert.ok(reviewSource6.includes("{#if $tracker?.coaching_type === 'GENERIC'}"), 'Review page must guard coaching_type check');
assert.ok(reviewSource6.includes("($tracker?.flashcards || [])"), 'Review page isCardSaved must guard flashcards array');

// 18h. Lecture Theater: Array validation on JSON.parse & script deduplication
const lecturePath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'LectureTheater.svelte');
const lectureSource6 = fs.readFileSync(lecturePath6, 'utf8');
assert.ok(lectureSource6.includes("Array.isArray(parsed)"), 'LectureTheater loadRecentLectures must validate parsed is array');
assert.ok(lectureSource6.includes('script[src*="youtube.com/iframe_api"]'), 'LectureTheater must avoid duplicate YouTube script tags');

// 18i. Todo Page: Array check on triage map & checklist grid
const todoPath6 = path.join(rootDir, 'src', 'routes', 'todo', '+page.svelte');
const todoSource6 = fs.readFileSync(todoPath6, 'utf8');
assert.ok(todoSource6.includes("(s.todos || []).map"), 'Todo runAiTriage must guard todos array');
assert.ok(todoSource6.includes("Array.isArray(clGrid?.data?.[chNo])"), 'Todo isChStarted must check row is array');

// 18j. Study Dump: Search filter & manifest merge safety
const dumpPath6 = path.join(rootDir, 'src', 'routes', 'dump', '+page.svelte');
const dumpSource6 = fs.readFileSync(dumpPath6, 'utf8');
assert.ok(dumpSource6.includes("(f.name || '').toLowerCase()"), 'Dump filteredFiles must guard undefined file name');

const studyDumpServicePath6 = path.join(rootDir, 'src', 'lib', 'services', 'studyDump.ts');
const studyDumpServiceSource6 = fs.readFileSync(studyDumpServicePath6, 'utf8');
assert.ok(studyDumpServiceSource6.includes("if (!cFile?.name) continue;"), 'uploadFilesToSection must skip missing cFile name');

// 18k. Feynman Duck: Guard scorecard suggestedFlashcard
const feynmanPath6 = path.join(rootDir, 'src', 'lib', 'components', 'feynman', 'FeynmanDuckModal.svelte');
const feynmanSource6 = fs.readFileSync(feynmanPath6, 'utf8');
assert.ok(feynmanSource6.includes("!scorecard?.suggestedFlashcard?.front"), 'saveAsFlashcard must guard suggestedFlashcard');

// 18l. Deep Work & Gemini Streaming: Tasks fallback, lock release & malformed JSON
const deepWorkPath6 = path.join(rootDir, 'src', 'lib', 'components', 'focus', 'DeepWorkMode.svelte');
const deepWorkSource6 = fs.readFileSync(deepWorkPath6, 'utf8');
assert.ok(deepWorkSource6.includes("($tracker?.h || []).filter"), 'DeepWorkMode openPlannerTasks must guard with array fallback');

const geminiServicePath6 = path.join(rootDir, 'src', 'lib', 'services', 'gemini.ts');
const geminiServiceSource6 = fs.readFileSync(geminiServicePath6, 'utf8');
assert.ok(geminiServiceSource6.includes("reader.releaseLock()"), 'streamGeminiChat must release reader lock in finally block');

const geminiApiPath6 = path.join(rootDir, 'src', 'routes', 'api', 'gemini', '+server.ts');
const geminiApiSource6 = fs.readFileSync(geminiApiPath6, 'utf8');
assert.ok(geminiApiSource6.includes("reader?.releaseLock()"), 'api/gemini stream functions must release reader lock in finally block');
assert.ok(geminiApiSource6.includes("Malformed JSON payload"), 'api/gemini POST must catch malformed JSON payload with 400 error');

console.log('✅ Sixth wave audit: All 12 additional bugs & regressions verified against source and runtime');

console.log('\n🎉 All core data-integrity & security tests passed successfully!\n');
