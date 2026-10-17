/* The Progress page: how the list's statuses have changed over time, drawn from the dated history of every problem, so that
   the speed of changes can be tracked. statusTimeline() also feeds the JSON export.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

const CHART_SERIES = [
  { key: 'open', label: 'open', color: '#c00808' },
  { key: 'under-revision', label: 'under revision', color: '#1a4fa0' },
  { key: 'solved', label: 'solved', color: '#3f8f3f' }
];
const CHART_W = 720, CHART_H = 300;
const dayOf = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000);
const isoOfDay = d => new Date(d * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => dayOf(b) - dayOf(a);
function median(arr) { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

/* Every problem is listed as open on the date of its 'posed' entry (or its earliest dated status entry, or the day the
   database went live); each dated history entry of kind 'status' with a 'to' changes it. If the recorded entries do not end
   in the problem's current status, the current status is applied on the date it has held since, so a status set by hand
   still counts. Undated entries are ignored here. */
function statusEvents() {
  const ev = [];
  for (const p of PROBLEMS) {
    const hist = (p.history || []).filter(h => h.date).slice().sort((a, b) => a.date.localeCompare(b.date));
    const dated = hist.filter(h => h.kind === 'posed' || (h.kind === 'status' && h.to && STATUSES[h.to]));
    let current = 'open';
    ev.push({ date: dated.length ? dated[0].date : SITE.started, problem: p.number, from: null, to: 'open', text: '' });
    for (const h of hist) if (h.kind === 'status' && h.to && STATUSES[h.to] && h.to !== current) { ev.push({ date: h.date, problem: p.number, from: current, to: h.to, text: h.text || '' }); current = h.to; }
    if (current !== p.status && STATUSES[p.status]) ev.push({ date: statusSince(p) || SITE.started, problem: p.number, from: current, to: p.status, text: '' });
  }
  return ev.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.problem - b.problem);
}
/* The counts after each day on which something changed, starting from the day the database went live (anything dated
   earlier counts from that day). */
function statusTimeline() {
  const ev = statusEvents().map(e => e.date < SITE.started ? { ...e, date: SITE.started } : e);
  const counts = { open: 0, 'under-revision': 0, solved: 0 };
  const dates = [...new Set([SITE.started, ...ev.map(e => e.date)])].sort();
  return dates.map(d => {
    for (const e of ev) if (e.date === d) { if (e.from) counts[e.from]--; counts[e.to]++; }
    return { date: d, ...counts, total: counts.open + counts['under-revision'] + counts.solved };
  });
}
/* the rows up to today: what the chart draws and the tiles count (a future-dated entry waits for its day) */
function timelineToDate(tl, today) { const shown = tl.filter(r => r.date <= today); return shown.length ? shown : tl.slice(0, 1); }

/* A step chart: one 2px line per status, hairline grid, month ticks, direct end labels with leader lines, a crosshair tooltip. */
function progressChart(all) {
  const m = { t: 16, r: 128, b: 36, l: 34 };
  const iw = CHART_W - m.l - m.r, ih = CHART_H - m.t - m.b;
  const today = todayIso();
  const tl = timelineToDate(all, today);
  const x0 = dayOf(SITE.started);
  const xEnd = Math.max(dayOf(today), x0 + 90);
  const maxTotal = Math.max(1, ...tl.map(r => r.total));
  const yMax = maxTotal <= 5 ? maxTotal + 1 : Math.ceil((maxTotal + 1) / 5) * 5;
  const yStep = yMax <= 6 ? 1 : yMax <= 12 ? 2 : yMax <= 30 ? 5 : 10;
  const X = d => m.l + (d - x0) / (xEnd - x0) * iw;
  const Y = v => m.t + ih - v / yMax * ih;
  const f = n => Math.round(n * 10) / 10;
  let grid = '';
  for (let v = 0; v <= yMax; v += yStep) grid += `<line class="grid" x1="${m.l}" x2="${m.l + iw}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text x="${m.l - 6}" y="${f(Y(v)) + 4}" text-anchor="end">${v}</text>`;
  /* month ticks from the launch month on; the launch month's tick sits on the launch day, and is dropped when the next
     month is so close that the two labels would collide */
  const months = [], d0 = new Date(x0 * 86400000), dayOfMonth = mo => Math.round(mo.getTime() / 86400000);
  for (let mo = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1)); dayOfMonth(mo) <= xEnd; mo = new Date(Date.UTC(mo.getUTCFullYear(), mo.getUTCMonth() + 1, 1))) months.push(mo);
  const every = months.length > 14 ? 3 : 1;
  const drawn = months.filter((mo, i) => i % every === 0 && !(i === 0 && months[1] && dayOfMonth(months[1]) - x0 < 14));
  let ticks = '', lastYear;
  for (const mo of drawn) {
    const x = f(X(Math.max(dayOfMonth(mo), x0))), yr = mo.getUTCFullYear();
    const label = yr !== lastYear ? `${MONTHS[mo.getUTCMonth()].slice(0, 3)} ${yr}` : MONTHS[mo.getUTCMonth()].slice(0, 3);
    lastYear = yr;
    ticks += `<line class="axis" x1="${x}" x2="${x}" y1="${m.t + ih}" y2="${m.t + ih + 4}"/><text x="${x}" y="${m.t + ih + 17}" text-anchor="middle">${label}</text>`;
  }
  const xToday = X(Math.min(Math.max(dayOf(today), x0), xEnd));
  const paths = CHART_SERIES.map(s => {
    let d = '';
    tl.forEach((r, i) => { const x = f(X(dayOf(r.date))), y = f(Y(r[s.key])); d += i === 0 ? `M${x},${y}` : `H${x}V${y}`; });
    return `<path class="series" d="${d}H${f(xToday)}" stroke="${s.color}"/>`;
  }).join('');
  const last = tl[tl.length - 1];
  const labels = CHART_SERIES.map(s => ({ s, v: last[s.key], y: Y(last[s.key]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
  const yBot = m.t + ih - 4;   // the lowest label's baseline sits on the axis line, not across it
  for (let i = labels.length - 1; i >= 0; i--) {
    if (labels[i].y > yBot) labels[i].y = yBot;
    if (i > 0 && labels[i].y - labels[i - 1].y < 14) labels[i - 1].y = labels[i].y - 14;
  }
  const ends = labels.map(l => `<line class="leader" x1="${f(xToday + 5)}" x2="${f(xToday + 14)}" y1="${f(Y(l.v))}" y2="${f(l.y)}"/><circle cx="${f(xToday)}" cy="${f(Y(l.v))}" r="4" fill="${l.s.color}" stroke="#fff" stroke-width="2"/><text x="${f(xToday + 18)}" y="${f(l.y) + 4}">${l.v} ${l.s.label}</text>`).join('');
  return `<div class="chart-wrap"><div class="chart-scroll"><svg class="chart" viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="Number of problems by status over time" data-x0="${x0}" data-xend="${xEnd}" data-l="${m.l}" data-w="${iw}">
    ${grid}<line class="axis" x1="${m.l}" x2="${m.l + iw}" y1="${m.t + ih}" y2="${m.t + ih}"/>${ticks}${paths}${ends}
    <line class="cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" style="display:none"/>
    <rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>
  </svg></div><div class="chart-tip" hidden></div></div>`;
}

function viewProgress() {
  const tl = statusTimeline(), ev = statusEvents(), today = todayIso();
  const shown = timelineToDate(tl, today), last = shown[shown.length - 1];
  const transitions = ev.filter(e => e.from).sort((a, b) => b.date.localeCompare(a.date) || a.problem - b.problem);
  /* listing -> first claim, and claim -> solved (paired with the claim that preceded the solution) */
  const toClaim = [], toSolved = [];
  for (const p of PROBLEMS) {
    const pe = ev.filter(e => e.problem === p.number), posed = pe[0];
    const rev = pe.find(e => e.from === 'open' && e.to === 'under-revision');
    const sol = pe.find(e => e.from === 'under-revision' && e.to === 'solved');
    const claimBefore = sol && pe.filter(e => e.to === 'under-revision' && e.date <= sol.date).pop();
    if (rev) toClaim.push(daysBetween(posed.date, rev.date));
    if (sol && claimBefore) toSolved.push(daysBetween(claimBefore.date, sol.date));
  }
  const tile = (v, l, href) => href ? `<a class="stat" href="${href}"><strong>${v}</strong><span>${l}</span></a>` : `<span class="stat"><strong>${v}</strong><span>${l}</span></span>`;
  const num = n => n === null ? '—' : String(n);
  const rows = transitions.map(e => { const p = PROBLEMS.find(x => x.number === e.problem); return `<li><span class="hist-date">${fmtDate(e.date, true)}</span><span><a href="#/problem/${e.problem}">Problem ${e.problem}</a>${p ? `: ${esc(p.title)}` : ''} <span class="st st-${e.from}">${esc(statusInfo(e.from).label)}</span> → <span class="st st-${e.to}">${esc(statusInfo(e.to).label)}</span>${e.text ? ` <span class="hist-by">${e.text}</span>` : ''}</span></li>`; }).join('');
  return `<h1 class="page-title">Progress</h1>
  <div class="prose">
  <p>How fast is the list moving? Every change of status is a dated entry in a problem's history, and this page draws that record: how many problems are listed, and how many of them are open, under revision, or solved, on each day since the database went live on ${fmtDate(SITE.started)}. The one-year assessment described on the <a href="#/about?to=test">About page</a> reads its time-to-resolution figures from the same dates.</p>
  </div>
  <nav class="stats" aria-label="Counts">
    ${tile(last.total, last.total === 1 ? 'problem listed' : 'problems listed', '#/problems')}
    ${tile(last.open, 'open', '#/problems?status=open')}
    ${tile(last['under-revision'], 'under revision', '#/problems?status=under-revision')}
    ${tile(last.solved, 'solved', '#/problems?status=solved')}
  </nav>
  <h2 class="sec-title">I. Problems by status over time</h2>
  <p class="legend">${CHART_SERIES.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</p>
  ${progressChart(tl)}
  <p class="small muted" style="text-align:center">Each line steps on the day a status changed. Move over the chart for the counts on a given day.</p>
  <h2 class="sec-title">II. How fast</h2>
  <div class="stats">
    ${tile(daysBetween(SITE.started, today), 'days since launch')}
    ${tile(num(median(toClaim)), toClaim.length ? `median days from listing to a claim (${plural(toClaim.length, 'problem')})` : 'days from listing to a first claim (none yet)')}
    ${tile(num(median(toSolved)), toSolved.length ? `median days from claim to solved (${plural(toSolved.length, 'problem')})` : 'days from claim to solved (none yet)')}
  </div>
  <h2 class="sec-title">III. Every change of status</h2>
  ${rows ? `<ul class="hist">${rows}</ul>` : `<p class="muted" style="text-align:center">No problem has changed status yet: all ${last.total} have been open since they were listed.</p>`}
  <p class="small muted" style="margin-top:.8rem">The counts are also in the <button class="linklike" type="button" data-json>JSON export</button>, under <code>timeline</code>.</p>`;
}

/* the crosshair and tooltip, wired by the router after the page is rendered */
function initProgressChart() {
  const svg = $('.chart');
  if (!svg || svg.dataset.ready) return;
  svg.dataset.ready = '1';
  const wrap = svg.closest('.chart-wrap'), tip = wrap.querySelector('.chart-tip'), cross = svg.querySelector('.cross'), hit = svg.querySelector('.hit');
  const tl = statusTimeline(), today = todayIso();
  const x0 = +svg.dataset.x0, xEnd = +svg.dataset.xend, l = +svg.dataset.l, w = +svg.dataset.w;
  const hide = () => { tip.hidden = true; cross.style.display = 'none'; };
  const show = e => {
    const r = svg.getBoundingClientRect();
    const sx = (e.clientX - r.left) * CHART_W / r.width;
    const day = Math.round(x0 + (sx - l) / w * (xEnd - x0));
    const iso = isoOfDay(day);
    if (day < x0 || iso > today) return hide();
    let row = tl[0]; for (const t of tl) if (t.date <= iso) row = t;
    cross.setAttribute('x1', sx); cross.setAttribute('x2', sx); cross.style.display = '';
    tip.innerHTML = `<strong>${fmtDate(iso, true)}</strong><br>${CHART_SERIES.map(s => `<i style="background:${s.color}"></i>${row[s.key]} ${s.label}`).join('<br>')}<br>${row.total} listed`;
    tip.hidden = false;
    const wr = wrap.getBoundingClientRect();
    let left = e.clientX - wr.left + 14;
    if (left + tip.offsetWidth > wr.width) left = e.clientX - wr.left - tip.offsetWidth - 14;
    tip.style.left = Math.max(0, left) + 'px';
    tip.style.top = (e.clientY - wr.top - 12) + 'px';
  };
  hit.addEventListener('mousemove', show);
  hit.addEventListener('mouseleave', hide);
  hit.addEventListener('touchstart', e => show(e.touches[0]), { passive: true });
  hit.addEventListener('touchmove', e => show(e.touches[0]), { passive: true });
}
