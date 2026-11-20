export interface GeneratedPromptResult {
  prompt_name: string;
  system_prompt: string;
}

export function buildLocalSystemPrompt(description: string): GeneratedPromptResult {
  const cleaned = description.trim().replace(/\s+/g, " ");
  const words = cleaned
    .replace(/^(i want|create|make|build|act as|you are)\s+(an?\s+)?(ai|assistant)\s*(that|who|to)?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  const titleWords = words.map(
    (w) => w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9-]/g, "")
  ).filter(Boolean);

  const prompt_name =
    titleWords.length > 0 ? titleWords.join(" ") : "Custom Assistant";

  const system_prompt = [
    `You are a focused, expert AI assistant tailored to the following goal: ${cleaned}.`,
    "Guidelines:",
    "- Give clear, accurate, and directly actionable answers.",
    "- Structure complex responses with concise bullet points or headings.",
    "- Ask a brief clarifying question only when critical details are missing.",
    "- Maintain a helpful, collaborative tone and avoid unnecessary filler.",
  ].join("\n");

  return { prompt_name, system_prompt };
}

export function parseGeneratedPromptResponse(
  rawText: string,
  fallbackDescription: string
): GeneratedPromptResult {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (
        typeof parsed.prompt_name === "string" &&
        parsed.prompt_name.trim() &&
        typeof parsed.system_prompt === "string" &&
        parsed.system_prompt.trim()
      ) {
        return {
          prompt_name: parsed.prompt_name.trim(),
          system_prompt: parsed.system_prompt.trim(),
        };
      }
    } catch {
      // Fall through to text/local fallback
    }
  }

  const trimmed = rawText.trim();
  if (trimmed.length > 20) {
    const local = buildLocalSystemPrompt(fallbackDescription);
    return {
      prompt_name: local.prompt_name,
      system_prompt: trimmed,
    };
  }

  return buildLocalSystemPrompt(fallbackDescription);
}
