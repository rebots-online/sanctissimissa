// §H.7 Preloaded prompt guides (operator, 2026-09-19).
// Authored-static content per INC-19: authored UI strings, never generated.
// Closed set of exactly six starter-question pairs, verbatim from §H.7.
// The "Explain today's feast" prompt may be appended with the app's current
// liturgical date at send time by ChatView — never baked into this const.

export const COMPANION_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'How do I pray the Breviary?',
    prompt: 'How do I pray the Breviary?',
  },
  {
    label: 'How do I follow along at my first Traditional Latin Mass?',
    prompt: 'How do I follow along at my first Traditional Latin Mass?',
  },
  {
    label: 'Walk me through the parts of the Mass',
    prompt: 'Walk me through the parts of the Mass',
  },
  {
    label: 'What is the difference between the Missal and the Liber Usualis?',
    prompt: 'What is the difference between the Missal and the Liber Usualis?',
  },
  {
    label: "How does the Church's liturgical year work?",
    prompt: "How does the Church's liturgical year work?",
  },
  {
    label: "Explain today's feast and its propers",
    prompt: "Explain today's feast and its propers",
  },
];
