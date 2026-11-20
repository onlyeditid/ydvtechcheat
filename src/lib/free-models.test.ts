import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BUILTIN_FREE_SELECTION,
  FREE_MODEL_PRESETS,
  buildCustomFreeProviderConfig,
  isVariableRequiredForProvider,
  shouldFallbackToBuiltinFree,
  sanitizeProviderHeaders,
  getActiveModelDisplayName,
  convertOpenAIMessagesToGemini,
} from "./free-models";
import { createCommandRouter } from "./tauri-shim/command-handler";

test("FREE_MODEL_PRESETS includes built-in, openrouter :free, groq, gemini, and ollama presets", () => {
  const providerIds = new Set(FREE_MODEL_PRESETS.map((p) => p.providerId));
  assert.ok(providerIds.has("gemini-free"));
  assert.ok(providerIds.has("openrouter"));
  assert.ok(providerIds.has("groq"));
  assert.ok(providerIds.has("gemini"));
  assert.ok(providerIds.has("ollama"));
});

test("buildCustomFreeProviderConfig builds valid keyless local cURL without Authorization header", () => {
  const cfg = buildCustomFreeProviderConfig({
    endpointUrl: "http://localhost:11434/v1/chat/completions",
    model: "llama3.2",
    apiKey: "",
    supportsImages: false,
    streaming: true,
  });

  assert.equal(cfg.responseContentPath, "choices[0].message.content");
  assert.equal(cfg.streaming, true);
  assert.ok(cfg.curl.includes("http://localhost:11434/v1/chat/completions"));
  assert.ok(cfg.curl.includes('"model": "llama3.2"'));
  assert.ok(cfg.curl.includes("{{TEXT}}"));
  assert.ok(!cfg.curl.includes("Authorization"));
  assert.ok(!cfg.curl.includes("{{IMAGE}}"));
});

test("buildCustomFreeProviderConfig includes Authorization and {{IMAGE}} when provided", () => {
  const cfg = buildCustomFreeProviderConfig({
    endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "google/gemma-3-27b-it:free",
    apiKey: "or-free-test-key",
    supportsImages: true,
  });

  assert.ok(cfg.curl.includes("Authorization: Bearer or-free-test-key"));
  assert.ok(cfg.curl.includes("HTTP-Referer"));
  assert.ok(cfg.curl.includes("X-Title"));
  assert.ok(cfg.curl.includes("{{IMAGE}}"));
});

test("buildCustomFreeProviderConfig validates required endpointUrl and model", () => {
  assert.throws(
    () => buildCustomFreeProviderConfig({ endpointUrl: "  ", model: "llama3.2" }),
    /Endpoint URL is required/
  );
  assert.throws(
    () =>
      buildCustomFreeProviderConfig({
        endpointUrl: "http://localhost:11434/v1/chat/completions",
        model: "",
      }),
    /Model name is required/
  );
});

test("isVariableRequiredForProvider allows keyless ollama and gemini-free while enforcing keys on cloud providers", () => {
  assert.equal(isVariableRequiredForProvider("ollama", "API_KEY"), false);
  assert.equal(isVariableRequiredForProvider("gemini-free", "API_KEY"), false);
  assert.equal(isVariableRequiredForProvider("openrouter", "API_KEY"), true);
  assert.equal(isVariableRequiredForProvider("openrouter", "MODEL"), true);
  assert.equal(isVariableRequiredForProvider("openrouter", "TEXT"), false);
  assert.equal(isVariableRequiredForProvider("openrouter", "IMAGE"), false);
});

test("sanitizeProviderHeaders strips empty or unresolved Bearer headers and preserves real tokens", () => {
  const cleaned = sanitizeProviderHeaders({
    Authorization: "Bearer   ",
    "x-api-key": "{{API_KEY}}",
    "Content-Type": "application/json",
    "X-Custom": "ok",
  });

  assert.deepEqual(cleaned, {
    "Content-Type": "application/json",
    "X-Custom": "ok",
  });

  const kept = sanitizeProviderHeaders({
    Authorization: "Bearer sk-real-token",
  });
  assert.deepEqual(kept, { Authorization: "Bearer sk-real-token" });
});

test("shouldFallbackToBuiltinFree recovers unconfigured cloud providers while keeping keyless or keyed selections", () => {
  const providers = [
    { id: "gemini-free", curl: 'curl -X POST "https://pluely.local/api/ai/chat"' },
    { id: "ollama", curl: "curl -X POST http://localhost:11434/v1/chat/completions" },
    { id: "openrouter", curl: 'curl https://openrouter.ai -H "Authorization: Bearer {{API_KEY}}"' },
  ];

  assert.equal(shouldFallbackToBuiltinFree(null, providers), true);
  assert.equal(
    shouldFallbackToBuiltinFree({ provider: "unknown", variables: {} }, providers),
    true
  );
  assert.equal(
    shouldFallbackToBuiltinFree(
      { provider: "openrouter", variables: { model: "openai/gpt-4o", api_key: "" } },
      providers
    ),
    true
  );
  assert.equal(
    shouldFallbackToBuiltinFree(
      { provider: "openrouter", variables: { model: "openai/gpt-4o", api_key: "sk-test" } },
      providers
    ),
    false
  );
  assert.equal(
    shouldFallbackToBuiltinFree(DEFAULT_BUILTIN_FREE_SELECTION, providers),
    false
  );
  assert.equal(
    shouldFallbackToBuiltinFree({ provider: "ollama", variables: { model: "llama3.2" } }, providers),
    false
  );
});

test("getActiveModelDisplayName formats active provider cleanly", () => {
  assert.equal(getActiveModelDisplayName({ provider: "" }), "Select Free Model");
  assert.equal(
    getActiveModelDisplayName({
      provider: "gemini-free",
      variables: { model: "gemini-3.1-flash-lite" },
    }),
    "Free Gemini Lite"
  );
  assert.equal(
    getActiveModelDisplayName({
      provider: "gemini-free",
      variables: { model: "gemini-4-hydrogen" },
    }),
    "Free Gemini (gemini-4-hydrogen)"
  );
  assert.equal(
    getActiveModelDisplayName({
      provider: "openrouter",
      variables: { model: "deepseek/deepseek-r1:free" },
    }),
    "openrouter: deepseek/deepseek-r1:free"
  );
});

test("convertOpenAIMessagesToGemini maps system instructions, roles, text, and base64 images", () => {
  const converted = convertOpenAIMessagesToGemini([
    { role: "system", content: "Be concise." },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this screenshot?" },
        {
          type: "image_url",
          image_url: { url: "data:image/png;base64,iVBORw0KGgo=" },
        },
      ],
    },
  ]);

  assert.equal(converted.systemInstruction, "Be concise.");
  assert.equal(converted.contents.length, 3);
  assert.equal(converted.contents[0].role, "user");
  assert.equal(converted.contents[1].role, "model");
  assert.deepEqual(converted.contents[2].parts, [
    { text: "What is in this screenshot?" },
    { inlineData: { mimeType: "image/png", data: "iVBORw0KGgo=" } },
  ]);
});

test("command router start_screen_capture emits captured-selection with base64 in browser", async () => {
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const router = createCommandRouter({
    emitEvent: async (event, payload) => {
      emitted.push({ event, payload });
    },
    captureScreen: async () => "BASE64PNGDATA",
  });

  await router("start_screen_capture");
  assert.deepEqual(emitted, [
    { event: "captured-selection", payload: "BASE64PNGDATA" },
  ]);
});
