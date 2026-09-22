const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Accept one complete JSON object surrounded by prose/fences. Never repair
// broken JSON, execute text, pick between multiple objects, or unwrap arrays.
export function parseResearchJson(input: unknown): Record<string, unknown> | null {
  if (typeof input !== 'string' || input.length > 200000) return null;
  const text = input.trim();
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isObject(value) ? value : null;
  } catch { /* The transport may surround the object with explanatory text. */ }
  let start = -1, quoted = false, escaped = false;
  const stack: string[] = [];
  let result: Record<string, unknown> | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (start < 0) {
      if (char !== '{' && char !== '[') continue;
      if (result) return null;
      start = i;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      if (stack.pop() !== (char === '}' ? '{' : '[')) return null;
      if (!stack.length) {
        try {
          const value: unknown = JSON.parse(text.slice(start, i + 1));
          if (!isObject(value)) return null;
          result = value;
        } catch { return null; }
        start = -1;
      }
    }
  }
  return start === -1 ? result : null;
}

export function parseManualDiscovery(input: unknown): { url: string; title: string } | null {
  const value = parseResearchJson(input);
  if (!value || Object.keys(value).some(key => key !== 'url' && key !== 'title') ||
    typeof value.url !== 'string' || value.url.length > 4096 ||
    typeof value.title !== 'string' || value.title.length > 512) return null;
  return { url: value.url, title: value.title };
}
