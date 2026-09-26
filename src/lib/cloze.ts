const CLOZE_PATTERN = /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g;

export function clozePrompt(source: string): string {
  return source.replace(CLOZE_PATTERN, (_match, _answer: string, hint?: string) => hint?.trim() ? `[${hint.trim()}]` : "[…]");
}

export function clozeAnswer(source: string): string {
  return source.replace(CLOZE_PATTERN, (_match, answer: string) => answer);
}

export function hasCloze(source: string): boolean {
  CLOZE_PATTERN.lastIndex = 0;
  return CLOZE_PATTERN.test(source);
}
