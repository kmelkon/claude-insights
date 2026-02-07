import Anthropic from "@anthropic-ai/sdk";
import AnthropicVertex from "@anthropic-ai/vertex-sdk";

interface LLMClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

function createClient(): { client: LLMClient; defaultModel: string } {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      client: new Anthropic() as unknown as LLMClient,
      defaultModel: "claude-sonnet-4-5-20250514",
    };
  }
  const region = process.env.CLOUD_ML_REGION || process.env.VERTEX_REGION || "europe-west1";
  return {
    client: new AnthropicVertex({ region }) as unknown as LLMClient,
    defaultModel: "claude-opus-4-6",
  };
}

const { client, defaultModel } = createClient();
export { defaultModel };

interface CallLLMOptions {
  model: string;
  system: string;
  content: string;
  maxTokens?: number;
}

export async function callLLM({ model, system, content, maxTokens = 4096 }: CallLLMOptions): Promise<string> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content }],
      });

      const block = response.content[0];
      return block.type === "text" ? (block.text ?? "") : "";
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && "status" in err && (err as { status: number }).status === 429;
      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isLastAttempt) return "";

      const delay = isRateLimit ? BASE_DELAY * Math.pow(2, attempt + 1) : BASE_DELAY * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return "";
}
