/* OpenContext preprint scan: looks through the newest arXiv and Hexagon preprints for papers that draw on a problem of the
   database without acknowledging it, and writes a report of candidates for the moderators to read. Run daily by
   .github/workflows/preprint-scan.yml; see README.md next to this file.

     node scan/scan.mjs                       the newest preprints (the last `lookbackDays` days, minus those seen before)
     node scan/scan.mjs --days 10             a wider window
     node scan/scan.mjs --ids 2609.13312,hexagon:2609.00126
                                              score these preprints, whatever their date, and print every score
     options: --out DIR (default scan-out), --state FILE (ids already scanned; default .scan-state/seen.json),
              --no-fulltext, --verbose (print titles and scores to the log; off by default, since the log may be public)

   Only free, public, read-only endpoints are used: the arXiv API and e-print service, and Hexagon's arXiv-compatible
   query API and source API. */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, buildProfiles, parseAtom, unpackEprint, tfidf, terms, normalize, stripTex, screen, examine, acknowledgement, strength, renderReport } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARXIV = 'https://export.arxiv.org/api/query';
const HEXAGON = 'https://hexagonmath.org';
const UA = 'OpenContext-preprint-scan/1.0 (+https://github.com/rafunds3d/OpenContext)';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const flag = name => args.includes(name);
const verbose = flag('--verbose'), ids = opt('--ids', '');
const outDir = opt('--out', 'scan-out'), statePath = opt('--state', '.scan-state/seen.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastArxiv = 0;
const ARXIV_GAP = Number(process.env.SCAN_ARXIV_GAP_MS ?? 3100);
/* arXiv asks for one request every three seconds. */
async function get(url, { binary = false, arxiv = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    if (arxiv) { const wait = lastArxiv + ARXIV_GAP - Date.now(); if (wait > 0) await sleep(wait); lastArxiv = Date.now(); }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
      if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      if (res.status !== 429 && res.status < 500) throw Object.assign(new Error(`HTTP ${res.status}`), { final: true });
      if (attempt >= 4) throw new Error(`HTTP ${res.status}`);
    } catch (e) { if (e.final || attempt >= 4) throw e; }
    await sleep(2000 * 2 ** attempt);
  }
}

const stamp = d => d.toISOString().slice(0, 10).replace(/-/g, '');

async function fetchArxivWindow(cats, from, to) {
  const q = `(${cats.map(c => 'cat:' + c).join(' OR ')}) AND submittedDate:[${stamp(from)}0000 TO ${stamp(to)}2359]`;
  const out = [];
  for (let start = 0, emptyRetry = 0; ;) {
    const xml = await get(`${ARXIV}?search_query=${encodeURIComponent(q)}&start=${start}&max_results=200&sortBy=submittedDate&sortOrder=descending`, { arxiv: true });
    const { total, entries } = parseAtom(xml, 'arxiv');
    /* the API now and then answers a page with no entries; one retry usually fills it */
    if (!entries.length && start < total && emptyRetry++ < 2) continue;
    out.push(...entries); start += 200; emptyRetry = 0;
    if (!entries.length || start >= total || start >= 5000) break;
  }
  return out;
}

async function fetchHexagonWindow(cats, from) {
  const q = cats.map(c => 'cat:' + c).join(' OR ');
  const xml = await get(`${HEXAGON}/api/query?search_query=${encodeURIComponent(q)}&start=0&max_results=500&sortBy=submittedDate&sortOrder=descending`);
  return parseAtom(xml, 'hexagon').entries.filter(e => !e.published || new Date(e.published) >= from);
}

async function fetchByIds(list) {
  const ax = list.filter(x => !x.startsWith('hexagon:')), hx = list.filter(x => x.startsWith('hexagon:')).map(x => x.slice(8));
  const out = [];
  if (ax.length) out.push(...parseAtom(await get(`${ARXIV}?id_list=${ax.join(',')}&max_results=${ax.length}`, { arxiv: true }), 'arxiv').entries);
  if (hx.length) out.push(...parseAtom(await get(`${HEXAGON}/api/query?id_list=${hx.join(',')}&max_results=${hx.length}`), 'hexagon').entries);
  return out;
}

/* The LaTeX source of a preprint as text files, or a note on why there is none. */
async function fullText(paper) {
  if (paper.source === 'arxiv') {
    const u = unpackEprint(await get(`https://arxiv.org/e-print/${paper.id}`, { binary: true, arxiv: true }));
    return u.files.length ? { files: u.files } : { note: u.kind === 'pdf' ? 'submitted as PDF only' : 'source not readable' };
  }
  const id = paper.id.replace(/^hexagon:/, '');
  const manifest = JSON.parse(await get(`${HEXAGON}/api/v1/works/${id}/source`));
  const wanted = (manifest.files || []).filter(f => /\.(tex|bbl|bib|ltx)$/i.test(f.path) && f.role !== 'retained-unused' && (f.sizeBytes || 0) < 4e6).slice(0, 30);
  const files = [];
  for (const f of wanted) files.push({ name: f.path, text: await get(`${HEXAGON}/api/v1/works/${id}/source?path=${encodeURIComponent(f.path)}`) });
  return files.length ? { files } : { note: 'no LaTeX source on Hexagon' };
}

async function main() {
  const { PROBLEMS } = loadData(readFileSync(join(ROOT, 'data/problems.js'), 'utf8'), ['PROBLEMS']);
  const { SITE } = loadData(readFileSync(join(ROOT, 'data/site.js'), 'utf8'), ['SITE']);
  const profile = JSON.parse(readFileSync(join(ROOT, 'scan/profile.json'), 'utf8'));
  const acks = [...profile.acknowledgements, SITE.paper && SITE.paper.url ? SITE.paper.url.replace(/^https?:\/\/(www\.)?arxiv\.org\/abs\//, '') : ''].filter(Boolean);
  const profiles = buildProfiles(PROBLEMS, profile, SITE.started);
  const problemsById = Object.fromEntries(profiles.map(p => [p.number, p]));

  const now = new Date(), days = Number(opt('--days', profile.lookbackDays || 5));
  const from = new Date(now.getTime() - days * 86400e3);
  const errors = [];
  let papers = [];
  if (ids) papers = await fetchByIds(ids.split(',').map(s => s.trim()).filter(Boolean));
  else {
    try { papers.push(...await fetchArxivWindow(profile.arxivCategories, from, now)); } catch (e) { errors.push('arXiv: ' + e.message); }
    try { papers.push(...await fetchHexagonWindow(profile.hexagonCategories, from)); } catch (e) { errors.push('Hexagon: ' + e.message); }
  }
  const seenIds = new Set(), unique = [];
  for (const p of papers) { const k = p.source + ':' + p.base; if (!seenIds.has(k)) { seenIds.add(k); unique.push(p); } }

  const seen = !ids && existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  const fresh = unique.filter(p => !seen[p.source + ':' + p.base]);

  /* weights from the whole window, so that what every quant-ph abstract says this week counts for little */
  const docTerms = unique.map(p => terms(normalize(p.title + ' . ' + stripTex(p.summary))));
  const vectorOf = tfidf([...docTerms, ...profiles.map(p => p.terms)]);
  for (const pr of profiles) pr.vector = vectorOf(pr.terms);
  const threshold = profile.similarityThreshold ?? 0.22;

  const flagged = [], acknowledged = [];
  for (const paper of fresh) {
    const matches = screen(paper, profiles, vectorOf, threshold);
    if (ids) {
      const all = profiles.map(pr => { const m = screen(paper, [pr], vectorOf, -1)[0]; return `P${pr.number} sim ${m.similarity.toFixed(3)} topic [${m.topic.join(', ')}] angle [${m.angle.join(', ')}]`; });
      console.log(`${paper.source}:${paper.id} ${paper.title}\n  ${all.join('\n  ')}\n  flagged: ${matches.map(m => 'P' + m.problem).join(', ') || 'none'}`);
    }
    if (!matches.length) continue;
    const blurb = [paper.title, paper.summary, paper.comment, paper.journal].join(' . ');
    const how = acknowledgement(normalize(blurb), blurb, acks);
    if (how) { acknowledged.push({ paper, how, problems: matches.map(m => m.problem) }); continue; }
    flagged.push({ paper, matches });
  }

  /* full text for the most promising, within a budget */
  flagged.sort((a, b) => b.matches[0].score - a.matches[0].score);
  const candidates = []; let fetched = 0;
  for (const [i, f] of flagged.entries()) {
    let ft = null;
    if (!flag('--no-fulltext') && i < (profile.maxFullText || 25)) {
      try { ft = await fullText(f.paper); } catch (e) { ft = { note: 'could not fetch the source (' + e.message + ')' }; }
    }
    if (ft && ft.files) {
      fetched++;
      const raw = ft.files.map(x => x.text).join('\n');
      const how = acknowledgement(normalize(stripTex(raw)), raw, acks);
      if (how) { acknowledged.push({ paper: f.paper, how, problems: f.matches.map(m => m.problem) }); continue; }
    }
    for (const m of f.matches) {
      const c = { ...m, paper: f.paper };
      if (ft && ft.files) c.deep = examine(ft.files, problemsById[m.problem]);
      else c.fullTextNote = ft ? ft.note : 'over the daily budget';
      c.strength = strength(c);
      candidates.push(c);
    }
  }

  const date = now.toISOString().slice(0, 10);
  const report = renderReport({
    date, window: { from: ids ? '(any date)' : from.toISOString().slice(0, 10), to: date },
    counts: { arxiv: unique.filter(p => p.source === 'arxiv').length, hexagon: unique.filter(p => p.source === 'hexagon').length, fresh: fresh.length, flagged: flagged.length, fullText: fetched },
    candidates, acknowledged, problemsById, errors
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'report.md'), report);
  writeFileSync(join(outDir, 'candidates.json'), JSON.stringify({ date, candidates: candidates.map(c => ({ ...c, paper: { ...c.paper } })), acknowledged, errors }, null, 2));

  if (!ids) {
    const keep = Object.fromEntries(Object.entries(seen).filter(([, d]) => (now - new Date(d)) < 90 * 86400e3));
    for (const p of unique) keep[p.source + ':' + p.base] ||= date;
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, JSON.stringify(keep));
  }

  const strong = candidates.filter(c => c.strength === 'strong').length;
  console.log(`scanned ${unique.length} preprints (${fresh.length} new), flagged ${flagged.length}, full text ${fetched}, candidates ${candidates.length} (${strong} strong), acknowledging ${acknowledged.length}${errors.length ? ', errors: ' + errors.join('; ') : ''}`);
  if (verbose) for (const c of candidates) console.log(`  [${c.strength}] P${c.problem} ${c.paper.id} sim ${c.similarity.toFixed(2)} ${c.paper.title}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `candidates=${candidates.length}\nstrong=${strong}\nacknowledged=${acknowledged.length}\nerrors=${errors.length}\n`);
  if (!ids && errors.length && !unique.length) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
