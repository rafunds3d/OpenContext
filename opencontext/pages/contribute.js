/* The Contribute page: curation criteria, templates for proposing a problem and reporting progress, best practices.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewContribute() {
  const repo = SITE.repo;
  return `<h1 class="page-title">Contribute</h1>
  <div class="prose">
  <p>Anyone who shares an interest in the research agenda can contribute: by proposing a problem, by registering interest in one and saying which strategy they intend to pursue, by submitting attempts and partial results, by verifying or revising someone else's attempt, or by translating an AI-generated argument into a form suited to a human reader. Each of these is credited. ${repo ? `The whole site lives in one file, <code>index.html</code>, in <a href="${esc(repo)}" rel="noopener">its repository</a>; a contribution is an edit to that file, proposed as a pull request, or a message to the moderators.` : 'Contributions go to the moderators, who edit the database.'}</p>

  <h2 class="sec-title" id="propose">A. Propose a problem</h2>
  <p>A problem is admitted to the active list if it meets the three criteria below. Any contributor may propose one; other researchers review it before it is admitted, and a problem that becomes obsolete can be removed.</p>
  ${criteriaBox()}
  <p>To propose one, add an entry to the <code>PROBLEMS</code> list using this template, with yourself as poser and today's date, and open a pull request${SITE.contact ? ` or send it to <a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>` : ''}:</p>
  <pre>${esc(problemTemplate())}</pre>

  <h2 class="sec-title" id="advance">B. Report progress</h2>
  <p>Attempted solutions, partial or negative results, reformulations, computational evidence, and questions about a statement's scope go into the problem's history. Submissions need not be complete or rigorous: say explicitly when material is provisional, and say when and how AI tools were used. Add an entry like this to the problem's <code>history</code> list, newest at the bottom:</p>
  <pre>${esc(advanceTemplate())}</pre>
  <p>Use <code>kind: "interest"</code> to record that you are working on a problem and the strategy you intend to pursue, so that others can choose between joining you and working independently, and <code>kind: "status"</code> when a change of status is agreed with the moderators. A resolution is recorded as <span class="st st-proved">proved</span>, <span class="st st-disproved">disproved</span> or <span class="st st-complete">complete</span> only once published work exists; the entry then stays open to follow-ups.</p>

  <h2 class="sec-title">C. Best practices</h2>
  <ol class="steps">
    <li>Cite the posers of a problem and the companion paper in any manuscript that addresses it, and acknowledge recorded partial results and the people who shared them.</li>
    <li>Be transparent about AI assistance, in entries here and in manuscripts.</li>
    <li>Keep preprint servers and journals for polished, human-readable results; let provisional material be digested here first.</li>
    <li>If you take up a problem someone else has publicly formulated, say so. Failing to acknowledge a publicly posed problem is a breach of academic norms.</li>
  </ol>

  <h2 class="sec-title">D. Mistakes and disputes</h2>
  <p>${repo ? `If a status is out of date or a reference is wrong, <a href="${esc(repo)}/issues" rel="noopener">open an issue</a>` : 'If a status is out of date or a reference is wrong, write to the moderators'}${SITE.contact ? `${repo ? ' or write to' : ''} <a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>` : ''}, quoting the problem number. Questions of priority or attribution are settled by the recorded history of the entry, which is why dating every contribution matters.</p>
  </div>`;
}
