export type UnitKind = "mass" | "volume" | "count";

export type UnitDef = {
  id: string;
  name: string;
  abbrev: string;
  kind: UnitKind;
  /** Mass converts to grams, volume to millilitres. */
  toBase: number;
  display: boolean;
};

export const UNITS: UnitDef[] = [
  { id: "g", name: "grams", abbrev: "g", kind: "mass", toBase: 1, display: true },
  { id: "kg", name: "kilograms", abbrev: "kg", kind: "mass", toBase: 1000, display: true },
  { id: "ml", name: "millilitres", abbrev: "ml", kind: "volume", toBase: 1, display: true },
  { id: "l", name: "litres", abbrev: "l", kind: "volume", toBase: 1000, display: true },
  { id: "tsp", name: "teaspoons", abbrev: "tsp", kind: "volume", toBase: 5, display: true },
  { id: "tbsp", name: "tablespoons", abbrev: "tbsp", kind: "volume", toBase: 15, display: true },
  { id: "cup", name: "cups", abbrev: "cup", kind: "volume", toBase: 240, display: false },
  { id: "floz", name: "fluid ounces", abbrev: "fl oz", kind: "volume", toBase: 29.5735, display: false },
  { id: "oz", name: "ounces", abbrev: "oz", kind: "mass", toBase: 28.3495, display: false },
  { id: "lb", name: "pounds", abbrev: "lb", kind: "mass", toBase: 453.592, display: false },
  { id: "piece", name: "pieces", abbrev: "piece", kind: "count", toBase: 1, display: true },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

const FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
};

const GLYPHS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

export type ParsedQty = { min: number; max: number | null };

function parseOne(token: string): number | null {
  const text = token.trim();
  if (!text) return null;
  const unicode = text.match(/^(\d+)?\s*([½¼¾⅓⅔⅛])$/);
  if (unicode) return (unicode[1] ? Number(unicode[1]) : 0) + FRACTIONS[unicode[2]];
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac && Number(frac[2]) !== 0) return Number(frac[1]) / Number(frac[2]);
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Accepts "1/2", "1 1/2", "1½", "2-3", "2.5". */
export function parseQuantity(text: string): ParsedQty | null {
  const raw = text.trim();
  if (!raw) return null;
  const range = raw.split(/\s*[-–—]\s*/);
  if (range.length === 2) {
    const min = parseOne(range[0]);
    const max = parseOne(range[1]);
    if (min == null || max == null || min < 0 || max < min) return null;
    return { min, max };
  }
  const min = parseOne(raw);
  if (min == null || min < 0) return null;
  return { min, max: null };
}

/** 187.5 → 190, small amounts stay on quarter steps. */
export function kitchenRound(n: number): number {
  if (!Number.isFinite(n)) return n;
  const sign = n < 0 ? -1 : 1;
  const a = Math.abs(n);
  let rounded: number;
  if (a >= 100) rounded = Math.round(a / 5) * 5;
  else if (a >= 20) rounded = Math.round(a);
  else if (a >= 3) rounded = Math.round(a * 2) / 2;
  else rounded = Math.round(a * 4) / 4;
  return sign * rounded;
}

export function formatQty(n: number): string {
  const rounded = kitchenRound(n);
  const whole = Math.floor(rounded + 1e-9);
  const frac = rounded - whole;
  const glyph = GLYPHS.find(([value]) => Math.abs(frac - value) < 0.02);
  if (glyph && whole === 0) return glyph[1];
  if (glyph) return `${whole}${glyph[1]}`;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
  return String(Math.round(rounded * 100) / 100);
}

export type StoredQty = {
  qtyMin: number | null;
  qtyMax: number | null;
  unitId: string | null;
  unitLabel: string | null;
  grams: number | null;
};

function convertOne(qty: number, unitToken: string, density: number | null): Omit<StoredQty, "qtyMin" | "qtyMax"> & { qty: number } {
  if (unitToken.startsWith("portion|")) {
    const [, gramsText, label] = unitToken.split("|");
    const each = Number(gramsText);
    return { qty, unitId: null, unitLabel: label || null, grams: Number.isFinite(each) ? qty * each : null };
  }
  const unit = UNIT_BY_ID[unitToken];
  if (!unit) return { qty, unitId: unitToken || null, unitLabel: null, grams: null };
  if (unit.kind === "count") return { qty, unitId: "piece", unitLabel: null, grams: null };
  if (unit.kind === "mass") {
    const grams = qty * unit.toBase;
    return { qty: grams, unitId: "g", unitLabel: null, grams };
  }
  const ml = qty * unit.toBase;
  const grams = density ? ml * density : null;
  if (!unit.display || unit.id === "l") {
    if (!unit.display && density) return { qty: grams!, unitId: "g", unitLabel: null, grams };
    return { qty: ml, unitId: "ml", unitLabel: null, grams };
  }
  return { qty, unitId: unit.id, unitLabel: null, grams };
}

export function convertQuantity(input: {
  qtyText: string;
  unitToken: string;
  density: number | null;
  toTaste: boolean;
}): StoredQty | { error: string } {
  if (input.toTaste) {
    return { qtyMin: null, qtyMax: null, unitId: null, unitLabel: "to taste", grams: null };
  }
  const parsed = parseQuantity(input.qtyText);
  if (!parsed) return { error: "Enter a quantity, like 200, 1/2, or 2-3. Or mark it to taste." };
  if (!input.unitToken) return { error: "Choose a unit." };
  const min = convertOne(parsed.min, input.unitToken, input.density);
  const max = parsed.max == null ? null : convertOne(parsed.max, input.unitToken, input.density).qty;
  return { qtyMin: min.qty, qtyMax: max, unitId: min.unitId, unitLabel: min.unitLabel, grams: min.grams };
}

function present(qty: number, unitId: string | null, promote: boolean): { value: number; unitId: string | null } {
  if (promote && unitId === "g" && qty >= 1000) return { value: qty / 1000, unitId: "kg" };
  if (promote && unitId === "ml" && qty >= 1000) return { value: qty / 1000, unitId: "l" };
  return { value: qty, unitId };
}

export function formatScaled(
  qtyMin: number | null,
  qtyMax: number | null,
  unitId: string | null,
  unitLabel: string | null,
  factor: number,
): string {
  if (unitLabel === "to taste" || qtyMin == null) return unitLabel === "to taste" ? "to taste" : "";
  const scaledMax = qtyMax == null ? null : qtyMax * factor;
  const promote = scaledMax == null ? qtyMin * factor >= 1000 : qtyMin * factor >= 1000 && scaledMax >= 1000;
  const min = present(qtyMin * factor, unitId, promote);
  const abbrev = min.unitId ? (UNIT_BY_ID[min.unitId]?.abbrev ?? min.unitId) : unitLabel;
  const head = formatQty(min.value);
  if (scaledMax == null) return abbrev ? `${head} ${abbrev}` : head;
  const max = present(scaledMax, unitId, promote);
  return abbrev ? `${head}–${formatQty(max.value)} ${abbrev}` : `${head}–${formatQty(max.value)}`;
}
