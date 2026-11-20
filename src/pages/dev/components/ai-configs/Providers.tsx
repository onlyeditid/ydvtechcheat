import { Badge, Button, Header, Input, Selection, TextInput } from "@/components";
import { UseSettingsReturn } from "@/types";
import curl2Json, { ResultJSON } from "@bany/curl-to-json";
import { CheckIcon, EyeIcon, EyeOffIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";

const safeCurl2Json = (curl?: string): ResultJSON | null => {
  if (!curl) return null;
  try {
    return curl2Json(curl) as ResultJSON;
  } catch {
    return null;
  }
};

export const Providers = ({
  allAiProviders,
  selectedAIProvider,
  onSetSelectedAIProvider,
  variables,
}: UseSettingsReturn) => {
  const [localSelectedProvider, setLocalSelectedProvider] =
    useState<ResultJSON | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (selectedAIProvider?.provider) {
      const provider = allAiProviders?.find(
        (p) => p?.id === selectedAIProvider?.provider
      );
      if (provider) {
        setLocalSelectedProvider(safeCurl2Json(provider?.curl));
      }
    }
  }, [selectedAIProvider?.provider, allAiProviders.length]);

  const findKeyAndValue = (key: string) => {
    return variables?.find((v) => v?.key === key);
  };

  const getApiKeyValue = () => {
    const apiKeyVar = findKeyAndValue("api_key");
    if (!apiKeyVar || !selectedAIProvider?.variables) return "";
    return selectedAIProvider?.variables?.[apiKeyVar.key] || "";
  };

  const isApiKeyEmpty = () => {
    return !getApiKeyValue().trim();
  };

  const updateApiKey = (nextValue: string) => {
    const apiKeyVar = findKeyAndValue("api_key");
    if (!apiKeyVar || !selectedAIProvider) return;

    onSetSelectedAIProvider({
      ...selectedAIProvider,
      variables: {
        ...selectedAIProvider.variables,
        [apiKeyVar.key]: nextValue,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Header
          title="Select AI Provider"
          description="Select your preferred AI service provider or custom providers to get started."
        />
        <Selection
          selected={selectedAIProvider?.provider}
          options={allAiProviders?.map((provider) => {
            const json = safeCurl2Json(provider?.curl);
            const displayUrl = json?.url?.replace(/^https?:\/\/pluely\.local/, "");
            return {
              label: provider?.isCustom
                ? displayUrl || "Custom Provider"
                : provider?.id || "Custom Provider",
              value: provider?.id || "Custom Provider",
              isCustom: provider?.isCustom,
            };
          })}
          placeholder="Choose your AI provider"
          onChange={(value) => {
            onSetSelectedAIProvider({
              provider: value,
              variables: {},
            });
          }}
        />
      </div>

      {localSelectedProvider ? (
        <Header
          title={`Method: ${
            localSelectedProvider?.method || "Invalid"
          }, Endpoint: ${localSelectedProvider?.url || "Invalid"}`}
          description={`If you want to use different url or method, you can always create a custom provider.`}
        />
      ) : null}

      {findKeyAndValue("api_key") ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Header
              title="API Key"
              description={`Enter or paste your ${
                allAiProviders?.find(
                  (p) => p?.id === selectedAIProvider?.provider
                )?.isCustom
                  ? "Custom Provider"
                  : selectedAIProvider?.provider
              } API key. Your key auto-saves locally in your browser.`}
            />
            {!isApiKeyEmpty() && (
              <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                <CheckIcon className="h-3 w-3 text-emerald-600" />
                Saved locally
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="Paste your API key (e.g. sk-or-v1-...)"
                value={getApiKeyValue()}
                onChange={(e) => updateApiKey(e.target.value)}
                disabled={false}
                className="flex-1 h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-11 w-11"
                onClick={() => setShowApiKey((prev) => !prev)}
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                title={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </Button>
              {!isApiKeyEmpty() && (
                <Button
                  type="button"
                  onClick={() => updateApiKey("")}
                  size="icon"
                  variant="destructive"
                  className="shrink-0 h-11 w-11"
                  aria-label="Remove API Key"
                  title="Remove API Key"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 mt-2">
        {variables
          .filter(
            (variable) => variable.key !== findKeyAndValue("api_key")?.key
          )
          .map((variable) => {
            const getVariableValue = () => {
              if (!variable?.key || !selectedAIProvider?.variables) return "";
              return selectedAIProvider.variables[variable.key] || "";
            };

            return (
              <div className="space-y-1" key={variable?.key}>
                <Header
                  title={variable?.value || ""}
                  description={`add your preferred ${variable?.key?.replace(
                    /_/g,
                    " "
                  )} for ${
                    allAiProviders?.find(
                      (p) => p?.id === selectedAIProvider?.provider
                    )?.isCustom
                      ? "Custom Provider"
                      : selectedAIProvider?.provider
                  }`}
                />
                <TextInput
                  placeholder={`Enter ${
                    allAiProviders?.find(
                      (p) => p?.id === selectedAIProvider?.provider
                    )?.isCustom
                      ? "Custom Provider"
                      : selectedAIProvider?.provider
                  } ${variable?.key?.replace(/_/g, " ") || "value"}`}
                  value={getVariableValue()}
                  onChange={(value) => {
                    if (!variable?.key || !selectedAIProvider) return;

                    onSetSelectedAIProvider({
                      ...selectedAIProvider,
                      variables: {
                        ...selectedAIProvider.variables,
                        [variable.key]: value,
                      },
                    });
                  }}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};
