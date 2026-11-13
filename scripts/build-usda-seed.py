#!/usr/bin/env python3
"""Build supabase/migrations/20261113150100_usda_sr_legacy.sql from the USDA SR Legacy CSV.

Source zip (public domain, CC0):
https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
"""
import csv
import sys
import uuid
from collections import defaultdict
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/usda/FoodData_Central_sr_legacy_food_csv_2018-04")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "supabase/migrations/20261113150100_usda_sr_legacy.sql")

AISLE = {
    "1": "Dairy", "2": "Spices", "3": "Other", "4": "Oils", "5": "Meat",
    "6": "Other", "7": "Meat", "8": "Grains", "9": "Produce", "10": "Meat",
    "11": "Produce", "12": "Nuts", "13": "Meat", "14": "Drinks", "15": "Seafood",
    "16": "Legumes", "17": "Meat", "18": "Bakery", "19": "Baking", "20": "Grains",
    "21": "Other", "22": "Other", "23": "Snacks", "24": "Other", "25": "Other",
    "26": "Other", "27": "Other", "28": "Drinks",
}
VOLUME = {
    "1000": ("cup", 240), "1001": ("tbsp", 15), "1002": ("tsp", 5),
    "1003": ("l", 1000), "1004": ("ml", 1), "1009": ("floz", 29.5735), "1118": ("tbsp", 15),
}
MASS = {"1030": "lb", "1038": "oz"}
# Many SR Legacy portions store the unit in `modifier` with measure_unit_id 9999.
MODIFIER_UNITS = {
    "cup": ("cup", 240), "cups": ("cup", 240),
    "tbsp": ("tbsp", 15), "tablespoon": ("tbsp", 15), "tablespoons": ("tbsp", 15),
    "tsp": ("tsp", 5), "teaspoon": ("tsp", 5), "teaspoons": ("tsp", 5),
    "ml": ("ml", 1), "milliliter": ("ml", 1), "millilitre": ("ml", 1),
    "l": ("l", 1000), "liter": ("l", 1000), "litre": ("l", 1000),
    "fl oz": ("floz", 29.5735), "floz": ("floz", 29.5735),
    "oz": ("oz", None), "ounce": ("oz", None), "ounces": ("oz", None),
    "lb": ("lb", None), "pound": ("lb", None), "pounds": ("lb", None),
}
KEEP_LABELS = {
    "piece", "pieces", "slice", "slices", "clove", "leaf", "medium", "large", "small",
    "stick", "strip", "fillet", "filet", "breast", "thigh", "wing", "leg", "chop",
    "steak", "link", "links", "patty", "serving", "each", "egg", "head", "bunch",
    "stalk", "spear", "sprig", "wedge",
}
NS = uuid.UUID("6f0e2d3a-7b14-4c1e-9a55-8d2c1b0e4f77")
ALIASES = [
    ("scallion", "scallion"), ("scallion", "green onion"), ("parmesan", "parm"),
    ("cilantro", "cilantro"), ("zucchini", "courgette"), ("eggplant", "aubergine"),
    ("chickpea", "chickpea"), ("garbanzo", "chickpea"), ("shrimp", "prawn"),
    ("bell pepper", "capsicum"), ("sweet pepper", "capsicum"), ("ground beef", "mince"),
    ("yogurt", "yoghurt"),
]


def sql(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def num(value):
    if value is None:
        return "null"
    return format(value, ".6g")


def singular(word):
    w = word.lower()
    if len(w) < 5 or w.endswith(("us", "is", "ss", "os")):
        return None
    if w.endswith("ies"):
        return w[:-3] + "y"
    if w.endswith(("ches", "shes", "xes", "zes", "oes")):
        return w[:-2]
    if w.endswith("s"):
        return w[:-1]
    return None


def synonyms_for(description):
    first = description.split(",")[0].strip().lower()
    last = first.split()[-1]
    one = singular(last)
    if not one or one == last:
        return []
    head = " ".join(first.split()[:-1] + [one]) if " " in first else one
    return [head] if head != first else []


foods = {}
with open(SRC / "food.csv") as f:
    for row in csv.DictReader(f):
        if row["food_category_id"] == "27":
            continue
        foods[row["fdc_id"]] = row

macros = {}
wanted = {"1008": "kcal", "1003": "protein", "1005": "carbs", "1004": "fat", "2047": "kcal_alt"}
with open(SRC / "food_nutrient.csv") as f:
    for row in csv.DictReader(f):
        key = wanted.get(row["nutrient_id"])
        if not key or row["fdc_id"] not in foods:
            continue
        try:
            amount = float(row["amount"])
        except ValueError:
            continue
        if amount < 0:
            continue
        slot = macros.setdefault(row["fdc_id"], {})
        if key == "kcal_alt":
            slot.setdefault("kcal", amount)
        else:
            slot[key] = amount

portions = defaultdict(list)
density_samples = defaultdict(list)
with open(SRC / "food_portion.csv") as f:
    for row in csv.DictReader(f):
        fdc = row["fdc_id"]
        if fdc not in foods:
            continue
        try:
            amount = float(row["amount"] or 0)
            grams = float(row["gram_weight"] or 0)
        except ValueError:
            continue
        if amount <= 0 or grams <= 0:
            continue
        per = grams / amount
        unit = VOLUME.get(row["measure_unit_id"])
        mass = MASS.get(row["measure_unit_id"])
        label = (row["portion_description"] or row["modifier"] or "").strip().lower()
        named = MODIFIER_UNITS.get(label)
        if unit:
            our_unit, ml = unit
            portions[fdc].append((our_unit, None, per))
            density_samples[fdc].append(per / ml)
        elif mass:
            portions[fdc].append((mass, None, per))
        elif named:
            our_unit, ml = named
            portions[fdc].append((our_unit, None, per))
            if ml:
                density_samples[fdc].append(per / ml)
        else:
            short = singular(label) if label else None
            if label in KEEP_LABELS:
                portions[fdc].append((None, label, per))
            elif short in KEEP_LABELS:
                portions[fdc].append((None, short, per))

ingredient_rows = []
macro_rows = []
portion_rows = []
seen_names = set()
for fdc, food in foods.items():
    name = " ".join(food["description"].split())
    if len(name) > 200:
        name = name[:197] + "..."
    if name.lower() in seen_names:
        name = f"{name} ({fdc})"
    seen_names.add(name.lower())
    iid = str(uuid.uuid5(NS, f"fdc:{fdc}"))
    syn = synonyms_for(name)
    low = name.lower()
    for needle, alias in ALIASES:
        if needle in low and alias not in syn and alias != low:
            syn.append(alias)
    samples = density_samples.get(fdc) or []
    density = sum(samples) / len(samples) if samples else None
    if density and (density < 0.05 or density > 3):
        density = None
    syn_sql = "array[" + ", ".join(sql(s) for s in syn) + "]::text[]" if syn else "'{}'::text[]"
    ingredient_rows.append(
        f"({sql(iid)}, {sql(name)}, {syn_sql}, {sql(AISLE.get(food['food_category_id']))}, {int(fdc)}, {num(density)})"
    )
    m = macros.get(fdc)
    if m and any(k in m for k in ("kcal", "protein", "carbs", "fat")):
        macro_rows.append(
            f"({sql(iid)}, {num(m.get('kcal'))}, {num(m.get('protein'))}, {num(m.get('carbs'))}, {num(m.get('fat'))})"
        )
    kept = []
    seen = set()
    for unit_id, label, grams in sorted(portions.get(fdc, []), key=lambda p: (p[0] is None, p[2])):
        marker = unit_id or label
        if marker in seen:
            continue
        seen.add(marker)
        kept.append((unit_id, label, grams))
        if len(kept) == 6:
            break
    for unit_id, label, grams in kept:
        portion_rows.append(f"({sql(iid)}, {sql(unit_id)}, {sql(label)}, {num(grams)})")


def batches(rows, size, insert):
    parts = []
    for i in range(0, len(rows), size):
        parts.append(insert + ",\n".join(rows[i : i + size]) + ";\n")
    return "".join(parts)


text = f"""-- Generated by scripts/build-usda-seed.py from USDA FoodData Central SR Legacy (April 2018).
-- Public domain (CC0). {len(ingredient_rows)} generic foods, macros per 100 g.
-- Do not edit by hand; regenerate the file.

{batches(ingredient_rows, 300, "insert into public.ingredients (id, name, synonyms, aisle, fdc_id, density_g_per_ml) values\n")}
{batches(macro_rows, 400, "insert into public.ingredient_macros (ingredient_id, kcal, protein_g, carbs_g, fat_g) values\n")}
{batches(portion_rows, 400, "insert into public.ingredient_portions (ingredient_id, unit_id, label, grams) values\n")}
create index ingredients_search_trgm_idx on public.ingredients using gin (search_text extensions.gin_trgm_ops);
create index recipes_title_trgm_idx on public.recipes using gin ((lower(title)) extensions.gin_trgm_ops);
"""
OUT.write_text(text)
print(f"ingredients {len(ingredient_rows)} macros {len(macro_rows)} portions {len(portion_rows)} bytes {OUT.stat().st_size}")
