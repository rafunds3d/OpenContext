/* =====================================================================
   3. PROBLEMS  — one entry per problem
   ---------------------------------------------------------------------
   Write math inside tex`...` strings: inline between \( and \), display
   between \[ and \]. A blank line starts a new paragraph.
   Dates are YYYY-MM-DD. history entries have kind "posed", "status",
   "advance", "interest" or "note"; the newest status entry sets the
   date the current status has held since.
   ===================================================================== */
const PROBLEMS = [
  {
    number: 1,
    title: "Contextuality in the Wigner-entropy conjecture",
    status: "open",
    goals: ["classicality"],
    topics: ["Continuous variables", "Wigner function", "Entropic uncertainty relations", "Quasiprobability representations"],
    posedBy: [],
    curatedBy: [],
    statement: tex`Let \(\rho\) be a state of a continuous-variable bosonic system whose Wigner function \(W_{\rho}(x,p)\) is nonnegative, and define the Wigner entropy
\[h(W_{\rho}) := -\int W_{\rho}(x,p)\,\ln W_{\rho}(x,p)\,\mathrm{d}x\,\mathrm{d}p .\]
Is the WEC inequality
\[h(W_{\rho}) \;\geq\; \ln(\pi) + 1\]
a valid generalized noncontextuality inequality for some natural prepare-and-measure scenario built from quadrature measurements on such states?`,
    notice: "The Wigner-entropy conjecture itself has recently been reported false, through a human–AI collaboration. The statement of this entry is being revised in the light of that result.",
    background: tex`While generalized noncontextuality is well understood for discrete-variable systems, its extension to continuous variables (CV) is comparatively underdeveloped. For the Kochen–Specker formulation there are CV scenarios in which contextuality is equivalent to the negativity of the Wigner function [Booth, Chabaud and Emeriau 2022]; for generalized contextuality more than one proposal exists [Jokinen et al. 2026; Haferkamp and Bermejo-Vega 2021], and the picture is more nuanced.

For a bosonic mode with quadratures \(x\) and \(p\), a state \(\rho\) has a Wigner quasiprobability representation \(W_\rho(x,p)\) on phase space which, unlike a probability distribution, may take negative values. The states for which it does not, the Wigner-positive states \(\mathcal{W}_+\), have a well-defined differential entropy \(h(W_\rho)\), the Wigner entropy [Van Herstraeten and Cerf 2021]. Since \(h(W_\rho)\) is invariant under Gaussian transformations and the uncertainty principle forbids arbitrarily sharp joint localization in \(x\) and \(p\), a state-independent lower bound is natural to expect. The Wigner-entropy conjecture (WEC) asserts
\[h(W_\rho) \geq \ln(\pi)+1 \qquad \forall\, \rho\in\mathcal{W}_+,\]
with equality for Gaussian pure states, the only pure Wigner-positive states by Hudson's theorem. The WEC refines the Białynicki-Birula–Mycielski entropic uncertainty relation \(h(\rho_x)+h(\rho_p)\geq \ln(\pi)+1\) for the marginal position and momentum distributions, since \(h(W_\rho)\) lower-bounds the sum of the marginal entropies whenever \(\rho\in\mathcal{W}_+\).

The conjecture had been established for passive states, Wigner-positive mixtures of the first three Fock states, general mixed states on the \(\{\ket{0},\ket{1}\}\) Fock subspace, beam-splitter states, and states with purity below \(4-2\sqrt{3}\); a Rényi-entropy variant was proven for \(\alpha\geq 2\), with pure Gaussian states as unique minimizers.`,
    motivation: tex`The problem sits squarely within Goal I. First, progress on it may in turn feed back into the study of Wigner entropy in the CV setting. Second, if the inequality is a noncontextuality inequality, its connection to entropic uncertainty relations, together with the established link between uncertainty relations and contextuality [Catani et al. 2022], would strengthen the case for a broader relationship between generalized noncontextuality and uncertainty relations. Third, progress requires linking generalized noncontextuality, as a notion of classicality, to the positivity of quasiprobability representations in the CV setting, extending the structure theorems of [Spekkens 2008; Schmid et al. 2024; Wagner et al. 2025], and would hint at a link between contextuality and the Wigner majorization conjecture, which seeks to express the uncertainty principle in the most general terms.`,
    history: [
      { date: "2026-10-03", kind: "posed", text: "Entry created from Problem I of the companion paper.", by: [] },
      { date: "2026-10-03", kind: "note", text: "The Wigner-entropy conjecture has been reported false; the statement will be revised.", by: [] }
    ],
    references: [
      { text: "Z. Van Herstraeten and N. J. Cerf, Quantum Wigner entropy, Phys. Rev. A 104, 042211 (2021)", url: "" },
      { text: "Z. Van Herstraeten, M. G. Jabbour and N. J. Cerf, Continuous majorization in quantum phase space, Quantum 7, 1021 (2023)", url: "" },
      { text: "R. I. Booth, U. Chabaud and P.-E. Emeriau, Contextuality and Wigner negativity are equivalent for continuous-variable quantum measurements, Phys. Rev. Lett. 129, 230401 (2022)", url: "" },
      { text: "J. Haferkamp and J. Bermejo-Vega, Equivalence of contextuality and Wigner function negativity in continuous-variable quantum optics (2021)", url: "https://arxiv.org/abs/2112.14788" },
      { text: "P. Jokinen et al., Generalised contextuality of continuous variable quantum theory can be revealed with a single projective measurement (2026)", url: "https://arxiv.org/abs/2601.14067" },
      { text: "S. D. Bartlett, T. Rudolph and R. W. Spekkens, Reconstruction of Gaussian quantum mechanics from Liouville mechanics with an epistemic restriction, Phys. Rev. A 86, 012103 (2012)", url: "" },
      { text: "L. Catani, M. Leifer, G. Scala, D. Schmid and R. W. Spekkens, What is nonclassical about uncertainty relations?, Phys. Rev. Lett. 129, 240401 (2022)", url: "" },
      { text: "I. Białynicki-Birula and J. Mycielski, Uncertainty relations for information entropy in wave mechanics, Commun. Math. Phys. 44, 129 (1975)", url: "" },
      { text: "N. C. Dias and J. N. Prata, On a recent conjecture by Z. Van Herstraeten and N. J. Cerf for the quantum Wigner entropy, Ann. Henri Poincaré 24, 2341 (2023)", url: "" },
      { text: "Q. Qian and C. N. Gagatsos, Wigner non-negative states that verify the Wigner entropy conjecture, Phys. Rev. A 110, 012228 (2024)", url: "" }
    ]
  },
  {
    number: 2,
    title: "Noncontextual SWITCH",
    status: "open",
    goals: ["framework"],
    topics: ["Indefinite causal order", "Quantum SWITCH", "Higher-order operations", "Epistemically restricted models"],
    posedBy: [],
    curatedBy: [],
    statement: tex`Take \(\mathcal{S}\) to be the quantum SWITCH. Is there a scenario in which a collection of channels \(\{A\}\), \(\{B\}\), taken as inputs to the quantum SWITCH, together with the resulting channels \(\{\mathcal{S}(A,B)\}\), coherent states, and effects, <em>can</em> be explained by means of a generalized noncontextual model?`,
    background: tex`The quantum SWITCH is a higher-order operation \(\mathcal{S}\) that takes two channels \(A,B:\mathcal{B}(\mathcal{H})\to\mathcal{B}(\mathcal{H})\) and outputs a channel on a control qubit together with the system,
\[\mathcal{S}(A,B)[\sigma\otimes\rho] := \sum_{ij} \mathsf{S}_{ij}\,(\sigma\otimes\rho)\,\mathsf{S}_{ij}^{\dagger},\qquad \mathsf{S}_{ij} := \ket{0}\!\bra{0}\otimes \mathsf{B}_j\mathsf{A}_i + \ket{1}\!\bra{1}\otimes \mathsf{A}_i\mathsf{B}_j ,\]
where \(\{\mathsf{A}_i\}_i\) and \(\{\mathsf{B}_j\}_j\) are Kraus representations of \(A\) and \(B\). Take \(A\) and \(B\) unitary for simplicity. If the control \(\sigma\) is in a computational-basis state the channels are applied in a definite order; if it is in a mixed state, in a probabilistic mixture of the two orders; but if it is coherent with respect to the computational basis, the SWITCH appears to implement the two orders in superposition. Such scenarios are said to exhibit indefinite causal order.

A causally “unscrambled” formulation of quantum theory faces an evident obstacle in settings where causal order appears indefinite, and even the broader question of whether generalized contextuality is a meaningful notion of classicality there is hard; some attempts to formalize such a notion exist [Kunjwal and Oreshkov 2025; Shrapnel and Costa 2018]. Framing indefinite causality within operational probabilistic theories, or within process theories, is itself a major line of active research, which makes it hard to pose near-term questions that do not rely on frameworks still being developed.

There is nevertheless a simple sense in which the question can be tackled with existing tools: for fixed \(A\) and \(B\), the element \(\mathcal{S}(A,B)\) is an ordinary quantum channel, and the classicality content of channels is well understood.`,
    motivation: tex`If such a model exists, then, since generalized noncontextual models make precise that nonclassical features arise from epistemic restrictions on a classical model rather than from some further puzzling phenomenon, it would provide evidence for, and clarify, the role that toy models with epistemic restrictions play in understanding phenomena usually taken to lack a causally ordered explanation. Although a standard near-term question, it may also spark progress toward the much harder question, central to Goal II, of whether the map \(\mathcal{S}\) itself can be considered classical in a sense akin to generalized noncontextuality.`,
    history: [
      { date: "2026-10-03", kind: "posed", text: "Entry created from Problem II of the companion paper.", by: [] }
    ],
    references: [
      { text: "G. Chiribella, G. M. D'Ariano, P. Perinotti and B. Valiron, Quantum computations without definite causal structure, Phys. Rev. A 88, 022318 (2013)", url: "" },
      { text: "P. Taranto, S. Milz, M. Murao, M. T. Quintino and K. Modi, Higher-order quantum operations (2025)", url: "https://arxiv.org/abs/2503.09693" },
      { text: "F. Costa, G. Rubino, C. Branciard, Č. Brukner and M. T. Quintino, Indefinite quantum causality (2026)", url: "https://arxiv.org/abs/2606.19438" },
      { text: "M. Araújo, C. Branciard, F. Costa, A. Feix, C. Giarmatzi and Č. Brukner, Witnessing causal nonseparability, New J. Phys. 17, 102001 (2015)", url: "" },
      { text: "R. Kunjwal and O. Oreshkov, Nonclassicality in correlations without causal order (2025)", url: "https://arxiv.org/abs/2307.02565" },
      { text: "S. Shrapnel and F. Costa, Causation does not explain contextuality, Quantum 2, 63 (2018)", url: "" },
      { text: "D. Schmid, J. H. Selby and R. W. Spekkens, Unscrambling the omelette of causation and inference: the framework of causal-inferential theories (2021)", url: "https://arxiv.org/abs/2009.03297" },
      { text: "J. H. Selby, M. E. Stasinou, M. Wilson and B. Coecke, Generalised process theories (2025)", url: "https://arxiv.org/abs/2502.10368" },
      { text: "M. Wilson, G. Chiribella and A. Kissinger, Quantum supermaps are characterized by locality, Quantum 10, 2013 (2026)", url: "" }
    ]
  },
  {
    number: 3,
    title: "Sample complexity of self-consistent entanglement certification",
    status: "open",
    goals: ["applications"],
    topics: ["Entanglement", "Theory-agnostic tomography", "Sample complexity", "Experimental tests"],
    posedBy: [],
    curatedBy: [],
    statement: tex`Consider self-consistent entanglement certification via generalized noncontextuality in a bipartite Bell experiment, with known local dimension \(d\) and the tomographic completeness needed to infer local operational identities. What is the minimum total number of copies of the target state required to certify entanglement at trace-distance resolution \(\gamma\), with error probability at most \(\delta\), when the identities must be learned from the same finite experimental data?

How does this sample complexity depend on \(d\), \(\gamma\), \(\delta\), and the number of distinct local measurement effects? All copies used to infer the identities must count towards the total.`,
    background: tex`<strong>Statistics.</strong> Alice and Bob share an unknown state \(\rho^{AB}\) on \(\mathbb C^d\otimes\mathbb C^d\). They choose measurement settings \(x,y\) and record outcomes \(a,b\), with probabilities
\[p(ab\mid xy)=\operatorname{Tr}\!\left[(M^A_{a\mid x}\otimes M^B_{b\mid y})\rho^{AB}\right].\]
The local effects are positive and satisfy \(\sum_a M^A_{a\mid x}=I_d\) and \(\sum_b M^B_{b\mid y}=I_d\). Their operator representations are not supplied to the protocol. One trial consumes one target copy and records \((x,y,a,b)\); assume independent, identically prepared copies and stationary, memoryless devices.

<strong>Operational identities and the test.</strong> The identities on Alice’s side are the real coefficient vectors
\[\mathcal O_A:=\left\{\alpha:\sum_{a,x}\alpha_{a,x}M^A_{a\mid x}=0\right\},\]
and \(\mathcal O_B\) is defined analogously. A generalized noncontextual model must reproduce the statistics as
\[p(ab\mid xy)=\sum_{\lambda_A,\lambda_B}\mu(\lambda_A,\lambda_B)\,\xi_A(a\mid x,\lambda_A)\,\xi_B(b\mid y,\lambda_B),\]
where \(\mu\) is a probability distribution and the local response functions \(\xi_A,\xi_B\) are nonnegative, normalized for each setting, and preserve every local operational identity:
\[\sum_{a,x}\alpha_{a,x}\xi_A(a\mid x,\lambda_A)=0\qquad\forall\alpha\in\mathcal O_A,\ \forall\lambda_A,\]
with the analogous constraint for Bob. Let \(\mathcal{NC}(\mathcal O_A,\mathcal O_B)\) denote the polytope of statistics admitting such a model. For fixed identities, membership can be tested by linear programming. Every separable state produces statistics in this polytope, so establishing \(p\notin\mathcal{NC}(\mathcal O_A,\mathcal O_B)\) certifies entanglement [Zhang 2026, Section II].

<strong>Finite-sample task.</strong> Define the trace-distance entanglement by
\[E_{\mathrm{tr}}(\rho):=\min_{\sigma\in\mathrm{Sep}}\frac12\|\rho-\sigma\|_1,\]
where \(\mathrm{Sep}\) is the set of separable states. A protocol returns either “certify” or “inconclusive” and must satisfy
\[\begin{aligned}
\Pr(\mathsf{certify})&\leq\delta &&\text{if }p\in\mathcal{NC}(\mathcal O_A,\mathcal O_B),\\
\Pr(\mathsf{certify})&\geq1-\delta &&\text{if }E_{\mathrm{tr}}(\rho^{AB})\geq\gamma.
\end{aligned}\]
The measurement family must be sufficiently rich to achieve the desired resolution with exact data. The tomographic-completeness assumption ensures that the linear relations visible in the exact probability table identify the relevant local operational identities. With finite data, both the probabilities and the identities are uncertain: the test must account for both, rather than impose estimated identities as exact. All trials used for this inference count towards the sample budget; any further assumptions needed for stable inference should be explicit.

For suitable local projective measurement families, when the exact identities are supplied independently, the optimal target-copy cost at fixed \(d\) is \(\Theta_d(\gamma^{-2}\log(1/\delta))\) [Zhang 2026, Section V]. The open question is the additional cost of learning those identities, including whether the number of distinct effects enters the sample complexity.`,
    motivation: tex`This problem gives theory-independent tomography a concrete experimental objective: a reliable entanglement certificate obtained through generalized noncontextuality. Measuring performance by the certification verdict avoids choosing a distance between gauge-dependent reconstructions. A solution would clarify the statistical cost of learning operational identities and provide a starting point for studying other applications of generalized contextuality.`,
    history: [
      { date: "2026-10-03", kind: "posed", text: "Entry created from Problem III of the companion paper.", by: [] },
      { date: "2026-10-17", kind: "note", text: "Reformulated around the sample complexity of self-consistent entanglement certification via generalized noncontextuality, following Sections II and V–VI of Zhang (2026). Prepared with Codex assistance.", by: ["Yujie Zhang"] }
    ],
    references: [
      { text: "Y. Zhang, Complexity of self-consistent entanglement certification (2026), Sections II and V–VI", url: "https://arxiv.org/abs/2610.08757" },
      { text: "M. D. Mazurek, M. F. Pusey, K. J. Resch and R. W. Spekkens, Experimentally bounding deviations from quantum theory in the landscape of generalized probabilistic theories, PRX Quantum 2, 020302 (2021)", url: "https://doi.org/10.1103/PRXQuantum.2.020302" },
      { text: "M. J. Grabowecky, C. A. J. Pollack, A. R. Cameron, R. W. Spekkens and K. J. Resch, Experimentally bounding deviations from quantum theory for a photonic three-level system using theory-agnostic tomography, Phys. Rev. A 105, 032204 (2022)", url: "https://doi.org/10.1103/PhysRevA.105.032204" }
    ]
  }
];
