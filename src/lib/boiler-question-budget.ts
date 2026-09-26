import { MAX_BOILER_QUESTIONS } from './boiler-probability';

// Count requested facts, not messages. A combined identity prompt can consume
// several slots even when it has only one question mark.
export function countBoilerQuestionRequests(text: string): number {
  const questionMarks = (text.match(/\?/g) ?? []).length;
  const identityFields = [
    /\bmarka(?:s[ıi]|n[ıi]z)?\b/i,
    /\bmodel(?:i|ini|iniz|inizin)?\b/i,
    /\bhata\s*kod(?:u|unu|unuz|unuzun)?\b/i,
  ].filter(pattern => pattern.test(text)).length;
  const interrogatives = (text.match(/\b(?:m[ıiuü](?:s[ıiuü]n[ıiuü]z)?|kaç|hangi|nedir)\b/gi) ?? []).length;
  return Math.max(1, questionMarks, interrogatives, identityFields);
}

export function countAskedQuestions(history: { role: string; content: string }[]): number {
  return Math.min(MAX_BOILER_QUESTIONS, history.filter(item => item.role === 'assistant' &&
    /\?|\b(?:paylaş|belirt|söyle|yaz)/i.test(item.content))
    .reduce((total, item) => total + countBoilerQuestionRequests(item.content), 0));
}

export function canAskBoilerQuestion(asked: number, text: string): boolean {
  return Number.isInteger(asked) && asked >= 0 &&
    asked + countBoilerQuestionRequests(text) <= MAX_BOILER_QUESTIONS;
}
