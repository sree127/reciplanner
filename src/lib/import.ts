// Website recipe import: read a page's schema.org Recipe data (JSON-LD), parse ingredient
// lines, and condense the method to at most six one-line steps. An optional AI pass
// (src/lib/ai.ts) handles pages with no structured data and better step condensing.
// These functions are deliberately free of Supabase so they can be unit tested.

export const MAX_STEPS = 6;

export type ParsedIngredient = {
  raw: string;
  qtyText: string;
  unitToken: string;
  name: string;
  note: string;
};

export type ParsedRecipe = {
  title: string;
  description: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  photoUrl: string;
  sourceUrl: string;
  sourceAuthor: string;
  ingredients: ParsedIngredient[];
  steps: string[];
  usedAi: boolean;
};

const UNIT_WORDS: Record<string, string> = {
  g: "g", gram: "g", grams: "g", gramme: "g", grammes: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp",
  tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
};

// Words that indicate a countable item rather than a mass/volume unit. They map to a
// single "piece" and are dropped from the ingredient name so it matches the catalog.
const COUNT_WORDS = new Set([
  "clove", "cloves", "can", "cans", "tin", "tins", "slice", "slices", "pinch", "pinches",
  "bunch", "bunches", "handful", "handfuls", "sprig", "sprigs", "stalk", "stalks", "stick",
  "sticks", "head", "heads", "fillet", "fillets", "piece", "pieces", "package", "packages",
  "packet", "packets", "jar", "jars", "bottle", "bottles", "sheet", "sheets",
]);

const SIZE_WORDS = new Set(["large", "medium", "small", "big", "whole", "ripe", "fresh"]);

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

function singular(word: string): string {
  return word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
}

function looksNumeric(token: string): boolean {
  return /^\d+([.,]\d+)?$/.test(token) || /^\d+\/\d+$/.test(token) || token in UNICODE_FRACTIONS;
}

/** Turn "2 cups all-purpose flour, sifted" into quantity, unit, name and note parts. */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const clean = raw.replace(/\s+/g, " ").trim();
  const empty: ParsedIngredient = { raw: clean, qtyText: "", unitToken: "", name: "", note: "" };
  if (!clean) return empty;

  // A note is whatever follows the first comma ("garlic, minced" -> note "minced").
  let main = clean;
  let note = "";
  const comma = clean.indexOf(",");
  if (comma >= 0) {
    main = clean.slice(0, comma).trim();
    note = clean.slice(comma + 1).trim();
  }

  // Drop a leading parenthetical like "1 (14 oz) can ...".
  main = main.replace(/\(([^)]*)\)/g, " ").replace(/\s+/g, " ").trim();

  // Expand a unicode fraction glued to a number: "1½" -> "1 1/2".
  main = main.replace(/(\d)([¼½¾⅓⅔⅛⅜⅝⅞])/g, (_, d, f) => `${d} ${UNICODE_FRACTIONS[f]}`);
  for (const [glyph, text] of Object.entries(UNICODE_FRACTIONS)) main = main.split(glyph).join(text);
  main = main.replace(/(\d)\s+to\s+(\d)/gi, "$1-$2"); // "2 to 3" -> "2-3"

  const tokens = main.split(" ").filter(Boolean);
  const qtyParts: string[] = [];
  while (tokens.length) {
    const token = tokens[0];
    if (looksNumeric(token)) {
      qtyParts.push(token);
      tokens.shift();
      continue;
    }
    // A range like "2-3".
    if (/^\d+([.,]\d+)?-\d+([.,]\d+)?$/.test(token)) {
      qtyParts.push(token);
      tokens.shift();
    }
    break;
  }
  // "1 1/2" collapses to a mixed number the kitchen parser understands.
  const qtyText = qtyParts.join(" ").replace(",", ".");

  let unitToken = "";
  if (tokens.length) {
    const word = singular(tokens[0].toLowerCase().replace(/\.$/, ""));
    if (word in UNIT_WORDS) {
      unitToken = UNIT_WORDS[word];
      tokens.shift();
    } else if (COUNT_WORDS.has(tokens[0].toLowerCase())) {
      unitToken = "piece";
      tokens.shift();
    }
  }

  // Drop leading size adjectives so "large eggs" matches "egg".
  while (tokens.length && SIZE_WORDS.has(tokens[0].toLowerCase())) tokens.shift();

  // A bare count with no unit word ("2 eggs") is a piece.
  if (!unitToken && qtyText && tokens.length) unitToken = "piece";

  const name = tokens.join(" ").replace(/\s+/g, " ").trim();
  return { raw: clean, qtyText, unitToken, name, note };
}

/** ISO 8601 duration ("PT1H30M") to whole minutes. */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match || (!match[1] && !match[2])) return null;
  return (Number(match[1] || 0) * 60) + Number(match[2] || 0);
}

function parseYield(value: unknown): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const n = parseYield(item);
      if (n != null) return n;
    }
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const m = value.match(/\d+/);
    if (m) return Number(m[0]);
  }
  return null;
}

function firstString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.url === "string") return o.url.trim();
    if (typeof o.name === "string") return o.name.trim();
    if (typeof o.text === "string") return o.text.trim();
  }
  return "";
}

type JsonObject = Record<string, unknown>;

function typeMatches(node: JsonObject, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t.toLowerCase() === type;
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.toLowerCase() === type);
  return false;
}

function collectNodes(value: unknown, out: JsonObject[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out);
  } else if (value && typeof value === "object") {
    const node = value as JsonObject;
    out.push(node);
    if ("@graph" in node) collectNodes(node["@graph"], out);
  }
}

/** Pull the first schema.org Recipe object out of a page's JSON-LD blocks. */
export function extractJsonLdRecipe(html: string): JsonObject | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(script[1].trim());
    } catch {
      continue;
    }
    const nodes: JsonObject[] = [];
    collectNodes(data, nodes);
    const recipe = nodes.find((n) => typeMatches(n, "recipe"));
    if (recipe) return recipe;
  }
  return null;
}

function flattenInstructions(value: unknown, out: string[]): void {
  if (!value) return;
  if (typeof value === "string") {
    const parts = value.includes("\n")
      ? value.split(/\r?\n+/)
      : value.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    for (const part of parts) {
      const t = part.replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenInstructions(item, out);
    return;
  }
  if (typeof value === "object") {
    const node = value as JsonObject;
    if (typeMatches(node, "howtosection") && node.itemListElement) {
      flattenInstructions(node.itemListElement, out);
      return;
    }
    const text = typeof node.text === "string" ? node.text : typeof node.name === "string" ? node.name : "";
    const t = text.replace(/\s+/g, " ").trim();
    if (t) out.push(t);
  }
}

/** At most six one-line steps, preserving every step's text by merging any overflow. */
export function condenseSteps(steps: string[]): string[] {
  const lines = steps.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (lines.length <= MAX_STEPS) return lines;
  const head = lines.slice(0, MAX_STEPS - 1);
  const tail = lines.slice(MAX_STEPS - 1).join(" ");
  return [...head, tail];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function fromJsonLd(recipe: JsonObject, url: string): ParsedRecipe {
  const ingredientsRaw = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient
    : Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];
  const steps: string[] = [];
  flattenInstructions(recipe.recipeInstructions, steps);

  const prep = parseIsoDuration(recipe.prepTime);
  const cook = parseIsoDuration(recipe.cookTime);
  const total = parseIsoDuration(recipe.totalTime);

  return {
    title: firstString(recipe.name) || "Imported recipe",
    description: firstString(recipe.description),
    servings: parseYield(recipe.recipeYield),
    prepMin: prep ?? (total != null && cook != null ? Math.max(total - cook, 0) : null),
    cookMin: cook ?? (total != null && prep != null ? Math.max(total - prep, 0) : total),
    photoUrl: firstString(recipe.image),
    sourceUrl: url,
    sourceAuthor: firstString(recipe.author),
    ingredients: ingredientsRaw
      .map((line) => parseIngredientLine(String(line)))
      .filter((i) => i.name || i.raw),
    steps,
    usedAi: false,
  };
}

/** Parse a fetched HTML page into a recipe. Pure: no network, no AI. */
export function parseRecipeHtml(html: string, url: string): ParsedRecipe | null {
  const recipe = extractJsonLdRecipe(html);
  if (!recipe) return null;
  const parsed = fromJsonLd(recipe, url);
  parsed.steps = condenseSteps(parsed.steps);
  return parsed;
}

function isBlockedHost(hostname: string): boolean {
  if (process.env.ALLOW_LOCAL_IMPORT === "1") return false;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\./.test(h) || h === "0.0.0.0" || h === "::1") return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ReciplannerBot/1.0 (+https://reciplanner.app; recipe import for a private household)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) throw new Error(`The site returned ${response.status}.`);
    const html = (await response.text()).slice(0, 2_000_000);
    return { html, finalUrl: response.url || url };
  } finally {
    clearTimeout(timer);
  }
}

export type ImportResult = ParsedRecipe | { error: string };

/** Fetch a URL and parse it into a recipe, using AI only when the page lacks recipe data. */
export async function importFromUrl(rawUrl: string): Promise<ImportResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { error: "That doesn't look like a web address. Paste the full link, including https://." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http and https links can be imported." };
  }
  if (isBlockedHost(url.hostname)) {
    return { error: "That link points to a private address, which can't be imported." };
  }

  let page: { html: string; finalUrl: string };
  try {
    page = await fetchPage(url.toString());
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "the page took too long to load" : "the page couldn't be loaded";
    return { error: `Couldn't fetch that link — ${reason}. You can still add the recipe by hand.` };
  }

  const { aiCondenseSteps, aiExtractRecipe } = await import("@/lib/ai");

  const parsed = parseRecipeHtml(page.html, page.finalUrl);
  if (parsed) {
    if (parsed.steps.length === MAX_STEPS || parsed.steps.join(" ").length > 500) {
      const better = await aiCondenseSteps(parsed.steps);
      if (better) parsed.steps = condenseSteps(better);
    }
    return parsed;
  }

  // No structured recipe data: let the AI read the page text, if a key is configured.
  const text = stripHtml(page.html).slice(0, 20000);
  const ai = await aiExtractRecipe(text, page.finalUrl);
  if (!ai) {
    return {
      error:
        "No recipe data found on that page. Big recipe sites usually work; for others, add the recipe by hand (or set a Gemini API key to read free-form pages).",
    };
  }
  return {
    title: ai.title || "Imported recipe",
    description: "",
    servings: ai.servings ?? null,
    prepMin: null,
    cookMin: null,
    photoUrl: "",
    sourceUrl: page.finalUrl,
    sourceAuthor: "",
    ingredients: ai.ingredients.map((line) => parseIngredientLine(line)).filter((i) => i.name || i.raw),
    steps: condenseSteps(ai.steps),
    usedAi: true,
  };
}
