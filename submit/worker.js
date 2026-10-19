/* OpenContext submission and moderation service: a Cloudflare Worker that turns a submission made on the site into a
   pull request once the sender has confirmed an institutional e-mail address, and that lets the moderators sign in on the
   site to edit entries, add them, and accept or decline submissions without touching GitHub. Setup is in README.md next
   to this file; the site reaches it through SITE.submit.endpoint in data/site.js. The pure helpers are exported so that
   test.mjs can exercise them with Node.

   Submissions:  GET  /check?domain=…        is this an institutional domain?
                 POST /submit                validate, store for 24 h, e-mail a confirmation link
                 GET  /verify?t=…            file the stored submission as a pull request, then send the browser back to the site
   Moderators:   POST /login                 e-mail a sign-in link to an address on MODERATOR_EMAILS
                 POST /session               exchange the link's token for a session token (30 days)
                 GET  /me                    who is signed in;  POST /logout ends the session
                 GET  /entry?list=&index=    the source of one entry of a data file, as it is in the repository
                 POST /edit, /add, /remove   replace, append or delete an entry: a commit to the base branch, or a pull
                                             request when EDIT_MODE is "pull-request"
                 GET  /queue, /pr?number=    the open pull requests, and one pull request's changes
                 POST /accept, /decline      merge or close a pull request
   Every moderator route needs the header "Authorization: Bearer <session token>". */

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
const LOGIN_TTL = 15 * 60;             // a sign-in link is valid for 15 minutes
const SESSION_TTL = 30 * 24 * 3600;    // a moderator stays signed in for 30 days
const RATE = { ip: 10, address: 3 };   // submissions (or sign-in requests) per hour from one network address, and e-mails to one address
/* the lists a moderator can edit on the site, and the files they live in; the entries are the direct elements of each list */
export const LISTS = { PROBLEMS: 'data/problems.js', CONTRIBUTIONS: 'data/contributions.js', POSTS: 'data/posts.js', FUTURE_GOALS: 'data/goals.js', GOALS: 'data/goals.js' };
const MARKERS = { PROBLEMS: TYPES.problem.marker, CONTRIBUTIONS: TYPES.contribution.marker, POSTS: TYPES.post.marker, FUTURE_GOALS: TYPES.direction.marker };
const MODERATOR_ROUTES = ['/me', '/logout', '/entry', '/edit', '/add', '/remove', '/queue', '/pr', '/accept', '/decline'];

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
      if (url.pathname === '/login' && request.method === 'POST') {
        checkOrigin(request, env);
        const body = await request.json().catch(() => null);
        const email = line(body && body.email, 200).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid e-mail address.');
        const mod = findModerator(env, email);
        await throttle(env, 'login-ip:' + (request.headers.get('CF-Connecting-IP') || 'unknown'), RATE.ip, 'Too many sign-in requests from this network address; please try again in an hour.');
        await throttle(env, 'login:' + email, RATE.address, 'Several sign-in links have just been sent to this address; please use one of them, or try again in an hour.');
        const token = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
        await env.SUBMISSIONS.put('login:' + token, JSON.stringify({ email }), { expirationTtl: LOGIN_TTL });
        await sendMail(env, email, loginMail(mod, siteLink(env, '#/moderate?login=' + token), env));
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/session' && request.method === 'POST') {
        checkOrigin(request, env);
        const body = await request.json().catch(() => null);
        const login = String((body && body.login) || '').slice(0, 64);
        const raw = login && await env.SUBMISSIONS.get('login:' + login);
        if (!raw) throw fail('This sign-in link is invalid or has already been used, or it has expired (links are valid for 15 minutes). Please request a new one.');
        await env.SUBMISSIONS.delete('login:' + login);
        const mod = findModerator(env, JSON.parse(raw).email);
        const token = crypto.randomUUID() + crypto.randomUUID();
        await env.SUBMISSIONS.put('session:' + token, JSON.stringify({ email: mod.email, since: new Date().toISOString() }), { expirationTtl: SESSION_TTL });
        return json({ ok: true, token, email: mod.email, name: mod.name, expires: Date.now() + SESSION_TTL * 1000, mode: editMode(env) }, 200, cors);
      }
      if (!MODERATOR_ROUTES.includes(url.pathname)) return json({ ok: false, error: 'Not found.' }, 404, cors);
      return json(await moderate(request, env, url), 200, cors);
    } catch (e) {
      const known = !!(e && e.status && (e.status < 500 || MODERATOR_ROUTES.includes(url.pathname)));   // a message meant for the sender; moderators also see GitHub's answers
      if (!(e && e.status && e.status < 500)) console.error('submission service:', (e && e.stack) || e);
      if (url.pathname === '/verify') return redirect(env, { error: known ? e.message : 'The submission could not be filed because of an error on our side. Please open the link again later, or write to the moderators.' });
      return json({ ok: false, error: known ? e.message : 'Something went wrong on our side; please try again later.' }, (e && e.status) || 500, cors);
    }
  }
};

/* responses */
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const corsHeaders = env => ({ 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' });
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
  /* the entry before the marker may lack its trailing comma (hand edits often do); add it, after that entry */
  const before = structural(src.slice(0, lineStart), true), last = before.search(/\S\s*$/), prev = last < 0 ? '' : before[last];
  const comma = prev && prev !== ',' && prev !== '[' ? last + 1 : -1;
  const head = comma < 0 ? src.slice(0, lineStart) : src.slice(0, comma) + ',' + src.slice(comma, lineStart);
  return head + text + src.slice(lineStart);
}
export const nextProblemNumber = src => Math.max(0, ...[...structural(src, true).matchAll(/\n\s*number: (\d+)\s*,/g)].map(m => Number(m[1]))) + 1;
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
    throw Object.assign(fail(`GitHub answered ${r.status} for ${method} ${path.split('?')[0]}.`, 502), { ghStatus: r.status });
  }
  return r.status === 204 ? null : r.json();
}
function ghRepo(env) {
  const repo = env.GITHUB_REPO || '';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !env.GITHUB_TOKEN) throw fail('The service is not configured for GitHub yet (GITHUB_REPO or GITHUB_TOKEN missing).', 500);
  return { repo, base: env.GITHUB_BASE || 'main' };
}
async function readFile(env, path, ref) {
  const f = await gh(env, 'GET', `/repos/${ghRepo(env).repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
  return { sha: f.sha, text: b64decode(f.content) };
}
/* a commit of one file; `author` names the moderator who made the change on the site */
const writeFile = (env, path, sha, text, message, branch, author) => gh(env, 'PUT', `/repos/${ghRepo(env).repo}/contents/${path}`, { message, content: b64encode(text), sha, branch, ...(author ? { author } : {}) });
const b64encode = s => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
const b64decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
/* submitter-written text in a pull request or commit message must not close issues or ping people */
const gitText = s => String(s).replace(/@(?=[A-Za-z0-9])/g, '@​').replace(/#(?=\d)/g, '#​');

async function openPullRequest(sub, env, suffix) {
  const { repo, base } = ghRepo(env), site = env.SITE_NAME || 'OpenContext';
  const date = new Date().toISOString().slice(0, 10);
  const spec = TYPES[sub.type];
  const head = await gh(env, 'GET', `/repos/${repo}/git/ref/heads/${base}`);
  const branch = `submission/${sub.type}-${slugify(sub.fields.title).slice(0, 40) || 'entry'}-${suffix}`;
  await gh(env, 'POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha });
  try {
    const read = path => readFile(env, path, branch);
    const write = (path, sha, text, message) => writeFile(env, path, sha, text, message, branch);

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
    const pr = await gh(env, 'POST', `/repos/${repo}/pulls`, { title: `Submission: ${gitText(label)}`.slice(0, 250), head: branch, base, body });
    try { await gh(env, 'POST', `/repos/${repo}/issues/${pr.number}/labels`, { labels: ['submission'] }); } catch (e) { /* the label needs Issues access on the token; optional */ }
    return pr.html_url;
  } catch (e) {
    try { await gh(env, 'DELETE', `/repos/${repo}/git/refs/heads/${branch}`); } catch (e2) { /* a stale branch is harmless; the retry uses a new name */ }
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

/* ===== Moderation: signed-in moderators edit the data files and handle pull requests from the site ===== */

/* MODERATOR_EMAILS is a comma-separated list of "Ada Lovelace <ada@uni.edu>" or bare addresses (semicolons work too) */
export function parseModerators(s) {
  return String(s || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => {
    const m = /^(.*?)\s*<([^<>\s]+)>$/.exec(x), email = (m ? m[2] : x).toLowerCase();
    return { email, name: (m && m[1].replace(/^"|"$/g, '').trim()) || email.split('@')[0] };
  }).filter(m => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email));
}
function findModerator(env, email) {
  const list = parseModerators(env.MODERATOR_EMAILS);
  if (!list.length) throw fail('The service has no moderator list yet (MODERATOR_EMAILS in wrangler.toml).', 503);
  const mod = list.find(m => m.email === String(email || '').toLowerCase());
  if (!mod) throw fail('This address is not on the moderator list.', 403);
  return mod;
}
const editMode = env => (env.EDIT_MODE || '').toLowerCase() === 'pull-request' ? 'pull-request' : 'direct';
function siteLink(env, hash) { const u = new URL(env.SITE_URL || 'https://rafunds3d.github.io/OpenContext/'); u.hash = hash; return u.toString(); }
/* the session behind "Authorization: Bearer …"; an address taken off the moderator list loses its sessions at once */
async function moderator(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim().slice(0, 80) : '';
  const raw = token && await env.SUBMISSIONS.get('session:' + token);
  if (!raw) throw fail('Please sign in.', 401);
  let mod;
  try { mod = findModerator(env, JSON.parse(raw).email); }
  catch (e) { await env.SUBMISSIONS.delete('session:' + token); throw e; }
  return { ...mod, token };
}
function loginMail(mod, link, env) {
  const site = env.SITE_NAME || 'OpenContext';
  const subject = `Sign in to ${site} as a moderator`;
  const text = `Hello ${mod.name},\n\nTo sign in to ${site} as a moderator, open this link within 15 minutes and press the button on the page:\n\n    ${link}\n\nYou then stay signed in on that browser for 30 days. If you did not request this, ignore this message.`;
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = `<p>Hello ${e(mod.name)},</p><p>To sign in to ${e(site)} as a moderator, open this link within 15 minutes and press the button on the page:</p><p><a href="${e(link)}">${e(link)}</a></p><p>You then stay signed in on that browser for 30 days. If you did not request this, ignore this message.</p>`;
  return { subject, text, html };
}

async function moderate(request, env, url) {
  const mod = await moderator(request, env);
  const get = request.method === 'GET', post = request.method === 'POST';
  if (post) checkOrigin(request, env);
  const body = post ? (await request.json().catch(() => null)) || {} : {};
  const route = url.pathname;
  if (route === '/me' && get) return { ok: true, email: mod.email, name: mod.name, mode: editMode(env), repo: env.GITHUB_REPO || '' };
  if (route === '/logout' && post) { await env.SUBMISSIONS.delete('session:' + mod.token); return { ok: true }; }

  if (route === '/entry' && get) {
    const { list, index } = where(url.searchParams.get('list'), url.searchParams.get('index'));
    const file = await readFile(env, LISTS[list], ghRepo(env).base);
    const at = locate(file.text, list, index, url.searchParams.get('key'));
    return { ok: true, list, index: at, file: LISTS[list], source: entryAt(file.text, list, at).text };
  }
  if (route === '/edit' && post) {
    const { list, index } = where(body.list, body.index);
    const entry = validateEntry(body.entry, list), was = String(body.was || '');
    let source = '';
    const result = await publish(env, mod, LISTS[list], text => {
      const f = current(text, list, index, was);
      if (list === 'PROBLEMS' && fieldLiteral(text, f, 'number') !== entry.number) throw fail('The number of a problem cannot be changed.');
      if (list === 'GOALS' && fieldLiteral(text, f, 'id') !== entry.id) throw fail('The id of a goal cannot be changed.');
      source = serializeEntry(entry, f.indent);
      return text.slice(0, f.start) + source + text.slice(f.end);
    }, `Edit ${describe(list, k => entry[k])}`);
    return { ok: true, entry, source, ...result };   // `source` is what the file now holds, so the form can be saved again
  }
  if (route === '/add' && post) {
    const { list } = where(body.list, 0);
    if (list === 'GOALS') throw fail('Goals are added by editing data/goals.js.');
    let entry = validateEntry(body.entry, list, true);
    const slugBase = list === 'POSTS' ? slugify(entry.slug || entry.title).slice(0, 60) : '';
    const result = await publish(env, mod, LISTS[list], text => {
      if (list === 'PROBLEMS') { const { number, ...rest } = entry; entry = { number: nextProblemNumber(text), ...rest }; }
      if (list === 'POSTS') { const { slug, ...rest } = entry; entry = { slug: uniqueSlug(slugBase, text), ...rest }; }
      return insertBeforeMarker(text, MARKERS[list], '  ' + serializeEntry(entry) + ',\n');
    }, () => `Add ${describe(list, k => entry[k])}`);
    return { ok: true, entry, ...result };
  }
  if (route === '/remove' && post) {
    const { list, index } = where(body.list, body.index);
    if (list === 'GOALS') throw fail('Goals are removed by editing data/goals.js.');
    const was = String(body.was || '');
    let label = 'entry';
    const result = await publish(env, mod, LISTS[list], text => {
      const f = current(text, list, index, was);
      label = describe(list, k => fieldLiteral(text, f, k));
      return removeEntry(text, f);
    }, () => `Remove ${label}`);
    return { ok: true, ...result };
  }

  const { repo } = ghRepo(env);
  if (route === '/queue' && get) {
    const pulls = await gh(env, 'GET', `/repos/${repo}/pulls?state=open&per_page=50&sort=created&direction=desc`);
    return { ok: true, mode: editMode(env), repo, pulls: pulls.map(pr => prSummary(pr, env)) };
  }
  if (route === '/pr' && get) {
    const n = prNumber(url.searchParams.get('number'));
    const [pr, files] = await Promise.all([gh(env, 'GET', `/repos/${repo}/pulls/${n}`), gh(env, 'GET', `/repos/${repo}/pulls/${n}/files?per_page=30`)]);
    const mb = files.some(f => Object.values(LISTS).includes(f.filename)) ? await mergeBase(env, pr) : null;
    const shown = await Promise.all(files.map(async f => ({ path: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: String(f.patch || '').slice(0, 30000), entries: (await changedEntries(env, pr, f.filename, mb)).map(({ list, source }) => ({ list, source })) })));
    return { ok: true, pull: { ...prSummary(pr, env), state: pr.state, merged: !!pr.merged, mergeable: pr.mergeable, files: shown } };
  }
  if (route === '/accept' && post) {
    const n = prNumber(body.number);
    const pr = await gh(env, 'GET', `/repos/${repo}/pulls/${n}`);
    if (pr.state !== 'open') throw fail('This pull request is no longer open.', 409);
    let merged, applied = null;
    try { merged = await gh(env, 'PUT', `/repos/${repo}/pulls/${n}/merge`, { merge_method: 'squash' }); }
    catch (e) { if (e.ghStatus !== 405 && e.ghStatus !== 409) throw e; applied = await applyEntries(env, mod, pr); }
    await deleteBranch(env, pr);
    console.log(`moderation: ${mod.email} accepted #${n} (${pr.title})${applied ? ' by placing its entries' : ''}`);
    return { ok: true, sha: merged ? merged.sha : undefined, url: pr.html_url, ...(applied ? { applied } : {}) };
  }
  if (route === '/decline' && post) {
    const n = prNumber(body.number), reason = clean(body.reason, 2000);
    const pr = await gh(env, 'GET', `/repos/${repo}/pulls/${n}`);
    if (pr.state !== 'open') throw fail('This pull request is no longer open.', 409);
    if (reason) await gh(env, 'POST', `/repos/${repo}/issues/${n}/comments`, { body: `${gitText(reason)}\n\n— ${gitText(mod.name)}, moderator, through the site` });
    await gh(env, 'PATCH', `/repos/${repo}/pulls/${n}`, { state: 'closed' });
    await deleteBranch(env, pr);
    console.log(`moderation: ${mod.email} declined #${n} (${pr.title})`);
    return { ok: true, url: pr.html_url };
  }
  throw fail('Not found.', 404);
}
function where(list, index) {
  if (!Object.hasOwn(LISTS, String(list))) throw fail('Unknown list.');
  const i = Number(index);
  if (!(Number.isInteger(i) && i >= 0 && i < 100000)) throw fail('Malformed entry index.');
  return { list: String(list), index: i };
}
/* The entry the moderator opened. The browser names it by its index in the list it loaded and by what identifies it
   (a problem's number, a post's slug, a goal's id, a contribution's problem, date and title, a direction's title); when
   the repository has moved on since the site was deployed, the entry is found by the latter. */
function identity(list, get) {
  return list === 'PROBLEMS' ? { number: get('number') } : list === 'POSTS' ? { slug: get('slug') } : list === 'GOALS' ? { id: get('id') }
    : list === 'CONTRIBUTIONS' ? { problem: get('problem'), date: get('date'), title: get('title') } : { title: get('title') };
}
export function locate(text, list, index, keyJson) {
  let key = null;
  if (keyJson) { try { key = JSON.parse(keyJson); } catch (e) { key = null; } }
  if (!key || typeof key !== 'object' || Array.isArray(key) || !Object.values(key).every(v => ['string', 'number'].includes(typeof v))) key = null;
  const spans = entrySpans(structural(text, true), list) || [];
  const same = i => { const f = entryAt(text, list, i), id = identity(list, k => fieldLiteral(text, f, k)); return Object.keys(id).every(k => String(id[k] ?? '') === String(key[k] ?? '')); };
  if (key && index < spans.length && same(index)) return index;
  if (key) {
    const hits = spans.map((s, i) => i).filter(same);
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) throw fail('Several entries in the repository look like this one; edit the file on GitHub.', 409);
    throw fail('This entry is not in the repository where the page expects it: the public site may be behind the repository, or the entry was changed or removed. Reload the page and try again.', 409);
  }
  if (index >= spans.length) throw fail('There is no such entry in the repository any more; reload the page.', 409);
  return index;
}
/* the entry at `index`, provided it still reads as it did when the moderator opened it */
function current(text, list, index, was) {
  const f = entryAt(text, list, index);
  if (!f) throw fail('There is no such entry in the repository any more; reload the page.', 409);
  if (f.text !== was) throw fail('This entry has changed in the repository since you opened it; reload the page and make the change again.', 409);
  return f;
}
function describe(list, get) {
  const t = String(get('title') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (list === 'PROBLEMS') return `Problem ${get('number')}: ${t}`;
  if (list === 'CONTRIBUTIONS') return `contribution to Problem ${get('problem')}: ${t}`;
  if (list === 'POSTS') return `post: ${t}`;
  if (list === 'FUTURE_GOALS') return `direction: ${t}`;
  return `Goal ${get('numeral') ?? ''}: ${t}`;
}
const prNumber = n => { const i = Number(n); if (!(Number.isInteger(i) && i > 0)) throw fail('Malformed pull request number.'); return i; };
/* the commit a pull request is compared against: the last one its branch and the base branch share */
async function mergeBase(env, pr) {
  try { const c = await gh(env, 'GET', `/repos/${ghRepo(env).repo}/compare/${encodeURIComponent(pr.base.ref)}...${encodeURIComponent(pr.head.sha)}`); return (c.merge_base_commit && c.merge_base_commit.sha) || pr.base.sha; }
  catch (e) { return pr.base && pr.base.sha; }
}
/* The entries a pull request adds or changes in a data file, as text: those of its version of the file that the commit it
   is compared against lacks. The site shows them as they will appear; a diff cannot serve, since its added lines may
   split an entry. The pull request's commits are read from this repository, where GitHub keeps them, or from the fork. */
async function changedEntries(env, pr, path, mergeBase) {
  const names = Object.keys(LISTS).filter(k => LISTS[k] === path);
  const from = pr.head && pr.head.repo && pr.head.repo.full_name, at = pr.head && pr.head.sha;
  if (!names.length || !/^[\w.-]+$/.test(String(at)) || !/^[\w.-]+$/.test(String(mergeBase))) return [];
  try {
    const fromFork = () => /^[\w.-]+\/[\w.-]+$/.test(String(from)) ? gh(env, 'GET', `/repos/${from}/contents/${path}?ref=${encodeURIComponent(at)}`).then(f => b64decode(f.content)) : Promise.reject(new Error('no fork'));
    const [head, base] = await Promise.all([readFile(env, path, at).then(f => f.text).catch(fromFork), readFile(env, path, mergeBase).then(f => f.text).catch(() => '')]);   // a file the pull request adds has no base
    const hs = structural(head, true), bs = structural(base, true), out = [];
    const idOf = (src, name, f) => JSON.stringify(identity(name, k => fieldLiteral(src, f, k)));
    for (const name of names) {
      const had = new Map();   // what the base had, by identity
      for (let i = 0, f; (f = entryAt(base, name, i, bs)); i++) had.set(idOf(base, name, f), f.text);
      for (let i = 0, f; (f = entryAt(head, name, i, hs)); i++) { const was = had.get(idOf(head, name, f)) ?? null; if (f.text !== was) out.push({ list: name, source: f.text.slice(0, 60000), was }); }
    }
    return out.slice(0, 20);
  } catch (e) { return []; }   // a fork that cannot be read, or a file that cannot be parsed: the diff is still shown
}
/* When GitHub cannot merge a pull request by itself, which happens whenever two submissions add their lines at the same
   place, the site places what the pull request adds or changes onto the current files, as a commit by the moderator:
   new entries go before the marker; a changed entry replaces the entry it changed, provided nobody else changed that
   one in the meantime. Anything else (a change outside the data files, say) is left to GitHub. */
async function applyEntries(env, mod, pr) {
  const { repo } = ghRepo(env);
  const cannot = () => fail('GitHub cannot merge this pull request by itself (a conflict, or a failing check), and it changes more than whole entries of the data files; open it on GitHub to resolve that.', 409);
  if (editMode(env) === 'pull-request') throw cannot();
  const files = await gh(env, 'GET', `/repos/${repo}/pulls/${pr.number}/files?per_page=30`);
  const paths = files.map(f => f.filename);
  if (!paths.length || !paths.every(p => Object.values(LISTS).includes(p))) throw cannot();
  const mb = await mergeBase(env, pr), commits = [];
  for (const path of paths) {
    const entries = await changedEntries(env, pr, path, mb);
    if (!entries.length) throw cannot();
    const r = await publish(env, mod, path, text => {
      let out = text;
      for (const { list, source, was } of entries) {
        if (was === null) { if (!MARKERS[list]) throw cannot(); out = insertBeforeMarker(out, MARKERS[list], '  ' + source + ',\n'); continue; }
        const st = structural(out, true);
        let f, i = 0;
        while ((f = entryAt(out, list, i, st)) && f.text !== was) i++;
        if (!f) throw cannot();
        out = out.slice(0, f.start) + source + out.slice(f.end);
      }
      return out;
    }, `Accept #${pr.number}: ${String(pr.title || '').replace(/^Submission: /, '').slice(0, 120)}`);
    if (r.commit) commits.push(r.commit);
  }
  await gh(env, 'POST', `/repos/${repo}/issues/${pr.number}/comments`, { body: `Accepted on the site by ${gitText(mod.name)}. GitHub could not merge this pull request by itself, so the site published its entries directly${commits.length ? `: ${commits.join(', ')}` : ''}.` });
  await gh(env, 'PATCH', `/repos/${repo}/pulls/${pr.number}`, { state: 'closed' });
  return commits;
}
function prSummary(pr, env) {
  const own = pr.head && pr.head.repo && pr.head.repo.full_name.toLowerCase() === (env.GITHUB_REPO || '').toLowerCase();
  return { number: pr.number, title: String(pr.title || '').slice(0, 300), url: pr.html_url, author: pr.user ? pr.user.login : '', created: pr.created_at, updated: pr.updated_at,
    labels: (pr.labels || []).map(l => String(l.name).slice(0, 50)), branch: pr.head ? pr.head.ref : '', fork: !own, draft: !!pr.draft, body: String(pr.body || '').slice(0, 4000) };
}
/* a submission's branch in this repository is deleted once its pull request is merged or closed; other branches are left alone */
async function deleteBranch(env, pr) {
  const own = pr.head && pr.head.repo && pr.head.repo.full_name.toLowerCase() === (env.GITHUB_REPO || '').toLowerCase();
  if (!own || !/^(submission|edit)\//.test(pr.head.ref)) return;
  try { await gh(env, 'DELETE', `/repos/${ghRepo(env).repo}/git/refs/heads/${pr.head.ref}`); } catch (e) { /* nothing depends on it */ }
}

/* Applies `transform` to the current text of `path` on the base branch and publishes the result as a commit by the
   moderator (EDIT_MODE "direct", the default) or as a pull request (EDIT_MODE "pull-request"). When someone else changed
   the file in the meantime GitHub refuses the commit, and the transform is applied again to the fresh text, twice. */
async function publish(env, mod, path, transform, message) {
  const { repo, base } = ghRepo(env), author = { name: mod.name, email: mod.email };
  for (let attempt = 0; ; attempt++) {
    const file = await readFile(env, path, base);
    const text = transform(file.text);
    const msg = typeof message === 'function' ? message() : message;
    const full = `${gitText(msg)}\n\nMade on the site by ${gitText(mod.name)}.`;
    if (editMode(env) !== 'pull-request') {
      try {
        const r = await writeFile(env, path, file.sha, text, full, base, author);
        console.log(`moderation: ${mod.email}: ${msg}`);
        return { mode: 'direct', commit: r.commit && r.commit.html_url };
      } catch (e) {
        if (e.ghStatus === 409 && attempt < 2) continue;
        if (e.ghStatus === 409) throw fail(`GitHub refused the commit to ${base} three times; if that branch is protected, set EDIT_MODE to "pull-request".`, 409);
        throw e;
      }
    }
    const head = await gh(env, 'GET', `/repos/${repo}/git/ref/heads/${base}`);
    const branch = `edit/${slugify(msg).slice(0, 40) || 'entry'}-${crypto.randomUUID().slice(0, 6)}`;
    await gh(env, 'POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha });
    try {
      await writeFile(env, path, file.sha, text, full, branch, author);
      const pr = await gh(env, 'POST', `/repos/${repo}/pulls`, { title: gitText(msg).slice(0, 250), head: branch, base, body: `${gitText(msg)}: made on the site by ${gitText(mod.name)} (${gitText(mod.email)}). Merging publishes it.` });
      try { await gh(env, 'POST', `/repos/${repo}/issues/${pr.number}/labels`, { labels: ['edit'] }); } catch (e) { /* optional, as for submissions */ }
      console.log(`moderation: ${mod.email}: ${msg} (pull request ${pr.number})`);
      return { mode: 'pull-request', pr: pr.html_url };
    } catch (e) {
      try { await gh(env, 'DELETE', `/repos/${repo}/git/refs/heads/${branch}`); } catch (e2) { /* harmless */ }
      throw e;
    }
  }
}

/* Locating entries. A list's entries are the object literals that are its direct elements, in order, so their indices are
   those of the array in the browser; markers and text inside strings are invisible to the search (see structural). */
function listSpan(st, name) {
  const m = new RegExp(`(^|\\n)const\\s+${name}\\s*=\\s*\\[`).exec(st);
  if (!m) return null;
  const open = m.index + m[0].length - 1, close = matching(st, open);
  return close < 0 ? null : { open, close };
}
export function entrySpans(st, name) {
  const L = listSpan(st, name);
  if (!L) return null;
  const out = [];
  for (let i = L.open + 1; i < L.close; i++) {
    const c = st[i];
    if (c !== '{' && c !== '[') continue;
    const e = matching(st, i);
    if (e < 0) return null;
    if (c === '{') out.push({ start: i, end: e + 1 });
    i = e;
  }
  return out;
}
/* the entry at `index`: its span and text in the original, the indentation of its opening brace, and the blanked copy */
export function entryAt(src, name, index, st = structural(src, true)) {
  const spans = entrySpans(st, name), span = spans && spans[index];
  if (!span) return null;
  const lineStart = src.lastIndexOf('\n', span.start) + 1;
  const indent = /^[ \t]*$/.test(src.slice(lineStart, span.start)) ? src.slice(lineStart, span.start) : '';
  return { ...span, text: src.slice(span.start, span.end), indent, st };
}
/* the value of a top-level field of the entry (a string, number or boolean literal), or undefined */
export function fieldLiteral(src, f, key) {
  const m = new RegExp(`\\n${f.indent}  ${key}: `).exec(f.st.slice(f.start, f.end));
  if (!m) return undefined;
  const start = f.start + m.index + m[0].length, c = src[start];
  if (c === '"' || c === "'") { const end = f.st.indexOf(c, start + 1); if (end < 0) return undefined; try { return JSON.parse(src.slice(start, end + 1)); } catch (e) { return src.slice(start + 1, end); } }
  if (c === '`' || src.startsWith('tex`', start)) { const q = src.indexOf('`', start), end = f.st.indexOf('`', q + 1); return end < 0 ? undefined : src.slice(q + 1, end); }
  const n = /^(-?\d+(?:\.\d+)?|true|false|null)/.exec(src.slice(start, start + 40));
  return n ? JSON.parse(n[0]) : undefined;
}
/* the file without the entry: its lines go, and so does the comma after it */
export function removeEntry(src, f) {
  const lineStart = src.lastIndexOf('\n', f.start) + 1;
  const from = /^[ \t]*$/.test(src.slice(lineStart, f.start)) ? lineStart : f.start;
  const after = /^[ \t]*,?[ \t]*\n?/.exec(src.slice(f.end))[0];
  return src.slice(0, from) + src.slice(f.end + after.length);
}
/* An entry sent by a moderator: plain data (strings, numbers, booleans, lists, nested objects) with identifier field names,
   bounded in size. The text is published as written, like an edit on GitHub, so moderators are trusted with markup. */
const IDENT = /^[A-Za-z_$][\w$]*$/, TEXT_FIELD_MAX = 50000, ENTRY_MAX = 200000;
export function validateEntry(v, list, adding = false) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw fail('Malformed entry.');
  let size = 0;
  const walk = (x, depth) => {
    if (depth > 4) throw fail('The entry is nested too deeply.');
    if (typeof x === 'string') { if (x.length > TEXT_FIELD_MAX) throw fail(`A text field is too long (at most ${TEXT_FIELD_MAX} characters).`); size += x.length; return clean(x, TEXT_FIELD_MAX); }
    if (typeof x === 'number') { if (!Number.isFinite(x)) throw fail('Malformed entry.'); return x; }
    if (typeof x === 'boolean' || x === null) return x;
    if (Array.isArray(x)) { if (x.length > 500) throw fail('A list in the entry is too long.'); return x.map(y => walk(y, depth + 1)); }
    if (typeof x === 'object') {
      const keys = Object.keys(x);
      if (keys.length > 60) throw fail('The entry has too many fields.');
      const o = {};
      for (const k of keys) {
        if (!IDENT.test(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') throw fail(`“${k}” is not a valid field name.`);
        const y = o[k] = walk(x[k], depth + 1);
        if (k === 'url' && y && !/^https?:\/\/\S+$/i.test(String(y))) throw fail('A link must start with http:// or https://.');
        if (k === 'date' && y && !/^\d{4}-\d{2}-\d{2}$/.test(String(y))) throw fail('A date is written as YYYY-MM-DD.');
      }
      return o;
    }
    throw fail('Malformed entry.');
  };
  const out = walk(v, 0);
  if (size > ENTRY_MAX) throw fail('The entry is too long.');
  if (!String(out.title ?? '').trim()) throw fail('The entry needs a title.');
  if (list === 'PROBLEMS' && !adding && !(Number.isInteger(out.number) && out.number > 0)) throw fail('A problem needs a positive number.');
  if (list === 'CONTRIBUTIONS' && !(Number.isInteger(out.problem) && out.problem > 0)) throw fail('A contribution needs the number of a problem.');
  if (list === 'POSTS' && (adding ? out.slug : true) && !/^[a-z0-9-]{1,80}$/.test(String(out.slug))) throw fail('The address of a post (its slug) may contain only a–z, 0–9 and hyphens.');
  if (list === 'GOALS' && !/^[a-z][a-z0-9-]{0,40}$/.test(String(out.id))) throw fail('A goal needs an id of lowercase letters, digits and hyphens.');
  return out;
}
