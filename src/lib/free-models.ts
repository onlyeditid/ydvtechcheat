import type { TYPE_PROVIDER } from "@/types";

export interface FreeModelPreset {
  id: string;
  label: string;
  providerId: string;
  model: string;
  badge: string;
  requiresApiKey: boolean;
  supportsImages: boolean;
  description: string;
  keyHelpUrl?: string;
}

export const DEFAULT_BUILTIN_FREE_SELECTION = {
  provider: "gemini-free",
  variables: { model: "gemini-3.1-flash-lite" },
};

export const FREE_MODEL_PRESETS: FreeModelPreset[] = [
  {
    id: "builtin-gemini-flash-lite",
    label: "Pluely Free — Fast (Gemini Lite)",
    providerId: "gemini-free",
    model: "gemini-3.1-flash-lite",
    badge: "Built-in • No Key Needed",
    requiresApiKey: false,
    supportsImages: true,
    description:
      "Fast zero-setup built-in free model with vision & screenshot support. Ready to chat immediately.",
  },
  {
    id: "builtin-gemini-hydrogen",
    label: "Pluely Free — Smart (Gemini 4)",
    providerId: "gemini-free",
    model: "gemini-4-hydrogen",
    badge: "Built-in • No Key Needed",
    requiresApiKey: false,
    supportsImages: true,
    description:
      "Built-in Gemini 4 Flash model with reasoning & screenshot support. No API key needed.",
  },
  {
    id: "openrouter-llama-3-3-free",
    label: "OpenRouter Llama 3.3 70B (:free)",
    providerId: "openrouter",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    badge: "OpenRouter Free",
    requiresApiKey: true,
    supportsImages: false,
    description:
      "Any OpenRouter model ending in :free runs at $0 with a free OpenRouter API key.",
    keyHelpUrl: "https://openrouter.ai/keys",
  },
  {
    id: "openrouter-gemma-3-vision-free",
    label: "OpenRouter Gemma 3 27B Vision (:free)",
    providerId: "openrouter",
    model: "google/gemma-3-27b-it:free",
    badge: "Free + Screenshots",
    requiresApiKey: true,
    supportsImages: true,
    description:
      "Free multimodal model on OpenRouter that supports text and screenshot analysis.",
    keyHelpUrl: "https://openrouter.ai/keys",
  },
  {
    id: "openrouter-deepseek-r1-free",
    label: "OpenRouter DeepSeek R1 (:free)",
    providerId: "openrouter",
    model: "deepseek/deepseek-r1:free",
    badge: "Free Reasoning",
    requiresApiKey: true,
    supportsImages: false,
    description: "Free reasoning model via OpenRouter's :free tier.",
    keyHelpUrl: "https://openrouter.ai/keys",
  },
  {
    id: "groq-llama-3-3-free",
    label: "Groq Llama 3.3 70B (Free Tier)",
    providerId: "groq",
    model: "llama-3.3-70b-versatile",
    badge: "Fast Free Tier",
    requiresApiKey: true,
    supportsImages: false,
    description: "Ultra-fast free tier inference with a free Groq API key.",
    keyHelpUrl: "https://console.groq.com/keys",
  },
  {
    id: "gemini-studio-free",
    label: "Google Gemini 3.1 Flash Lite (BYO Key)",
    providerId: "gemini",
    model: "gemini-3.1-flash-lite",
    badge: "Free Tier + Vision",
    requiresApiKey: true,
    supportsImages: true,
    description:
      "Bring your own Google AI Studio key using Gemini's OpenAI-compatible endpoint.",
    keyHelpUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "ollama-llama3-2",
    label: "Ollama Local (llama3.2)",
    providerId: "ollama",
    model: "llama3.2",
    badge: "100% Free Local",
    requiresApiKey: false,
    supportsImages: false,
    description:
      "Runs locally on your machine via Ollama (http://localhost:11434) with no API key.",
    keyHelpUrl: "https://ollama.com",
  },
  {
    id: "ollama-llava-vision",
    label: "Ollama Vision (llava)",
    providerId: "ollama",
    model: "llava",
    badge: "Local + Screenshots",
    requiresApiKey: false,
    supportsImages: true,
    description:
      "Local Ollama vision model supporting screenshots with no API key required.",
    keyHelpUrl: "https://ollama.com",
  },
];

export interface CustomFreeProviderInput {
  endpointUrl: string;
  model: string;
  apiKey?: string;
  supportsImages?: boolean;
  streaming?: boolean;
}

export function buildCustomFreeProviderConfig(
  input: CustomFreeProviderInput
): Omit<TYPE_PROVIDER, "id" | "isCustom"> {
  const cleanUrl = input.endpointUrl.trim();
  const cleanModel = input.model.trim();
  const cleanKey = input.apiKey?.trim() || "";
  const supportsImages = input.supportsImages ?? true;
  const streaming = input.streaming ?? true;

  if (!cleanUrl) {
    throw new Error("Endpoint URL is required");
  }
  if (!cleanModel) {
    throw new Error("Model name is required");
  }

  const userContent = supportsImages
    ? `[{"type": "text", "text": "{{TEXT}}"}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,{{IMAGE}}"}}]`
    : `"{{TEXT}}"`;

  const authHeaderLine = cleanKey
    ? `  -H "Authorization: Bearer ${cleanKey.replace(/"/g, '\\"')}" \\\n`
    : "";

  const openRouterHeaders = cleanUrl.toLowerCase().includes("openrouter.ai")
    ? `  -H "HTTP-Referer: https://pluely.local" \\\n  -H "X-Title: Pluely" \\\n`
    : "";

  const curl = `curl -X POST "${cleanUrl.replace(/"/g, '\\"')}" \\
  -H "Content-Type: application/json" \\
${authHeaderLine}${openRouterHeaders}  -d '{
    "model": "${cleanModel.replace(/"/g, '\\"')}",
    "messages": [
      {"role": "system", "content": "{{SYSTEM_PROMPT}}"},
      {"role": "user", "content": ${userContent}}
    ]
  }'`;

  return {
    curl,
    responseContentPath: "choices[0].message.content",
    streaming,
  };
}

const KEYLESS_PROVIDER_IDS = new Set(["ollama", "gemini-free"]);

export function isVariableRequiredForProvider(
  providerId: string | undefined,
  variableKey: string
): boolean {
  const upperKey = variableKey.toUpperCase();
  if (upperKey === "SYSTEM_PROMPT" || upperKey === "TEXT" || upperKey === "IMAGE") {
    return false;
  }
  if (upperKey === "API_KEY" && providerId && KEYLESS_PROVIDER_IDS.has(providerId)) {
    return false;
  }
  return true;
}

export function shouldFallbackToBuiltinFree(
  selection: { provider?: string; variables?: Record<string, string> } | null | undefined,
  providers: Array<{ id?: string; curl?: string }>
): boolean {
  if (!selection?.provider) {
    return true;
  }
  const matched = providers.find((p) => p.id === selection.provider);
  if (!matched) {
    return true;
  }
  if (KEYLESS_PROVIDER_IDS.has(selection.provider)) {
    return false;
  }
  const curl = matched.curl || "";
  if (/\{\{\s*API_KEY\s*\}\}/i.test(curl)) {
    const apiKey = selection.variables?.api_key || selection.variables?.API_KEY || "";
    if (!apiKey.trim()) {
      return true;
    }
  }
  return false;
}

export function sanitizeProviderHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const trimmed = typeof value === "string" ? value.trim() : String(value ?? "").trim();
    if (
      key.toLowerCase() === "authorization" &&
      (trimmed === "" || trimmed === "Bearer" || trimmed === "Bearer {{API_KEY}}")
    ) {
      continue;
    }
    if (key.toLowerCase() === "x-api-key" && (trimmed === "" || trimmed === "{{API_KEY}}")) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export function getActiveModelDisplayName(selectedAIProvider: {
  provider: string;
  variables?: Record<string, string>;
}): string {
  if (!selectedAIProvider?.provider) {
    return "Select Free Model";
  }
  const modelVar =
    selectedAIProvider.variables?.model || selectedAIProvider.variables?.MODEL;
  if (selectedAIProvider.provider === "gemini-free") {
    if (!modelVar || modelVar === "gemini-3.1-flash-lite") {
      return "Free Gemini Lite";
    }
    return `Free Gemini (${modelVar})`;
  }
  if (modelVar && modelVar.trim()) {
    return `${selectedAIProvider.provider}: ${modelVar}`;
  }
  return selectedAIProvider.provider;
}

export interface OpenAICompatMessage {
  role: string;
  content:
    | string
    | Array<{
        type?: string;
        text?: string;
        image_url?: { url?: string } | string;
      }>;
}

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

export function convertOpenAIMessagesToGemini(messages: OpenAICompatMessage[]): {
  systemInstruction?: string;
  contents: GeminiContent[];
} {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const msg of messages || []) {
    if (!msg) continue;

    if (msg.role === "system") {
      if (typeof msg.content === "string" && msg.content.trim()) {
        systemParts.push(msg.content.trim());
      } else if (Array.isArray(msg.content)) {
        const texts = msg.content
          .map((part) => part?.text || "")
          .filter(Boolean)
          .join("\n");
        if (texts.trim()) systemParts.push(texts.trim());
      }
      continue;
    }

    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    const parts: GeminiContentPart[] = [];

    if (typeof msg.content === "string") {
      if (msg.content.trim()) {
        parts.push({ text: msg.content });
      }
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (!item) continue;
        if (item.type === "text" && item.text) {
          parts.push({ text: item.text });
        } else if (item.type === "image_url" && item.image_url) {
          const url =
            typeof item.image_url === "string"
              ? item.image_url
              : item.image_url.url || "";
          const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          } else if (url && !url.includes("{{IMAGE}}")) {
            parts.push({
              inlineData: {
                mimeType: "image/png",
                data: url.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ""),
              },
            });
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  return {
    systemInstruction: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    contents,
  };
}
