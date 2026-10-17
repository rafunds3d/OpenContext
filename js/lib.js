/* Shared machinery: helpers, derived data, and the pieces that pages are assembled from
   (apple icons, status labels, rows, the red and tan boxes, templates, the fixed submission format). Rarely needs editing. */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const plain = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\\[()]/g, '').replace(/\s+/g, ' ').trim();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(iso, short) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const name = MONTHS[(m || 1) - 1] || '';
  return `${d} ${short ? name.slice(0, 3) : name} ${y}`;
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function qs(obj) { const p = new URLSearchParams(); for (const [k, v] of Object.entries(obj)) if (v) p.set(k, v); const s = p.toString(); return s ? '?' + s : ''; }
function siteUrl() { return location.href.split('#')[0]; }
const paras = s => String(s || '').trim().split(/\n\s*\n/).filter(Boolean).map(x => `<p>${x.trim()}</p>`).join('');
const names = list => (list || []).map(esc).join(', ');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* derived data */
const goalById = id => GOALS.find(g => g.id === id);
const problemGoals = p => (p.goals || []).map(goalById).filter(Boolean);
const problemsForGoal = g => PROBLEMS.filter(p => (p.goals || []).includes(g.id));
const statusInfo = s => STATUSES[s] || { label: s, closed: false };
const isClosed = p => statusInfo(p.status).closed;
const contributionsFor = p => (typeof CONTRIBUTIONS !== 'undefined' ? CONTRIBUTIONS : []).filter(c => c.problem === p.number).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const updatedOf = p => [...(p.history || []), ...contributionsFor(p)].reduce((m, h) => (h.date || '') > m ? h.date : m, '') || SITE.started;
const statusSince = p => { const h = (p.history || []).filter(x => x.kind === 'status' || x.kind === 'posed').sort((a, b) => (b.date || '').localeCompare(a.date || '')); return h.length ? h[0].date : updatedOf(p); };
const latest = () => PROBLEMS.reduce((m, p) => updatedOf(p) > m ? updatedOf(p) : m, '');
const byDateDesc = (a, b) => updatedOf(b).localeCompare(updatedOf(a)) || a.number - b.number;
const byNumber = (a, b) => a.number - b.number;
const problemUrl = p => `#/problem/${p.number}`;
const problemLabel = p => `Problem ${p.number}`;
/* What an entry under revision displays, as the paper asks: the date of the claim and the number of
   independent verifications and explanatory expositions received since. */
const revisionStats = p => { const since = statusSince(p); const cs = contributionsFor(p).filter(c => (c.date || '') >= since); return { since, claims: cs.filter(c => c.kind === 'claim').length, verifications: cs.filter(c => c.kind === 'verification').length, expositions: cs.filter(c => c.kind === 'exposition').length }; };
const contributionKind = k => (typeof CONTRIBUTION_KINDS !== 'undefined' && CONTRIBUTION_KINDS[k]) ? CONTRIBUTION_KINDS[k].label : k;
const aiUseLabel = a => (typeof AI_USE !== 'undefined' && AI_USE[a]) || '';
const postsAll = () => (typeof POSTS !== 'undefined' ? POSTS : []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const postBySlug = s => postsAll().find(x => x.slug === s);
const postsForProblem = p => postsAll().filter(x => (x.problems || []).includes(p.number));

function buildTopics() {
  const m = new Map();
  for (const p of PROBLEMS) (p.topics || []).forEach(t => m.set(t, (m.get(t) || 0) + 1));
  return [...m].map(([name, count]) => ({ name, count, slug: slug(name) }));
}
const TOPICS = buildTopics();
const topicBySlug = s => TOPICS.find(t => t.slug === s);

function randomProblem(status, excludeNumber) {
  const all = PROBLEMS.filter(p => status ? p.status === status : true);
  const pool = all.filter(p => p.number !== excludeNumber);
  const base = pool.length ? pool : all;
  return base.length ? base[Math.floor(Math.random() * base.length)] : null;
}
function textOf(p) {
  return [problemLabel(p), p.title, p.statement, p.background, p.relevance, p.significance, p.motivation, (p.topics || []).join(' '), problemGoals(p).map(g => g.title).join(' '),
    (p.posedBy || []).join(' '), (p.history || []).map(h => h.text).join(' '), contributionsFor(p).map(c => c.title + ' ' + (c.summary || '')).join(' ')].filter(Boolean).join(' ').replace(/<[^>]+>/g, ' ').toLowerCase();
}
function search(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return PROBLEMS.slice();
  return PROBLEMS.map(p => {
    const text = textOf(p), title = plain(p.title).toLowerCase();
    let score = 0;
    for (const term of terms) { if (!text.includes(term)) return null; score += title.includes(term) ? 3 : 1; }
    return { p, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.p);
}

/* pieces */
const apple = (cls = '') => `<svg class="apple ${cls}" aria-hidden="true" focusable="false"><use href="#i-apple"/></svg>`;
const appleFor = p => apple(isClosed(p) ? 'apple-done' : p.status === 'under-revision' ? 'apple-revision' : '');
const badge = p => `<span class="st st-${esc(p.status)}">${esc(statusInfo(p.status).label)}</span>`;
const goalChips = p => problemGoals(p).map(g => `<a class="gchip" href="#/agenda?to=${g.id}" title="Goal ${g.numeral}: ${esc(g.title)}">${g.numeral}</a>`).join(' ');
const topicChips = p => (p.topics || []).length ? `<div class="chips">${(p.topics || []).map(t => `<a class="chip" href="#/tag/${slug(t)}">${esc(t)}</a>`).join('')}</div>` : '';
function rows(list, opts = {}) {
  if (!list.length) return `<p class="empty muted">${opts.empty || 'Nothing here yet.'}</p>`;
  return `<ul class="rows">${list.map(p => `<li class="row">
    <span class="row-num">${appleFor(p)}${problemLabel(p)}</span>
    <span class="row-title"><a href="${problemUrl(p)}">${esc(p.title)}</a></span>
    ${badge(p)}
    <p class="row-meta"><span>${goalChips(p)}</span><span>${opts.since ? 'status since ' + fmtDate(statusSince(p), true) : 'updated ' + fmtDate(updatedOf(p), true)}</span>${(p.posedBy || []).length ? `<span>posed by ${names(p.posedBy)}</span>` : ''}</p>
  </li>`).join('')}</ul>`;
}
function problemBox(p, opts = {}) {
  return `<article class="pbox">
    <div class="pbox-title" title="${esc(problemLabel(p))}: ${esc(p.title)}">${apple('apple-white')}${esc(problemLabel(p))}: ${esc(p.title)}</div>
    ${paras(p.statement)}
    ${opts.link ? `<p class="more"><a href="${problemUrl(p)}">Open problem page →</a></p>` : ''}
  </article>`;
}
/* Contributions attached to an entry, each in the fixed format: title, type of material, AI use, named people. */
function contribRows(list) {
  if (!list.length) return '';
  return `<ul class="hist contribs">${list.map(c => `<li>
    <span class="hist-date">${fmtDate(c.date, true)}</span>
    <span><span class="hist-kind">${esc(contributionKind(c.kind))}</span>${c.url ? `<a href="${esc(c.url)}" rel="noopener">${esc(c.title)}</a>` : `<strong>${esc(c.title)}</strong>`}${c.provisional ? ' <span class="flag">provisional</span>' : ''}
      ${c.summary ? `<div class="contrib-sum">${paras(c.summary)}</div>` : ''}
      <p class="contrib-meta">${c.material ? esc(c.material) + ' · ' : ''}${esc(aiUseLabel(c.ai) || 'AI use not stated')}${(c.by || []).length ? ` · <span class="hist-by">${names(c.by)}</span>` : ''}</p></span>
  </li>`).join('')}</ul>`;
}
function criteriaBox() {
  return `<section class="cbox" aria-label="Curation criteria">
    <div class="cbox-title">BOX I: Curation criteria</div>
    <dl>
      <div><dt>(Clarity)</dt> <dd>The problem must be precisely stated, with fixed objects and assumptions, so that what counts as a solution is unambiguous and the problem can be readily prompted into an AI agent.</dd></div>
      <div><dt>(Relevance)</dt> <dd>The problem must be well-motivated within the existing literature and traceable to at least one of the program's long-term goals.</dd></div>
      <div><dt>(Significance)</dt> <dd>The problem's resolution must meaningfully advance the long-term goal(s) to which the problem is traceable.</dd></div>
      <div><dt>(Feasibility)</dt> <dd>The problem must be plausibly tackled with existing techniques and near-term AI assistance: not necessarily easy, but not so far beyond current methods that even formulating a strategy is out of reach.</dd></div>
    </dl>
  </section>`;
}
function featuresBox() {
  return `<section class="cbox" aria-label="Core database features">
    <div class="cbox-title">BOX II: Core database features</div>
    <dl>
      <div><dt>Live problem status.</dt> <dd>Every problem statement carries a status that is updated as work proceeds. A problem may be marked <span class="st st-open">open</span>, <span class="st st-under-revision">under revision</span> or <span class="st st-solved">solved</span>, and each change is dated.</dd></div>
      <div><dt>Partial advances.</dt> <dd>Researchers, with or without AI assistance, can submit attempted solutions, partial or negative results, useful reformulations, computational evidence, or pointed questions about a problem's statement or scope, directly to the problem's entry. This way, no contribution is lost between listing and resolution. Solutions elsewhere are monitored by the moderators.</dd></div>
      <div><dt>Unpolished, provisional material.</dt> <dd>Submissions need not be complete or rigorous to be recorded. A promising but unpolished argument, an incomplete proof, or a partially verified computation can be submitted explicitly as provisional and flagged for revision.</dd></div>
      <div><dt>Revision and digestion.</dt> <dd>Once submitted, material becomes available for other researchers, and AI agents, to inspect, revise, extend, or challenge. In particular, when the moderators receive a claimed solution, the problem enters the under-revision status: researchers can submit revisions and other expositions of, and comments on, the claimed solution.</dd></div>
      <div><dt>Contribution tracking.</dt> <dd>An entry accumulates contributions from one line of attack or from several converging ones. The researchers involved in the entry's statement, attempted solutions, and revisions can collectively decide whether the result merits a proper manuscript. This information is used for preparing progress reports.</dd></div>
      <div><dt>Result updates.</dt> <dd>Once a manuscript from a listed problem is published, for example as an arXiv preprint, its entry stays open to further updates, corrections, simplified proofs, generalizations, or follow-ups.</dd></div>
    </dl>
  </section>`;
}
function practicesBox() {
  return `<section class="cbox" aria-label="Best practices">
    <div class="cbox-title">BOX III: Best practices</div>
    <dl>
      <div><dt>(Prompt cautiously)</dt> <dd>Do not feed other researchers' unpublished material shared privately, such as ideas on how to solve a certain problem, to commercial AI services without their consent.</dd></div>
      <div><dt>(Be honest)</dt> <dd>Claim full understanding only if you can follow all the relevant arguments presented, explain why each step is needed, name its assumptions, and answer questions about it; declare partial understanding otherwise.</dd></div>
      <div><dt>(Avoid single-prompt outputs)</dt> <dd>Even when a single prompt yields a promising solution, engage with the material in follow-up iterative prompting before submitting it to ${esc(SITE.name)}.</dd></div>
      <div><dt>(Be polite)</dt> <dd>Agents have no feelings; humans do. A digestion phase is public and every submission carries named humans, so direct polite criticism at the claim or passages, not at the involved researchers.</dd></div>
      <div><dt>(Avoid duplication)</dt> <dd>Check whether a claimed solution already exists. If one does, do not rapidly prepare an AI-written revised version merely to reflect “your own style” and submit it; make an effort, instead, to ensure that distinct solutions offer distinct insights into the same problem.</dd></div>
      <div><dt>(Recognize effort)</dt> <dd>When preparing an explanatory exposition of an independent manuscript, or any work that benefited from the exchanges shared in ${esc(SITE.name)}, acknowledge, and where relevant cite, the contributions you drew on.</dd></div>
    </dl>
  </section>`;
}
function problemTemplate() {
  return `{
  number: ${PROBLEMS.reduce((m, p) => Math.max(m, p.number), 0) + 1},
  title: "Short descriptive title",
  status: "open",            // open, under-revision, solved
  goals: ["classicality"],   // classicality, framework, applications (one or more)
  topics: ["Topic one", "Topic two"],
  posedBy: ["Your Name (Institution)"],
  curatedBy: [],
  ai: "none",                // none, partial, full: how much AI assistance went into posing it
  statement: tex\`Precise statement. Inline math between \\( and \\),
display math between \\[ and \\]. A blank line starts a new paragraph.\`,
  background: tex\`What a reader needs to understand the statement, with references.\`,
  relevance: tex\`How the problem is motivated within the existing literature, and which long-term goal(s) it traces to.\`,
  significance: tex\`How its resolution would meaningfully advance those goal(s).\`,
  history: [
    { date: "${todayIso()}", kind: "posed", text: "Problem posed.", by: ["Your Name"] }
  ],
  references: [
    { text: "Author, Title, Journal (Year)", url: "https://..." }
  ]
},`;
}
function advanceTemplate() {
  return `{ date: "${todayIso()}", kind: "advance", text: "What was shown, how, and with which tools (say so if AI-assisted and if provisional).", by: ["Your Name"], url: "https://..." }`;
}
function contributionTemplate(number) {
  return `{
  problem: ${number || 1},
  date: "${todayIso()}",
  kind: "partial",           // ${Object.keys(typeof CONTRIBUTION_KINDS !== 'undefined' ? CONTRIBUTION_KINDS : {}).join(', ')}
  title: "Short title of the material",
  material: "explanatory note",   // the type of material: note, manuscript, open-source code, computation, …
  ai: "partial",             // none, partial, full
  by: ["Your Name (Institution)"],
  provisional: true,
  summary: tex\`What the material shows, how, and what remains to be checked.\`,
  url: "https://..."
},`;
}

/* The fixed submission format. buildEntry turns the fields of the Submit form into an entry for the data files;
   serializeEntry writes it as the JavaScript the data files are made of. The submission service in submit/ does the
   same on the server, so an entry submitted through the site and one written by hand look alike. */
function buildEntry(type, f, meta) {
  const by = meta.by || [], ai = meta.ai || '', date = meta.date || todayIso();
  const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  if (type === 'problem') return {
    number: meta.number, title: f.title, status: 'open', goals: list(f.goals), topics: list(f.topics), posedBy: by, curatedBy: [], ai,
    statement: f.statement, background: f.background, relevance: f.relevance, significance: f.significance,
    history: [{ date, kind: 'posed', text: 'Problem posed through the site.', by }],
    references: lines(f.references).map(l => { const i = l.indexOf('|'); return i < 0 ? { text: l, url: '' } : { text: l.slice(0, i).trim(), url: l.slice(i + 1).trim() }; })
  };
  if (type === 'contribution') return { problem: Number(f.problem), date, kind: f.kind, title: f.title, material: f.material, ai, by, provisional: !!f.provisional, summary: f.summary, url: f.url || '' };
  if (type === 'post') return { slug: meta.slug || slug(f.title), title: f.title, date, by, ai, challengeTo: f.challengeTo || '', problems: list(f.problems).map(Number).filter(n => n > 0), summary: f.summary, body: f.body };
  return { title: f.title, proposedBy: by, date, ai, summary: f.summary, description: f.description };
}
function serializeEntry(v, ind = '  ') {
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every(x => typeof x !== 'object' || x === null)) return '[' + v.map(x => serializeEntry(x, ind)).join(', ') + ']';
    return '[\n' + v.map(x => ind + '  ' + serializeEntry(x, ind + '  ')).join(',\n') + '\n' + ind + ']';
  }
  if (v && typeof v === 'object') return '{\n' + Object.keys(v).map(k => `${ind}  ${k}: ${serializeEntry(v[k], ind + '  ')}`).join(',\n') + '\n' + ind + '}';
  if (typeof v === 'string') {
    if (/[\\\n]/.test(v)) return 'tex`' + v.replace(/`/g, '’').replace(/\$\{/g, '$ {').replace(/[\\\s]+$/, '') + '`';
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}
