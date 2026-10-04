/* Shared machinery: helpers, derived data, and the pieces that pages are assembled from
   (apple icons, status labels, rows, the problem and criteria boxes, templates). Rarely needs editing. */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

/* derived data */
const goalById = id => GOALS.find(g => g.id === id);
const problemGoals = p => (p.goals || []).map(goalById).filter(Boolean);
const problemsForGoal = g => PROBLEMS.filter(p => (p.goals || []).includes(g.id));
const statusInfo = s => STATUSES[s] || { label: s, closed: false };
const isClosed = p => statusInfo(p.status).closed;
const updatedOf = p => (p.history || []).reduce((m, h) => (h.date || '') > m ? h.date : m, '') || SITE.started;
const statusSince = p => { const h = (p.history || []).filter(x => x.kind === 'status' || x.kind === 'posed').sort((a, b) => (b.date || '').localeCompare(a.date || '')); return h.length ? h[0].date : updatedOf(p); };
const latest = () => PROBLEMS.reduce((m, p) => updatedOf(p) > m ? updatedOf(p) : m, '');
const byDateDesc = (a, b) => updatedOf(b).localeCompare(updatedOf(a)) || a.number - b.number;
const byNumber = (a, b) => a.number - b.number;
const problemUrl = p => `#/problem/${p.number}`;
const problemLabel = p => `Problem ${p.number}`;

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
  return [problemLabel(p), p.title, p.statement, p.background, p.motivation, (p.topics || []).join(' '), problemGoals(p).map(g => g.title).join(' '),
    (p.posedBy || []).join(' '), (p.history || []).map(h => h.text).join(' ')].filter(Boolean).join(' ').replace(/<[^>]+>/g, ' ').toLowerCase();
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
function criteriaBox() {
  return `<section class="cbox" aria-label="Curation criteria">
    <div class="cbox-title">BOX I: Curation criteria</div>
    <dl>
      <div><dt>(Clarity)</dt> <dd>The problem must be precisely stated, with fixed objects and assumptions, so that what counts as a solution is unambiguous and the problem can be readily prompted into an AI agent.</dd></div>
      <div><dt>(Relevance)</dt> <dd>The problem must be well-motivated within the existing literature and traceable to at least one of the program's long-term goals, so that its resolution would meaningfully advance that agenda rather than merely adding a technical result.</dd></div>
      <div><dt>(Feasibility)</dt> <dd>The problem must be plausibly tackled with existing techniques and near-term AI assistance: not necessarily easy, but not so far beyond current methods that even formulating a strategy is out of reach.</dd></div>
    </dl>
  </section>`;
}
function featuresBox() {
  return `<section class="cbox" aria-label="Core database features">
    <div class="cbox-title">BOX II: Core database features</div>
    <dl>
      <div><dt>Live problem status.</dt> <dd>Every problem carries a status that is updated as work proceeds rather than fixed at the time of writing: <span class="st st-open">open</span>, <span class="st st-proved">proved</span> or <span class="st st-disproved">disproved</span> for mathematical statements, and <span class="st st-under-revision">under revision</span> or <span class="st st-complete">complete</span> for laborious, non-mathematical tasks. Each change is dated.</dd></div>
      <div><dt>Partial advances.</dt> <dd>Researchers, with or without AI assistance, can submit attempted solutions, partial or negative results, useful reformulations, computational evidence, or pointed questions about a problem's statement or scope, directly to its entry, so that no contribution is lost between listing and resolution.</dd></div>
      <div><dt>Unpolished, provisional material.</dt> <dd>Submissions need not be complete or rigorous to be recorded. A promising but unpolished argument, an incomplete proof, or a partially verified computation can be submitted explicitly as provisional and flagged for revision, so that early progress remains visible.</dd></div>
      <div><dt>Revision and “digestion”.</dt> <dd>Once submitted, material is available for other researchers, and other AI agents, to inspect, revise, extend, or challenge. Open revision and scrutiny is what turns a provisional attempt into a trusted candidate solution.</dd></div>
      <div><dt>Dissemination.</dt> <dd>As an entry accumulates contributions, those involved in its statement, attempted solutions, and revisions can collectively decide whether the result merits a manuscript. The entry makes it straightforward to reconstruct who contributed what, and when.</dd></div>
      <div><dt>Result updates.</dt> <dd>Once a manuscript from a listed problem is published, its entry stays open to corrections, simplified proofs, generalizations, and follow-ups. A problem is closed only once published work exists.</dd></div>
    </dl>
  </section>`;
}
function problemTemplate() {
  return `{
  number: ${PROBLEMS.reduce((m, p) => Math.max(m, p.number), 0) + 1},
  title: "Short descriptive title",
  status: "open",            // open, proved, disproved, under-revision, complete
  goals: ["classicality"],   // classicality, framework, applications (one or more)
  topics: ["Topic one", "Topic two"],
  posedBy: ["Your Name"],
  curatedBy: [],
  statement: tex\`Precise statement. Inline math between \\( and \\),
display math between \\[ and \\]. A blank line starts a new paragraph.\`,
  background: tex\`What a reader needs to understand the statement, with references.\`,
  motivation: tex\`Why resolving it would advance the goal it is filed under.\`,
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
