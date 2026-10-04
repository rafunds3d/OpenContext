/* The research agenda (long-term goals) and the status vocabulary.
   Math is written inside tex`...` strings: inline between \( and \), display between \[ and \]. */
const GOALS = [
  {
    id: "classicality",
    numeral: "I",
    title: "Reconceptualization of classicality",
    summary: "Motivating and developing the thesis that generalized noncontextuality offers a broad, formal, and meaningful framework for characterizing what it means for a process in Nature to be “classical”.",
     description: tex`Classicality is a concept under active reconceptualization. In its traditional sense it denotes the possibility of explaining a phenomenon within Newtonian or relativistic mechanics, and within quantum theory it is usually tied to commutativity or to the limit \(\hbar\to 0\). Relative to the standards of foundational work, and to the experiments that are now routinely performed, that notion is too narrow and hard to apply in theories beyond quantum theory.

Generalized noncontextuality has come to be viewed as a candidate for a universally applicable reformulation of classicality, for three reasons. It is general: it applies to any operational theory, quantum, classical, or post-quantum, and to arbitrary experimental fragments, from single preparations to multi-setting scenarios with instruments and channels. It subsumes several independently motivated notions of classicality, among them Liouville mechanics and the Gaussian subtheory, positive quasiprobability representations, macrorealism, Kochen–Specker noncontextuality, and classically simulable stabilizer subtheories, and it connects naturally to decoherence-based accounts of objectivity. And it is stringent: entanglement, coherence, incompatibility, uncertainty relations, and no-cloning are not, individually, sufficient to establish contextuality.

The long-term goal is to determine whether the criterion captures the appropriate boundary between classical and nonclassical explanation: clarifying its relation to other notions of classicality, understanding which familiar quantum phenomena do and do not imply its failure, and identifying settings in which the criterion itself needs refinement or replacement.`
  },
  {
    id: "framework",
    numeral: "II",
    title: "Towards a better framework",
    summary: "Build a formalism that separates causal (ontic) from inferential (epistemic) elements, in which a suitably adapted noncontextuality can be formulated.",
    description: tex`Early on, generalized noncontextuality served as a formal tool for systematizing epistemic interpretations of quantum theory, a line of work that produced Spekkens's toy theory and its many descendants. Because generalized noncontextuality is provably incompatible with quantum theory, an epistemic interpretation that keeps Leibniz's principle of the identity of indiscernibles has to move beyond the standard ontological-models framework rather than work within it.

The guiding observation is Jaynes's: the quantum formalism is a mixture of claims about Nature and claims about our incomplete information about Nature, scrambled into an omelette nobody has unscrambled. A central aim of this goal is therefore a formalism that generalizes ontological models while cleanly distinguishing causal from inferential content, within which a suitably adapted notion of noncontextuality can be formulated beyond the reach of the existing no-go theorems. The framework of causal-inferential theories is a major step in this direction.

This is the most open-ended of the three goals. Much of the near-term work is formalization itself, drawing on category theory and its diagrammatic instantiations to structure processes, their composition and their equivalences, and connecting to neighbouring literatures on process theories, causal modeling, and causal structure.`
  },
  {
    id: "applications",
    numeral: "III",
    title: "Useful applications",
    summary: "Witness the failure of classicality in practice, relate it to quantum advantage, and understand contextuality as a resource.",
    description: tex`Advances in quantum foundations, with Bell's theorem as the paradigm, offer more than conceptual clarity: they provide applications. The same holds for generalized contextuality, a significant part of whose literature studies how contextuality yields advantages in specific tasks and how it can benchmark the nonclassicality of devices.

Three themes recur. Witnessing contextuality, theoretically and experimentally, through noncontextuality inequalities, linear programs, and theory-agnostic tomography, where the experimental side still lags far behind Bell and Kochen–Specker tests and the scaling of tests to high-dimensional systems is not understood. Relating contextuality to quantum advantage in computation, state discrimination, interference, metrology, thermodynamics, communication, cloning, and broadcasting. And understanding contextuality as a resource, towards a fully motivated resource theory, which also sharpens the conceptual picture pursued under Goal I.`
  }
];

/* Statuses, as in the database design: the first three are for mathematical
   statements, the last two for laborious non-mathematical tasks. */
const STATUSES = {
  "open":           { label: "open",           closed: false },
  "proved":         { label: "proved",         closed: true },
  "disproved":      { label: "disproved",      closed: true },
  "under-revision": { label: "under revision", closed: false },
  "complete":       { label: "complete",       closed: true }
};

/* Proposals for broad directions that a later cycle of the list could be organized around. */
const FUTURE_GOALS = [
  {
    title: "Challenges to the program",
    proposedBy: [],
    date: "2026-10-04",
    summary: "A direction for work that questions the assumptions behind generalized noncontextuality itself, rather than working within them.",
    description: tex`The companion paper plans a part of the agenda dedicated to challenges to the field: responses to the noncontextuality no-go theorem that abandon some of its assumptions and propose new ones, that keep Leibniz's principle while reformulating the mathematical framework, or that restructure both the arena and the principle at once. Collecting such work under an explicit heading would make the agenda easier to contest and would give near-term problems that probe the framework's limits a place to trace back to. This entry is a placeholder to be developed by whoever takes it up.`
  }
];
