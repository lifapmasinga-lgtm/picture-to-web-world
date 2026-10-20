import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Simple AI endpoint used by the plain HTML/CSS/JS dashboard in /public/app.
export const Route = createFileRoute("/api/public/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          system?: string;
          messages?: { role: "user" | "assistant"; content: string }[];
        } | null;
        const messages = (body?.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
        if (!messages.length) return new Response("No input", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY!;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: String(body?.system ?? "You are a helpful workplace assistant.").slice(0, 4000),
          messages,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              store: false,
              forceReasoning: true,
              reasoningEffort: "low",
              include: ["reasoning.encrypted_content"],
            },
          },
          onError: ({ error }) => console.error(error),
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
