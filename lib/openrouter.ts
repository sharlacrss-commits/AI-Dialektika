const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_UTAMA = "google/gemini-2.5-flash";
const DEFAULT_CADANGAN = "openai/gpt-4o-mini";

// Dibaca saat request (bukan saat module load) supaya selalu ikut env terbaru.
export function defaultModels() {
  return [
    process.env.OPENROUTER_MODEL || DEFAULT_UTAMA,
    process.env.OPENROUTER_MODEL_FALLBACK || DEFAULT_CADANGAN,
  ];
}

export type ORMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOpts = {
  messages: ORMessage[];
  stream?: boolean;
  temperature?: number;
  response_format?: unknown;
  models?: string[];
};

export function openrouterChat({
  messages,
  stream = false,
  temperature = 0.7,
  response_format,
  models,
}: ChatOpts) {
  const list = [...new Set((models?.length ? models : defaultModels()).filter(Boolean))];

  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "Dialektika",
    },
    body: JSON.stringify({
      models: list,
      route: "fallback",
      messages,
      temperature,
      stream,
      ...(response_format ? { response_format } : {}),
    }),
  });
}
