export interface MensagemChat {
  role: "system" | "user" | "assistant";
  content: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function chamarAgente(mensagens: MensagemChat[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada");
  }
  const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages: mensagens }),
  });

  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`OpenRouter respondeu ${res.status}: ${corpo}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message.content ?? "";
}
