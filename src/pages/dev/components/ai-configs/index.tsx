import { Header } from "@/components";
import { UseSettingsReturn } from "@/types";
import { Providers } from "./Providers";
import { CustomProviders } from "./CustomProvider";
import { FreeModelSetup } from "./FreeModelSetup";

export const AIProviders = (settings: UseSettingsReturn) => {
  return (
    <div id="ai-providers" className="space-y-4">
      <Header
        title="AI Providers"
        description="Select a free model preset, add any custom OpenAI-compatible free model, or configure your preferred AI provider."
        isMainTitle
      />

      {/* Free Models Quick Setup */}
      <FreeModelSetup
        selectedAIProvider={settings.selectedAIProvider}
        onSetSelectedAIProvider={settings.onSetSelectedAIProvider}
      />

      {/* Custom Provider */}
      <CustomProviders {...settings} />
      {/* Providers Selection */}
      <Providers {...settings} />
    </div>
  );
};
