const bannedWords = [
  'stronzo', 'stronza', 'merda', 'cazzo', 'fica', 'troia', 'puttana',
  'frocio', 'ricchione', 'finocchio', 'negro', 'negra', 'zingaro',
  'ritardato', 'ritardata', 'mongoloide', 'down', 'autistico',
  'puttaniere', 'puttanata', 'vaffanculo', 'affanculo', 'culo',
  'segaiolo', 'sega', 'sborra', 'sborrone', 'inculare', 'inculato',
  'cornuto', 'cornuta', 'coglione', 'coglioni', 'scemo', 'scema',
  'deficiente', 'imbecille', 'cretino', 'idiota', 'bastardo',
  'bastarda', 'maiale', 'troietta', 'zoccola', 'mignotta',
  'minchia', 'pippa', 'pompino', '69',
];

const wordPattern = new RegExp(
  `\\b(${bannedWords.map((w) => w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})\\b`,
  'giu',
);

export function cleanText(text: string): string {
  return text.replace(wordPattern, (match) => '*'.repeat(match.length));
}

export function hasProfanity(text: string): boolean {
  return wordPattern.test(text);
}
