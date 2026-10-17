/* OpenContext submission service: a Cloudflare Worker that turns a submission made on the site into a pull request once
   the sender has confirmed an institutional e-mail address. Setup is in README.md next to this file; the site reaches it
   through SITE.submit.endpoint in data/site.js. The pure helpers are exported so that test.mjs can exercise them with Node.

   Routes:  GET  /check?domain=…   is this an institutional domain?
            POST /submit           validate, store for 24 h, e-mail a confirmation link
            GET  /verify?t=…       file the stored submission as a pull request, then send the browser back to the site */

import DOMAINS from './domains.js';   // university domains, flattened once by build-domains.mjs from a public list

const FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.br', 'ymail.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it', 'outlook.com', 'outlook.de', 'live.com', 'live.de', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'pm.me', 'gmx.de', 'gmx.net', 'gmx.com', 'gmx.at', 'gmx.ch', 'web.de', 'mail.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'qq.com', '163.com', '126.com', 'zoho.com', 'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io', 'posteo.de', 'libero.it', 'orange.fr', 'free.fr', 'uol.com.br', 'bol.com.br', 'terra.com.br'];
/* Academic suffixes administered by a registry (edu, and the edu.xx / ac.xx entries of the Public Suffix List): an address
   under one of these is accepted without consulting the university list. Anything else that merely contains "edu" or "ac"
   (edu.xyz, ac.io and the like can be registered by anyone) goes through the list. Mirrored in pages/submit.js. */
export const ACADEMIC_SUFFIXES = ['edu', 'ac.ae', 'ac.at', 'ac.bd', 'ac.be', 'ac.bw', 'ac.ci', 'ac.cn', 'ac.cr', 'ac.cy', 'ac.eg', 'ac.fj', 'ac.gn', 'ac.id', 'ac.il', 'ac.im', 'ac.in', 'ac.ir', 'ac.jp', 'ac.ke', 'ac.kr', 'ac.lk', 'ac.ls', 'ac.ma', 'ac.me', 'ac.ml', 'ac.mu', 'ac.mw', 'ac.mz', 'ac.ni', 'ac.np', 'ac.nz', 'ac.pa', 'ac.pg', 'ac.pk', 'ac.pr', 'ac.rs', 'ac.rw', 'ac.se', 'ac.sz', 'ac.th', 'ac.tz', 'ac.ug', 'ac.uk', 'ac.vn', 'ac.za', 'ac.zm', 'ac.zw', 'edu.ac', 'edu.af', 'edu.al', 'edu.ao', 'edu.ar', 'edu.au', 'edu.az', 'edu.ba', 'edu.bb', 'edu.bd', 'edu.bh', 'edu.bi', 'edu.bj', 'edu.bm', 'edu.bn', 'edu.bo', 'edu.br', 'edu.bs', 'edu.bt', 'edu.bz', 'edu.ci', 'edu.ck', 'edu.cn', 'edu.co', 'edu.cu', 'edu.cv', 'edu.cw', 'edu.dm', 'edu.do', 'edu.dz', 'edu.ec', 'edu.ee', 'edu.eg', 'edu.er', 'edu.es', 'edu.et', 'edu.fj', 'edu.fk', 'edu.fm', 'edu.gd', 'edu.ge', 'edu.gh', 'edu.gi', 'edu.gl', 'edu.gn', 'edu.gp', 'edu.gr', 'edu.gt', 'edu.gu', 'edu.gy', 'edu.hk', 'edu.hn', 'edu.ht', 'edu.in', 'edu.io', 'edu.iq', 'edu.it', 'edu.jm', 'edu.jo', 'edu.kg', 'edu.kh', 'edu.ki', 'edu.km', 'edu.kn', 'edu.kp', 'edu.kw', 'edu.ky', 'edu.kz', 'edu.la', 'edu.lb', 'edu.lc', 'edu.lk', 'edu.lr', 'edu.ls', 'edu.lv', 'edu.ly', 'edu.me', 'edu.mg', 'edu.mk', 'edu.ml', 'edu.mm', 'edu.mn', 'edu.mo', 'edu.ms', 'edu.mt', 'edu.mv', 'edu.mw', 'edu.mx', 'edu.my', 'edu.mz', 'edu.ng', 'edu.ni', 'edu.np', 'edu.nr', 'edu.om', 'edu.pa', 'edu.pe', 'edu.pf', 'edu.pg', 'edu.ph', 'edu.pk', 'edu.pl', 'edu.pn', 'edu.pr', 'edu.ps', 'edu.pt', 'edu.py', 'edu.qa', 'edu.rs', 'edu.sa', 'edu.sb', 'edu.sc', 'edu.sd', 'edu.sg', 'edu.sl', 'edu.sn', 'edu.so', 'edu.ss', 'edu.st', 'edu.sv', 'edu.sy', 'edu.tj', 'edu.tm', 'edu.to', 'edu.tr', 'edu.tt', 'edu.tw', 'edu.ua', 'edu.ug', 'edu.uy', 'edu.vc', 'edu.ve', 'edu.vg', 'edu.vn', 'edu.vu', 'edu.ws', 'edu.ye', 'edu.za', 'edu.zm'];
const AI_USE = { none: 'no AI assistance', partial: 'partially AI-assisted (several human–AI iterations)', full: 'fully AI-generated (the output of a single prompt)' };
const KINDS = { claim: 'claimed solution', partial: 'partial result', negative: 'negative result', reformulation: 'reformulation', decomposition: 'decomposition into further problems', evidence: 'computational evidence', verification: 'independent verification', exposition: 'explanatory exposition', challenge: 'challenge to a solution', question: 'question about the statement', comment: 'comment' };
export const TYPES = {
  problem:      { file: 'data/problems.js',      marker: '/* new problems are added above this line */',      label: 'new problem' },
  contribution: { file: 'data/contributions.js', marker: '/* new contributions are added above this line */', label: 'contribution' },
  post:         { file: 'data/posts.js',         marker: '/* new posts are added above this line */',         label: 'blog post' },
  direction:    { file: 'data/goals.js',         marker: '/* new entries are added above this line */',       label: 'broad direction' }
};
const FIELDS = {
  problem: ['title', 'goals', 'topics', 'statement', 'background', 'relevance', 'significance', 'references'],
  contribution: ['problem', 'kind', 'title', 'material', 'summary', 'url', 'provisional'],
  post: ['title', 'summary', 'body', 'problems', 'challengeTo'],
  direction: ['title', 'summary', 'description']
};
const REQUIRED = {
  problem: ['title', 'goals', 'statement', 'background', 'relevance', 'significance'],
  contribution: ['problem', 'kind', 'title', 'material', 'summary'],
  post: ['title', 'summary', 'body'],
  direction: ['title', 'summary', 'description']
};
/* single-line fields and their maximum length; everything else is a text of up to TEXT_MAX characters */
const LINE_MAX = { title: 300, material: 200, url: 2000, goals: 200, topics: 300, problems: 100, challengeTo: 40, problem: 10, kind: 40 };
const TEXT_MAX = 20000;
const LINK_TTL = 24 * 3600;
const RATE = { ip: 10, address: 3 };   // submissions per hour from one network address, and confirmation e-mails to one address

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/check' && request.method === 'GET') {
        const domain = (url.searchParams.get('domain') || '').trim().toLowerCase().slice(0, 253);
        return json({ domain, institutional: isInstitutional(domain, extraDomains(env)) }, 200, cors);
      }
      if (url.pathname === '/submit' && request.method === 'POST') {
        checkOrigin(request, env);
        const sub = validate(await request.json().catch(() => null));
        const domain = sub.email.split('@')[1];
        if (!isInstitutional(domain, extraDomains(env))) return json({ ok: false, error: `${domain} is not recognised as an institutional domain. If it should be, write to the moderators.` }, 400, cors);
        await throttle(env, 'ip:' + (request.headers.get('CF-Connecting-IP') || 'unknown'), RATE.ip, 'Too many submissions from this network address; please try again in an hour.');
        await throttle(env, 'address:' + sub.email, RATE.address, 'Several confirmation e-mails have just been sent to this address; please use one of them, or try again in an hour.');
        const token = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
        await env.SUBMISSIONS.put('sub:' + token, JSON.stringify(sub), { expirationTtl: LINK_TTL });
        await sendMail(env, sub.email, confirmationMail(sub, `${url.origin}/verify?t=${token}`, env));
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/verify' && request.method === 'GET') {
        const token = (url.searchParams.get('t') || '').slice(0, 64);
        const done = token && await env.SUBMISSIONS.get('done:' + token);
        if (done) return redirect(env, { done: '1', pr: done });   // the link opened twice (a mail scanner, a double click) is not an error
        const raw = token && await env.SUBMISSIONS.get('sub:' + token);
        if (!raw) return redirect(env, { error: 'This confirmation link is invalid or has expired (links are valid for 24 hours). Please submit again.' });
        if (await env.SUBMISSIONS.get('lock:' + token)) return redirect(env, { error: 'This submission is already being filed; please wait a moment and open the link again.' });
        await env.SUBMISSIONS.put('lock:' + token, '1', { expirationTtl: 120 });
        const pr = await openPullRequest(JSON.parse(raw), env, crypto.randomUUID().slice(0, 6));
        await env.SUBMISSIONS.put('done:' + token, pr, { expirationTtl: LINK_TTL });
        await env.SUBMISSIONS.delete('sub:' + token);
        return redirect(env, { done: '1', pr });
      }
      return json({ ok: false, error: 'Not found.' }, 404, cors);
    } catch (e) {
      const known = !!(e && e.status && e.status < 500);   // a message meant for the submitter; anything else is logged, not shown
      if (!known) console.error('submission service:', (e && e.stack) || e);
      if (url.pathname === '/verify') return redirect(env, { error: known ? e.message : 'The submission could not be filed because of an error on our side. Please open the link again later, or write to the moderators.' });
      return json({ ok: false, error: known ? e.message : 'Something went wrong on our side; please try again later.' }, (e && e.status) || 500, cors);
    }
  }
};

/* responses */
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const corsHeaders = env => ({ 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' });
function redirect(env, params) {
  const u = new URL(env.SITE_URL || 'https://rafunds3d.github.io/OpenContext/');
  u.hash = '#/submit?' + new URLSearchParams(params).toString();
  return Response.redirect(u.toString(), 303);
}
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
/* browsers send the page's origin with a cross-site POST; a script elsewhere does not get to use the service */
function checkOrigin(request, env) {
  const allowed = env.ALLOWED_ORIGIN;
  if (!allowed || allowed === '*') return;
  if ((request.headers.get('Origin') || '') !== allowed) throw fail('Submissions are accepted from the site only.', 403);
}
async function throttle(env, key, limit, message) {
  const k = 'rate:' + key, n = Number(await env.SUBMISSIONS.get(k)) || 0;
  if (n >= limit) throw fail(message, 429);
  await env.SUBMISSIONS.put(k, String(n + 1), { expirationTtl: 3600 });
}

/* institutional domains: free-mail providers are refused; academic suffixes and EXTRA_DOMAINS accepted at once; everything
   else is looked up in the bundled university list */
export const matchesDomain = (domain, list) => list.some(d => d && (domain === d || domain.endsWith('.' + d)));
export function quickDomainCheck(domain, extra = []) {
  if (!domain || domain.length > 253 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  if (FREE_MAIL.includes(domain)) return false;
  if (matchesDomain(domain, extra)) return true;
  if (matchesDomain(domain, ACADEMIC_SUFFIXES)) return true;
  return null;
}
export function isInstitutional(domain, extra = []) {
  const quick = quickDomainCheck(domain, extra);
  return quick !== null ? quick : matchesDomain(domain, DOMAINS);
}
const extraDomains = env => (env.EXTRA_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

/* validation: only the fields of the chosen type, cleaned and bounded */
const clean = (s, max = TEXT_MAX) => String(s ?? '').slice(0, max + 1).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').split('\n').map(l => l.trimEnd()).join('\n').trim();
const line = (s, max) => clean(s, max).replace(/\s+/g, ' ').trim();
const tooLong = (v, max) => String(v ?? '').length > max;
export function validate(body) {
  if (!body || typeof body !== 'object') throw fail('Malformed submission.');
  if (body.website) throw fail('Rejected.');                      // honeypot field, hidden on the site
  const type = String(body.type || '');
  if (!Object.hasOwn(TYPES, type)) throw fail('Unknown submission type.');
  const email = line(body.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid e-mail address.');
  const by = (Array.isArray(body.by) ? body.by : []).map(s => line(s, 120)).filter(Boolean).slice(0, 10);
  if (!by.length) throw fail('Name at least one human contributor.');
  const ai = String(body.ai || '');
  if (!Object.hasOwn(AI_USE, ai)) throw fail('Say how much AI assistance was used.');
  if (body.consent !== true) throw fail('Confirm that you take responsibility for the material.');
  const raw = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const fields = {};
  for (const k of FIELDS[type]) {
    if (k === 'provisional') { fields[k] = raw[k] === true; continue; }
    const max = Object.hasOwn(LINE_MAX, k) ? LINE_MAX[k] : k === 'summary' && type !== 'contribution' ? 300 : TEXT_MAX;
    if (tooLong(raw[k], max)) throw fail(`The field “${k}” is too long (at most ${max} characters).`);
    fields[k] = max === TEXT_MAX ? clean(raw[k]) : line(raw[k], max);
  }
  for (const k of REQUIRED[type]) if (!fields[k]) throw fail(`The field “${k}” is required.`);
  if (type === 'contribution') {
    fields.problem = parseInt(fields.problem, 10);
    if (!(fields.problem > 0)) throw fail('Choose a problem.');
    if (!Object.hasOwn(KINDS, fields.kind)) throw fail('Choose the kind of contribution.');
    if (fields.url && !/^https?:\/\/\S+$/.test(fields.url)) throw fail('Links must start with http:// or https:// and contain no spaces.');
  }
  if (type === 'post' && fields.challengeTo && !/^[a-z-]{1,40}$/.test(fields.challengeTo)) throw fail('Unknown goal.');
  return { type, email, by, ai, fields };
}

/* Text fields are published as HTML, so that <em>, <strong>, <a>, <code>, <sup>, <sub> and <br> work alongside LaTeX;
   every other tag-shaped piece of text is shown literally, and a link must be http(s). Identical in js/lib.js. */
const ALLOWED_TAGS = { em: 1, strong: 1, b: 1, i: 1, code: 1, sup: 1, sub: 1, br: 1, a: 1 };
export function sanitizeMarkup(s) {
  return String(s ?? '').replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>|<(?=[a-zA-Z!\/?])/g, (m, slash, name, attrs) => {
    if (name === undefined) return '&lt;';
    const n = name.toLowerCase();
    if (ALLOWED_TAGS[n] !== 1) return '&lt;' + m.slice(1);
    if (n === 'a' && !slash) {
      const h = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
      const url = h ? (h[1] ?? h[2]) : '';
      return /^https?:\/\/[^\s"'<>]+$/.test(url) ? `<a href="${url}" rel="noopener">` : '&lt;' + m.slice(1);
    }
    if (attrs.trim()) return '&lt;' + m.slice(1);
    return `<${slash}${n}>`;
  });
}
const webUrl = u => /^https?:\/\/\S+$/.test(u) ? u : '';

/* the entry, in the same shape and order as the hand-written ones (mirrors buildEntry in js/lib.js) */
export function buildEntry(sub, extra) {
  const { type, by, ai, fields: f } = sub, date = extra.date;
  const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const text = sanitizeMarkup;
  if (type === 'problem') return {
    number: extra.number, title: f.title, status: 'open', goals: list(f.goals), topics: list(f.topics), posedBy: by, curatedBy: [], ai,
    statement: text(f.statement), background: text(f.background), relevance: text(f.relevance), significance: text(f.significance),
    history: [{ date, kind: 'posed', text: 'Problem posed through the site.', by }],
    references: lines(f.references).map(l => { const i = l.indexOf('|'); return i < 0 ? { text: l, url: '' } : { text: l.slice(0, i).trim(), url: webUrl(l.slice(i + 1).trim()) }; })
  };
  if (type === 'contribution') return { problem: f.problem, date, kind: f.kind, title: f.title, material: f.material, ai, by, provisional: !!f.provisional, summary: text(f.summary), url: webUrl(f.url || '') };
  if (type === 'post') return { slug: extra.slug, title: f.title, date, by, ai, challengeTo: f.challengeTo || '', problems: list(f.problems).map(Number).filter(n => n > 0), summary: f.summary, body: text(f.body) };
  return { title: f.title, proposedBy: by, date, ai, summary: f.summary, description: text(f.description) };
}
/* written as the JavaScript the data files are made of: tex`…` for text with math or paragraphs, JSON otherwise */
export function serializeEntry(v, ind = '  ') {
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
export const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* Editing the data files. They mix code with tex`…` text that may contain anything, including the marker comments and lines
   that look like entries, so the structure (markers, entry boundaries, arrays) is located in a copy of the file in which the
   insides of string literals (and, when asked, comments) are blanked out, and the edit is then applied to the original at
   the same positions. */
export function structural(src, blankComments = false) {
  let out = '', i = 0;
  const n = src.length, blank = s => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i), j = e < 0 ? n : e; out += blankComments ? blank(src.slice(i, j)) : src.slice(i, j); i = j; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2), j = e < 0 ? n : e + 2; out += blankComments ? blank(src.slice(i, j)) : src.slice(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += c + blank(src.slice(i + 1, j)) + (j < n ? c : '');
      i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}
/* index of the bracket that closes the one at `open` (in text whose strings and comments are blanked), or -1 */
function matching(st, open) {
  const o = st[open], c = o === '[' ? ']' : o === '{' ? '}' : ')';
  let depth = 0;
  for (let i = open; i < st.length; i++) { if (st[i] === o) depth++; else if (st[i] === c && --depth === 0) return i; }
  return -1;
}
/* the values of every `key: "…"` line (read from the original, located in the blanked copy) */
function fieldValues(src, st, key, from = 0, to = src.length) {
  const re = new RegExp(`\\n\\s*${key}: "`, 'g'), out = [];
  re.lastIndex = from;
  let m;
  while ((m = re.exec(st)) && m.index < to) { const start = m.index + m[0].length, end = src.indexOf('"', start); out.push({ start, end: end < 0 ? src.length : end, value: src.slice(start, end < 0 ? src.length : end) }); }
  return out;
}
export function insertBeforeMarker(src, marker, text) {
  const i = structural(src).indexOf(marker);
  if (i < 0) throw fail(`The data file has no “${marker}” line.`, 500);
  const lineStart = src.lastIndexOf('\n', i) + 1;
  return src.slice(0, lineStart) + text + src.slice(lineStart);
}
export const nextProblemNumber = src => Math.max(0, ...[...structural(src, true).matchAll(/\n    number: (\d+),/g)].map(m => Number(m[1]))) + 1;
export function uniqueSlug(base, src) {
  const taken = new Set(fieldValues(src, structural(src, true), 'slug').map(x => x.value));
  let s = base || 'post', i = 2;
  while (taken.has(s)) s = `${base || 'post'}-${i++}`;
  return s;
}
/* the span [start, end) of the entry object with the given `number` in data/problems.js, in blanked text */
export function problemSpan(st, number) {
  const m = new RegExp(`\\n  \\{\\n    number: ${number},`).exec(st);
  if (!m) return null;
  const start = m.index + 3, end = matching(st, start);
  return end < 0 ? null : { start, end: end + 1 };
}
/* Changes a problem's status and records it as a dated history entry (a claimed solution places an open problem under
   revision, as the guidelines prescribe; moderators use it for every other change). opts.from limits the change to
   problems currently in that status. Returns the source unchanged when nothing applies. */
export function markStatus(src, number, to, date, text, opts = {}) {
  const st = structural(src, true);
  const span = problemSpan(st, number);
  if (!span) return src;
  const status = fieldValues(src, st, 'status', span.start, span.end)[0];
  if (!status || status.value === to || (opts.from && status.value !== opts.from)) return src;
  const entry = `{ date: ${JSON.stringify(date)}, kind: "status", to: ${JSON.stringify(to)}, text: ${JSON.stringify(text)}, by: ${JSON.stringify(opts.by || [])} }`;
  let out = src.slice(0, status.start) + to + src.slice(status.end);
  const st2 = structural(out, true), span2 = problemSpan(st2, number);
  const h = /\n    history: \[/.exec(st2.slice(span2.start, span2.end));
  if (h) {
    const open = span2.start + h.index + h[0].length - 1, close = matching(st2, open);
    if (close < 0) return src;
    const inner = out.slice(open + 1, close).replace(/[\s,]+$/, '');
    out = out.slice(0, open) + '[' + (inner.trim() ? inner + ',' : '') + '\n      ' + entry + '\n    ]' + out.slice(close + 1);
  } else {
    const closeBrace = span2.end - 1, before = out.slice(0, closeBrace).replace(/\s+$/, '');
    out = before + (before.endsWith(',') || before.endsWith('{') ? '' : ',') + '\n    history: [\n      ' + entry + '\n    ]\n  ' + out.slice(closeBrace);
  }
  return out;
}
export const markUnderRevision = (src, number, date) => markStatus(src, number, 'under-revision', date, 'A solution has been claimed; the problem is placed under revision.', { from: 'open' });

/* GitHub: a branch, one or two commits, a pull request */
async function gh(env, method, path, body) {
  const r = await fetch('https://api.github.com' + path, {
    method,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'opencontext-submit', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) {
    console.error(`GitHub answered ${r.status} for ${method} ${path.split('?')[0]}: ${(await r.text()).slice(0, 300)}`);
    throw fail(`GitHub answered ${r.status} for ${method} ${path.split('?')[0]}.`, 502);
  }
  return r.status === 204 ? null : r.json();
}
const b64encode = s => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
const b64decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
/* submitter-written text in a pull request or commit message must not close issues or ping people */
const gitText = s => String(s).replace(/@(?=[A-Za-z0-9])/g, '@​').replace(/#(?=\d)/g, '#​');

async function openPullRequest(sub, env, suffix) {
  const [owner, repo] = (env.GITHUB_REPO || '').split('/');
  if (!owner || !repo || !env.GITHUB_TOKEN) throw fail('The service is not configured for GitHub yet (GITHUB_REPO or GITHUB_TOKEN missing).', 500);
  const base = env.GITHUB_BASE || 'main', site = env.SITE_NAME || 'OpenContext';
  const date = new Date().toISOString().slice(0, 10);
  const spec = TYPES[sub.type];
  const head = await gh(env, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${base}`);
  const branch = `submission/${sub.type}-${slugify(sub.fields.title).slice(0, 40) || 'entry'}-${suffix}`;
  await gh(env, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha });
  try {
    const read = async path => { const f = await gh(env, 'GET', `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`); return { sha: f.sha, text: b64decode(f.content) }; };
    const write = (path, sha, text, message) => gh(env, 'PUT', `/repos/${owner}/${repo}/contents/${path}`, { message, content: b64encode(text), sha, branch });

    const file = await read(spec.file);
    const extra = { date };
    if (sub.type === 'problem') extra.number = nextProblemNumber(file.text);
    if (sub.type === 'post') extra.slug = uniqueSlug(slugify(sub.fields.title).slice(0, 60), file.text);
    const entry = buildEntry(sub, extra);
    const label = sub.type === 'problem' ? `Problem ${entry.number}: ${sub.fields.title}`
      : sub.type === 'contribution' ? `${KINDS[sub.fields.kind]} for Problem ${sub.fields.problem}: ${sub.fields.title}`
      : `${spec.label}: ${sub.fields.title}`;
    const who = gitText(sub.by.join(', '));
    await write(spec.file, file.sha, insertBeforeMarker(file.text, spec.marker, '  ' + serializeEntry(entry) + ',\n'), `Add ${gitText(label)}\n\nSubmitted through the site by ${who}.`);

    let statusNote = '';
    if (sub.type === 'contribution' && sub.fields.kind === 'claim') {
      const pf = await read('data/problems.js');
      const next = markUnderRevision(pf.text, sub.fields.problem, date);
      if (next !== pf.text) {
        await write('data/problems.js', pf.sha, next, `Place Problem ${sub.fields.problem} under revision`);
        statusNote = `\n\nThis is a claimed solution, so the pull request also places Problem ${sub.fields.problem} under revision, as the guidelines prescribe. Remove that part of the diff if the claim should not change the status yet.`;
      }
    }
    const body = [
      `Submitted through the ${site} site on ${date}.`, '',
      `- **Type:** ${gitText(label)}`,
      `- **Contributors:** ${who}`,
      `- **Verified institutional address:** ${gitText(sub.email)}`,
      `- **AI assistance:** ${AI_USE[sub.ai]}`,
      ...(sub.fields.url ? [`- **Link:** ${gitText(sub.fields.url)}`] : []),
      ...(sub.fields.provisional ? ['- **Flagged as provisional** by the contributors.'] : []),
      '', 'Merging publishes the entry; the site redeploys by itself within a minute or two. Edit the diff first if anything needs changing, or close the pull request to decline. The text is published as written, with LaTeX and the tags em, strong, a, code, sup, sub and br; any other markup is shown literally.' + statusNote
    ].join('\n');
    const pr = await gh(env, 'POST', `/repos/${owner}/${repo}/pulls`, { title: `Submission: ${gitText(label)}`.slice(0, 250), head: branch, base, body });
    try { await gh(env, 'POST', `/repos/${owner}/${repo}/issues/${pr.number}/labels`, { labels: ['submission'] }); } catch (e) { /* the label needs Issues access on the token; optional */ }
    return pr.html_url;
  } catch (e) {
    try { await gh(env, 'DELETE', `/repos/${owner}/${repo}/git/refs/heads/${branch}`); } catch (e2) { /* a stale branch is harmless; the retry uses a new name */ }
    throw e;
  }
}

/* the confirmation e-mail, through Brevo (default: verifies a sender address, no domain needed) or Resend */
function confirmationMail(sub, link, env) {
  const site = env.SITE_NAME || 'OpenContext', what = TYPES[sub.type].label, title = sub.fields.title;
  const subject = `Confirm your ${site} submission`;
  const text = `You, or someone using this address, submitted a ${what} to ${site}:\n\n    ${title}\n\nTo confirm the address and file the submission, open this link within 24 hours:\n\n    ${link}\n\nThe submission then reaches the moderators as a pull request and appears on the site once they accept it. If you did not submit anything, ignore this message.`;
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = `<p>You, or someone using this address, submitted a ${e(what)} to ${e(site)}:</p><blockquote><strong>${e(title)}</strong></blockquote><p>To confirm the address and file the submission, open this link within 24 hours:</p><p><a href="${e(link)}">${e(link)}</a></p><p>The submission then reaches the moderators as a pull request and appears on the site once they accept it. If you did not submit anything, ignore this message.</p>`;
  return { subject, text, html };
}
async function sendMail(env, to, { subject, text, html }) {
  if (!env.MAIL_API_KEY || !env.MAIL_FROM) throw fail('The service is not configured for e-mail yet (MAIL_API_KEY or MAIL_FROM missing).', 500);
  const provider = (env.MAIL_PROVIDER || 'brevo').toLowerCase();
  let r;
  if (provider === 'resend') {
    r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.MAIL_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, html }) });
  } else {
    const m = /^(.*?)\s*<([^>]+)>\s*$/.exec(env.MAIL_FROM);
    const sender = m ? { name: m[1].replace(/^"|"$/g, ''), email: m[2] } : { email: env.MAIL_FROM };
    r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.MAIL_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, htmlContent: html }) });
  }
  if (!r.ok) {
    console.error(`${provider} answered ${r.status}: ${(await r.text()).slice(0, 300)}`);
    throw fail('The confirmation e-mail could not be sent; please try again later.', 502);
  }
}
