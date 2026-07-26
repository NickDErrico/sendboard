import PLAN_MARKDOWN from '../../docs/training-plan.md?raw';

/**
 * The training plan, in the app (T25, D42).
 *
 * The document is bundled at build time — no fetch, no IndexedDB, no service
 * worker question — so it is available offline and versions with the deploy,
 * exactly as the code-seeded catalog does (D6).
 *
 * **The rule this module exists to keep (D42): the plan is displayed, searched
 * and quoted; it is never parsed for meaning.** Nothing below extracts a
 * duration, a set count, a rest interval or any other training value, and no
 * caller may either — the typed catalog remains the machine-readable source. The
 * one structural fact taken from the text is a `§` reference, which is a heading
 * and not a training variable.
 *
 * Pure and dependency-free, like every other derivation in `lib/`: no markdown
 * library, no search library, and the whole parse is a function of one string.
 */

export type PlanBlock =
  | { kind: 'para'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] };

export interface PlanSection {
  /** "4", "4B", "8" — the plan's own numbering, derived from the heading. */
  ref: string;
  /** "§4B" — the form the catalog's safety notes already cite. */
  label: string;
  /** The heading's own text, with the number and letter stripped. */
  title: string;
  /** The parent section's title, for subsections; null for top-level ones. */
  parentTitle: string | null;
  /** True where the plan numbered the subsection with a letter (§4B) rather than leaving it unlettered (§8's prose headings). */
  lettered: boolean;
  blocks: PlanBlock[];
  /** Heading + body, flattened once at parse time — what search reads. */
  searchText: string;
}

/**
 * Normalised for comparison: lowercased, with the plan's typography folded to
 * ASCII.
 *
 * The document is written with curly apostrophes, em- and en-dashes, so a search
 * for "don't" typed on an iOS keyboard would otherwise miss "don’t" in §7 — a
 * silent no-match on the safety section, which is the worst possible place for
 * one.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-');
}

// ─── Parse ───────────────────────────────────────────────────────────────────

const HEADING = /^(#{1,3})\s+(.*)$/;
// "## 4. Day 1: Fingerboard Session" → number 4, title the rest.
const NUMBERED = /^(\d+)\.\s+(.*)$/;
// "### B. PIMA — Overcoming Isometric Pulls" → letter B, title the rest.
const LETTERED = /^([A-Z])\.\s+(.*)$/;

/**
 * The plan's sections, in document order.
 *
 * The `#` title and its italic subtitle are deliberately not a section: they name
 * the document rather than a part of it, and listing them would put an entry in
 * the browser that nothing ever cites.
 */
export function parsePlan(markdown: string): PlanSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: PlanSection[] = [];
  let current: { ref: string; title: string; parentTitle: string | null; lettered: boolean } | null =
    null;
  let buffer: string[] = [];
  let parentRef = '';
  let parentTitle = '';

  const flush = () => {
    // The buffer is cleared either way: lines belonging to no section — the
    // document's own subtitle, above the first `##` — are dropped rather than
    // carried into whatever section starts next.
    if (current === null) {
      buffer = [];
      return;
    }
    const blocks = parseBlocks(buffer);
    sections.push({
      ref: current.ref,
      label: `§${current.ref}`,
      title: current.title,
      parentTitle: current.parentTitle,
      lettered: current.lettered,
      blocks,
      searchText: [current.title, current.parentTitle ?? '', blocksToText(blocks)].join('\n'),
    });
    buffer = [];
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (!heading) {
      buffer.push(line);
      continue;
    }
    const level = heading[1].length;
    const text = heading[2].trim();

    if (level === 1) {
      // The document title. Everything before the first `##` belongs to it and is
      // dropped rather than shown as a section nobody cites.
      flush();
      current = null;
      buffer = [];
      continue;
    }

    flush();
    const numbered = NUMBERED.exec(text);
    if (level === 2 && numbered) {
      parentRef = numbered[1];
      parentTitle = numbered[2].trim();
      current = { ref: parentRef, title: parentTitle, parentTitle: null, lettered: false };
      continue;
    }
    if (level === 2) {
      // An unnumbered top-level heading: keep it, addressed by its own title.
      parentRef = '';
      parentTitle = text;
      current = { ref: text, title: text, parentTitle: null, lettered: false };
      continue;
    }

    const lettered = LETTERED.exec(text);
    if (lettered) {
      current = {
        ref: `${parentRef}${lettered[1]}`,
        title: lettered[2].trim(),
        parentTitle,
        lettered: true,
      };
      continue;
    }
    // §8's subsections carry no letter. They take their parent's reference rather
    // than being assigned one the plan never wrote (D6).
    current = { ref: parentRef, title: text, parentTitle, lettered: false };
  }
  flush();
  return sections;
}

const TABLE_DIVIDER = /^\|[\s:|-]+\|$/;

/** Markdown block structure, to the extent the plan actually uses it. */
function parseBlocks(lines: string[]): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'para', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed === '---') {
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith('|')) {
      flushParagraph();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        if (!TABLE_DIVIDER.test(row)) rows.push(splitRow(row));
        i += 1;
      }
      i -= 1;
      if (rows.length > 0) blocks.push({ kind: 'table', header: rows[0], rows: rows.slice(1) });
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      blocks.push({ kind: 'quote', text: trimmed.slice(2).trim() });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = numbered !== null && bullet === null;
      const items: string[] = [];
      while (i < lines.length) {
        const item = lines[i].trim();
        const next = ordered ? /^\d+\.\s+(.*)$/.exec(item) : /^[-*]\s+(.*)$/.exec(item);
        if (!next) break;
        items.push(next[1].trim());
        i += 1;
      }
      i -= 1;
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

function splitRow(row: string): string[] {
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Every word in a section's blocks, for search. Tables and lists included (AC10). */
function blocksToText(blocks: PlanBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case 'para':
        case 'quote':
          return block.text;
        case 'list':
          return block.items.join('\n');
        case 'table':
          return [block.header, ...block.rows].map((row) => row.join(' ')).join('\n');
      }
    })
    .join('\n');
}

/** The parsed plan, computed once — the text is a build-time constant. */
export const PLAN_SECTIONS: PlanSection[] = parsePlan(PLAN_MARKDOWN);

/** A section by its `§` reference, or undefined. Case-insensitive: "4b" finds §4B. */
export function sectionsForRef(ref: string): PlanSection[] {
  const wanted = ref.trim().replace(/^§/, '').toLowerCase();
  return PLAN_SECTIONS.filter((s) => s.ref.toLowerCase() === wanted);
}

// ─── Search ──────────────────────────────────────────────────────────────────

/** Terms of at least two characters. A one-character query searches nothing. */
export function queryTerms(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}'-]/gu, ''))
    .filter((term) => term.length >= 2);
}

export interface PlanHit {
  section: PlanSection;
  /** Up to `SNIPPET_LIMIT` lines of the section that contain a term. */
  snippets: string[];
  matches: number;
}

export const SNIPPET_LIMIT = 3;

/**
 * Sections containing every term, in the plan's own order.
 *
 * Deliberately unranked: document order is the plan's order, which is a fact,
 * where a relevance score would be a judgment the app has no business making
 * (D23). `matches` is reported as a count, not used to sort.
 */
export function searchPlan(query: string, sections: PlanSection[] = PLAN_SECTIONS): PlanHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const hits: PlanHit[] = [];
  for (const section of sections) {
    const haystack = normalize(section.searchText);
    if (!terms.every((term) => haystack.includes(term))) continue;

    const snippets: string[] = [];
    let matches = 0;
    for (const line of section.searchText.split('\n')) {
      const normalized = normalize(line);
      const count = terms.reduce((sum, term) => sum + occurrences(normalized, term), 0);
      if (count === 0) continue;
      matches += count;
      if (snippets.length < SNIPPET_LIMIT && line.trim() !== '') snippets.push(line.trim());
    }
    hits.push({ section, snippets, matches });
  }
  return hits;
}

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

// ─── Inline rendering ────────────────────────────────────────────────────────

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** True where this run matched a search term and should be highlighted. */
  hit?: boolean;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

/**
 * One line of plan text as styled runs, with search terms marked.
 *
 * Two concerns in one pass because they overlap: emphasis is markdown syntax and
 * a highlight is a substring, and a term can fall inside a bold run. Emphasis is
 * resolved first, then each run is split on the terms — so `**Track everything.**`
 * searched for "track" renders bold *and* highlighted, rather than one or the
 * other winning.
 */
export function inlineSpans(text: string, terms: string[] = []): InlineSpan[] {
  const styled: InlineSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) styled.push({ text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith('**')) styled.push({ text: token.slice(2, -2), bold: true });
    else if (token.startsWith('`')) styled.push({ text: token.slice(1, -1), bold: true });
    else styled.push({ text: token.slice(1, -1), italic: true });
    last = index + token.length;
  }
  if (last < text.length) styled.push({ text: text.slice(last) });

  if (terms.length === 0) return styled.filter((span) => span.text !== '');
  return styled.flatMap((span) => splitOnTerms(span, terms)).filter((span) => span.text !== '');
}

function splitOnTerms(span: InlineSpan, terms: string[]): InlineSpan[] {
  const haystack = normalize(span.text);
  // Earliest match wins at each position, so overlapping terms cannot produce
  // interleaved fragments.
  const out: InlineSpan[] = [];
  let cursor = 0;
  while (cursor < span.text.length) {
    let bestAt = -1;
    let bestLength = 0;
    for (const term of terms) {
      const at = haystack.indexOf(term, cursor);
      if (at === -1) continue;
      if (bestAt === -1 || at < bestAt || (at === bestAt && term.length > bestLength)) {
        bestAt = at;
        bestLength = term.length;
      }
    }
    if (bestAt === -1) {
      out.push({ ...span, text: span.text.slice(cursor) });
      break;
    }
    if (bestAt > cursor) out.push({ ...span, text: span.text.slice(cursor, bestAt) });
    out.push({ ...span, text: span.text.slice(bestAt, bestAt + bestLength), hit: true });
    cursor = bestAt + bestLength;
  }
  return out;
}
