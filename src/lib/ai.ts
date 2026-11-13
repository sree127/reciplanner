// Optional Gemini pass for recipe import. Used only when GEMINI_API_KEY is set; every
// function returns null on a missing key or any failure so the deterministic parser in
// import.ts stays the baseline. We call the free-tier Gemini REST endpoint directly with
// a JSON response schema (model is swappable via GEMINI_MODEL).

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export function aiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type Schema = Record<string, unknown>;

async function generate(prompt: string, schema: Schema): Promise<unknown | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
        }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type AiRecipe = { title: string; servings: number | null; ingredients: string[]; steps: string[] };

/** Read a recipe out of free-form page text when the page has no structured data. */
export async function aiExtractRecipe(pageText: string, url: string): Promise<AiRecipe | null> {
  const prompt = [
    "Extract the recipe from this web page text. Keep the full ingredient list verbatim",
    "(one string per ingredient, with its quantity and unit). Summarise the method as at most",
    `${6} short steps, one sentence each, keeping all temperatures and times and dropping stories and tips.`,
    "If there is no recipe, return empty arrays.",
    `\n\nURL: ${url}\n\nPAGE TEXT:\n${pageText}`,
  ].join(" ");
  const result = (await generate(prompt, {
    type: "object",
    properties: {
      title: { type: "string" },
      servings: { type: "integer", nullable: true },
      ingredients: { type: "array", items: { type: "string" } },
      steps: { type: "array", items: { type: "string" } },
    },
    required: ["title", "ingredients", "steps"],
  })) as AiRecipe | null;
  if (!result || !Array.isArray(result.ingredients) || result.ingredients.length === 0) return null;
  return {
    title: String(result.title || ""),
    servings: typeof result.servings === "number" ? result.servings : null,
    ingredients: result.ingredients.map(String),
    steps: Array.isArray(result.steps) ? result.steps.map(String) : [],
  };
}

/** Rewrite a long method into at most six short steps, keeping temperatures and times. */
export async function aiCondenseSteps(steps: string[]): Promise<string[] | null> {
  if (steps.length === 0) return null;
  const prompt = [
    "Rewrite this recipe method as at most 6 steps, one short sentence each.",
    "Keep every temperature, time and quantity. Drop stories, tips and chatter.",
    "Return the steps in order.\n\nMETHOD:\n",
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  ].join(" ");
  const result = (await generate(prompt, {
    type: "object",
    properties: { steps: { type: "array", items: { type: "string" } } },
    required: ["steps"],
  })) as { steps?: unknown } | null;
  if (!result || !Array.isArray(result.steps) || result.steps.length === 0) return null;
  return result.steps.map(String).filter(Boolean);
}
