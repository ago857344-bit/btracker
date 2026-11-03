import { marked } from 'marked';
// @ts-ignore
import markedKatex from 'marked-katex-extension';

// Configure marked with KaTeX for LaTeX rendering
marked.use(markedKatex({
    throwOnError: false,
    nonStandard: true
}));

export function preprocessMath(text: string): string {
    if (!text) return '';
    let processed = text;
    
    // Replace double-escaped block math: \\[ ... \\] -> $$ ... $$
    processed = processed.replace(/\\\\\[([\s\S]*?)\\\\\]/g, '\n\n$$$$\n$1\n$$$$\n\n');
    
    // Replace single-escaped block math: \[ ... \] -> $$ ... $$
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '\n\n$$$$\n$1\n$$$$\n\n');
    
    // Replace double-escaped inline math: \\( ... \\) -> $ ... $
    processed = processed.replace(/\\\\\(([\s\S]*?)\\\\\)/g, '$$$1$$');
    
    // Replace single-escaped inline math: \( ... \) -> $ ... $
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

    // Fix escaped underscores inside inline math tags non-greedily: $\int\_0^\pi$ -> $\int_0^\pi$
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_, math) => `$${math.replace(/\\_/g, '_')}$`);

    return processed;
}

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

export function sanitizeHtml(html: string): string {
    if (!html) return '';
    let clean = html;

    // 1. Remove dangerous tag blocks and self-closing elements (including svg, style, base, applet)
    const blockRegex = new RegExp(`<\\s*(?:${DANGEROUS_TAGS})\\b[\\s\\S]*?(?:<\\/\\s*(?:${DANGEROUS_TAGS})\\s*>|\\/>)`, 'gi');
    const openOrCloseRegex = new RegExp(`<\\/?\\s*(?:${DANGEROUS_TAGS})\\b[^>]*>`, 'gi');
    clean = clean.replace(blockRegex, '');
    clean = clean.replace(openOrCloseRegex, '');

    // 2. Remove inline event handler attributes (e.g., onclick="...", onerror=...) and srcdoc/formaction
    // Supports both whitespace and slash delimiters (e.g. <img/onerror=alert(1)>)
    clean = clean.replace(/[\s/]+(?:on[a-z0-9_-]+|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+)/gi, ' ');

    // 3. Neutralize dangerous protocols (javascript:, vbscript:, non-image data:) in href, src, xlink:href, action
    // Accounts for entity encoding, control character injection, and whitespace bypasses
    clean = clean.replace(/([\s/]+(?:href|src|xlink:href|action)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^>\s]+))/gi, (match, prefix, q1, q2, bare) => {
        const rawVal = q1 ?? q2 ?? bare ?? '';
        if (isDangerousUri(rawVal)) {
            return `${prefix}"#"`;
        }
        return match;
    });

    return clean;
}

export const renderMarkdown = async (text: string): Promise<string> => {
    if (!text) return '';
    const parsed = await marked.parse(preprocessMath(text));
    return sanitizeHtml(parsed as string);
};

export const renderMarkdownSync = (text: string): string => {
    if (!text) return '';
    const parsed = marked.parse(preprocessMath(text)) as string;
    return sanitizeHtml(parsed);
};

export { marked };
