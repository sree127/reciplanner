#!/usr/bin/env python3
"""Build supabase/migrations/20261113160000_common_ingredients.sql.

A short, friendly list of everyday ingredients. Each friendly name is matched to the
best USDA SR Legacy row, and that row's macros (per 100 g), density, and portions are
copied. These rows are marked is_common = true and shown first in search; the full USDA
catalog stays available behind "Search all foods".
"""
import csv
import sys
import uuid
from collections import defaultdict
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/usda/FoodData_Central_sr_legacy_food_csv_2018-04")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "supabase/migrations/20261113160000_common_ingredients.sql")
NS = uuid.UUID("2b9d6c41-5e0a-4a7e-9f3b-1c7d8e2a6b40")

VOLUME = {"1000": 240, "1001": 15, "1002": 5, "1003": 1000, "1004": 1, "1009": 29.5735, "1118": 15}
MASS = {"1030": 453.592, "1038": 28.3495}
KEEP_LABELS = {
    "clove", "leaf", "slice", "slices", "piece", "pieces", "medium", "large", "small",
    "stick", "strip", "fillet", "breast", "thigh", "egg", "head", "stalk", "sprig", "ear",
}

# friendly name | aisle | keywords all required | optional: prefer tokens
COMMON = [
    # Produce
    ("Onion", "Produce", ["onions, raw"]),
    ("Spring onion", "Produce", ["onions, spring", "raw"]),
    ("Garlic", "Produce", ["garlic, raw"]),
    ("Tomato", "Produce", ["tomatoes, red, ripe, raw, year"]),
    ("Potato", "Produce", ["potatoes, flesh and skin, raw"]),
    ("Sweet potato", "Produce", ["sweet potato, raw, unprepared"]),
    ("Carrot", "Produce", ["carrots, raw"]),
    ("Celery", "Produce", ["celery, raw"]),
    ("Cucumber", "Produce", ["cucumber, with peel, raw"]),
    ("Bell pepper, red", "Produce", ["peppers, sweet, red, raw"]),
    ("Bell pepper, green", "Produce", ["peppers, sweet, green, raw"]),
    ("Chilli pepper", "Produce", ["peppers, hot chili, green, raw"]),
    ("Mushroom", "Produce", ["mushrooms, white, raw"]),
    ("Zucchini", "Produce", ["squash, summer, zucchini, includes skin, raw"]),
    ("Eggplant", "Produce", ["eggplant, raw"]),
    ("Broccoli", "Produce", ["broccoli, raw"]),
    ("Cauliflower", "Produce", ["cauliflower, raw"]),
    ("Spinach", "Produce", ["spinach, raw"]),
    ("Kale", "Produce", ["kale, raw"]),
    ("Lettuce", "Produce", ["lettuce, cos or romaine, raw"]),
    ("Cabbage", "Produce", ["cabbage, raw"]),
    ("Green beans", "Produce", ["beans, snap, green, raw"]),
    ("Peas", "Produce", ["peas, green, raw"]),
    ("Sweetcorn", "Produce", ["corn, sweet, yellow, raw"]),
    ("Avocado", "Produce", ["avocados, raw, all"]),
    ("Ginger", "Produce", ["ginger root, raw"]),
    ("Leek", "Produce", ["leeks, (bulb and lower leaf-portion), raw"]),
    ("Pumpkin", "Produce", ["pumpkin, raw"]),
    ("Beetroot", "Produce", ["beets, raw"]),
    ("Asparagus", "Produce", ["asparagus, raw"]),
    ("Lemon", "Produce", ["lemons, raw, without peel"]),
    ("Lime", "Produce", ["lime juice, raw"]),
    ("Apple", "Produce", ["apples, raw, with skin"]),
    ("Banana", "Produce", ["bananas, raw"]),
    ("Orange", "Produce", ["oranges, raw, all"]),
    ("Strawberry", "Produce", ["strawberries, raw"]),
    ("Blueberry", "Produce", ["blueberries, raw"]),
    ("Grapes", "Produce", ["grapes, red or green", "raw"]),
    ("Mango", "Produce", ["mangos, raw"]),
    ("Pineapple", "Produce", ["pineapple, raw, all"]),
    # Herbs and spices
    ("Basil", "Spices", ["basil, fresh"]),
    ("Coriander (cilantro)", "Spices", ["coriander (cilantro) leaves, raw"]),
    ("Parsley", "Spices", ["parsley, fresh"]),
    ("Mint", "Spices", ["spearmint, fresh"]),
    ("Black pepper", "Spices", ["spices, pepper, black"]),
    ("Salt", "Spices", ["salt, table"]),
    ("Paprika", "Spices", ["spices, paprika"]),
    ("Cumin", "Spices", ["spices, cumin seed"]),
    ("Chilli powder", "Spices", ["spices, chili powder"]),
    ("Cinnamon", "Spices", ["spices, cinnamon, ground"]),
    ("Curry powder", "Spices", ["spices, curry powder"]),
    ("Oregano", "Spices", ["spices, oregano, dried"]),
    ("Turmeric", "Spices", ["spices, turmeric, ground"]),
    ("Bay leaf", "Spices", ["spices, bay leaf"]),
    # Meat and fish
    ("Chicken breast", "Meat", ["chicken", "breast", "meat only, raw"]),
    ("Chicken thigh", "Meat", ["chicken", "thigh, meat only, raw"]),
    ("Chicken, whole", "Meat", ["chicken, broilers or fryers, meat and skin, raw"]),
    ("Minced beef", "Meat", ["beef, ground, 85% lean meat / 15% fat, raw"]),
    ("Beef steak", "Meat", ["beef", "loin, top sirloin", "separable lean only, raw"]),
    ("Pork chop", "Meat", ["pork, fresh, loin", "(chops)", "separable lean only, raw"]),
    ("Minced pork", "Meat", ["pork, ground, 84%"]),
    ("Bacon", "Meat", ["pork, cured, bacon, unprepared"]),
    ("Sausage", "Meat", ["sausage, italian, pork, mild, raw"]),
    ("Ham", "Meat", ["ham, sliced, regular"]),
    ("Lamb", "Meat", ["lamb", "loin", "separable lean only, raw"]),
    ("Salmon", "Seafood", ["fish, salmon, atlantic, farmed, raw"]),
    ("Tuna", "Seafood", ["fish, tuna, fresh, bluefin, raw"]),
    ("Cod", "Seafood", ["fish, cod, atlantic, raw"]),
    ("Prawns", "Seafood", ["crustaceans, shrimp, mixed species, raw"]),
    ("Tinned tuna", "Seafood", ["fish, tuna, light, canned in water, drained solids"]),
    # Dairy and eggs
    ("Egg", "Dairy", ["egg, whole, raw, fresh"]),
    ("Milk", "Dairy", ["milk, reduced fat, fluid, 2%"]),
    ("Whole milk", "Dairy", ["milk, whole, 3.25% milkfat, with added vitamin d"]),
    ("Butter", "Dairy", ["butter, salted"]),
    ("Unsalted butter", "Dairy", ["butter, without salt"]),
    ("Cheddar", "Dairy", ["cheese, cheddar"]),
    ("Parmesan", "Dairy", ["cheese, parmesan, hard"]),
    ("Mozzarella", "Dairy", ["cheese, mozzarella, whole milk"]),
    ("Feta", "Dairy", ["cheese, feta"]),
    ("Cream cheese", "Dairy", ["cheese, cream"]),
    ("Greek yogurt", "Dairy", ["yogurt, greek, plain, whole milk"]),
    ("Yogurt", "Dairy", ["yogurt, plain, whole milk"]),
    ("Double cream", "Dairy", ["cream, fluid, heavy whipping"]),
    ("Sour cream", "Dairy", ["cream, sour, cultured"]),
    # Tofu and plant
    ("Tofu, firm", "Produce", ["tofu, raw, firm, prepared with calcium sulfate"]),
    ("Tofu, silken", "Produce", ["tofu, silken, soft"]),
    ("Tempeh", "Produce", ["tempeh"]),
    # Legumes, nuts, seeds
    ("Chickpeas, tinned", "Legumes", ["chickpeas (garbanzo beans, bengal gram), mature seeds, canned"]),
    ("Black beans, tinned", "Legumes", ["beans, black, mature seeds, canned"]),
    ("Kidney beans, tinned", "Legumes", ["beans, kidney, red, mature seeds, canned"]),
    ("Red lentils", "Legumes", ["lentils, raw"]),
    ("Peanut butter", "Nuts", ["peanut butter, smooth style, with salt"]),
    ("Almonds", "Nuts", ["nuts, almonds"]),
    ("Walnuts", "Nuts", ["nuts, walnuts, english"]),
    ("Cashews", "Nuts", ["nuts, cashew nuts, raw"]),
    ("Sesame seeds", "Nuts", ["seeds, sesame seeds, whole, dried"]),
    # Grains and pasta
    ("Rice, white", "Grains", ["rice, white, long-grain, regular, raw, unenriched"]),
    ("Rice, brown", "Grains", ["rice, brown, long-grain, raw"]),
    ("Pasta, dried", "Grains", ["pasta, dry, unenriched"]),
    ("Plain flour", "Baking", ["wheat flour, white, all-purpose, unenriched"]),
    ("Bread", "Bakery", ["bread, white, commercially prepared"]),
    ("Oats", "Grains", ["cereals, oats, regular and quick, not fortified, dry"]),
    ("Couscous", "Grains", ["couscous, dry"]),
    ("Quinoa", "Grains", ["quinoa, uncooked"]),
    ("Tortilla", "Bakery", ["tortillas, ready-to-bake or -fry, flour"]),
    # Oils, fats, condiments
    ("Olive oil", "Oils", ["oil, olive, salad or cooking"]),
    ("Vegetable oil", "Oils", ["oil, canola"]),
    ("Sunflower oil", "Oils", ["oil, sunflower"]),
    ("Coconut oil", "Oils", ["oil, coconut"]),
    ("Soy sauce", "Other", ["soy sauce made from soy and wheat (shoyu)"]),
    ("Tomato paste", "Other", ["tomato products, canned, paste, without salt"]),
    ("Chopped tomatoes, tinned", "Other", ["tomatoes, red, ripe, canned, packed in tomato juice"]),
    ("Passata", "Other", ["tomato products, canned, puree, without salt"]),
    ("Coconut milk", "Other", ["nuts, coconut milk, canned"]),
    ("Honey", "Baking", ["honey"]),
    ("Maple syrup", "Baking", ["syrups, maple"]),
    ("Mustard", "Other", ["mustard, prepared, yellow"]),
    ("Mayonnaise", "Other", ["salad dressing, mayonnaise, regular"]),
    ("Ketchup", "Other", ["catsup"]),
    ("Vinegar", "Other", ["vinegar, distilled"]),
    ("Balsamic vinegar", "Other", ["vinegar, balsamic"]),
    ("Stock, chicken", "Other", ["soup, stock, chicken, home-prepared"]),
    ("Stock, beef", "Other", ["soup, stock, beef, home-prepared"]),
    # Baking and sweet
    ("Sugar", "Baking", ["sugars, granulated"]),
    ("Brown sugar", "Baking", ["sugars, brown"]),
    ("Icing sugar", "Baking", ["sugars, powdered"]),
    ("Baking powder", "Baking", ["leavening agents, baking powder, double-acting, sodium aluminum sulfate"]),
    ("Baking soda", "Baking", ["leavening agents, baking soda"]),
    ("Cocoa powder", "Baking", ["cocoa, dry powder, unsweetened"]),
    ("Dark chocolate", "Baking", ["chocolate, dark, 70-85% cacao solids"]),
    ("Vanilla extract", "Baking", ["vanilla extract"]),
    ("Raisins", "Baking", ["raisins, dark, seedless"]),
]


def sql(value):
    return "null" if value is None else "'" + str(value).replace("'", "''") + "'"


def num(value):
    return "null" if value is None else format(value, ".6g")


foods = {}
with open(SRC / "food.csv") as f:
    for row in csv.DictReader(f):
        foods[row["fdc_id"]] = " ".join(row["description"].split())

macros = defaultdict(dict)
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
        if key == "kcal_alt":
            macros[row["fdc_id"]].setdefault("kcal", amount)
        else:
            macros[row["fdc_id"]][key] = amount

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
        label = (row["portion_description"] or row["modifier"] or "").strip().lower()
        if row["measure_unit_id"] in VOLUME:
            density_samples[fdc].append(per / VOLUME[row["measure_unit_id"]])
        elif label in KEEP_LABELS:
            portions[fdc].append((label, per))


def best_match(keywords):
    phrase = " ".join(keywords).lower()
    exact = [fdc for fdc, name in foods.items() if name.lower() == phrase]
    if exact:
        return exact[0]
    needles = [phrase] if len(keywords) == 1 else [k.lower() for k in keywords]
    candidates = [fdc for fdc, name in foods.items() if all(n in name.lower() for n in needles)]
    if not candidates:
        return None
    def score(fdc):
        name = foods[fdc].lower()
        return (name.startswith(needles[0]), "raw" in name, -len(name), fdc in macros)
    return max(candidates, key=score)


ingredient_rows = []
macro_rows = []
portion_rows = []
missing = []
for friendly, aisle, keywords in COMMON:
    fdc = best_match(keywords)
    if not fdc:
        missing.append(friendly)
        continue
    iid = str(uuid.uuid5(NS, f"common:{friendly}"))
    samples = density_samples.get(fdc) or []
    density = sum(samples) / len(samples) if samples else None
    if density and (density < 0.05 or density > 3):
        density = None
    ingredient_rows.append(
        f"({sql(iid)}, {sql(friendly)}, {sql(aisle)}, {num(density)}, true)"
    )
    m = macros.get(fdc, {})
    if any(k in m for k in ("kcal", "protein", "carbs", "fat")):
        macro_rows.append(
            f"({sql(iid)}, {num(m.get('kcal'))}, {num(m.get('protein'))}, {num(m.get('carbs'))}, {num(m.get('fat'))})"
        )
    else:
        missing.append(f"{friendly} (no macros)")
    seen = set()
    for label, grams in sorted(portions.get(fdc, []), key=lambda p: p[1]):
        if label in seen:
            continue
        seen.add(label)
        portion_rows.append(f"({sql(iid)}, null, {sql(label)}, {num(grams)})")


def batches(rows, insert, size=200):
    return "".join(insert + ",\n".join(rows[i : i + size]) + ";\n" for i in range(0, len(rows), size))


names = sorted({friendly for friendly, _, _ in COMMON})
delete_list = ", ".join(sql(n.lower()) for n in names)

text = f"""-- Generated by scripts/build-common-seed.py from USDA SR Legacy (public domain).
-- {len(ingredient_rows)} everyday ingredients with friendly names, shown first in search.
-- Do not edit by hand; regenerate the file.

alter table public.ingredients add column if not exists is_common boolean not null default false;
create index if not exists ingredients_common_idx on public.ingredients (is_common) where is_common;

-- A friendly name may equal a global USDA name (e.g. "Tempeh"). Remove the USDA duplicate so
-- the friendly row is the single global entry for that name.
delete from public.ingredients where household_id is null and lower(name) in ({delete_list});

{batches(ingredient_rows, "insert into public.ingredients (id, name, aisle, density_g_per_ml, is_common) values\n")}
{batches(macro_rows, "insert into public.ingredient_macros (ingredient_id, kcal, protein_g, carbs_g, fat_g) values\n")}
{batches(portion_rows, "insert into public.ingredient_portions (ingredient_id, unit_id, label, grams) values\n")}
"""
OUT.write_text(text)
print(f"common {len(ingredient_rows)} macros {len(macro_rows)} portions {len(portion_rows)}")
if missing:
    print("MISSING:", "; ".join(missing))
