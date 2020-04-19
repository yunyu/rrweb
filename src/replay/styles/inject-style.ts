const rules: (blockClass: string) => string[] = (blockClass: string) => [
  `iframe, .${blockClass} { background: #ccc }`,
  `.manted-overlay-wrapper.${blockClass} { display: none !important; }`,
  'noscript { display: none !important; }',
];

export default rules;
 