/* The Submit page: one form for the four kinds of submission (a problem, a contribution to an entry, a blog post, a broad
   direction). Every submission names its human contributors, the extent of AI use, and an institutional e-mail address.
   With SITE.submit.endpoint set, the form posts to the submission service in submit/ (see README.md), which e-mails a
   confirmation link and then opens a pull request that a moderator merges to publish. Without it, the form produces the
   entry in the fixed format and an e-mail to the moderators. */

const FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.br', 'ymail.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it', 'outlook.com', 'outlook.de', 'live.com', 'live.de', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'pm.me', 'gmx.de', 'gmx.net', 'gmx.com', 'gmx.at', 'gmx.ch', 'web.de', 'mail.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'qq.com', '163.com', '126.com', 'zoho.com', 'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io', 'posteo.de', 'libero.it', 'orange.fr', 'free.fr', 'uol.com.br', 'bol.com.br', 'terra.com.br'];
/* academic suffixes administered by a registry (edu, and the edu.xx / ac.xx entries of the Public Suffix List); the same list as in submit/worker.js */
const ACADEMIC_SUFFIXES = ['edu', 'ac.ae', 'ac.at', 'ac.bd', 'ac.be', 'ac.bw', 'ac.ci', 'ac.cn', 'ac.cr', 'ac.cy', 'ac.eg', 'ac.fj', 'ac.gn', 'ac.id', 'ac.il', 'ac.im', 'ac.in', 'ac.ir', 'ac.jp', 'ac.ke', 'ac.kr', 'ac.lk', 'ac.ls', 'ac.ma', 'ac.me', 'ac.ml', 'ac.mu', 'ac.mw', 'ac.mz', 'ac.ni', 'ac.np', 'ac.nz', 'ac.pa', 'ac.pg', 'ac.pk', 'ac.pr', 'ac.rs', 'ac.rw', 'ac.se', 'ac.sz', 'ac.th', 'ac.tz', 'ac.ug', 'ac.uk', 'ac.vn', 'ac.za', 'ac.zm', 'ac.zw', 'edu.ac', 'edu.af', 'edu.al', 'edu.ao', 'edu.ar', 'edu.au', 'edu.az', 'edu.ba', 'edu.bb', 'edu.bd', 'edu.bh', 'edu.bi', 'edu.bj', 'edu.bm', 'edu.bn', 'edu.bo', 'edu.br', 'edu.bs', 'edu.bt', 'edu.bz', 'edu.ci', 'edu.ck', 'edu.cn', 'edu.co', 'edu.cu', 'edu.cv', 'edu.cw', 'edu.dm', 'edu.do', 'edu.dz', 'edu.ec', 'edu.ee', 'edu.eg', 'edu.er', 'edu.es', 'edu.et', 'edu.fj', 'edu.fk', 'edu.fm', 'edu.gd', 'edu.ge', 'edu.gh', 'edu.gi', 'edu.gl', 'edu.gn', 'edu.gp', 'edu.gr', 'edu.gt', 'edu.gu', 'edu.gy', 'edu.hk', 'edu.hn', 'edu.ht', 'edu.in', 'edu.io', 'edu.iq', 'edu.it', 'edu.jm', 'edu.jo', 'edu.kg', 'edu.kh', 'edu.ki', 'edu.km', 'edu.kn', 'edu.kp', 'edu.kw', 'edu.ky', 'edu.kz', 'edu.la', 'edu.lb', 'edu.lc', 'edu.lk', 'edu.lr', 'edu.ls', 'edu.lv', 'edu.ly', 'edu.me', 'edu.mg', 'edu.mk', 'edu.ml', 'edu.mm', 'edu.mn', 'edu.mo', 'edu.ms', 'edu.mt', 'edu.mv', 'edu.mw', 'edu.mx', 'edu.my', 'edu.mz', 'edu.ng', 'edu.ni', 'edu.np', 'edu.nr', 'edu.om', 'edu.pa', 'edu.pe', 'edu.pf', 'edu.pg', 'edu.ph', 'edu.pk', 'edu.pl', 'edu.pn', 'edu.pr', 'edu.ps', 'edu.pt', 'edu.py', 'edu.qa', 'edu.rs', 'edu.sa', 'edu.sb', 'edu.sc', 'edu.sd', 'edu.sg', 'edu.sl', 'edu.sn', 'edu.so', 'edu.ss', 'edu.st', 'edu.sv', 'edu.sy', 'edu.tj', 'edu.tm', 'edu.to', 'edu.tr', 'edu.tt', 'edu.tw', 'edu.ua', 'edu.ug', 'edu.uy', 'edu.vc', 'edu.ve', 'edu.vg', 'edu.vn', 'edu.vu', 'edu.ws', 'edu.ye', 'edu.za', 'edu.zm'];
const SUBMIT_TYPES = { problem: 'A new problem', contribution: 'A contribution to an existing problem', post: 'A blog post', direction: 'A broad direction for a later cycle' };
const SUBMIT_PREFIX = { problem: 'p-', contribution: 'c-', post: 'b-', direction: 'd-' };
const SUBMIT_FILE = { problem: 'data/problems.js', contribution: 'data/contributions.js', post: 'data/posts.js', direction: 'data/goals.js (FUTURE_GOALS)' };
/* the comment line in each data file above which new entries go (the same markers as in submit/worker.js) */
const SUBMIT_MARKER = { problem: 'new problems are added above this line', contribution: 'new contributions are added above this line', post: 'new posts are added above this line', direction: 'new entries are added above this line' };
const emailHint = () => (submitEndpoint() ? 'A confirmation link is sent here. ' : 'Send the prepared entry from this address. ') + 'The address is seen by the moderators and is not published.';

function emailDomain(email) { const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(String(email || '').trim().toLowerCase()); return m ? m[1] : ''; }
/* 'free' (a free-mail provider), 'institutional' (recognised without asking anyone), or 'unknown' (the service, or the moderators, decide). */
function domainStatus(domain) {
  if (!domain) return 'unknown';
  if (FREE_MAIL.includes(domain)) return 'free';
  const under = list => list.some(d => domain === d || domain.endsWith('.' + d));
  if (under((SITE.submit && SITE.submit.extraDomains) || [])) return 'institutional';
  if (under(ACADEMIC_SUFFIXES)) return 'institutional';
  return 'unknown';
}
const submitEndpoint = () => ((SITE.submit && SITE.submit.endpoint) || '').replace(/\/+$/, '');

function viewSubmit(params) {
  const done = params.get('done'), error = (params.get('error') || '').slice(0, 400);
  const pr = /^https:\/\/github\.com\/[^\s"'<>]+$/.test(params.get('pr') || '') ? params.get('pr') : '';   // only what the service sends back
  const outcome = done ? `<p class="callout ok">Thank you: your submission has been filed${pr ? ` as <a href="${esc(pr)}" rel="noopener">a pull request</a>` : ''}. It reaches the moderators now and appears on the site, with a timestamp and the names of its contributors, once they accept it.</p>`
    : error ? `<p class="callout err">${esc(error)}</p>` : '';
  const type = SUBMIT_TYPES[params.get('type')] ? params.get('type') : (params.get('problem') ? 'contribution' : 'problem');
  const problem = parseInt(params.get('problem'), 10);
  const field = (id, label, control, help) => `<div class="field"><label for="${id}">${label}</label>${control}${help ? `<p class="help">${help}</p>` : ''}</div>`;
  const text = (name, ph, req, kind = 'text', max) => `<input id="${name}" name="${name}" type="${kind}" placeholder="${esc(ph)}"${req ? ' data-req' : ''}${max ? ` maxlength="${max}"` : ''} autocomplete="off">`;
  const area = (name, rows, ph, req) => `<textarea id="${name}" name="${name}" rows="${rows}" placeholder="${esc(ph)}"${req ? ' data-req' : ''} maxlength="20000"></textarea>`;
  const mathHelp = 'Inline math between <code>\\(</code> and <code>\\)</code>, display math between <code>\\[</code> and <code>\\]</code>. A blank line starts a new paragraph.';
  const ep = submitEndpoint();
  return `<h1 class="page-title">Submit</h1>
  ${outcome}
  <div class="prose">
  <p>Submissions come from researchers: we ask for an institutional e-mail address, which you confirm ${ep ? 'by clicking a link we send you' : 'by sending us the prepared entry from that address'}, and for the name of at least one human contributor who takes responsibility for the material. Every submission is recorded in the fixed format of the companion paper, with a title, the type of material for a contribution to an entry, the extent to which AI tools were used, and the names of its contributors, and reaches the moderators for a lightweight check before it appears on the site. Moderators do not adjudicate correctness; the community does, openly, on the entry. Please read the <a href="#/contribute?to=practices">best practices</a> first; in particular, do not submit other researchers' unpublished material without their consent.</p>
  </div>
  <form id="submit-form" class="form" novalidate data-type="${type}">
    <div class="field"><label for="sub-type">What are you submitting?</label>
      <select id="sub-type" name="type">${Object.entries(SUBMIT_TYPES).map(([k, v]) => `<option value="${k}"${k === type ? ' selected' : ''}>${v}</option>`).join('')}</select></div>

    <fieldset data-for="problem"><legend>The problem</legend>
      ${field('p-title', 'Title', text('p-title', 'Short descriptive title', true, 'text', 300))}
      <div class="field"><span class="label">Goal or goals it traces to</span><div class="checks">${GOALS.map(g => `<label><input type="checkbox" name="p-goals" value="${g.id}"> ${g.numeral}. ${esc(g.title)}</label>`).join('')}</div></div>
      ${field('p-topics', 'Topics', text('p-topics', 'Comma-separated, e.g. Wigner function, Sample complexity', false, 'text', 300), 'Finer tags; see the <a href="#/tags">topics</a> already in use.')}
      ${field('p-statement', 'Statement', area('p-statement', 6, 'Precise statement, with fixed objects and assumptions, so that what counts as a solution is unambiguous.', true), 'Clarity. ' + mathHelp)}
      ${field('p-background', 'Background', area('p-background', 8, 'What a reader needs to understand the statement, with references in the form [Author Year].', true))}
      ${field('p-relevance', 'Relevance', area('p-relevance', 5, 'How the problem is motivated within the existing literature, and which long-term goal(s) it traces to.', true))}
      ${field('p-significance', 'Significance', area('p-significance', 5, 'How its resolution would meaningfully advance those goal(s).', true), 'Say also why the problem is feasible: plausibly tackled with existing techniques and near-term AI assistance.')}
      ${field('p-references', 'References', area('p-references', 5, 'One per line: Author, Title, Journal (Year) | https://...'), 'Separate a link from the citation with a vertical bar.')}
    </fieldset>

    <fieldset data-for="contribution"><legend>The contribution</legend>
      ${field('c-problem', 'Problem', `<select id="c-problem" name="c-problem">${PROBLEMS.slice().sort(byNumber).map(p => `<option value="${p.number}"${p.number === problem ? ' selected' : ''}>Problem ${p.number}: ${esc(plain(p.title))} (${esc(statusInfo(p.status).label)})</option>`).join('')}</select>`)}
      ${field('c-kind', 'Kind of contribution', `<select id="c-kind" name="c-kind" data-req><option value="" selected>Choose…</option>${Object.entries(CONTRIBUTION_KINDS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select>`, 'A claimed solution places the problem under revision. A proof of a weakened or modified statement is a partial result, not a claim.')}
      ${field('c-title', 'Title', text('c-title', 'Short title of the material', true, 'text', 300))}
      ${field('c-material', 'Type of material', text('c-material', 'e.g. explanatory note, manuscript, open-source code, numerical computation', true, 'text', 200))}
      ${field('c-summary', 'Summary', area('c-summary', 7, 'What the material shows, how, and what remains to be checked.', true), mathHelp)}
      ${field('c-url', 'Link', text('c-url', 'https://... (a preprint, a repository, a note)', false, 'url', 2000), 'Optional. For a claimed solution, a preprint with a DOI is what the guidelines ask for.')}
      <div class="field"><label class="check"><input type="checkbox" name="c-provisional"> This material is provisional: incomplete, unpolished, or only partially verified.</label></div>
    </fieldset>

    <fieldset data-for="post"><legend>The post</legend>
      ${field('b-title', 'Title', text('b-title', 'Title of the post', true, 'text', 300))}
      ${field('b-summary', 'Summary', text('b-summary', 'One sentence on what the post is about', true, 'text', 300), 'At most 300 characters.')}
      ${field('b-body', 'Text', area('b-body', 12, 'The post itself.', true), mathHelp)}
      ${field('b-problems', 'Problems it is about', text('b-problems', 'Problem numbers, comma-separated, e.g. 1, 3', false, 'text', 100), 'Optional.')}
      ${field('b-challengeTo', 'A challenge to a goal?', `<select id="b-challengeTo" name="b-challengeTo"><option value="">No, a discussion</option>${GOALS.map(g => `<option value="${g.id}">Yes, to Goal ${g.numeral}: ${esc(g.title)}</option>`).join('')}</select>`, 'A challenge states the objection, the assumption or motivation it contests, and what the goal would lose if the objection held.')}
    </fieldset>

    <fieldset data-for="direction"><legend>The direction</legend>
      ${field('d-title', 'Name of the direction', text('d-title', 'Name of the direction', true, 'text', 300))}
      ${field('d-summary', 'Summary', text('d-summary', 'One sentence on what the direction is', true, 'text', 300), 'At most 300 characters.')}
      ${field('d-description', 'Description', area('d-description', 8, 'The line of inquiry, why it should organize part of a later list, and what near-term problems would trace back to it.', true), mathHelp)}
    </fieldset>

    <fieldset class="common"><legend>Who is responsible</legend>
      ${field('sub-by', 'Human contributors', text('sub-by', 'Ada Lovelace (University of X), Charles Babbage (Institute Y)', true), 'At least one named person who takes responsibility for the material; comma-separated, affiliations in brackets. These names are published.')}
      ${field('sub-email', 'Institutional e-mail address', text('sub-email', 'you@your-institution.edu', true, 'email'), `<span id="email-hint">${emailHint()}</span>`)}
      ${field('sub-ai', 'AI assistance', `<select id="sub-ai" name="ai">${Object.entries(AI_USE).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>`, 'Fully: the output of a single prompt. Partially: produced over several human–AI iterations.')}
      <div class="field"><label class="check"><input type="checkbox" name="consent" data-req> I take responsibility for this material, I have read the <a href="#/contribute?to=practices">best practices</a>, and I agree to its publication${SITE.license ? ` under ${esc(SITE.license)}` : ''} with my name.</label></div>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    </fieldset>
    <p id="submit-msg" class="callout err" hidden></p>
    <p class="form-actions"><button class="btn" type="submit">Submit</button> <span class="small muted">${ep ? 'You will receive a link to confirm your address.' : 'The entry is prepared for you to send to the moderators.'}</span></p>
  </form>
  <div id="submit-result"></div>`;
}

/* wiring, called by the router after the page is rendered */
function initSubmitForm() {
  const f = $('#submit-form');
  if (!f || f.dataset.ready) return;
  f.dataset.ready = '1';
  const toggle = () => { const t = f.elements.namedItem('type').value; f.dataset.type = t; for (const fs of f.querySelectorAll('fieldset[data-for]')) fs.hidden = fs.dataset.for !== t; };
  toggle();
  f.elements.namedItem('type').addEventListener('change', toggle);
  const email = f.elements.namedItem('sub-email'), hint = $('#email-hint');
  let timer;
  email.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => showEmailHint(email, hint), 400); });
  f.addEventListener('submit', onSubmit);
}
async function showEmailHint(email, hint) {
  const d = emailDomain(email.value);
  const set = (t, cls) => { hint.textContent = t; hint.className = cls || ''; };
  if (!d) return set(emailHint());
  const s = domainStatus(d);
  if (s === 'free') return set(`${d} is a free-mail provider; please use your institutional address.`, 'bad');
  if (s === 'institutional') return set(`${d} is recognised as an institutional domain.`, 'good');
  const ep = submitEndpoint();
  if (ep) {
    set(`Checking ${d}…`);
    try {
      const r = await fetch(`${ep}/check?domain=${encodeURIComponent(d)}`);
      const j = await r.json();
      if (emailDomain(email.value) !== d) return;                       // the address changed while the answer was on its way
      if (!r.ok || typeof j.institutional !== 'boolean') throw new Error('no answer');
      return j.institutional ? set(`${d} is recognised as an institutional domain.`, 'good') : set(`${d} is not in our list of institutional domains. If it should be, write to the moderators${SITE.contact ? ` at ${SITE.contact}` : ''}.`, 'bad');
    } catch (e) { if (emailDomain(email.value) !== d) return; /* else fall through to the generic hint */ }
  }
  set(`${d} is not in our list of recognised institutional domains; the moderators will check it.`, 'warn');
}
function labelOf(f, el) { const l = f.querySelector(`label[for="${el.id}"]`); return l ? l.textContent.trim() : el.name; }
/* "Ada Lovelace (University of California, Berkeley), Charles Babbage (Institute Y)": commas inside brackets do not separate people */
const splitNames = s => String(s || '').split(/,(?![^()]*\))/).map(x => x.trim()).filter(Boolean);
async function onSubmit(e) {
  e.preventDefault();
  const f = e.target, msg = $('#submit-msg'), out = $('#submit-result');
  const type = f.dataset.type, prefix = SUBMIT_PREFIX[type];
  const fields = {}, missing = [];
  for (const el of f.querySelectorAll(`[name^="${prefix}"]`)) {
    const key = el.name.slice(prefix.length);
    if (el.type === 'checkbox') { if (key === 'goals') { if (el.checked) fields.goals = (fields.goals ? fields.goals + ', ' : '') + el.value; } else fields[key] = el.checked; }
    else fields[key] = el.value.trim();
    if (el.hasAttribute('data-req') && !el.value.trim()) missing.push(labelOf(f, el));
  }
  if (type === 'problem' && !fields.goals) missing.push('Goal');
  const by = splitNames(f.elements.namedItem('sub-by').value);
  const email = f.elements.namedItem('sub-email').value.trim();
  const ai = f.elements.namedItem('ai').value;
  if (!by.length) missing.push('Human contributors');
  if (!emailDomain(email)) missing.push('Institutional e-mail address');
  if (!f.elements.namedItem('consent').checked) missing.push('the responsibility statement');
  const say = t => { msg.innerHTML = t; msg.hidden = false; msg.scrollIntoView({ block: 'nearest' }); };
  if (missing.length) return say(`Please fill in: ${missing.map(esc).join(', ')}.`);
  if (domainStatus(emailDomain(email)) === 'free') return say('Please use your institutional e-mail address rather than a free-mail provider.');
  if (type === 'contribution' && fields.url && !/^https?:\/\/\S+$/.test(fields.url)) return say('Links must start with http:// or https:// and contain no spaces.');
  msg.hidden = true;
  const payload = { type, email, by, ai, consent: true, fields, website: f.elements.namedItem('website').value };
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
  try { await sendSubmission(payload, f, out); } finally { btn.disabled = false; }
}
async function sendSubmission(payload, f, out) {
  const ep = submitEndpoint();
  if (ep) {
    try {
      const r = await fetch(`${ep}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => { throw new Error('The submission service could not be reached.'); });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `The submission service answered with an error (${r.status}).`);
      out.innerHTML = `<p class="callout ok">Thank you. A confirmation link has been sent to <strong>${esc(payload.email)}</strong>; it is valid for 24 hours. Open it to file the submission: it then reaches the moderators as a pull request and appears on the site once they accept it. If nothing arrives, check your spam folder.</p>`;
      f.hidden = true;
    } catch (err) {
      out.innerHTML = `<p class="callout err">${esc(err.message)} You can instead send the entry below to the moderators yourself.</p>${fallbackHtml(payload)}`;
    }
  } else out.innerHTML = fallbackHtml(payload);
  out.scrollIntoView();
  typeset(out);
}
/* Without a submission service: the entry in the fixed format, to copy or to e-mail to the moderators. */
function fallbackHtml(payload) {
  const number = PROBLEMS.reduce((m, p) => Math.max(m, p.number), 0) + 1;
  const entry = buildEntry(payload.type, payload.fields, { by: payload.by, ai: payload.ai, date: todayIso(), number });
  const file = SUBMIT_FILE[payload.type], marker = SUBMIT_MARKER[payload.type];
  const code = serializeEntry(entry) + ',';
  const header = `${SITE.name} submission: ${SUBMIT_TYPES[payload.type].toLowerCase()}\nContributors: ${payload.by.join(', ')}\nAI assistance: ${aiUseLabel(payload.ai)}\nFile: ${file}, above the “${marker}” line\n\n`;
  /* mail clients cap the length of a mailto: link, so a long entry travels on the clipboard instead of in the link */
  const full = encodeURIComponent(header + code);
  const body = full.length < 1800 ? full : encodeURIComponent(header + '(paste here the entry copied from the Submit page)\n');
  const mailto = SITE.contact ? `mailto:${encodeURIComponent(SITE.contact)}?subject=${encodeURIComponent(SITE.name + ' submission: ' + entry.title)}&amp;body=${body}` : '';
  return `<div class="prose"><p>Here is your entry in the fixed format, ready for <code>${esc(file)}</code>. ${mailto ? `<a class="btn btn-small" href="${mailto}">Send it to the moderators</a> from your institutional address${full.length < 1800 ? '' : ' (copy the entry into the message with the button below)'}${SITE.repo ? ', or ' : '.'}` : ''}${SITE.repo ? `<a href="${esc(SITE.repo)}" rel="noopener">open a pull request</a> that adds it above the “${esc(marker)}” line of that file.` : ''} <button class="btn btn-quiet btn-small" type="button" data-copy="entry-code">Copy</button></p></div>
  <pre id="entry-code">${esc(header + code)}</pre>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const el = document.getElementById(b.dataset.copy);
  if (!el || !navigator.clipboard) return;
  navigator.clipboard.writeText(el.textContent).then(() => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1500); });
});
