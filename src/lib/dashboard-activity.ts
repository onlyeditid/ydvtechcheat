import type { ChatConversation } from "@/types";

export interface DailyActivityPoint {
  date: string;
  requests: number;
}

export interface LocalUsageSummary {
  data: DailyActivityPoint[];
  totalConversations: number;
  totalMessages: number;
  estimatedTokens: number;
}

export function computeLocalUsageSummary(
  conversations: ChatConversation[]
): LocalUsageSummary {
  const byDate = new Map<string, number>();
  let totalMessages = 0;
  let totalChars = 0;

  for (const conv of conversations) {
    for (const msg of conv.messages || []) {
      totalMessages += 1;
      totalChars += (msg.content || "").length;
      if (msg.role === "user") {
        const ts = typeof msg.timestamp === "number" ? msg.timestamp : conv.updatedAt;
        const dateKey = new Date(ts || Date.now()).toISOString().slice(0, 10);
        byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);
      }
    }
  }

  const data: DailyActivityPoint[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, requests]) => ({ date, requests }));

  return {
    data,
    totalConversations: conversations.length,
    totalMessages,
    estimatedTokens: Math.ceil(totalChars / 4),
  };
}
