import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BotIcon, CheckIcon, ChevronDownIcon, PlusCircleIcon } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components";
import { useApp } from "@/contexts";
import { FREE_MODEL_PRESETS, getActiveModelDisplayName } from "@/lib";
import { invoke } from "@tauri-apps/api/core";

export const ModelSelector = ({
  compact = true,
}: {
  compact?: boolean;
}) => {
  const {
    selectedAIProvider,
    onSetSelectedAIProvider,
    allAiProviders,
  } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const customProviders = allAiProviders.filter((p) => p.isCustom);
  const activeLabel = getActiveModelDisplayName(selectedAIProvider);

  const handleSelectPreset = (preset: (typeof FREE_MODEL_PRESETS)[number]) => {
    const existingApiKey =
      selectedAIProvider.provider === preset.providerId
        ? selectedAIProvider.variables?.api_key || ""
        : "";
    const nextVariables: Record<string, string> = {
      ...(selectedAIProvider.provider === preset.providerId
        ? selectedAIProvider.variables
        : {}),
      model: preset.model,
    };
    if (existingApiKey) {
      nextVariables.api_key = existingApiKey;
    }

    onSetSelectedAIProvider({
      provider: preset.providerId,
      variables: nextVariables,
    });
    setOpen(false);

    if (preset.requiresApiKey && !nextVariables.api_key) {
      navigate("/dev-space");
    }
  };

  const handleSelectCustom = (providerId: string) => {
    onSetSelectedAIProvider({
      provider: providerId,
      variables: {},
    });
    setOpen(false);
  };

  const handleOpenDevSpace = async () => {
    setOpen(false);
    try {
      await invoke("open_dashboard");
    } catch {
      // Fallback handled by router below
    }
    navigate("/dev-space");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Select AI model"
          title={`Active AI model: ${activeLabel}`}
          className={
            compact
              ? "h-9 px-2.5 gap-1.5 text-xs shrink-0 max-w-[165px]"
              : "h-8 px-2.5 gap-1.5 text-xs shrink-0 max-w-[200px]"
          }
        >
          <BotIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{activeLabel}</span>
          <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" className="w-80 p-0">
        <div className="px-3 py-2.5 border-b bg-muted/30">
          <p className="text-xs font-semibold">Switch Free AI Model</p>
          <p className="text-[11px] text-muted-foreground">
            Pick a built-in, local Ollama, or free cloud model
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
          <div className="space-y-1">
            {FREE_MODEL_PRESETS.map((preset) => {
              const isSelected =
                selectedAIProvider.provider === preset.providerId &&
                (selectedAIProvider.variables?.model === preset.model ||
                  (!selectedAIProvider.variables?.model &&
                    preset.id === "builtin-gemini-flash-lite"));

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-accent transition-colors flex items-start justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {preset.badge}
                      {preset.requiresApiKey ? " • Needs free API key" : " • Zero key"}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}

            {customProviders.length > 0 && (
              <div className="pt-2 mt-2 border-t">
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Your Custom Providers
                </p>
                {customProviders.map((provider) => {
                  const isSelected = selectedAIProvider.provider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => provider.id && handleSelectCustom(provider.id)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="text-xs truncate">{provider.id}</span>
                      {isSelected && (
                        <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-2 border-t bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenDevSpace}
            className="w-full justify-start gap-2 text-xs h-8"
          >
            <PlusCircleIcon className="h-3.5 w-3.5" />
            Add Any Free Model in Dev Space
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
