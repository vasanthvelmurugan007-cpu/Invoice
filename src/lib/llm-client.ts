export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string | any[]; // any[] for multimodal content
}

export interface LLMRequest {
  messages: LLMMessage[];
  max_tokens?: number;
  temperature?: number;
}

const NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL_NAME = "nvidia/llama-3.1-nemotron-nano-vl-8b-v1";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function askLLM(request: LLMRequest): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY environment variable is not set");
  }

  const payload = {
    model: MODEL_NAME,
    messages: request.messages,
    max_tokens: request.max_tokens || 1024,
    temperature: request.temperature || 0.2,
  };

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(NIM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      console.warn(`[LLM Client] Request failed. Retrying in ${BASE_DELAY_MS * attempt}ms...`);
      await new Promise(res => setTimeout(res, BASE_DELAY_MS * attempt));
    }
  }

  throw new Error("askLLM failed after max retries.");
}
