export function serializeToolArguments(args: Record<string, unknown>): string {
  try { return JSON.stringify(args); } catch { return "{…}"; }
}

export function toolResultText(text: string, expanded: boolean): string {
  return !expanded && text.length > 500
    ? text.slice(0, 500) + "... (Tab select, Space expand)"
    : text;
}
