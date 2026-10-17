/* The Contribute page: who can contribute and how, the curation criteria, the fixed format of a contribution, best practices, editing by hand.
   Every function here returns an HTML string; helpers and data come from the files loaded before it (see index.html). */

function viewContribute() {
  const repo = SITE.repo;
  const mail = SITE.contact ? `<a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>` : '';
  return `<h1 class="page-title">Contribute</h1>
  <div class="prose">
  <p>Anyone who shares an interest in the research agenda can contribute: by proposing a problem, by registering interest in one and saying which strategy they intend to pursue, by submitting attempts and partial results, by verifying or revising someone else's attempt, by translating an AI-generated argument into a form suited to a human reader, by writing a blog post, or by proposing a broad direction for a later cycle. Each of these is credited and recorded with its provenance.</p>
  <p>Submissions come from researchers: the <a href="#/submit">Submit page</a> asks for an institutional e-mail address, which you confirm by clicking a link, and for the name of at least one human contributor who takes responsibility for the material. The submission then reaches the moderators, who perform a lightweight check and accept it; it appears on the site with a timestamp and the names of its contributors. Moderators do not adjudicate correctness; the community does, openly, on the entry. See the <a href="#/guidelines">guidelines</a> for how submissions are handled and how a problem's status changes.</p>
  <p style="text-align:center"><a class="btn" href="#/submit">Submit a problem, contribution, post, or direction</a></p>

  <h2 class="sec-title" id="propose">A. Propose a problem</h2>
  <p>A problem is admitted to the active list if it meets the four criteria below. They are meant to make problems sufficiently well-posed that AI agents can objectively and unambiguously understand what is being asked (Clarity), search the existing literature for prior attempts and established results (Relevance), and do so for a problem whose resolution would advance the research program (Significance) and that is not obviously out of reach (Feasibility). Any contributor may propose a problem; it is checked against these criteria, not heavily refereed, and a problem that becomes obsolete or no longer relevant can be removed. For this first cycle the active list is fixed in advance, so proposals are kept for the next cycle unless the moderators decide otherwise.</p>
  ${criteriaBox()}
  <p>Each entry therefore has, besides its statement, a <em>background</em> (what a reader needs to understand the statement, with references), a <em>relevance</em> section (how the problem is motivated within the existing literature and which long-term goal or goals it traces to), and a <em>significance</em> section (how its resolution would meaningfully advance those goals). The <a href="#/submit?type=problem">Submit page</a> asks for each of them.</p>

  <h2 class="sec-title" id="advance">B. Contribute to an entry</h2>
  <p>Attempted solutions, partial or negative results, reformulations, decompositions into further problems, computational evidence, independent verifications, explanatory expositions, challenges to a claimed solution, questions about a statement's scope, and comments all go to the problem's entry. Submissions need not be complete or rigorous: say explicitly when material is provisional. Every contribution is recorded in the fixed format of the companion paper: a title; the type of material; the extent to which AI tools were used (<em>fully</em>, when the material is the output of a single prompt; <em>partially</em>, when it was produced over several human–AI iterations; or not at all); and the name of at least one human contributor who takes responsibility for it. A link to a preprint, a repository, or a note can be attached.</p>
  <p>A claimed solution places the problem under revision, and from then on what the entry needs most is understanding: commentary on the existing material, independent verification, replication, and clearly written expositions, which is where the credit for solving goes. A proof of a weakened or modified statement is a partial advance, not a solution; propose the modified statement as a new entry. To record that you are working on a problem and the strategy you intend to pursue, so that others can choose between joining you and working independently, submit a comment saying so.</p>

  <h2 class="sec-title" id="posts">C. Posts and directions</h2>
  <p>A <a href="#/blog">blog post</a> discusses a problem more informally than a contribution to its entry, and is also the place for challenges to the goals of the agenda until a later round gives them an entry type of their own. A proposal for a broad direction that a later cycle of the list could be organized around goes to the <a href="#/future-goals">future broad goals</a> page. Both are submitted through the <a href="#/submit">Submit page</a>.</p>

  <h2 class="sec-title" id="practices">D. Best practices</h2>
  ${practicesBox()}
  <ol class="steps">
    <li>Cite the posers of a problem and the companion paper in any manuscript that addresses it, and acknowledge recorded partial results and the people who shared them.</li>
    <li>Be transparent about AI assistance, in entries here and in manuscripts.</li>
    <li>Keep preprint servers and journals for polished, human-readable results grounded in human understanding; let provisional material be digested here first.</li>
    <li>If you take up a problem someone else has publicly formulated, say so. Failing to acknowledge a publicly posed problem is a breach of academic norms.</li>
  </ol>

  <h2 class="sec-title" id="by-hand">E. Editing by hand</h2>
  <p>${repo ? `The whole site is a set of plain data files in <a href="${esc(repo)}" rel="noopener">its repository</a>; a submission made through the site arrives there as a pull request, and so can one made by hand. ` : ''}A problem is an entry in <code>data/problems.js</code>, a contribution an entry in <code>data/contributions.js</code>, a post an entry in <code>data/posts.js</code>. ${repo ? `Add it and open a pull request${mail ? `, or send it to ${mail}` : ''}` : mail ? `Send it to ${mail}` : 'Send it to the moderators'} from your institutional address. A new problem:</p>
  <pre>${esc(problemTemplate())}</pre>
  <p>A contribution to an entry:</p>
  <pre>${esc(contributionTemplate(1))}</pre>
  <p>Progress agreed with the moderators is recorded in the problem's <code>history</code> list, newest at the bottom, with entries like <code>${esc(advanceTemplate())}</code>. A change of status is a <code>status</code> entry naming the new status in <code>to</code>, which is what moves "status since" and steps the <a href="#/progress">progress chart</a>: <code>${esc(statusTemplate())}</code>.</p>

  <h2 class="sec-title">F. Mistakes and disputes</h2>
  <p>${repo ? `If a status is out of date or a reference is wrong, <a href="${esc(repo)}/issues" rel="noopener">open an issue</a>` : 'If a status is out of date or a reference is wrong, write to the moderators'}${mail ? `${repo ? ' or write to' : ''} ${mail}` : ''}, quoting the problem number. Questions of priority or attribution are settled by the recorded history of the entry, which is why dating every contribution matters. Disputes about a claimed solution are handled as the <a href="#/guidelines?to=solved">guidelines</a> describe.</p>
  </div>`;
}
