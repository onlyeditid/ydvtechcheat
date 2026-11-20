import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BotIcon,
  AudioLinesIcon,
  WandSparklesIcon,
  ArrowRightIcon,
  CameraIcon,
} from "lucide-react";
import { Usage } from "./components";
import { PageLayout } from "@/layouts";
import { useApp } from "@/contexts";
import { Button, Card, CardDescription, CardHeader, CardTitle } from "@/components";
import { getAllConversations } from "@/lib";
import { computeLocalUsageSummary, type DailyActivityPoint } from "@/lib/dashboard-activity";

const Dashboard = () => {
  const { selectedAIProvider, selectedSttProvider, allAiProviders, allSttProviders } =
    useApp();
  const navigate = useNavigate();
  const [activityData, setActivityData] = useState<DailyActivityPoint[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const conversations = await getAllConversations();
      const summary = computeLocalUsageSummary(conversations);
      setActivityData(summary.data);
      setTotalTokens(summary.estimatedTokens);
      setTotalConversations(summary.totalConversations);
    } catch {
      setActivityData([]);
      setTotalTokens(0);
      setTotalConversations(0);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const activeAiName =
    allAiProviders.find((p) => p.id === selectedAIProvider.provider)?.id ||
    selectedAIProvider.provider ||
    "Not configured";
  const activeSttName =
    allSttProviders.find((p) => p.id === selectedSttProvider.provider)?.id ||
    selectedSttProvider.provider ||
    "Not configured";

  return (
    <PageLayout
      title="Dashboard"
      description="All features are unlocked and free to use. Configure your AI & speech providers and track your local activity."
      rightSlot={
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate("/")}
        >
          <CameraIcon className="h-4 w-4" />
          Open Chat &amp; Screenshot
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-none border border-border/70 rounded-xl p-4">
          <CardHeader className="p-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BotIcon className="size-4" />
              <span>AI Provider</span>
            </div>
            <CardTitle className="text-base capitalize">{activeAiName}</CardTitle>
            <CardDescription className="text-xs">
              Configure OpenAI, Gemini, Claude, Ollama, or custom cURL endpoints.
            </CardDescription>
          </CardHeader>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => navigate("/dev-space")}
            >
              Configure AI
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
        </Card>

        <Card className="shadow-none border border-border/70 rounded-xl p-4">
          <CardHeader className="p-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AudioLinesIcon className="size-4" />
              <span>Speech-to-Text</span>
            </div>
            <CardTitle className="text-base capitalize">{activeSttName}</CardTitle>
            <CardDescription className="text-xs">
              Configure Whisper, Groq, ElevenLabs, or custom STT providers.
            </CardDescription>
          </CardHeader>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => navigate("/dev-space")}
            >
              Configure STT
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
        </Card>

        <Card className="shadow-none border border-border/70 rounded-xl p-4">
          <CardHeader className="p-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <WandSparklesIcon className="size-4" />
              <span>Conversations</span>
            </div>
            <CardTitle className="text-base">{totalConversations} saved</CardTitle>
            <CardDescription className="text-xs">
              Browse saved chats or customize system prompts and response style.
            </CardDescription>
          </CardHeader>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => navigate("/system-prompts")}
            >
              System Prompts
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
        </Card>
      </div>

      <Usage
        loading={loadingActivity}
        onRefresh={fetchActivity}
        data={activityData}
        totalTokens={totalTokens}
      />
    </PageLayout>
  );
};

export default Dashboard;
