/* A single problem page: boxed statement, meta line, background, relevance, significance, history, contributions, references, attribution.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewProblem(num) {
  const p = PROBLEMS.find(x => x.number === num);
  if (!p) return viewNotFound(Number.isInteger(num) ? `There is no Problem ${num}.` : 'There is no such problem.');
  const refs = (p.references || []).map(r => `<li>${r.url ? `<a href="${esc(r.url)}" rel="noopener">${esc(r.text)}</a>` : esc(r.text)}</li>`).join('');
  const hist = (p.history || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(h => `<li>
    <span class="hist-date">${fmtDate(h.date, true)}</span>
    <span><span class="hist-kind">${esc(h.kind)}</span>${h.url ? `<a href="${esc(h.url)}" rel="noopener">${h.text}</a>` : h.text}${(h.by || []).length ? ` <span class="hist-by">(${names(h.by)})</span>` : ''}</span>
  </li>`).join('');
  const contribs = contributionsFor(p);
  const posts = postsForProblem(p);
  const goals = problemGoals(p);
  const cite = `${SITE.name}, Problem ${p.number}: ${plain(p.title)} (status: ${statusInfo(p.status).label}, last updated ${fmtDate(updatedOf(p))}). ${siteUrl()}${problemUrl(p)}`;
  const posed = (p.posedBy || []).length ? names(p.posedBy) : '<span class="muted">to be recorded</span>';
  const rev = p.status === 'under-revision' ? revisionStats(p) : null;
  const byKinds = kinds => [...new Set(contribs.filter(c => kinds.includes(c.kind)).flatMap(c => c.by || []))];
  const advanced = [...new Set([...(p.history || []).filter(h => h.kind === 'advance').flatMap(h => h.by || []), ...byKinds(['claim', 'partial', 'negative', 'reformulation', 'decomposition', 'evidence'])])];
  const verified = byKinds(['verification']), explained = byKinds(['exposition']);
  let sec = 0; const letter = () => String.fromCharCode(65 + sec++) + '.';
  return `<p class="crumb"><a href="#/problems">All problems</a></p>
  <article class="problem prose">
    ${problemBox(p, { heading: true })}
    <div class="meta">
      <span>${badge(p)} <span class="small">since ${fmtDate(statusSince(p), true)}</span></span>
      <span><b>Goal${goals.length === 1 ? '' : 's'}:</b> ${goals.map(g => `<a href="#/agenda?to=${g.id}">${g.numeral}. ${esc(g.title)}</a>`).join(', ') || '<span class="muted">none</span>'}</span>
      <span><b>Posed by:</b> ${posed}</span>
      <span><b>Updated:</b> ${fmtDate(updatedOf(p), true)}</span>
    </div>
    ${p.notice ? `<p class="notice">${p.notice}</p>` : ''}
    ${rev ? `<p class="notice"><strong>Under revision since ${fmtDate(rev.since)}.</strong> A solution has been claimed; ${plural(rev.verifications, 'independent verification')} and ${plural(rev.expositions, 'explanatory exposition')} have been received since. Credit for solving goes to those who understand and verify the solution, so commentary, independent verification, replication, and clearly written expositions are the contributions this entry needs now (see the <a href="#/guidelines?to=under-revision">guidelines</a>).</p>` : ''}
    ${p.background ? `<h2 class="sec-title">${letter()} Background</h2>${paras(p.background)}` : ''}
    ${p.relevance ? `<h2 class="sec-title">${letter()} Relevance</h2>${paras(p.relevance)}` : ''}
    ${p.significance ? `<h2 class="sec-title">${letter()} Significance</h2>${paras(p.significance)}` : ''}
    <h2 class="sec-title">${letter()} Progress and history</h2>
    ${hist ? `<ul class="hist">${hist}</ul>` : `<p class="muted">No entries yet.</p>`}
    <h2 class="sec-title">${letter()} Contributions</h2>
    ${contribs.length ? contribRows(contribs) : `<p class="muted">No contributions recorded yet.</p>`}
    ${posts.length ? `<p class="small" style="margin-top:.8rem">Blog posts about this problem: ${posts.map(x => `<a href="#/blog/${esc(x.slug)}">${esc(x.title)}</a>`).join(', ')}.</p>` : ''}
    <p class="small muted" style="margin-top:.8rem">Attempted solutions, partial or negative results, reformulations, computational evidence, verifications, expositions, and questions about the statement are welcome here, provisional or not. Each is recorded with its title, the type of material, the extent of AI use, and the names of the people responsible for it. See <a href="#/contribute?to=advance">how to contribute</a>.</p>
    <p style="text-align:center"><a class="btn btn-small" href="#/submit?type=contribution&amp;problem=${p.number}">Submit a contribution to this problem</a></p>
    ${refs ? `<h2 class="sec-title">${letter()} References</h2><ol class="refs">${refs}</ol>` : ''}
    <h2 class="sec-title">${letter()} Attribution and citation</h2>
    <dl class="people">
      <div><dt>Posed by:</dt> <dd>${posed}${p.ai && aiUseLabel(p.ai) ? ` <span class="muted small">(${esc(aiUseLabel(p.ai))})</span>` : ''}</dd></div>
      ${(p.curatedBy || []).length ? `<div><dt>Curated by:</dt> <dd>${names(p.curatedBy)}</dd></div>` : ''}
      ${advanced.length ? `<div><dt>Advanced by:</dt> <dd>${names(advanced)}</dd></div>` : ''}
      ${verified.length ? `<div><dt>Verified by:</dt> <dd>${names(verified)}</dd></div>` : ''}
      ${explained.length ? `<div><dt>Explained by:</dt> <dd>${names(explained)}</dd></div>` : ''}
    </dl>
    <p class="small" style="margin-top:.8rem">Work that addresses this problem should cite the people who posed it and the companion paper, and acknowledge any partial result or discussion recorded here that proved useful. To cite this entry:</p>
    <pre class="cite">${esc(cite)}</pre>
    ${topicChips(p)}
    ${SITE.repo ? `<p class="small muted" style="margin-top:1rem">Spotted an error? <a href="${esc(SITE.repo)}/issues" rel="noopener">Report it on GitHub</a>${SITE.contact ? ` or write to <a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>` : ''}.</p>` : ''}
  </article>`;
}
