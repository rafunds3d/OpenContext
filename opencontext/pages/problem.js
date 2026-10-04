/* A single problem page: boxed statement, meta line, background, motivation, history, references, attribution.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewProblem(num) {
  const p = PROBLEMS.find(x => x.number === num);
  if (!p) return viewNotFound(`There is no Problem ${esc(num)}.`);
  const refs = (p.references || []).map(r => `<li>${r.url ? `<a href="${esc(r.url)}" rel="noopener">${esc(r.text)}</a>` : esc(r.text)}</li>`).join('');
  const hist = (p.history || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(h => `<li>
    <span class="hist-date">${fmtDate(h.date, true)}</span>
    <span><span class="hist-kind">${esc(h.kind)}</span>${h.url ? `<a href="${esc(h.url)}" rel="noopener">${h.text}</a>` : h.text}${(h.by || []).length ? ` <span class="hist-by">(${names(h.by)})</span>` : ''}</span>
  </li>`).join('');
  const goals = problemGoals(p);
  const cite = `${SITE.name}, Problem ${p.number}: ${plain(p.title)} (status: ${statusInfo(p.status).label}, last updated ${fmtDate(updatedOf(p))}). ${siteUrl()}${problemUrl(p)}`;
  const posed = (p.posedBy || []).length ? names(p.posedBy) : '<span class="muted">to be recorded</span>';
  let sec = 0; const letter = () => String.fromCharCode(65 + sec++) + '.';
  return `<p class="crumb"><a href="#/problems">All problems</a></p>
  <article class="problem prose">
    ${problemBox(p)}
    <div class="meta">
      <span>${badge(p)} <span class="small">since ${fmtDate(statusSince(p), true)}</span></span>
      <span><b>Goal${goals.length === 1 ? '' : 's'}:</b> ${goals.map(g => `<a href="#/agenda?to=${g.id}">${g.numeral}. ${esc(g.title)}</a>`).join(', ') || '<span class="muted">none</span>'}</span>
      <span><b>Posed by:</b> ${posed}</span>
      <span><b>Updated:</b> ${fmtDate(updatedOf(p), true)}</span>
    </div>
    ${p.notice ? `<p class="notice">${p.notice}</p>` : ''}
    ${p.background ? `<h2 class="sec-title">${letter()} Background</h2>${paras(p.background)}` : ''}
    ${p.motivation ? `<h2 class="sec-title">${letter()} Motivation</h2>${paras(p.motivation)}` : ''}
    <h2 class="sec-title">${letter()} Progress and history</h2>
    ${hist ? `<ul class="hist">${hist}</ul>` : `<p class="muted">No entries yet.</p>`}
    <p class="small muted" style="margin-top:.8rem">Partial results, reformulations, computational evidence, and questions about the statement are welcome here, provisional or not. See <a href="#/contribute?to=advance">how to report progress</a>.</p>
    ${refs ? `<h2 class="sec-title">${letter()} References</h2><ol class="refs">${refs}</ol>` : ''}
    <h2 class="sec-title">${letter()} Attribution and citation</h2>
    <dl class="people">
      <div><dt>Posed by:</dt> <dd>${posed}</dd></div>
      ${(p.curatedBy || []).length ? `<div><dt>Curated by:</dt> <dd>${names(p.curatedBy)}</dd></div>` : ''}
      ${(p.history || []).some(h => h.kind === 'advance') ? `<div><dt>Advanced by:</dt> <dd>${names([...new Set((p.history || []).filter(h => h.kind === 'advance').flatMap(h => h.by || []))]) || '<span class="muted">see history</span>'}</dd></div>` : ''}
    </dl>
    <p class="small" style="margin-top:.8rem">Work that addresses this problem should cite the people who posed it and the companion paper, and acknowledge any partial result or discussion recorded here that proved useful. To cite this entry:</p>
    <pre class="cite">${esc(cite)}</pre>
    ${topicChips(p)}
    ${SITE.repo ? `<p class="small muted" style="margin-top:1rem">Spotted an error? <a href="${esc(SITE.repo)}/issues" rel="noopener">Report it on GitHub</a>${SITE.contact ? ` or write to <a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>` : ''}.</p>` : ''}
  </article>`;
}
