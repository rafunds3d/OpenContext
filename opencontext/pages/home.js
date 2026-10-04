/* The home page: masthead, counts, search, the three goals, a random open problem, recently updated.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewHome() {
  const open = PROBLEMS.filter(p => p.status === 'open').length;
  const closed = PROBLEMS.filter(isClosed).length;
  const revising = PROBLEMS.filter(p => p.status === 'under-revision').length;
  const rnd = randomProblem('open');
  const paper = SITE.paper && SITE.paper.title ? `<p class="paper">Companion paper: ${SITE.paper.url ? `<a href="${esc(SITE.paper.url)}" rel="noopener">${esc(SITE.paper.title)}</a>` : `<em>${esc(SITE.paper.title)}</em>`}${SITE.paper.authors ? `, ${esc(SITE.paper.authors)}` : ''}${SITE.paper.year ? ` (${esc(SITE.paper.year)})` : ''}.</p>` : '';
  return `<section class="masthead">
    <h1 class="title">${esc(SITE.name)}</h1>
    <p class="subtitle">${esc(SITE.subtitle)}</p>
    ${SITE.byline ? `<p class="byline">${esc(SITE.byline)}<sup>⋆</sup></p>` : ''}
    <p class="abstract">${esc(SITE.abstract)}</p>
    ${paper}
    ${SITE.byline ? `<p class="star-note"><sup>⋆</sup> The list of moderators and contributors is on the <a href="#/about?to=people">About page</a>.</p>` : ''}
  </section>
  <nav class="stats" aria-label="Counts">
    <a class="stat" href="#/problems"><strong>${PROBLEMS.length}</strong><span>${PROBLEMS.length === 1 ? 'problem' : 'problems'}</span></a>
    <a class="stat" href="#/problems?status=open"><strong>${open}</strong><span>open</span></a>
    ${revising ? `<a class="stat" href="#/problems?status=under-revision"><strong>${revising}</strong><span>under revision</span></a>` : ''}
    <a class="stat" href="#/problems?status=closed"><strong>${closed}</strong><span>resolved</span></a>
  </nav>
  <form class="search" id="search-form" role="search">
    <label for="q" class="visually-hidden">Search problems</label>
    <input id="q" name="q" type="search" placeholder="Search problems" autocomplete="off">
    <button class="btn" type="submit">Search</button>
  </form>
  <p class="hint">Press <kbd>/</kbd> to start typing. ${latest() ? 'Last update ' + fmtDate(latest()) + '.' : ''}</p>

  <h2 class="sec-title">I. Research agenda</h2>
  <p class="muted small" style="text-align:center;margin-top:-.4rem">Three long-term goals organize the field; every problem traces back to at least one of them. Golden apples mark goals, red apples the near-term problems that grow from them.</p>
  <ol class="goals">${GOALS.map(g => `<li class="goal">
    <span class="goal-num">${apple('apple-goal')}${g.numeral}.</span>
    <span class="goal-title"><a href="#/agenda?to=${g.id}">${esc(g.title)}</a></span>
    <span class="goal-count">${problemsForGoal(g).length} ${problemsForGoal(g).length === 1 ? 'problem' : 'problems'}</span>
    <p class="goal-sum">${esc(g.summary)}</p>
  </li>`).join('')}</ol>

  <h2 class="sec-title">II. A random open problem</h2>
  ${rnd ? `<div class="card-slot">${problemBox(rnd, { link: true })}</div>
  <p style="text-align:center;margin-top:-.2rem"><button class="btn btn-quiet btn-small" type="button" data-reroll="open" data-current="${rnd.number}">Another one</button> <a class="btn btn-quiet btn-small" href="#/random/open">Open a random one</a></p>` : `<p class="muted">No open problems yet.</p>`}

  <h2 class="sec-title">III. Recently updated</h2>
  ${rows(PROBLEMS.slice().sort(byDateDesc).slice(0, 8))}
  <p class="small" style="text-align:right"><a href="#/problems?sort=date">All problems by date →</a></p>`;
}
