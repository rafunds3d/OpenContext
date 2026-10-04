/* The About page: what the database is, how it works, attribution, the one-year test, citation, people, license.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewAbout() {
  const paperCite = SITE.paper && SITE.paper.title ? `${SITE.paper.authors ? SITE.paper.authors + ', ' : ''}${SITE.paper.title}${SITE.paper.year ? ' (' + SITE.paper.year + ')' : ''}${SITE.paper.url ? ', ' + SITE.paper.url : ''}` : '';
  const dbCite = `${SITE.name}: ${SITE.subtitle}, ${siteUrl()} (accessed ${fmtDate(todayIso())})`;
  const list = (arr, empty) => arr && arr.length ? names(arr) : `<span class="muted">${empty}</span>`;
  return `<h1 class="page-title">About</h1>
  <div class="prose">
  <h2 class="sec-title">A. What this is</h2>
  <p>${esc(SITE.name)} is a community-curated, open database of precisely stated, near-term problems in generalized contextuality, each traceable to a long-term goal of the field's <a href="#/agenda">research agenda</a>. It is the proof-of-concept infrastructure of the companion paper, which argues that in a research environment shaped by skilled humans working with AI agents, curated lists of well-posed problems become an unusually valuable resource: they make duplicated effort visible and avoidable, give partial progress a place to be recorded and scrutinized before it reaches preprint servers, keep problems anchored to a shared agenda rather than to individual incentives, and record the provenance of every contribution so that credit can be assigned fairly, including to the people who pose good questions and to researchers who contribute without access to frontier models.</p>
  <p>Problem selection is community-driven. A fixed set of problems is put forward for a period; during that period the database is the arena for discussion, attempts, and partial results, and further problems can be suggested for later consideration. At the end of the period the community reassesses which problems and which lines of attack advanced the goals, and selects a new set.</p>

  <h2 class="sec-title">B. How the database works</h2>
  ${featuresBox()}
  <p>Moderation is minimal, in the manner of the arXiv or StackExchange: it filters only content that is unrelated, predatory, or otherwise unethical. Contributors are known by name, so that the concentrated effort of the community cannot be used anonymously without attribution.</p>

  <h2 class="sec-title">C. Attribution</h2>
  <p>Credit is fine-grained: posing, curating, solving, verifying, and translating a result into human-readable form are distinct contributions, and all are recorded. Manuscripts that resolve a listed problem should cite the problem's posers and the companion paper, and acknowledge any partial result or discussion recorded here that proved helpful, naming the researchers who shared it. Researchers should be upfront about their use of AI tools, both for credit and so that the usefulness of these tools can be benchmarked. Polished, human-readable material belongs in preprint servers and journals; provisional, AI-heavy material belongs here first, where it can be digested.</p>

  <h2 class="sec-title">D. The one-year test</h2>
  <p>The initiative is a testable intervention rather than a demonstration. Over one year from ${fmtDate(SITE.started)}, two things are tracked: whether a small but active community forms around the list, and how many of the listed problems are advanced or resolved, by what means, and how fast. Timestamps on every status change make time-to-resolution measurable. At the end of the year a community-facing white paper will report what worked, what did not, which parts of the methodology need revision, and which problems remain, with negative outcomes reported as carefully as positive ones.</p>

  <h2 class="sec-title">E. How to cite</h2>
  <p>Every problem page ends with a ready-made citation carrying the problem number, its status, and the date it was last updated. To cite the database as a whole, and the paper that describes it:</p>
  <pre class="cite">${esc(dbCite)}${paperCite ? '\n' + esc(paperCite) : ''}</pre>

  <h2 class="sec-title" id="people">F. Moderators and contributors</h2>
  <dl class="people">
    <div><dt>Moderators:</dt> <dd>${list(SITE.moderators, 'to be listed')}${SITE.contact ? ` (<a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>)` : ''}</dd></div>
    <div><dt>Contributors:</dt> <dd>${list(SITE.team, 'to be listed')}</dd></div>
  </dl>
  <p class="small" style="margin-top:.8rem">Each problem page names the people who posed, curated, and advanced it.</p>
  ${SITE.license ? `<h2 class="sec-title">G. Licensing</h2><p>Unless an entry says otherwise, the text of this database is released under ${esc(SITE.license)}. Quotations from the cited sources keep their original licenses.</p>` : ''}
  </div>`;
}
