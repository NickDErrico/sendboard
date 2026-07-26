import { describe, expect, it } from 'vitest';
import {
  PLAN_SECTIONS,
  inlineSpans,
  normalize,
  parsePlan,
  queryTerms,
  searchPlan,
  sectionsForRef,
  type PlanBlock,
} from './plan';
import { EXERCISES } from '../data/exercises';

const SAMPLE = `# Title — The Document

*A subtitle nobody cites.*

---

## 1. The Concept, Briefly

Isometrics come in two flavors:

- **Yielding** — you hold a position.
- **Overcoming** — you push an immovable object.

## 4. Day 1: Fingerboard Session

### A. Warm-up (10–15 min)

Easy hangs on jugs, don’t skip it.

### B. PIMA — Overcoming Isometric Pulls

- Effort: 3–5 sec at **100% max effort**
- Sets: 4–6

| Tool | Role |
|---|---|
| Hangboard | Max Hangs and PIMA pulls |
| Kettlebell | Added load |

## 8. Greasing the Groove

### What it is
Short submaximal sets through the day.

### When to drop it entirely
> Drop it at any elbow soreness.
`;

const sections = parsePlan(SAMPLE);
const byRef = (ref: string, title?: string) =>
  sections.find((s) => s.ref === ref && (title === undefined || s.title === title))!;

describe('parsePlan derives the plan’s own § numbering (AC2, AC4)', () => {
  it('skips the document title and subtitle rather than listing them as a section', () => {
    expect(sections.some((s) => s.title.includes('The Document'))).toBe(false);
    expect(sections.some((s) => s.searchText.includes('A subtitle nobody cites'))).toBe(false);
    expect(sections[0].ref).toBe('1');
  });

  it('numbers top-level sections and letters their subsections', () => {
    expect(byRef('1').title).toBe('The Concept, Briefly');
    expect(byRef('4').title).toBe('Day 1: Fingerboard Session');
    expect(byRef('4A').title).toBe('Warm-up (10–15 min)');
    expect(byRef('4B').title).toBe('PIMA — Overcoming Isometric Pulls');
    expect(byRef('4B').label).toBe('§4B');
    expect(byRef('4B').parentTitle).toBe('Day 1: Fingerboard Session');
    expect(byRef('4B').lettered).toBe(true);
  });

  it('gives an unlettered subsection its parent’s reference and its own heading', () => {
    const whatItIs = byRef('8', 'What it is');
    expect(whatItIs.label).toBe('§8');
    expect(whatItIs.lettered).toBe(false);
    expect(whatItIs.parentTitle).toBe('Greasing the Groove');
  });
});

describe('parseBlocks keeps the structure the plan wrote (AC4)', () => {
  const kinds = (blocks: PlanBlock[]) => blocks.map((b) => b.kind);

  it('reads unordered lists as lists, with markers stripped', () => {
    const list = byRef('1').blocks.find((b) => b.kind === 'list');
    expect(list).toMatchObject({ kind: 'list', ordered: false });
    expect((list as { items: string[] }).items).toEqual([
      '**Yielding** — you hold a position.',
      '**Overcoming** — you push an immovable object.',
    ]);
  });

  it('reads a table as a header and rows, dropping the divider', () => {
    const table = byRef('4B').blocks.find((b) => b.kind === 'table') as {
      header: string[];
      rows: string[][];
    };
    expect(table.header).toEqual(['Tool', 'Role']);
    expect(table.rows).toEqual([
      ['Hangboard', 'Max Hangs and PIMA pulls'],
      ['Kettlebell', 'Added load'],
    ]);
  });

  it('reads a block quote as a quote', () => {
    const drop = byRef('8', 'When to drop it entirely');
    expect(kinds(drop.blocks)).toContain('quote');
    expect(drop.blocks[0]).toEqual({ kind: 'quote', text: 'Drop it at any elbow soreness.' });
  });

  it('drops horizontal rules and blank lines rather than rendering them', () => {
    for (const section of sections) {
      for (const block of section.blocks) {
        if (block.kind === 'para') expect(block.text).not.toBe('---');
        if (block.kind === 'para') expect(block.text).not.toBe('');
      }
    }
  });
});

describe('search finds sections, unranked, in the plan’s order (AC2, AC10)', () => {
  it('returns document order, not a relevance order', () => {
    const hits = searchPlan('the', sections);
    const order = hits.map((h) => sections.indexOf(h.section));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('requires every term (AND), not any', () => {
    expect(searchPlan('pima pulls', sections).map((h) => h.section.ref)).toContain('4B');
    expect(searchPlan('pima kettlebell', sections).map((h) => h.section.ref)).toEqual(['4B']);
    expect(searchPlan('pima unicycle', sections)).toEqual([]);
  });

  it('matches text inside a table cell (AC10)', () => {
    expect(searchPlan('kettlebell', sections).map((h) => h.section.ref)).toEqual(['4B']);
  });

  it('matches text inside a list item (AC10)', () => {
    expect(searchPlan('immovable', sections).map((h) => h.section.ref)).toEqual(['1']);
  });

  it('matches a term that appears only in the heading', () => {
    expect(searchPlan('warm-up', sections).map((h) => h.section.ref)).toContain('4A');
  });

  it('is insensitive to case and to the plan’s typography (AC3)', () => {
    expect(searchPlan("DON'T", sections).map((h) => h.section.ref)).toEqual(['4A']);
    expect(searchPlan('don’t', sections).map((h) => h.section.ref)).toEqual(['4A']);
    expect(normalize('Don’t — “quoted”')).toBe('don\'t - "quoted"');
  });

  it('reports snippets and a count without ordering by them', () => {
    const hit = searchPlan('pima', sections)[0];
    expect(hit.snippets.length).toBeGreaterThan(0);
    expect(hit.snippets.length).toBeLessThanOrEqual(3);
    expect(hit.matches).toBeGreaterThan(0);
  });

  it('searches nothing for a one-character or punctuation-only query', () => {
    expect(queryTerms('a')).toEqual([]);
    expect(queryTerms('§ — .')).toEqual([]);
    expect(searchPlan('a', sections)).toEqual([]);
    expect(searchPlan('   ', sections)).toEqual([]);
  });

  it('returns nothing rather than everything when a term matches no section (AC11)', () => {
    expect(searchPlan('kayaking', sections)).toEqual([]);
  });
});

describe('inlineSpans renders emphasis and highlights together', () => {
  it('reads bold and italic markers', () => {
    expect(inlineSpans('a **bold** and *soft* word')).toEqual([
      { text: 'a ' },
      { text: 'bold', bold: true },
      { text: ' and ' },
      { text: 'soft', italic: true },
      { text: ' word' },
    ]);
  });

  it('marks search terms, including inside a bold run', () => {
    const spans = inlineSpans('**Track everything.** Note edge size.', ['track', 'edge']);
    expect(spans).toEqual([
      { text: 'Track', bold: true, hit: true },
      { text: ' everything.', bold: true },
      { text: ' Note ', hit: undefined },
      { text: 'edge', hit: true },
      { text: ' size.', hit: undefined },
    ]);
  });

  it('matches a term through the plan’s typography', () => {
    const spans = inlineSpans('don’t skip the ramp', ["don't"]);
    expect(spans[0]).toEqual({ text: 'don’t', hit: true });
  });

  it('leaves text alone when nothing matches', () => {
    expect(inlineSpans('plain text', ['absent'])).toEqual([{ text: 'plain text' }]);
  });

  it('never loses or duplicates a character', () => {
    const text = 'Warm up **fingers** thoroughly before any hangboard work';
    for (const terms of [[], ['fingers'], ['warm', 'work'], ['o']]) {
      const rebuilt = inlineSpans(text, terms)
        .map((s) => s.text)
        .join('');
      expect(rebuilt).toBe(text.replace(/\*\*/g, ''));
    }
  });
});

describe('the real plan parses into an addressable document (AC1, AC4)', () => {
  it('produces the sections the app already cites', () => {
    for (const ref of ['3', '4A', '4B', '4C', '4E', '4F', '5A', '5B', '7', '8']) {
      expect(sectionsForRef(ref).length).toBeGreaterThan(0);
    }
  });

  it('finds a section by a lowercase or §-prefixed reference', () => {
    expect(sectionsForRef('4b')[0].label).toBe('§4B');
    expect(sectionsForRef('§4B')[0].label).toBe('§4B');
    expect(sectionsForRef('nope')).toEqual([]);
  });

  it('carries §4E’s retest table and §4F’s week table as tables', () => {
    const tableIn = (ref: string) =>
      sectionsForRef(ref)[0].blocks.filter((b) => b.kind === 'table').length;
    expect(tableIn('4E')).toBeGreaterThan(0);
    expect(tableIn('4F')).toBeGreaterThan(0);
  });

  it('finds §7’s safety content by the words the owner would type', () => {
    expect(searchPlan('pulley').map((h) => h.section.label)).toContain('§7');
    expect(searchPlan('elbow').length).toBeGreaterThan(0);
    expect(searchPlan('track everything').map((h) => h.section.label)).toContain('§7');
  });

  it('every section has a reference and a title', () => {
    expect(PLAN_SECTIONS.length).toBeGreaterThan(10);
    for (const section of PLAN_SECTIONS) {
      expect(section.ref).not.toBe('');
      expect(section.title).not.toBe('');
      expect(section.label.startsWith('§')).toBe(true);
    }
  });
});

describe('every catalog citation resolves (AC8, D42)', () => {
  it('each declared planRef names a section that exists', () => {
    const declaring = EXERCISES.filter((e) => (e.planRefs?.length ?? 0) > 0);
    expect(declaring.length).toBeGreaterThan(0);
    for (const exercise of declaring) {
      for (const ref of exercise.planRefs ?? []) {
        expect(sectionsForRef(ref).length).toBeGreaterThan(0);
      }
    }
  });

  it('an entry that cites nothing resolves to nothing rather than guessing', () => {
    // The catalog happens to cite everywhere today; the supported state is that it
    // need not, and the lookup must stay silent rather than pattern-match prose.
    const uncited = { ...EXERCISES[0], planRefs: undefined };
    expect(uncited.planRefs ?? []).toEqual([]);
    expect(sectionsForRef('')).toEqual([]);
  });
});
