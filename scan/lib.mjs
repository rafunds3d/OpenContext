/* Pure helpers of the preprint scan (scan.mjs): reading the site's data files, parsing arXiv-style Atom feeds, unpacking
   arXiv source archives, and scoring a preprint against the problem entries. Nothing here touches the network, so that
   test.mjs can exercise all of it offline.

   The scan never decides that someone used OpenContext. It ranks preprints by how much they overlap with what is
   distinctive about each entry, sets aside those that acknowledge the database, and lists the evidence for each remaining
   candidate so that a moderator can judge it. */

import { gunzipSync } from 'node:zlib';

/* ---------- the site's data ---------- */

/* Evaluate a data file the way the browser does: tex`…` is String.raw, and the file declares top-level consts. */
export function loadData(src, names) {
  const ret = names.map(n => `${n}: typeof ${n} !== "undefined" ? ${n} : null`).join(', ');
  return new Function('tex', `${src}\nreturn { ${ret} };`)(String.raw);
}

/* A problem's 'posed' date, else its earliest dated history entry, else the day the database went live (as js/lib.js). */
export function posedOn(p, started) {
  const h = (p.history || []).filter(x => x.date);
  return h.filter(x => x.kind === 'posed').map(x => x.date).sort()[0] || h.map(x => x.date).sort()[0] || started;
}

/* ---------- text ---------- */

/* TeX or HTML to plain words: math, commands, comments and tags go; the prose stays. */
export function stripTex(s) {
  return String(s || '')
    .replace(/(^|[^\\])%.*$/gm, '$1')
    .replace(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$]*\$/g, ' ')
    .replace(/\\begin\{(equation|align|eqnarray|gather|multline)\*?\}[\s\S]*?\\end\{\1\*?\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\[a-zA-Z@]+\*?/g, ' ')
    .replace(/[{}~\\]/g, ' ');
}

/* Lower case, accents dropped, hyphens and dashes as spaces, one space between words: the form phrases are matched in. */
export function normalize(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[-‐‑‒–—_/]/g, ' ').replace(/[^a-z0-9.:\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* The phrases of a list that occur in a normalized text, each starting at a word boundary (a phrase may end mid-word,
   so "noncontextuality inequalit" catches both forms). */
export function phraseHits(norm, phrases) {
  return (phrases || []).filter(ph => new RegExp('(^|[^a-z0-9])' + escRe(normalize(ph))).test(norm));
}

const STOP = new Set('the a an and or of to in on for with by from as at is are be been being this that these those it its into than then there their which who whom whose what when where while such can could may might must shall should will would not no nor also both either each any all some more most other only same so very via we our us they them one two three new show shows shown study studies paper work result results use used using based give given gives known well within without however here between under over upon among about above below whether does do done has have had was were let consider since thus hence i ii iii et al'.split(' '));
const stem = w => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;

/* Unigrams and bigrams of content words. */
export function terms(norm) {
  const words = norm.split(' ').map(w => w.replace(/[.:]+$/, '')).filter(w => /^[a-z][a-z0-9]{2,}$/.test(w) && !STOP.has(w)).map(stem);
  const out = words.slice();
  for (let i = 1; i < words.length; i++) out.push(words[i - 1] + ' ' + words[i]);
  return out;
}

const counts = ts => ts.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());

/* TF-IDF over a corpus (the day's preprints plus the problem entries, so that the field's everyday vocabulary weighs
   little). Returns a function from a text's terms to a unit vector. */
export function tfidf(corpusTerms) {
  const df = new Map(), n = corpusTerms.length;
  for (const ts of corpusTerms) for (const t of new Set(ts)) df.set(t, (df.get(t) || 0) + 1);
  return ts => {
    const v = new Map(); let norm2 = 0;
    for (const [t, c] of counts(ts)) { const w = (1 + Math.log(c)) * (Math.log((n + 1) / ((df.get(t) || 0) + 1)) + 1); v.set(t, w); norm2 += w * w; }
    const len = Math.sqrt(norm2) || 1;
    for (const [t, w] of v) v.set(t, w / len);
    return v;
  };
}
export function cosine(a, b) {
  let s = 0; const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, w] of small) { const u = big.get(t); if (u) s += w * u; }
  return s;
}

/* Runs of at least k consecutive words of the entry that reappear verbatim in the paper, longest first. */
export function sharedPassages(entryNorm, paperNorm, k = 8) {
  const ew = entryNorm.split(' '), pw = paperNorm.split(' ');
  if (ew.length < k || pw.length < k) return [];
  const grams = new Set();
  for (let i = 0; i + k <= pw.length; i++) grams.add(pw.slice(i, i + k).join(' '));
  const runs = [];
  for (let i = 0; i + k <= ew.length;) {
    if (!grams.has(ew.slice(i, i + k).join(' '))) { i++; continue; }
    let j = i + 1;
    while (j + k <= ew.length && grams.has(ew.slice(j, j + k).join(' '))) j++;
    runs.push(ew.slice(i, j - 1 + k).join(' '));
    i = j - 1 + k;
  }
  return runs.sort((a, b) => b.length - a.length);
}

/* ---------- references ---------- */

/* What can be looked for in a bibliography to recognise one of an entry's references: its arXiv number, its DOI, the
   opening words of its title, and its first author's surname with the year. */
export function referenceKeys(ref) {
  const text = ref.text || '', url = ref.url || '';
  const arxiv = (url.match(/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5}|[a-z-]+\/[0-9]{7})/i) || [])[1] || null;
  const doi = (url.match(/doi\.org\/(10\.[^\s]+)/i) || [])[1] || null;
  const year = (text.match(/\((\d{4})\)\s*$/) || [])[1] || null;
  const parts = text.replace(/\s*\(\d{4}\)\s*$/, '').split(/,\s+/);
  const isNames = s => /(^|\s)[A-Z]\.(-[A-Z]\.)?(\s|$)/.test(s) || /^and\s/.test(s);
  const ti = parts.findIndex((s, i) => i > 0 && !isNames(s) && s.split(' ').length >= 2);
  const title = ti > 0 ? normalize(parts[ti]).split(' ').slice(0, 8).join(' ') : null;
  const first = parts[0].split(/\s+and\s+/)[0].trim().split(/\s+/).pop();
  return { text, arxiv, doi: doi && doi.toLowerCase(), title, surname: first ? normalize(first) : null, year };
}

/* How a reference shows up in a paper's normalized text (or bibliography), if it does. */
export function findReference(keys, norm, raw) {
  if (keys.arxiv && raw.includes(keys.arxiv)) return 'arXiv number';
  if (keys.doi && raw.toLowerCase().includes(keys.doi)) return 'DOI';
  if (keys.title && keys.title.split(' ').length >= 3 && norm.includes(keys.title)) return 'title';
  if (keys.surname && keys.year && keys.surname.length > 2) {
    const re = new RegExp('(^|[^a-z])' + escRe(keys.surname) + '[^]{0,250}?' + keys.year);
    if (re.test(norm)) return 'author and year';
  }
  return null;
}

/* The bibliography part of a source: .bbl and .bib files, or what follows \begin{thebibliography} or \bibliography. */
export function bibliographyOf(files) {
  const bib = files.filter(f => /\.(bbl|bib)$/i.test(f.name)).map(f => f.text).join('\n');
  if (bib.trim()) return bib;
  const tex = files.map(f => f.text).join('\n');
  const at = tex.search(/\\begin\{thebibliography\}|\\bibliography\{|\\printbibliography/);
  return at >= 0 ? tex.slice(at) : '';
}

/* ---------- feeds ---------- */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENT[e] ?? m));
const tag = (s, name) => { const m = s.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`)); return m ? unxml(m[1]).replace(/\s+/g, ' ').trim() : ''; };
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:]+)="([^"]*)"/g)].map(m => [m[1], unxml(m[2])]));

/* The entries of an arXiv API (or Hexagon /api/query) Atom feed. `source` is "arxiv" or "hexagon". */
export function parseAtom(xml, source) {
  const total = Number(tag(xml, 'opensearch:totalResults')) || 0;
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const idUrl = tag(e, 'id');
    const id = (idUrl.match(/(\d{4}\.\d{4,5}(v\d+)?|[a-z-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?)$/) || [])[1] || idUrl;
    const links = [...e.matchAll(/<link\s[^>]*\/?>/g)].map(m => attrs(m[0]));
    return {
      source, id, base: id.replace(/v\d+$/, ''),
      url: (links.find(l => l.rel === 'alternate') || {}).href || idUrl,
      title: tag(e, 'title'),
      summary: tag(e, 'summary'),
      authors: [...e.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(m => tag(m[1], 'name')).filter(Boolean),
      published: tag(e, 'published'), updated: tag(e, 'updated'),
      categories: [...e.matchAll(/<category\s[^>]*\/?>/g)].map(m => attrs(m[0]).term).filter(Boolean),
      comment: tag(e, 'arxiv:comment'), journal: tag(e, 'arxiv:journal_ref')
    };
  }).filter(x => x.title && x.title !== 'Error');
  return { total, entries };
}

/* ---------- sources ---------- */

/* An arXiv e-print as text files: a gzipped tar of the LaTeX source, a single gzipped .tex, or (for PDF-only
   submissions) nothing. Returns { kind: 'tex' | 'pdf' | 'unknown', files: [{ name, text }] }. */
export function unpackEprint(buf) {
  let b = Buffer.from(buf);
  if (b[0] === 0x1f && b[1] === 0x8b) b = gunzipSync(b);
  if (b.subarray(0, 5).toString() === '%PDF-') return { kind: 'pdf', files: [] };
  if (b.length > 262 && b.subarray(257, 262).toString() === 'ustar') {
    const files = untar(b).filter(f => /\.(tex|bbl|bib|ltx)$/i.test(f.name)).map(f => ({ name: f.name, text: f.data.toString('utf8') }));
    return { kind: files.length ? 'tex' : 'unknown', files };
  }
  const text = b.toString('utf8');
  return /\\(documentclass|begin\{document\}|section)/.test(text) ? { kind: 'tex', files: [{ name: 'main.tex', text }] } : { kind: 'unknown', files: [] };
}

/* A minimal ustar reader (regular files, GNU long names). */
export function untar(b) {
  const out = []; let longName = null;
  for (let off = 0; off + 512 <= b.length;) {
    const h = b.subarray(off, off + 512);
    if (h.every(x => x === 0)) break;
    const str = (a, n) => h.subarray(a, a + n).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(str(124, 12).trim() || '0', 8) || 0, type = str(156, 1) || '0';
    const prefix = str(345, 155), data = b.subarray(off + 512, off + 512 + size);
    let name = longName || (prefix ? prefix + '/' : '') + str(0, 100);
    longName = null;
    if (type === 'L') longName = data.toString('utf8').replace(/\0.*$/s, '');
    else if (type === '0' || type === '\0') out.push({ name, data });
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

/* ---------- scoring ---------- */

/* What the scan compares a preprint with, one profile per problem. */
export function buildProfiles(problems, profile, started) {
  return problems.map(p => {
    const sig = (profile.problems || {})[String(p.number)] || {};
    const prose = [p.title, p.statement, p.background, p.relevance, p.significance].map(stripTex).join('\n');
    const norm = normalize(prose);
    return {
      number: p.number, title: p.title, posed: posedOn(p, started),
      topic: sig.topic || [], angle: sig.angle || [],
      norm, terms: terms(norm),
      references: (p.references || []).map(referenceKeys)
    };
  });
}

/* Whether a text acknowledges the database or its companion paper, and how. */
export function acknowledgement(norm, raw, patterns) {
  const hit = phraseHits(norm, patterns)[0];
  if (hit) return hit;
  const r = raw.toLowerCase();
  return patterns.find(p => r.includes(p.toLowerCase())) || null;
}

/* First pass, on title and abstract: which problems a preprint might draw on, and why. */
export function screen(paper, profiles, vectorOf, threshold) {
  const norm = normalize(paper.title + ' . ' + stripTex(paper.summary));
  const v = vectorOf(terms(norm));
  return profiles.map(pr => {
    const topic = phraseHits(norm, pr.topic), angle = phraseHits(norm, pr.angle);
    const similarity = cosine(v, pr.vector);
    const reasons = [];
    if (topic.length && angle.length) reasons.push('the abstract combines the problem\'s subject with its question');
    if (similarity >= threshold) reasons.push('the abstract is unusually close in wording to the entry');
    return { problem: pr.number, topic, angle, similarity, flagged: reasons.length > 0, reasons, score: topic.length + 2 * angle.length * (topic.length > 0) + 10 * similarity };
  }).filter(m => m.flagged).sort((a, b) => b.score - a.score);
}

/* Second pass, on the full source when it could be fetched: references shared with the entry, passages reused word for
   word, and the problem's phrases in the body. */
export function examine(files, pr) {
  const raw = files.map(f => f.text).join('\n');
  const norm = normalize(stripTex(raw));
  const bibRaw = bibliographyOf(files), bibNorm = normalize(stripTex(bibRaw)) || norm;
  const refs = pr.references.map(k => ({ ref: k.text, how: findReference(k, bibNorm, bibRaw || raw) })).filter(x => x.how);
  return {
    sharedReferences: refs, referenceShare: pr.references.length ? refs.length / pr.references.length : 0,
    passages: sharedPassages(pr.norm, norm).slice(0, 5),
    topic: phraseHits(norm, pr.topic), angle: phraseHits(norm, pr.angle)
  };
}

/* How much a candidate deserves a moderator's attention, from the evidence gathered. */
export function strength(m) {
  const d = m.deep;
  if (d && (d.passages.length >= 2 || (d.passages.length && d.passages[0].split(' ').length >= 15))) return 'strong';
  if (d && m.topic.length && m.angle.length && d.referenceShare >= 0.3) return 'strong';
  if (m.topic.length && m.angle.length && (m.similarity >= 0.15 || (d && d.referenceShare >= 0.15))) return 'moderate';
  return 'weak';
}

/* ---------- the report ---------- */

const RANK = { strong: 0, moderate: 1, weak: 2 };
const short = (s, n = 300) => s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + ' …' : s;
const day = s => String(s || '').slice(0, 10);

export function renderReport({ date, window, counts, candidates, acknowledged, problemsById, errors }) {
  const L = [];
  L.push(`# Preprint scan, ${date}`, '');
  L.push(`Window: preprints first submitted ${window.from} to ${window.to}. Scanned ${counts.arxiv} arXiv and ${counts.hexagon} Hexagon preprints (${counts.fresh} not seen in earlier runs); full text fetched for ${counts.fullText} of ${counts.flagged} flagged.`, '');
  L.push('> These are candidates for a moderator to read, not findings. Overlap in subject, wording or references is what independent work on the same question also produces, and the scan cannot see where an idea came from. Before contacting anyone, read the paper and check its dates against the entry\'s.', '');
  if (errors.length) L.push('**Problems during the run:** ' + errors.join('; '), '');
  if (!candidates.length) L.push('No candidates today.', '');
  const sorted = candidates.slice().sort((a, b) => RANK[a.strength] - RANK[b.strength] || b.score - a.score);
  for (const c of sorted) {
    const p = problemsById[c.problem];
    L.push(`## [${c.strength}] ${c.paper.title}`, '');
    L.push(`${c.paper.authors.join(', ')}. ${c.paper.source === 'hexagon' ? 'Hexagon' : 'arXiv'} [${c.paper.id}](${c.paper.url}), first version ${day(c.paper.published)}${c.paper.categories.length ? ', ' + c.paper.categories.join(', ') : ''}.`, '');
    L.push(`**Problem ${c.problem}, ${p.title}** (posed ${p.posed}).`, '');
    L.push(`- Why flagged: ${c.reasons.join('; ')}.`);
    if (c.topic.length) L.push(`- Subject phrases: ${c.topic.join(', ')}.`);
    if (c.angle.length) L.push(`- Question phrases: ${c.angle.join(', ')}.`);
    L.push(`- Similarity of the abstract to the entry: ${c.similarity.toFixed(2)}.`);
    if (c.deep) {
      const d = c.deep;
      L.push(`- References shared with the entry: ${d.sharedReferences.length} of ${p.references.length}${d.sharedReferences.length ? ' (' + d.sharedReferences.map(r => short(r.ref, 80) + ', by ' + r.how).join('; ') + ')' : ''}.`);
      L.push(d.passages.length ? `- Passages of the entry reused word for word: ${d.passages.length}.` : '- No passage of the entry reused word for word.');
      for (const s of d.passages.slice(0, 3)) L.push(`  - "${short(s, 240)}"`);
      if (d.angle.length && !c.angle.length) L.push(`- Question phrases in the body: ${d.angle.join(', ')}.`);
    } else L.push(`- Full text not checked${c.fullTextNote ? ' (' + c.fullTextNote + ')' : ''}; the acknowledgement check covered the abstract and comments only.`);
    L.push('', `> ${short(c.paper.summary, 700)}`, '');
  }
  if (acknowledged.length) {
    L.push('## Preprints that acknowledge OpenContext', '');
    for (const a of acknowledged) L.push(`- [${a.paper.id}](${a.paper.url}) ${a.paper.title}, ${a.paper.authors.slice(0, 4).join(', ')}${a.paper.authors.length > 4 ? ' et al.' : ''} (matched "${a.how}"${a.problems.length ? ', near Problem ' + a.problems.join(', ') : ''}).`);
    L.push('');
  }
  return L.join('\n');
}
