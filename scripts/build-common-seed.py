#!/usr/bin/env python3
"""Build supabase/migrations/20261113160200_more_common_ingredients.sql.

A friendly list of everyday ingredients. Each friendly name is matched to the best USDA
SR Legacy row, and that row's macros (per 100 g), density, and portions are copied (a
few German staples USDA does not carry use typical label macros instead). These rows are
marked is_common = true and shown first in search; the full USDA catalog stays available
behind "Search all foods".

The base list (COMMON) already shipped in 20261113160000_common_ingredients.sql. This
script now emits only the follow-up additions (EXTRA) as a separate, idempotent migration
so the already-applied base migration is never rewritten.
"""
import csv
import sys
import uuid
from collections import defaultdict
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/usda/FoodData_Central_sr_legacy_food_csv_2018-04")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "supabase/migrations/20261113160200_more_common_ingredients.sql")
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

# Staples common in German supermarkets (English names). These ship as a follow-up
# migration (see OUT below) so the already-applied base list above is left untouched.
EXTRA = [
    # Produce
    ("Red cabbage", "Produce", ["cabbage, red, raw"]),
    ("Savoy cabbage", "Produce", ["cabbage, savoy, raw"]),
    ("Kohlrabi", "Produce", ["kohlrabi, raw"]),
    ("Brussels sprouts", "Produce", ["brussels sprouts, raw"]),
    ("Celeriac", "Produce", ["celeriac, raw"]),
    ("Fennel", "Produce", ["fennel, bulb, raw"]),
    ("Radish", "Produce", ["radishes, raw"]),
    ("Chard", "Produce", ["chard, swiss, raw"]),
    ("Rocket (arugula)", "Produce", ["arugula, raw"]),
    ("Chicory", "Produce", ["chicory greens, raw"]),
    ("Shallot", "Produce", ["shallots, raw"]),
    ("Parsnip", "Produce", ["parsnips, raw"]),
    ("Turnip", "Produce", ["turnips, raw"]),
    ("Olives", "Produce", ["olives, ripe, canned"]),
    ("Sauerkraut", "Produce", ["sauerkraut, canned"]),
    ("Gherkins", "Produce", ["pickles, cucumber, dill"]),
    ("Sun-dried tomatoes", "Produce", ["tomatoes, sun-dried"]),
    ("Capers", "Other", ["capers, canned"]),
    # Fruit
    ("Pear", "Produce", ["pears, raw"]),
    ("Plum", "Produce", ["plums, raw"]),
    ("Cherry", "Produce", ["cherries, sweet, raw"]),
    ("Peach", "Produce", ["peaches, yellow, raw"]),
    ("Nectarine", "Produce", ["nectarines, raw"]),
    ("Apricot", "Produce", ["apricots, raw"]),
    ("Kiwi", "Produce", ["kiwifruit, green, raw"]),
    ("Watermelon", "Produce", ["watermelon, raw"]),
    ("Melon", "Produce", ["melons, cantaloupe, raw"]),
    ("Raspberry", "Produce", ["raspberries, raw"]),
    ("Blackberry", "Produce", ["blackberries, raw"]),
    ("Rhubarb", "Produce", ["rhubarb, raw"]),
    ("Redcurrant", "Produce", ["currants, red and white, raw"]),
    ("Gooseberry", "Produce", ["gooseberries, raw"]),
    ("Mandarin", "Produce", ["tangerines, (mandarin oranges), raw"]),
    # Herbs and spices
    ("Dill", "Spices", ["dill weed, fresh"]),
    ("Chives", "Spices", ["chives, raw"]),
    ("Thyme", "Spices", ["thyme, fresh"]),
    ("Rosemary", "Spices", ["rosemary, fresh"]),
    ("Sage", "Spices", ["spices, sage, ground"]),
    ("Nutmeg", "Spices", ["spices, nutmeg, ground"]),
    ("Caraway", "Spices", ["spices, caraway seed"]),
    ("Cloves", "Spices", ["spices, cloves, ground"]),
    ("Cardamom", "Spices", ["spices, cardamom"]),
    ("Ground ginger", "Spices", ["spices, ginger, ground"]),
    ("Garlic powder", "Spices", ["spices, garlic powder"]),
    ("Onion powder", "Spices", ["spices, onion powder"]),
    # Meat
    ("Turkey breast", "Meat", ["turkey", "breast", "meat only", "raw"]),
    ("Frankfurter", "Meat", ["frankfurter", "beef"]),
    ("Salami", "Meat", ["salami, dry or hard, pork"]),
    ("Liver sausage", "Meat", ["liverwurst"]),
    ("Bratwurst", "Meat", ["sausage, pork and beef, fresh, cooked"]),
    ("Veal", "Meat", ["veal", "loin", "separable lean only, raw"]),
    # Seafood
    ("Herring", "Seafood", ["fish, herring, atlantic, raw"]),
    ("Mackerel", "Seafood", ["fish, mackerel, atlantic, raw"]),
    ("Trout", "Seafood", ["fish, trout, rainbow, farmed, raw"]),
    ("Pollock", "Seafood", ["fish, pollock, atlantic, raw"]),
    ("Smoked salmon", "Seafood", ["fish, salmon, chinook, smoked"]),
    # Dairy and eggs
    ("Buttermilk", "Dairy", ["buttermilk, fluid, cultured, lowfat"]),
    ("Cottage cheese", "Dairy", ["cheese, cottage, creamed, large or small curd"]),
    ("Quark", "Dairy", {"kcal": 67, "protein": 12.0, "carbs": 4.0, "fat": 0.3}),
    ("Gouda", "Dairy", ["cheese, gouda"]),
    ("Emmental", "Dairy", ["cheese, swiss"]),
    ("Edam", "Dairy", ["cheese, edam"]),
    ("Camembert", "Dairy", ["cheese, camembert"]),
    ("Brie", "Dairy", ["cheese, brie"]),
    ("Ricotta", "Dairy", ["cheese, ricotta, whole milk"]),
    ("Mascarpone", "Dairy", {"kcal": 429, "protein": 4.6, "carbs": 4.0, "fat": 44.0}),
    ("Creme fraiche", "Dairy", ["cream, fluid, light whipping"]),
    ("Condensed milk", "Dairy", ["milk, canned, condensed, sweetened"]),
    ("Kefir", "Dairy", ["kefir", "lowfat", "plain"]),
    ("Skyr", "Dairy", ["yogurt, greek, plain, nonfat"]),
    ("Oat milk", "Other", {"kcal": 46, "protein": 1.0, "carbs": 6.7, "fat": 1.5}),
    ("Soy milk", "Other", ["soymilk, original and vanilla, unfortified"]),
    # Grains, bakery and pantry
    ("Rye bread", "Bakery", ["bread, rye"]),
    ("Wholemeal bread", "Bakery", ["bread, whole-wheat, commercially prepared"]),
    ("Bread roll", "Bakery", ["rolls, hard (includes kaiser)"]),
    ("Pumpernickel", "Bakery", ["bread, pumpernickel"]),
    ("Pretzel", "Bakery", ["snacks, pretzels, hard, plain"]),
    ("Crispbread", "Bakery", ["crackers, rye, wafers, plain"]),
    ("Cornflakes", "Grains", ["cereals ready-to-eat", "corn flakes"]),
    ("Muesli", "Grains", ["cereals ready-to-eat, granola, homemade"]),
    ("Egg noodles", "Grains", ["noodles, egg, dry, unenriched"]),
    ("Semolina", "Grains", ["semolina, unenriched"]),
    ("Spelt", "Grains", ["spelt, uncooked"]),
    ("Barley", "Grains", ["barley, pearled, raw"]),
    ("Bulgur", "Grains", ["bulgur, dry"]),
    ("Cornmeal (polenta)", "Grains", ["cornmeal, whole-grain, yellow"]),
    ("Rye flour", "Baking", ["rye flour, medium"]),
    ("Wholemeal flour", "Baking", ["wheat flour, whole-grain, soft"]),
    # Legumes
    ("White beans, tinned", "Legumes", ["beans, white, mature seeds, canned"]),
    ("Split peas", "Legumes", ["peas", "split", "raw"]),
    ("Green lentils", "Legumes", ["lentils, raw"]),
    # Nuts and seeds
    ("Hazelnuts", "Nuts", ["nuts, hazelnuts or filberts"]),
    ("Pecans", "Nuts", ["nuts, pecans"]),
    ("Pistachios", "Nuts", ["nuts, pistachio nuts, raw"]),
    ("Pine nuts", "Nuts", ["nuts, pine nuts, dried"]),
    ("Peanuts", "Nuts", ["peanuts, all types, raw"]),
    ("Sunflower seeds", "Nuts", ["seeds, sunflower seed kernels, dried"]),
    ("Pumpkin seeds", "Nuts", ["seeds, pumpkin and squash seed kernels, dried"]),
    ("Chia seeds", "Nuts", ["seeds, chia seeds, dried"]),
    ("Flaxseed", "Nuts", ["seeds, flaxseed"]),
    # Oils and condiments
    ("Rapeseed oil", "Oils", ["oil, canola"]),
    ("Horseradish", "Other", ["horseradish, prepared"]),
    ("Jam", "Other", ["jams and preserves"]),
    ("Pesto", "Other", ["sauce, pesto"]),
    ("Vegetable stock", "Other", {"kcal": 4, "protein": 0.3, "carbs": 0.6, "fat": 0.1}),
    # Baking
    ("Yeast", "Baking", ["leavening agents, yeast, baker", "active dry"]),
    ("Gelatine", "Baking", ["gelatins, dry powder, unsweetened"]),
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
for friendly, aisle, spec in EXTRA:
    iid = str(uuid.uuid5(NS, f"common:{friendly}"))
    # A dict spec carries label macros for a German staple with no USDA SR Legacy row
    # (Quark, Mascarpone, oat milk, vegetable stock). No density or portions.
    if isinstance(spec, dict):
        ingredient_rows.append(f"({sql(iid)}, {sql(friendly)}, {sql(aisle)}, null, true)")
        macro_rows.append(
            f"({sql(iid)}, {num(spec.get('kcal'))}, {num(spec.get('protein'))}, {num(spec.get('carbs'))}, {num(spec.get('fat'))})"
        )
        continue
    keywords = spec
    fdc = best_match(keywords)
    if not fdc:
        missing.append(friendly)
        continue
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
        # Deterministic id so re-running the migration can't duplicate the portion.
        pid = str(uuid.uuid5(NS, f"portion:{friendly}:{label}"))
        portion_rows.append(f"({sql(pid)}, {sql(iid)}, null, {sql(label)}, {num(grams)})")


def batches(rows, insert, suffix, size=200):
    return "".join(insert + ",\n".join(rows[i : i + size]) + suffix for i in range(0, len(rows), size))


names = sorted({friendly for friendly, _, _ in EXTRA})
delete_list = ", ".join(sql(n.lower()) for n in names)

text = f"""-- Generated by scripts/build-common-seed.py from USDA SR Legacy (public domain).
-- {len(ingredient_rows)} more everyday ingredients (German-supermarket staples) with
-- friendly names, shown first in search. Follow-up to 20261113160000_common_ingredients.sql.
-- Idempotent: safe to apply on top of the base list or on a fresh database.
-- Do not edit by hand; regenerate the file.

alter table public.ingredients add column if not exists is_common boolean not null default false;
create index if not exists ingredients_common_idx on public.ingredients (is_common) where is_common;

-- A friendly name may equal a global USDA name. Remove the USDA duplicate so the friendly
-- row is the single global entry for that name.
delete from public.ingredients where household_id is null and lower(name) in ({delete_list});

{batches(ingredient_rows, "insert into public.ingredients (id, name, aisle, density_g_per_ml, is_common) values\n", "\non conflict (id) do nothing;\n")}
{batches(macro_rows, "insert into public.ingredient_macros (ingredient_id, kcal, protein_g, carbs_g, fat_g) values\n", "\non conflict (ingredient_id) do nothing;\n")}
{batches(portion_rows, "insert into public.ingredient_portions (id, ingredient_id, unit_id, label, grams) values\n", "\non conflict (id) do nothing;\n")}
"""
OUT.write_text(text)
print(f"common {len(ingredient_rows)} macros {len(macro_rows)} portions {len(portion_rows)}")
if missing:
    print("MISSING:", "; ".join(missing))
