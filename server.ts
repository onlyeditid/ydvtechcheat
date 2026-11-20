import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { convertOpenAIMessagesToGemini } from "./src/lib/free-models.ts";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      hasServerGemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.post("/api/ai/chat", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          "Server GEMINI_API_KEY is not configured. Open Dev Space to choose Ollama (local, no key), OpenRouter (:free), Groq free tier, or add any custom free model.",
      });
      return;
    }

    const { model, messages, stream = true } = req.body || {};
    const { systemInstruction, contents } = convertOpenAIMessagesToGemini(
      Array.isArray(messages) ? messages : []
    );

    if (contents.length === 0) {
      res.status(400).json({ error: "No user message content provided." });
      return;
    }

    const requestedModel =
      typeof model === "string" && model.trim()
        ? model.trim()
        : "gemini-3.1-flash-lite";

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const config: {
        systemInstruction?: string;
        thinkingConfig?: { thinkingLevel: ThinkingLevel };
      } = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (requestedModel === "gemini-4-hydrogen") {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      const hasConfig = Object.keys(config).length > 0;

      const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
        try {
          return await fn();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
            await new Promise((r) => setTimeout(r, 800));
            return await fn();
          }
          throw err;
        }
      };

      if (!stream) {
        const response = await withRetry(() =>
          ai.models.generateContent({
            model: requestedModel,
            contents,
            ...(hasConfig ? { config } : {}),
          })
        );
        const text = response.text || "";
        res.json({
          choices: [{ message: { role: "assistant", content: text } }],
        });
        return;
      }

      const streamResult = await withRetry(() =>
        ai.models.generateContentStream({
          model: requestedModel,
          contents,
          ...(hasConfig ? { config } : {}),
        })
      );

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      for await (const chunk of streamResult) {
        const text = chunk.text;
        if (text) {
          res.write(
            `data: ${JSON.stringify({
              choices: [{ delta: { content: text } }],
            })}\n\n`
          );
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate Gemini response";
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      } else {
        res.write(
          `data: ${JSON.stringify({
            choices: [{ delta: { content: `\n\nError: ${message}` } }],
          })}\n\n`
        );
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.use((_req, res) => {
      const indexHtml = path.join(distDir, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Not found");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
