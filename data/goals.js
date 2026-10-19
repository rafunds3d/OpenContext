/* The research agenda (long-term goals) and the status vocabulary.
   Math is written inside tex`...` strings: inline between \( and \), display between \[ and \]. */
const GOALS = [
  {
    id: "classicality",
    numeral: "I",
    title: "Reconceptualization of classicality",
    summary: "Determine whether generalized noncontextuality captures the appropriate boundary between classical and nonclassical explanation, the thesis being that it offers a broad, formal, and meaningful framework for what it means for a process in Nature to be “classical”.",
    description: tex`Conceptualization is a central methodological task in any research field: an ongoing, collective effort of refining what a concept should (and should not) mean, through debate, revision, formalization, and consensus-building. Classicality is one such concept under reconceptualization. In its traditional sense it denotes the possibility of explaining a phenomenon within Newtonian or relativistic mechanics, and within quantum theory it is usually tied to forms of commutativity or to the limit \(\hbar\to 0\). Relative to the standards of foundational work, and to the experiments that are now routinely performed, those notions are too narrow and hard to apply in theories beyond quantum theory or in a theory-independent setting.

Research on generalized noncontextuality began with a modest aim, as an extension of the Kochen–Specker notion of noncontextuality. As the literature matured, partly under the influence of foundational work on epistemic interpretations of quantum theory, it came to be viewed as a candidate for a universally applicable reformulation of classicality in its own right, for three reasons.

<strong>Generality.</strong> The framework applies to an immense class of conceivable physical theories, quantum, classical, and post-quantum, and to arbitrary experimental fragments of them, from single preparations, transformations, or measurements to multi-setting scenarios involving instruments and channels. Advances consist in applying it within ever more encompassing frameworks and to an ever wider range of processes.

<strong>Subsumption.</strong> Generalized noncontextuality recovers, as special cases, several independently motivated notions of classicality: Liouville mechanics and the Gaussian subtheory of quantum theory, positive quasiprobability representations, classical mechanics, macrorealism in the sense of Leggett and Garg, Kochen–Specker noncontextuality, odd-dimensional classically simulable Clifford subtheories, and the emergence of classical objectivity through quantum Darwinism. Advances consist in locating well-established proposals and comparing them, formally, with generalized noncontextuality.

<strong>Stringency.</strong> The criterion sets a high bar for nonclassicality: entanglement, coherence and superposition, incompatibility, uncertainty relations, and no-cloning are not, individually, sufficient to prove contextuality, much as entanglement alone does not suffice to violate a Bell inequality. Advances consist in showing which phenomena fail to imply the nonexistence of a generalized noncontextual model.

The long-term goal is to determine whether the criterion captures the appropriate boundary between classical and nonclassical explanation: clarifying its relation to independently motivated notions of classicality, understanding which familiar quantum phenomena do and do not imply its failure, and identifying settings in which the criterion itself may require refinement or replacement. Reconceptualizing classicality remains open-ended; generalized noncontextuality is a particularly well-developed starting point, not a definition to be assumed from the outset.`
  },
  {
    id: "framework",
    numeral: "II",
    title: "Towards a better framework",
    summary: "Develop a formalism that generalizes ontological models while cleanly separating causal (ontic) from inferential (epistemic) elements, in which a suitably adapted notion of noncontextuality can be formulated.",
    description: tex`Generalized noncontextuality was conceived as an extension of Kochen–Specker noncontextuality, not as a route to reconceptualizing classicality. It has also served as a formal tool for a more foundational project: systematizing and rethinking epistemic interpretations of quantum theory. That project is tied to a milestone of the field, Spekkens's toy theory, since extended to a full generalized probabilistic theory, studied within diagrammatic frameworks, and connected to the Clifford subtheory of quantum theory. Because generalized noncontextuality is provably incompatible with quantum theory, an epistemic interpretation that keeps Leibniz's principle of the identity of indiscernibles has to move beyond the standard ontological-models framework, within which the no-go theorem leaves no room for it.

A broader motivation comes from an observation of E. T. Jaynes: “our present [quantum mechanical] formalism is not purely epistemological; it is a peculiar mixture describing in part realities of Nature, in part incomplete human information about Nature, all scrambled up by Heisenberg and Bohr into an omelette that nobody has seen how to unscramble.” Sharpening the distinction between causation and inference has been central to many areas of science, with the work of Judea Pearl a milestone. The central aim of this goal is accordingly a formalism that generalizes the ontological-models framework while allowing causal (ontic) and inferential (epistemic) elements of a physical description to be cleanly distinguished, within which a suitably adapted notion of noncontextuality can be formulated beyond the reach of the existing no-go theorems. The framework of causal-inferential theories is a major step in this direction.

This is the most open-ended and conceptually demanding of the three goals. A major part of it is formalization itself: identifying a sufficiently general mathematical arena, for instance in category theory and its diagrammatic instantiations, in which processes, their composition, and their equivalences can be represented and related in a principled way. Advances require connecting literatures that use the same mathematics for independent reasons: categorical and process-theoretic approaches to quantum theory, causal-inferential modeling, causality and the experimental analysis of causal structures. A central challenge is how causal notions connect to inferential ones, and how the two interact within a common formalism.`
  },
  {
    id: "applications",
    numeral: "III",
    title: "Useful applications",
    summary: "Make the failure of classicality, as captured by generalized noncontextuality, a certified and quantified resource, witnessed in experiments and tied to the advantages that quantum devices offer.",
    description: tex`Advances in quantum foundations, with Bell's theorem as the paradigm, offer more than conceptual clarity about nonclassicality: they provide applications. The same holds for generalized contextuality, a significant part of whose literature studies how contextuality yields advantages in tasks, most notably for benchmarking the nonclassicality of physical devices. The goal is organized around two themes.

<strong>Witnessing.</strong> Techniques to witness the failure of noncontextuality range from noncontextuality inequalities amenable to direct experimental tests to approaches that establish nonclassicality with minimal assumptions about the devices, together with linear programs, methods that make witnesses robust to noise, and methods that close, or at least identify, the loopholes of such tests. Experiments have followed, so far for low-dimensional systems, and they lag far behind the Bell and Kochen–Specker literature. Advances consist in tests that are tighter, cheaper, and robust, in scaling them to high-dimensional systems, and in carrying out the experiments.

<strong>Contextuality as a resource.</strong> Qualitatively, the question is which tasks require contextuality: for which tasks every noncontextual model falls short of the quantum performance, and which feature of the task is responsible. This has been studied in computation, state discrimination, interference, measurement compatibility, uncertainty relations, metrology, thermodynamics, information processing and communication, cloning, and broadcasting; advances add tasks to the list and show that the advantage survives the noise of actual devices. Quantitatively, the question is how much advantage a given amount of contextuality buys and whether contextuality can be converted from one form into another, as entanglement can. That requires a resource theory of generalized contextuality, with its free operations, monotones, and conversion rules, which remains to be formulated. It is not a goal in its own right here: its value for this goal is the quantitative link to advantage, and its conceptual value belongs to Goal I.`
  }
];

/* Statuses, as in BOX II of the companion paper. A problem enters as "open"; a claimed solution
   moves it to "under revision"; it becomes "solved" on a peer-reviewed publication or on independent
   verification (see the Guidelines page). Disputes or corrections can return it to an earlier status. */
const STATUSES = {
  "open":           { label: "open",           closed: false },
  "under-revision": { label: "under revision", closed: false },
  "solved":         { label: "solved",         closed: true }
};

/* Proposals for broad directions that a later cycle of the list could be organized around. */
const FUTURE_GOALS = [
  {
    title: "Challenges to the program",
    proposedBy: [],
    date: "2026-10-04",
    summary: "A second-round entry type, attached to a goal rather than to a problem, for objections to the assumptions and motivations behind the agenda itself.",
    description: tex`Research on a program is carried out from two positions, often by different people and sometimes by the same person: a constructive one, which builds the theory, and a critical one, which questions it. Criticism keeps a community from turning into a self-confirming bubble, and within generalized contextuality such exchanges have already sharpened its concepts and exposed loopholes, such as the requirement of tomographic completeness. The current design accommodates challenges to a claimed solution and to the statement of a problem, but not to the goals themselves; a community-driven agenda that admits no such challenge risks becoming a consensus machine.

Should the first round succeed, the companion paper plans to add challenges as an entry type of their own. A challenge is attached to a goal; it states the objection, the assumption or motivation it contests, and what the goal would lose if the objection held. Unlike a problem it has no solution: it stays open as an arena for discussion until the community revises the goal or the objection is withdrawn, and it may spawn concrete problems, curated like any other, whose answers inform the dispute without settling it. Until then, researchers who hold such challenges are invited to post them as <a href="#/blog">blog entries</a>, which the moderators will collect as starting material for the second round.`
  },
  /* new entries are added above this line */
];
