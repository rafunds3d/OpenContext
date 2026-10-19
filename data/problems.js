/* =====================================================================
   3. PROBLEMS  — one entry per problem
   ---------------------------------------------------------------------
   Write math inside tex`...` strings: inline between \( and \), display
   between \[ and \]. A blank line starts a new paragraph.
   Dates are YYYY-MM-DD. history entries have kind "posed", "status"
   (with to: the new status), "advance", "interest" or "note"; the
   newest status entry sets the date the current status has held since
   and the status entries draw the progress chart. Claims, verifications,
   expositions, challenges and comments are contributions and go in
   data/contributions.js, which also credits "verified by" and
   "explained by".
   ===================================================================== */
const PROBLEMS = [
  {
    number: 1,
    title: "The Wigner-entropy bound",
    status: "open",
    goals: ["classicality"],
    topics: ["Continuous variables", "Wigner function", "Entropic uncertainty relations", "Quasiprobability representations"],
    posedBy: ["Rafael Wagner", "Tobias Haas", "Ulysse Chabaud"],
    revisedBy: [],
    curatedBy: [],
    statement: tex`Let \(\rho\) be a state of a continuous-variable bosonic system whose Wigner function \(W_{\rho}(x,p)\) is nonnegative, and define the Wigner entropy
\[h(W_{\rho}) := -\int W_{\rho}(x,p)\,\ln W_{\rho}(x,p)\,\mathrm{d}x\,\mathrm{d}p .\]
Let \(b_\star := \inf_{\rho\in\mathcal{W}_+} h(W_\rho)\) be the infimum of the Wigner entropy over the set \(\mathcal{W}_+\) of such states; it is known that \(\ln(2\pi) \leq b_\star < \ln(\pi)+1\). Is
\[h(W_{\rho}) \;\geq\; b_\star\]
a valid generalized noncontextuality inequality for some natural prepare-and-measure scenario involving quadrature measurements on such states, that is, does the bound \(b_\star\) follow from noncontextuality alone, and can \(b_\star\) be determined?`,
    background: tex`While generalized noncontextuality is well understood for discrete-variable (DV) systems, its extension to continuous variables (CV) is comparatively underdeveloped. For the Kochen–Specker formulation there are CV scenarios in which the notion can be made precise [Barbosa et al. 2022], quantified and experimentally investigated, and in which contextuality is equivalent to the negativity of the Wigner function [Booth, Chabaud and Emeriau 2022]. For generalized contextuality more than one proposal exists [Jokinen et al. 2026], and the picture is more nuanced, although there seems to be a close relationship between generalized contextuality and Wigner negativity, both for DV systems [Schmid et al. 2022] and in some proposed CV definitions [Haferkamp and Bermejo-Vega 2021]. A concrete problem helps to work around the space of possible definitions, putting those proposals to the test.

For a bosonic mode with quadratures \(x\) and \(p\), a state \(\rho\) has a Wigner quasiprobability representation \(W_\rho(x,p)\) on phase space which, unlike a probability distribution, may take negative values. The states for which it does not, the Wigner-positive states \(\mathcal{W}_+\), have a well-defined differential entropy \(h(W_\rho)\), the Wigner entropy [Van Herstraeten and Cerf 2021]; proposed extensions of this functional to arbitrary states are not unique. Since \(h(W_\rho)\) is invariant under Gaussian transformations and the uncertainty principle forbids arbitrarily sharp joint localization in \(x\) and \(p\), a state-independent lower bound is natural to expect. The Wigner-entropy conjecture (WEC) asserted
\[h(W_\rho) \geq \ln(\pi)+1 \qquad \forall\, \rho\in\mathcal{W}_+,\]
with equality for Gaussian pure states, the only pure Wigner-positive states by Hudson's theorem. The WEC refines the Białynicki-Birula–Mycielski entropic uncertainty relation \(h(\rho_x)+h(\rho_p)\geq \ln(\pi)+1\) for the marginal position and momentum distributions, since \(h(W_\rho)\) lower-bounds the sum of the marginal entropies whenever \(\rho\in\mathcal{W}_+\), by subadditivity.

The conjecture had been established for passive states, Wigner-positive mixtures of the first three Fock states, general mixed states on the \(\{\ket{0},\ket{1}\}\) Fock subspace, general mixtures of Fock states, beam-splitter states, and states with purities below \(2/e\); a Rényi-entropy variant was proven for \(\alpha\geq 2\), with pure Gaussian states as unique minimizers. Recently, however, three independent works provided counterexamples to the WEC [He 2026; Liu and Qiao 2026; Van Herstraeten, Cerf and Chabaud 2026], showing that the true infimum of the Wigner entropy lies strictly below that of Gaussian pure states, without determining its exact value.`,
    relevance: tex`The question is motivated by three established connections in the literature: between Kochen–Specker noncontextuality and Wigner positivity in the CV domain [Booth, Chabaud and Emeriau 2022], between generalized noncontextuality and Wigner positivity in the setting of [Haferkamp and Bermejo-Vega 2021], and between generalized noncontextuality and the Gaussian subtheory of quantum theory [Bartlett, Rudolph and Spekkens 2012]. Together with the recent refutation of the WEC, which leaves the true infimum \(b_\star\) undetermined, they make it timely to ask whether the correct entropic bound on Wigner-positive states is a noncontextuality inequality. A concrete inequality is also a way of putting the competing CV definitions of generalized contextuality [Jokinen et al. 2026; Haferkamp and Bermejo-Vega 2021] to the test.

The problem traces to Goal I, Reconceptualization of classicality, on two of its three fronts: subsumption, since positive quasiprobability representations and the Gaussian subtheory are among the notions of classicality that generalized noncontextuality is meant to recover, and stringency, since it bears on whether uncertainty relations, which alone do not imply contextuality, can nonetheless be recast as noncontextuality inequalities.`,
    significance: tex`A resolution would advance Goal I in three ways. First, of independent interest to researchers working on Wigner representations, progress on it may lead to further advances in understanding the Wigner entropy itself, including the value of \(b_\star\). Second, should the bound turn out to be a noncontextuality inequality, its connection to entropic uncertainty relations, together with the established link between nonclassicality as captured by uncertainty relations and contextuality [Catani et al. 2022], would significantly strengthen the case for a broader relationship between generalized noncontextuality and uncertainty relations. Since progress requires linking generalized noncontextuality, as a notion of classicality, to the positivity of quasiprobability representations, it extends the structure theorems of [Spekkens 2008; Schmid et al. 2024; Wagner et al. 2025] into the CV setting. Third, such a link would hint at a link between contextuality and the even more fundamental Wigner majorization conjecture in phase space, which seeks to express the uncertainty principle in the most general terms. A negative answer is informative too: it would locate a natural CV entropic bound that noncontextuality alone does not explain.`,
    history: [
      { date: "2026-10-03", kind: "posed", text: "Entry created from Problem I of the companion paper.", by: [] }
    ],
    references: [
      { text: "Z. Van Herstraeten and N. J. Cerf, Quantum Wigner entropy, Phys. Rev. A 104, 042211 (2021)", url: "https://doi.org/10.1103/PhysRevA.104.042211" },
      { text: "Z. Van Herstraeten, M. G. Jabbour and N. J. Cerf, Continuous majorization in quantum phase space, Quantum 7, 1021 (2023)", url: "" },
      { text: "Z. He, Wigner entropy below vacuum: physical counterexamples and stability limits (2026)", url: "https://arxiv.org/abs/2609.13312" },
      { text: "A.-X. Liu and C.-F. Qiao, Radial coarse graining restores vacuum majorization in Wigner phase space (2026)", url: "https://arxiv.org/abs/2609.23277" },
      { text: "Z. Van Herstraeten, N. J. Cerf and U. Chabaud, Wigner-positive quantum states can have lower entropy than the vacuum (2026)", url: "https://arxiv.org/abs/2609.24670" },
      { text: "R. S. Barbosa, T. Douce, P.-E. Emeriau, E. Kashefi and S. Mansfield, Continuous-variable nonlocality and contextuality, Commun. Math. Phys. 391, 1047 (2022)", url: "" },
      { text: "R. I. Booth, U. Chabaud and P.-E. Emeriau, Contextuality and Wigner negativity are equivalent for continuous-variable quantum measurements, Phys. Rev. Lett. 129, 230401 (2022)", url: "" },
      { text: "P. Jokinen, M. Weilenmann, M. Plávala, J.-P. Pellonpää, J. Kiukas and R. Uola, Generalised contextuality of continuous variable quantum theory can be revealed with a single projective measurement (2026)", url: "https://arxiv.org/abs/2601.14067" },
      { text: "J. Haferkamp and J. Bermejo-Vega, Equivalence of contextuality and Wigner function negativity in continuous-variable quantum optics (2021)", url: "https://arxiv.org/abs/2112.14788" },
      { text: "D. Schmid, H. Du, J. H. Selby and M. F. Pusey, Uniqueness of noncontextual models for stabilizer subtheories, Phys. Rev. Lett. 129, 120403 (2022)", url: "" },
      { text: "S. D. Bartlett, T. Rudolph and R. W. Spekkens, Reconstruction of Gaussian quantum mechanics from Liouville mechanics with an epistemic restriction, Phys. Rev. A 86, 012103 (2012)", url: "" },
      { text: "I. Białynicki-Birula and J. Mycielski, Uncertainty relations for information entropy in wave mechanics, Commun. Math. Phys. 44, 129 (1975)", url: "" },
      { text: "Q. Qian and C. N. Gagatsos, Wigner non-negative states that verify the Wigner entropy conjecture, Phys. Rev. A 110, 012228 (2024)", url: "" },
      { text: "L. Vanbever, In Wigner phase space, convolution explains why the vacuum majorizes mixtures of Fock states (2021)", url: "https://arxiv.org/abs/2104.14996" },
      { text: "Z. Van Herstraeten and N. J. Cerf, Wigner entropy conjecture and the interference formula in quantum phase space, Phys. Rev. A 112, 062207 (2025)", url: "" },
      { text: "Q. Qian and C. N. Gagatsos, Upper bounds on the purity of Wigner non-negative quantum states that verify the Wigner entropy conjecture, Phys. Rev. A 114, 022408 (2026)", url: "" },
      { text: "N. C. Dias and J. N. Prata, On a recent conjecture by Z. Van Herstraeten and N. J. Cerf for the quantum Wigner entropy, Ann. Henri Poincaré 24, 2341 (2023)", url: "" },
      { text: "L. Catani, M. Leifer, G. Scala, D. Schmid and R. W. Spekkens, What is nonclassical about uncertainty relations?, Phys. Rev. Lett. 129, 240401 (2022)", url: "" },
      { text: "R. W. Spekkens, Negativity and contextuality are equivalent notions of nonclassicality, Phys. Rev. Lett. 101, 020401 (2008)", url: "" },
      { text: "D. Schmid, J. H. Selby, M. F. Pusey and R. W. Spekkens, A structure theorem for generalized-noncontextual ontological models, Quantum 8, 1283 (2024)", url: "https://doi.org/10.22331/q-2024-03-14-1283" },
      { text: "R. Wagner, R. D. Baldijão, M. Salzger, Y. Yīng, D. Schmid and J. H. Selby, A structure theorem for complex-valued quasiprobability representations of physical theories (2025)", url: "https://arxiv.org/abs/2509.10949" }
    ]
  },
  {
    number: 2,
    title: "Noncontextual SWITCH",
    status: "open",
    goals: ["framework"],
    topics: ["Indefinite causal order", "Quantum SWITCH", "Higher-order operations", "Epistemically restricted models"],
    posedBy: [],
    revisedBy: [],
    curatedBy: [],
    statement: tex`Take \(\mathcal{S}\) to be the quantum SWITCH. Is there a scenario in which a collection of channels \(\{A\}\), \(\{B\}\), taken as inputs to the quantum SWITCH, together with the resulting channels \(\{\mathcal{S}(A,B)\}\), coherent states, and effects, <em>can</em> be explained by means of a generalized noncontextual model?`,
    background: tex`The quantum SWITCH is a higher-order operation \(\mathcal{S}\) that takes two channels \(A,B:\mathcal{B}(\mathcal{H})\to\mathcal{B}(\mathcal{H})\) and outputs a channel on a control qubit together with the system,
\[\mathcal{S}(A,B)[\sigma\otimes\rho] := \sum_{ij} \mathsf{S}_{ij}\,(\sigma\otimes\rho)\,\mathsf{S}_{ij}^{\dagger},\qquad \mathsf{S}_{ij} := \ket{0}\!\bra{0}\otimes \mathsf{B}_j\mathsf{A}_i + \ket{1}\!\bra{1}\otimes \mathsf{A}_i\mathsf{B}_j ,\]
where \(\{\mathsf{A}_i\}_i\) and \(\{\mathsf{B}_j\}_j\) are Kraus representations of \(A\) and \(B\). Take \(A\) and \(B\) unitary for simplicity. If the control \(\sigma\) is in a computational-basis state the channels are applied in a definite order; if it is in a mixed state, in a probabilistic mixture of the two orders; but if it is coherent with respect to the computational basis, the SWITCH appears to implement the two orders in superposition. Such scenarios are said to exhibit indefinite causal order.

A causally “unscrambled” formulation of quantum theory faces an evident obstacle in settings where causal order appears indefinite, and even the broader question of whether generalized contextuality is a meaningful notion of classicality there is hard; some attempts to formalize such a notion exist [Kunjwal and Oreshkov 2025; Shrapnel and Costa 2018]. Framing indefinite causality within operational probabilistic theories, or within process theories, is itself a major line of active research, which makes it hard to pose near-term questions that do not rely on frameworks still being developed.

There is nevertheless a simple sense in which the question can be tackled with existing tools: for fixed \(A\) and \(B\), the element \(\mathcal{S}(A,B)\) is an ordinary quantum channel, and the classicality content of channels is well understood.`,
    relevance: tex`Indefinite causal order is a significantly puzzling effect allowed by quantum theory, one that calls traditional ways of reasoning about causality into question [Chiribella, D'Ariano and Perinotti 2008; Chiribella et al. 2013; Taranto et al. 2025; Costa et al. 2026], and framing it within operational probabilistic theories, or more generally within process theories, is a major, ongoing line of research [Selby et al. 2025; Wilson, Chiribella and Kissinger 2026]. Even whether generalized contextuality is a meaningful notion of classicality there is a hard question, with only a few attempts to formalize such a notion [Kunjwal and Oreshkov 2025; Shrapnel and Costa 2018]. Most questions one could ask depend on frameworks still under construction. This one does not: for fixed inputs the SWITCH produces ordinary quantum channels, for which an overwhelmingly large literature and toolbox on generalized noncontextuality exists, so the question is well posed today while pointing at the harder one.

The problem traces to Goal II, Towards a better framework. A causally “unscrambled” formulation of quantum theory, in the sense of causal-inferential theories [Schmid, Selby and Spekkens 2021], faces an evident obstacle in settings where causal order appears indefinite, and the quantum SWITCH is the simplest and most studied such setting.`,
    significance: tex`A generalized noncontextual model is, by construction, a classical model in which all nonclassical features arise from epistemic restrictions alone. If such a model exists for the quantum SWITCH, the puzzling features of indefinite causal order would have an explanation of this kind, which would clarify the role that epistemically restricted toy models can play in interpreting phenomena that seem to lack a causally ordered explanation. If no such model exists, the quantum SWITCH becomes a concrete target for the extended framework that Goal II seeks. Either way, the answer may spark progress toward the much harder question of whether the map \(\mathcal{S}\) itself can be considered classical in a sense akin to generalized noncontextuality.`,
    history: [
      { date: "2026-10-03", kind: "posed", text: "Entry created from Problem II of the companion paper.", by: [] }
    ],
    references: [
      { text: "G. Chiribella, G. M. D'Ariano and P. Perinotti, Transforming quantum operations: quantum supermaps, EPL 83, 30004 (2008)", url: "" },
      { text: "G. Chiribella, G. M. D'Ariano, P. Perinotti and B. Valiron, Quantum computations without definite causal structure, Phys. Rev. A 88, 022318 (2013)", url: "" },
      { text: "P. Taranto, S. Milz, M. Murao, M. T. Quintino and K. Modi, Higher-order quantum operations (2025)", url: "https://arxiv.org/abs/2503.09693" },
      { text: "F. Costa, G. Rubino, C. Branciard, Č. Brukner and M. T. Quintino, Indefinite quantum causality (2026)", url: "https://arxiv.org/abs/2606.19438" },
      { text: "M. Araújo, C. Branciard, F. Costa, A. Feix, C. Giarmatzi and Č. Brukner, Witnessing causal nonseparability, New J. Phys. 17, 102001 (2015)", url: "" },
      { text: "C. Branciard, M. Araújo, A. Feix, F. Costa and Č. Brukner, The simplest causal inequalities and their violation, New J. Phys. 18, 013008 (2015)", url: "" },
      { text: "D. Ebler, S. Salek and G. Chiribella, Enhanced communication with the assistance of indefinite causal order, Phys. Rev. Lett. 120, 120502 (2018)", url: "" },
      { text: "M. Araújo, P. A. Guérin and A. Baumeler, Quantum computation with indefinite causal structures, Phys. Rev. A 96, 052315 (2017)", url: "" },
      { text: "R. Kunjwal and O. Oreshkov, Nonclassicality in correlations without causal order (2025)", url: "https://arxiv.org/abs/2307.02565" },
      { text: "S. Shrapnel and F. Costa, Causation does not explain contextuality, Quantum 2, 63 (2018)", url: "" },
      { text: "D. Schmid, J. H. Selby and R. W. Spekkens, Unscrambling the omelette of causation and inference: the framework of causal-inferential theories (2021)", url: "https://arxiv.org/abs/2009.03297" },
      { text: "J. H. Selby, M. E. Stasinou, M. Wilson and B. Coecke, Generalised process theories (2025)", url: "https://arxiv.org/abs/2502.10368" },
      { text: "M. Wilson, G. Chiribella and A. Kissinger, Quantum supermaps are characterized by locality, Quantum 10, 2013 (2026)", url: "" }
    ]
  },
  {
    number: 3,
    title: "Sample complexity",
    status: "open",
    goals: ["applications"],
    topics: ["Self-consistent tomography", "Entanglement certification", "Sample complexity", "Experimental tests"],
    posedBy: [],
    revisedBy: [],
    curatedBy: [],
    statement: tex`Consider a bipartite state \(\rho^{AB}\) with known local dimension \(d\), measured by uncharacterized local devices, so that the statistics are
\[p(ab|xy) = \operatorname{Tr}\!\left[(M^A_{a|x}\otimes M^B_{b|y})\,\rho^{AB}\right].\]
Let \(\mathcal{NC}\) be the polytope of statistics admitting a local ontological model whose response functions preserve the operational identities among each party's measurement effects, and let \(E_{\mathrm{tr}}(\rho):=\min_{\sigma\in\mathrm{Sep}}\frac12\|\rho-\sigma\|_1\), where \(\mathrm{Sep}\) is the set of separable states. Assume independent, identically prepared target copies, stationary and memoryless devices, the tomographic completeness needed to infer the local identities, and measurement families rich enough to certify every state with \(E_{\mathrm{tr}}(\rho^{AB})\geq\gamma\) in the exact-data limit.

What is the minimum total number of target copies required for a protocol returning either \(\mathsf{certify}\) or \(\mathsf{inconclusive}\) to satisfy
\[\begin{aligned}
\Pr(\mathsf{certify})&\leq\delta &&\text{if } p\in\mathcal{NC},\\
\Pr(\mathsf{certify})&\geq1-\delta &&\text{if } E_{\mathrm{tr}}(\rho^{AB})\geq\gamma,
\end{aligned}\]
when the operational identities defining \(\mathcal{NC}\) must be inferred from the same finite experimental data? How does this number scale with \(d\), \(\gamma\), \(\delta\), and the number of distinct local effects, counting all copies used to infer the identities?`,
    background: tex`Compared to the Bell and Kochen–Specker literature, experimental investigations of generalized contextuality remain relatively limited, with only a handful of experiments reported [Mazurek et al. 2016; Mazurek et al. 2021; Giordani et al. 2023; Spekkens et al. 2009; Zhan et al. 2017; Zhang et al. 2019; Zhang et al. 2026; Gama et al. 2026; Rossi et al. 2026]. Generalized contextuality tests can address loopholes arising in Kochen–Specker tests [Pusey, del Rio and Meyer 2019; Schmid et al. 2025; Selby et al. 2023; Gitton and Woods 2024], and can be made robust [Pusey 2018; Fonseca et al. 2025; Selby et al. 2024; Khoshbin, Catani and Leifer 2024; Rossi et al. 2023]. Yet, despite our increasing ability to control high-dimensional systems, much of the development around testing generalized contextuality remains concerned with low-dimensional examples, and it is not entirely clear how these tests scale.

A first difficulty is establishing the operational equivalences that enter the definition of generalized noncontextuality. Some form of tomography is required for this purpose [Pusey, del Rio and Meyer 2019; Schmid et al. 2025]. If one wishes to remain agnostic about the underlying theory, in the instrumentalist sense of operational probabilistic theories, this can be done within the framework of generalized probabilistic theories (GPTs) through theory-agnostic tomography, demonstrated experimentally for a photon's polarization degree of freedom [Mazurek et al. 2021] and for a three-level photonic system [Grabowecky et al. 2022], or through other standard self-consistent tomography [Nielsen et al. 2021] within the framework of quantum theory.

A second difficulty concerns how to assess the output of self-consistent tomography. Even with tomographically complete, exact statistics, state and effect representations are determined only up to compatible gauge transformations. A reconstruction-based sample-complexity analysis therefore needs an accuracy criterion that accounts for this freedom, for example by minimizing a distance over gauges, which may introduce a computationally demanding optimization. An alternative is to benchmark tomography together with the subsequent noncontextuality test through a gauge-independent certification task.

Self-consistent entanglement certification provides one such task [Zhang et al. 2026; Zhang 2026]. Every separable state produces statistics in the polytope \(\mathcal{NC}\) of the statement, so \(p\notin\mathcal{NC}\) certifies entanglement, and both the operational identities and this verdict are independent of the tomographic gauge. Compared with standard tomography using calibrated measurements, an additional difficulty is that finite data introduce uncertainty not only in the probabilities but also in the estimate of \(\mathcal{NC}\) itself, through the inferred operational identities; the certification test must account for both sources of uncertainty.

When the exact identities are supplied independently, suitable local projective measurement families give an optimal target-copy cost of \(\Theta_d(\gamma^{-2}\log(1/\delta))\) at fixed \(d\) [Zhang 2026]. The additional cost of inferring those identities, while accounting for their statistical uncertainty, is what the problem asks for.`,
    relevance: tex`Strengthening the connection between generalized contextuality and experimentation is a major goal, since any application ultimately rests on it, and experiments remain few compared to the Bell and Kochen–Specker literature. Generalized contextuality tests can address the loopholes of Kochen–Specker tests and can be made robust to noise, but they have mostly been developed for low-dimensional examples, and it is not clear how they scale. How complex it is to implement such a test has accordingly been receiving attention, and it is tied to the tomography that any test needs to establish its operational equivalences [Pusey, del Rio and Meyer 2019; Schmid et al. 2025]. Self-consistent entanglement certification [Zhang et al. 2026; Zhang 2026] turns this into a well-posed question: it sidesteps the gauge freedom of self-consistent tomography, and the cost is already known when the identities are supplied independently, leaving the cost of inferring them open.

The problem traces to Goal III, Useful applications, through its witnessing theme: devising tests that are tighter, cheaper to implement and robust, scaling them to high-dimensional systems, and carrying out the corresponding experiments.`,
    significance: tex`Resolving the problem would clarify the experimental resources needed for a concrete application of generalized noncontextuality, entanglement certification with uncharacterized local devices, counting the cost of establishing the operational identities and not only of estimating the probabilities. The scaling with \(d\) and with the number of distinct local effects would say how such tests extend from the low-dimensional examples studied so far to larger systems, which is the scaling question the witnessing theme of Goal III raises, and comparing it with the \(\Theta_d(\gamma^{-2}\log(1/\delta))\) cost when the identities are supplied would isolate the price of self-consistency. This bears directly on the goal of making the failure of classicality, as captured by generalized noncontextuality, a certified resource witnessed in experiments.`,
    history: [
      { date: "2026-10-03", kind: "posed", text: "Entry created from Problem III of the companion paper.", by: [] }
    ],
    references: [
      { text: "M. D. Mazurek, M. F. Pusey, R. Kunjwal, K. J. Resch and R. W. Spekkens, An experimental test of noncontextuality without unphysical idealizations, Nat. Commun. 7, 11780 (2016)", url: "" },
      { text: "M. D. Mazurek, M. F. Pusey, K. J. Resch and R. W. Spekkens, Experimentally bounding deviations from quantum theory in the landscape of generalized probabilistic theories, PRX Quantum 2, 020302 (2021)", url: "" },
      { text: "T. Giordani, R. Wagner, C. Esposito, A. Camillini, F. Hoch, G. Carvacho, C. Pentangelo, F. Ceccarelli, S. Piacentini, A. Crespi, N. Spagnolo, R. Osellame, E. F. Galvão and F. Sciarrino, Experimental certification of contextuality, coherence, and dimension in a programmable universal photonic processor, Sci. Adv. 9, eadj4249 (2023)", url: "" },
      { text: "R. W. Spekkens, D. H. Buzacott, A. J. Keehn, B. Toner and G. J. Pryde, Preparation contextuality powers parity-oblivious multiplexing, Phys. Rev. Lett. 102, 010401 (2009)", url: "" },
      { text: "X. Zhan, E. G. Cavalcanti, J. Li, Z. Bian, Y. Zhang, H. M. Wiseman and P. Xue, Experimental generalized contextuality with single-photon qubits, Optica 4, 966 (2017)", url: "" },
      { text: "A. Zhang, H. Xu, J. Xie, H. Zhang, B. J. Smith, M. S. Kim and L. Zhang, Experimental test of contextuality in quantum and classical systems, Phys. Rev. Lett. 122, 080401 (2019)", url: "" },
      { text: "Y. Zhang, J. Spodek, D. Schmid, C. Reid, L. J. Morrison, T. Jennewein, K. J. Resch and R. W. Spekkens, A new paradigm for entanglement certification using noncontextuality inequalities (2026)", url: "https://arxiv.org/abs/2507.01122" },
      { text: "J. M. M. Gama, G. T. C. Cruz, M. Khoshbin, L. Catani, J. A. O. Huguenin and W. F. Balthazar, Experimental investigation of nonclassicality in the simplest scenario via the degrees of freedom of light (2026)", url: "https://arxiv.org/abs/2601.16952" },
      { text: "V. P. Rossi, E. Polino, B. Polacchi, V. Cimini, D. Schmid, J. H. Selby, G. Corrielli, A. Crespi, R. Osellame, F. Sciarrino and A. B. Sainz, Theory-agnostic nonclassicality certification in an integrated photonic circuit (2026)", url: "https://arxiv.org/abs/2609.18671" },
      { text: "M. F. Pusey, L. del Rio and B. Meyer, Contextuality without access to a tomographically complete set (2019)", url: "https://arxiv.org/abs/1904.08699" },
      { text: "D. Schmid, J. H. Selby, V. P. Rossi, R. D. Baldijão and A. B. Sainz, Shadows and subsystems of generalized probabilistic theories: when tomographic incompleteness is not a loophole for contextuality proofs, Quantum 9, 1880 (2025)", url: "" },
      { text: "J. H. Selby, D. Schmid, E. Wolfe, A. B. Sainz, R. Kunjwal and R. W. Spekkens, Accessible fragments of generalized probabilistic theories, cone equivalence, and applications to witnessing nonclassicality, Phys. Rev. A 107, 062203 (2023)", url: "" },
      { text: "V. Gitton and M. P. Woods, System loophole of generalized noncontextuality, Phys. Rev. Res. 6, 043289 (2024)", url: "" },
      { text: "M. F. Pusey, Robust preparation noncontextuality inequalities in the simplest scenario, Phys. Rev. A 98, 022112 (2018)", url: "" },
      { text: "A. M. Fonseca, V. P. Rossi, R. D. Baldijão, J. H. Selby and A. B. Sainz, Robustness of contextuality under different types of noise as quantifiers for parity-oblivious multiplexing tasks, Phys. Rev. A 111, 022217 (2025)", url: "" },
      { text: "J. H. Selby, E. Wolfe, D. Schmid, A. B. Sainz and V. P. Rossi, Linear program for testing nonclassicality and an open-source implementation, Phys. Rev. Lett. 132, 050202 (2024)", url: "" },
      { text: "M. Khoshbin, L. Catani and M. Leifer, Alternative robust ways of witnessing nonclassicality in the simplest scenario, Phys. Rev. A 109, 032212 (2024)", url: "" },
      { text: "V. P. Rossi, D. Schmid, J. H. Selby and A. B. Sainz, Contextuality with vanishing coherence and maximal robustness to dephasing, Phys. Rev. A 108, 032213 (2023)", url: "" },
      { text: "M. J. Grabowecky, C. A. J. Pollack, A. R. Cameron, R. W. Spekkens and K. J. Resch, Experimentally bounding deviations from quantum theory for a photonic three-level system using theory-agnostic tomography, Phys. Rev. A 105, 032204 (2022)", url: "" },
      { text: "E. Nielsen, J. K. Gamble, K. Rudinger, T. Scholten, K. Young and R. Blume-Kohout, Gate set tomography, Quantum 5, 557 (2021)", url: "" },
      { text: "Y. Zhang, Complexity of self-consistent entanglement certification (2026)", url: "https://arxiv.org/abs/2610.08757" }
    ]
  },
  /* new problems are added above this line */
];
