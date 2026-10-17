/* =====================================================================
   4. CONTRIBUTIONS  — material attached to a problem's entry
   ---------------------------------------------------------------------
   Every contribution is recorded in the fixed format of the companion
   paper: a title, the type of material, the extent to which AI tools
   were used, and the name of at least one human contributor who takes
   responsibility for it. Entries submitted through the Submit page land
   here as pull requests; a moderator merges to publish.

   Fields: problem (number), date (YYYY-MM-DD), kind (a key of
   CONTRIBUTION_KINDS), title, material (free text: "explanatory note",
   "open-source code", "numerical computation", …), ai (a key of AI_USE),
   by (names, with affiliations if wished), provisional (true/false),
   summary (tex`...`, with math as in problems.js), url (optional).
   ===================================================================== */
const CONTRIBUTION_KINDS = {
  "claim":         { label: "claimed solution" },
  "partial":       { label: "partial result" },
  "negative":      { label: "negative result" },
  "reformulation": { label: "reformulation" },
  "decomposition": { label: "decomposition into further problems" },
  "evidence":      { label: "computational evidence" },
  "verification":  { label: "independent verification" },
  "exposition":    { label: "explanatory exposition" },
  "challenge":     { label: "challenge to a solution" },
  "question":      { label: "question about the statement" },
  "comment":       { label: "comment" }
};

/* How much AI assistance went into a piece of material, as the paper distinguishes it. */
const AI_USE = {
  "none":    "no AI assistance",
  "partial": "partially AI-assisted (several human–AI iterations)",
  "full":    "fully AI-generated (the output of a single prompt)"
};

const CONTRIBUTIONS = [
  /* new contributions are added above this line */
];
