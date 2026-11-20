import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Header,
  Input,
  Switch,
  TextInput,
} from "@/components";
import { useApp } from "@/contexts";
import {
  DEFAULT_BUILTIN_FREE_SELECTION,
  FREE_MODEL_PRESETS,
  buildCustomFreeProviderConfig,
  extractVariables,
  type FreeModelPreset,
} from "@/lib";
import { addCustomAiProvider } from "@/lib/storage";
import { UseSettingsReturn } from "@/types";
import {
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";

export const FreeModelSetup = ({
  selectedAIProvider,
  onSetSelectedAIProvider,
}: Pick<
  UseSettingsReturn,
  "selectedAIProvider" | "onSetSelectedAIProvider"
>) => {
  const { loadData, allAiProviders } = useApp();

  const [endpointUrl, setEndpointUrl] = useState(
    "https://openrouter.ai/api/v1/chat/completions"
  );
  const [modelName, setModelName] = useState(
    "meta-llama/llama-3.3-70b-instruct:free"
  );
  const [apiKey, setApiKey] = useState("");
  const [showCustomApiKey, setShowCustomApiKey] = useState(false);
  const [showActiveApiKey, setShowActiveApiKey] = useState(false);
  const [supportsImages, setSupportsImages] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const activeProviderObj = allAiProviders.find(
    (p) => p.id === selectedAIProvider.provider
  );
  const activeVars = activeProviderObj
    ? extractVariables(activeProviderObj.curl)
    : [];
  const activeHasApiKeyVar = activeVars.some((v) => v.key === "api_key");
  const activeHasModelVar = activeVars.some((v) => v.key === "model");

  const handleApplyPreset = (preset: FreeModelPreset) => {
    const existingKey =
      selectedAIProvider.provider === preset.providerId
        ? selectedAIProvider.variables?.api_key || ""
        : "";
    onSetSelectedAIProvider({
      provider: preset.providerId,
      variables: {
        ...(selectedAIProvider.provider === preset.providerId
          ? selectedAIProvider.variables
          : {}),
        model: preset.model,
        ...(existingKey ? { api_key: existingKey } : {}),
      },
    });
    setAddedNotice(
      preset.requiresApiKey && !existingKey
        ? `Selected ${preset.label}. Paste your free API key in the box below to start chatting.`
        : `Activated ${preset.label}. Ready to chat!`
    );
    setFormError(null);
  };

  const handleCreateCustomFreeModel = () => {
    setFormError(null);
    setAddedNotice(null);
    try {
      const trimmedKey = apiKey.trim();
      const config = buildCustomFreeProviderConfig({
        endpointUrl,
        model: modelName,
        apiKey: trimmedKey ? "{{API_KEY}}" : "",
        supportsImages,
        streaming: true,
      });
      const created = addCustomAiProvider(config);
      if (!created?.id) {
        setFormError("Could not save custom free model.");
        return;
      }
      loadData();
      onSetSelectedAIProvider({
        provider: created.id,
        variables: trimmedKey ? { api_key: trimmedKey } : {},
      });
      setAddedNotice(
        `Added and activated custom free model "${modelName.trim()}". You can use it in chat right now.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Invalid provider configuration"
      );
    }
  };

  return (
    <Card className="p-4 border border-border/70 bg-muted/20 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Header
          title="Free Models — 1-Click Setup & Custom Builder"
          description="Use the built-in free Gemini model, pick a free-tier cloud/local preset, or add any OpenAI-compatible free model."
        />
        <Badge variant="outline" className="w-fit gap-1 text-xs">
          <SparklesIcon className="h-3 w-3" />
          All Free
        </Badge>
      </div>

      {/* Zero-key ready banner */}
      {selectedAIProvider.provider === "gemini-free" && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckIcon className="h-4 w-4 shrink-0" />
            <span>
              <strong>Ready to chat — No API key required!</strong> Using built-in{" "}
              <code className="font-mono">
                {selectedAIProvider.variables?.model || "gemini-3.1-flash-lite"}
              </code>
              .
            </span>
          </div>
        </div>
      )}

      {/* Inline Active Provider Key & Model Configuration */}
      {(activeHasApiKeyVar || activeHasModelVar) && (
        <div className="rounded-lg border border-primary/30 bg-background/90 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">
                Active Provider:{" "}
                <span className="uppercase">{selectedAIProvider.provider}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeHasApiKeyVar &&
              selectedAIProvider.variables?.api_key?.trim() ? (
                <Badge variant="outline" className="text-[11px] gap-1">
                  <CheckIcon className="h-3 w-3 text-emerald-600" />
                  API Key Saved
                </Badge>
              ) : activeHasApiKeyVar ? (
                <>
                  <Badge variant="secondary" className="text-[11px]">
                    API Key Required
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-6 text-[11px] gap-1"
                    onClick={() => {
                      onSetSelectedAIProvider(DEFAULT_BUILTIN_FREE_SELECTION);
                      setAddedNotice(
                        "Switched to Built-in Free Gemini Lite — ready to chat with no API key!"
                      );
                    }}
                  >
                    <SparklesIcon className="h-3 w-3" />
                    Use Built-in Free (No Key)
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeHasApiKeyVar && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {selectedAIProvider.provider.toUpperCase()} API Key
                </label>
                <div className="flex gap-1.5">
                  <Input
                    type={showActiveApiKey ? "text" : "password"}
                    placeholder="Paste your API key (e.g. sk-or-v1-...)"
                    value={selectedAIProvider.variables?.api_key || ""}
                    onChange={(e) =>
                      onSetSelectedAIProvider({
                        ...selectedAIProvider,
                        variables: {
                          ...selectedAIProvider.variables,
                          api_key: e.target.value,
                        },
                      })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowActiveApiKey((prev) => !prev)}
                    aria-label={
                      showActiveApiKey ? "Hide active API key" : "Show active API key"
                    }
                    title={showActiveApiKey ? "Hide key" : "Show key"}
                  >
                    {showActiveApiKey ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activeHasModelVar && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Model ID
                </label>
                <TextInput
                  placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
                  value={selectedAIProvider.variables?.model || ""}
                  onChange={(value) =>
                    onSetSelectedAIProvider({
                      ...selectedAIProvider,
                      variables: {
                        ...selectedAIProvider.variables,
                        model: value,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1-Click Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {FREE_MODEL_PRESETS.map((preset) => {
          const isActive =
            selectedAIProvider.provider === preset.providerId &&
            (selectedAIProvider.variables?.model === preset.model ||
              (!selectedAIProvider.variables?.model &&
                preset.id === "builtin-gemini-flash-lite"));

          return (
            <div
              key={preset.id}
              className={`rounded-lg border p-3 transition-colors flex flex-col justify-between gap-2 ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-background/60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{preset.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {preset.badge}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {preset.description}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/80">
                  Model: {preset.model}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className="h-7 text-xs gap-1"
                  onClick={() => handleApplyPreset(preset)}
                >
                  {isActive ? (
                    <>
                      <CheckIcon className="h-3 w-3" />
                      Active
                    </>
                  ) : (
                    "Use This Free Model"
                  )}
                </Button>
                {preset.keyHelpUrl && (
                  <a
                    href={preset.keyHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get free key
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Custom Free Model Builder */}
      <div className="rounded-lg border border-border/60 bg-background/80 p-3.5 space-y-3">
        <div>
          <h4 className="text-xs font-semibold">
            Add Any Custom Model / OpenRouter Model (No cURL Editing Required)
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Works with OpenRouter (:free or paid models like openai/gpt-4o),
            Ollama (localhost:11434), LM Studio (localhost:1234), Groq, Hugging
            Face, GitHub Models, or any OpenAI-compatible endpoint.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              API Endpoint URL
            </label>
            <TextInput
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              value={endpointUrl}
              onChange={setEndpointUrl}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Model ID
            </label>
            <TextInput
              placeholder="meta-llama/llama-3.3-70b-instruct:free"
              value={modelName}
              onChange={setModelName}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              API Key (leave blank for local Ollama / LM Studio)
            </label>
            <div className="flex gap-1.5">
              <Input
                type={showCustomApiKey ? "text" : "password"}
                placeholder="Paste key (e.g. sk-or-v1-...) or leave blank"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowCustomApiKey((prev) => !prev)}
                aria-label={
                  showCustomApiKey ? "Hide custom API key" : "Show custom API key"
                }
                title={showCustomApiKey ? "Hide key" : "Show key"}
              >
                {showCustomApiKey ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 h-10 px-3 rounded-md border border-input/50">
            <span className="text-xs">Supports Screenshot / Images</span>
            <Switch
              checked={supportsImages}
              onCheckedChange={setSupportsImages}
            />
          </div>
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}
        {addedNotice && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            {addedNotice}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleCreateCustomFreeModel}
            className="gap-1.5"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add & Use Model
          </Button>
        </div>
      </div>
    </Card>
  );
};
