// RepWise food database + pure macro math.
// Ingredients are stored per 100 g (raw/as-purchased unless the name says cooked).
// Values: USDA FoodData Central (SR Legacy / Foundation) typical values. Filipino items marked
// "USDA (PhilFCT pending)" use the closest USDA equivalent until FNRI PhilFCT values are verified.
// Dish recipes are typical home-portion estimates (grams per serving) and are marked as estimates.
(function (root) {
  'use strict';
  const U = 'USDA FDC', P = 'USDA (PhilFCT pending)', E = 'Estimate (label/typical)';
  // [id, name, aliases, group, kcal, protein, carbs, fat, satFat, fiber, src, gramsPerPiece, pieceLabel]
  const ROWS = [
    // ---------- Meat & fish ----------
    ['pork_belly', 'Pork belly', 'liempo baboy pork', 'meat', 518, 9.3, 0, 53, 19.3, 0, U],
    ['pork_lean', 'Pork, lean (kasim/shoulder)', 'kasim baboy pork lean', 'meat', 148, 19.3, 0, 7.5, 2.6, 0, U],
    ['pork_loin', 'Pork chop / loin', 'pork chop loin baboy', 'meat', 172, 20.5, 0, 9.6, 3.4, 0, U, 150, 'chop'],
    ['pork_ground', 'Ground pork', 'giniling baboy pork', 'meat', 263, 16.9, 0, 21.2, 7.9, 0, U],
    ['pork_hock', 'Pork hock (pata)', 'pata baboy pork knuckle', 'meat', 247, 18.2, 0, 19, 6.8, 0, U],
    ['pork_liver', 'Pork liver', 'atay baboy', 'meat', 134, 21.4, 2.5, 3.7, 1.2, 0, U],
    ['pork_blood', 'Pork blood', 'dugo dinuguan', 'meat', 79, 17, 0.1, 0.1, 0, 0, E],
    ['chicken_thigh_skin', 'Chicken thigh, skin on', 'manok hita chicken', 'meat', 221, 15.5, 0, 17.1, 4.8, 0, U, 130, 'thigh'],
    ['chicken_thigh', 'Chicken thigh, skinless', 'manok hita chicken', 'meat', 121, 19.7, 0, 4.1, 1, 0, U, 110, 'thigh'],
    ['chicken_breast', 'Chicken breast, skinless', 'manok pecho dibdib chicken', 'meat', 120, 22.5, 0, 2.6, 0.6, 0, U, 170, 'breast'],
    ['chicken_wing', 'Chicken wing, skin on', 'manok pakpak chicken', 'meat', 191, 17.5, 0, 12.8, 3.6, 0, U, 45, 'wing'],
    ['chicken_liver', 'Chicken liver', 'atay manok', 'meat', 119, 16.9, 0.7, 4.8, 1.6, 0, U],
    ['beef_lean', 'Beef, lean (sirloin)', 'baka beef sirloin', 'meat', 150, 21.5, 0, 6.5, 2.6, 0, U],
    ['beef_chuck', 'Beef chuck / brisket', 'baka beef chuck brisket punta', 'meat', 250, 18, 0, 19.5, 7.6, 0, U],
    ['beef_shank', 'Beef shank (bulalo)', 'baka beef shank kenchi bulalo', 'meat', 201, 19.2, 0, 13.4, 5.4, 0, U],
    ['beef_ground', 'Ground beef', 'giniling baka beef', 'meat', 254, 17.2, 0, 20, 7.6, 0, U],
    ['oxtail', 'Oxtail', 'buntot baka oxtail', 'meat', 262, 19.6, 0, 20.4, 8.4, 0, U],
    ['bone_marrow', 'Bone marrow', 'utak buto bulalo', 'meat', 786, 6.7, 0, 84.4, 37, 0, U],
    ['goat', 'Goat (kambing)', 'kambing goat chevon', 'meat', 109, 20.6, 0, 2.3, 0.7, 0, U],
    ['tapa', 'Beef tapa (cured)', 'tapa baka tapsilog', 'meat', 255, 27, 7, 13, 5, 0, E],
    ['tocino', 'Pork tocino', 'tocino baboy tocilog', 'meat', 300, 16, 22, 17, 6, 0, E],
    ['longganisa', 'Longganisa', 'longganisa sausage longsilog', 'meat', 330, 15, 10, 26, 9.5, 0, E, 50, 'pc'],
    ['hotdog', 'Hotdog', 'hotdog sausage hatdog', 'meat', 290, 11, 4, 26, 9.5, 0, U, 45, 'pc'],
    ['corned_beef', 'Corned beef (canned)', 'corned beef cornsilog', 'meat', 250, 27, 0, 15, 6.2, 0, U],
    ['luncheon_meat', 'Luncheon meat', 'spam luncheon meat', 'meat', 315, 13, 3, 27, 10, 0, U, 50, 'slice'],
    ['chicharon', 'Chicharon', 'chicharon chicharron pork rind', 'meat', 544, 61, 0, 31, 11, 0, U],
    ['bangus', 'Milkfish (bangus)', 'bangus milkfish isda fish', 'meat', 148, 20.5, 0, 6.7, 1.6, 0, P],
    ['galunggong', 'Round scad (galunggong)', 'galunggong gg isda fish', 'meat', 120, 20, 0, 4, 1.2, 0, P, 75, 'fish'],
    ['tilapia', 'Tilapia', 'tilapia isda fish', 'meat', 96, 20.1, 0, 1.7, 0.6, 0, U],
    ['tuyo', 'Dried herring (tuyo)', 'tuyo dried fish daing', 'meat', 300, 60, 0, 5, 1.5, 0, P, 15, 'pc'],
    ['shrimp', 'Shrimp (hipon)', 'hipon shrimp prawn sugpo', 'meat', 85, 20.1, 0, 0.5, 0.1, 0, U],
    ['squid', 'Squid (pusit)', 'pusit squid calamares', 'meat', 92, 15.6, 3.1, 1.4, 0.4, 0, U],
    ['tuna_can', 'Tuna in water (canned)', 'tuna canned', 'meat', 116, 25.5, 0, 0.8, 0.2, 0, U],
    ['sardines', 'Sardines in tomato sauce', 'sardinas sardines', 'meat', 180, 17, 1.5, 11, 3, 0, U],
    ['egg', 'Egg', 'itlog egg', 'meat', 143, 12.6, 0.7, 9.5, 3.1, 0, U, 50, 'egg'],
    ['tofu', 'Tofu, firm (tokwa)', 'tokwa tofu', 'meat', 144, 17.3, 2.8, 8.7, 1.3, 2.3, U],
    ['tofu_silken', 'Tofu, silken (taho)', 'taho tofu silken', 'meat', 55, 4.8, 2, 2.7, 0.4, 0.1, U],
    // ---------- Vegetables ----------
    ['kangkong', 'Water spinach (kangkong)', 'kangkong water spinach', 'veg', 19, 2.6, 3.1, 0.2, 0, 2.1, P],
    ['sitaw', 'String beans (sitaw)', 'sitaw yardlong beans', 'veg', 47, 2.8, 8.4, 0.4, 0.1, 3, P],
    ['talong', 'Eggplant (talong)', 'talong eggplant', 'veg', 25, 1, 5.9, 0.2, 0, 3, U, 120, 'pc'],
    ['ampalaya', 'Bitter gourd (ampalaya)', 'ampalaya bitter melon', 'veg', 17, 1, 3.7, 0.2, 0, 2.8, U],
    ['kalabasa', 'Squash (kalabasa)', 'kalabasa squash pumpkin', 'veg', 26, 1, 6.5, 0.1, 0.1, 0.5, U],
    ['malunggay', 'Moringa leaves (malunggay)', 'malunggay moringa', 'veg', 64, 9.4, 8.3, 1.4, 0.2, 2, U],
    ['pechay', 'Bok choy (pechay)', 'pechay bok choy petsay', 'veg', 13, 1.5, 2.2, 0.2, 0, 1, U],
    ['okra', 'Okra', 'okra', 'veg', 33, 1.9, 7.5, 0.2, 0, 3.2, U],
    ['sayote', 'Chayote (sayote)', 'sayote chayote', 'veg', 19, 0.8, 4.5, 0.1, 0, 1.7, U],
    ['papaya_green', 'Green papaya', 'papaya hilaw green papaya', 'veg', 39, 0.6, 9.8, 0.1, 0, 1.8, U],
    ['taro_leaves', 'Taro leaves (dahon ng gabi)', 'gabi leaves laing', 'veg', 42, 2.7, 7, 0.4, 0.1, 3.8, U],
    ['gabi', 'Taro (gabi)', 'gabi taro', 'carb', 112, 1.5, 26.5, 0.2, 0, 4.1, U],
    ['cabbage', 'Cabbage (repolyo)', 'repolyo cabbage', 'veg', 25, 1.3, 5.8, 0.1, 0, 2.5, U],
    ['carrot', 'Carrot', 'karot carrot', 'veg', 41, 0.9, 9.6, 0.2, 0, 2.8, U, 60, 'pc'],
    ['onion', 'Onion (sibuyas)', 'sibuyas onion', 'veg', 40, 1.1, 9.3, 0.1, 0, 1.7, U],
    ['garlic', 'Garlic (bawang)', 'bawang garlic', 'veg', 149, 6.4, 33, 0.5, 0.1, 2.1, U],
    ['ginger', 'Ginger (luya)', 'luya ginger', 'veg', 80, 1.8, 18, 0.8, 0.2, 2, U],
    ['tomato', 'Tomato (kamatis)', 'kamatis tomato', 'veg', 18, 0.9, 3.9, 0.2, 0, 1.2, U, 90, 'pc'],
    ['bell_pepper', 'Bell pepper', 'bell pepper siling pula', 'veg', 31, 1, 6, 0.3, 0, 2.1, U],
    ['green_beans', 'Green beans (Baguio beans)', 'baguio beans green beans', 'veg', 31, 1.8, 7, 0.2, 0, 2.7, U],
    ['togue', 'Mung bean sprouts (togue)', 'togue bean sprouts', 'veg', 30, 3, 5.9, 0.2, 0, 1.8, U],
    ['peas', 'Green peas / snow peas', 'gisantes peas chicharo', 'veg', 81, 5.4, 14.5, 0.4, 0.1, 5.1, U],
    ['cauliflower', 'Cauliflower', 'cauliflower', 'veg', 25, 1.9, 5, 0.3, 0.1, 2, U],
    ['broccoli', 'Broccoli', 'broccoli', 'veg', 34, 2.8, 6.6, 0.4, 0, 2.6, U],
    ['lettuce', 'Lettuce', 'lettuce salad', 'veg', 15, 1.4, 2.9, 0.2, 0, 1.3, U],
    ['cucumber', 'Cucumber (pipino)', 'pipino cucumber', 'veg', 15, 0.7, 3.6, 0.1, 0, 0.5, U],
    ['banana_blossom', 'Banana blossom (puso ng saging)', 'puso ng saging banana heart', 'veg', 51, 1.6, 9.9, 0.6, 0, 5.7, U],
    ['corn', 'Corn (mais)', 'mais corn', 'carb', 86, 3.3, 19, 1.4, 0.2, 2.7, U, 150, 'cob'],
    ['monggo_dry', 'Mung beans, dry (monggo)', 'monggo munggo mung beans', 'carb', 347, 23.9, 62.6, 1.2, 0.3, 16.3, U],
    // ---------- Fruit ----------
    ['banana', 'Banana (lakatan/latundan)', 'saging banana lakatan latundan', 'fruit', 89, 1.1, 22.8, 0.3, 0.1, 2.6, U, 118, 'pc'],
    ['saba', 'Saba banana', 'saba saging plantain', 'fruit', 122, 1.3, 31.9, 0.4, 0.1, 2.3, P, 100, 'pc'],
    ['mango', 'Mango, ripe', 'mangga mango', 'fruit', 60, 0.8, 15, 0.4, 0.1, 1.6, U, 200, 'pc'],
    ['papaya', 'Papaya, ripe', 'papaya', 'fruit', 43, 0.5, 10.8, 0.3, 0.1, 1.7, U],
    ['guava', 'Guava (bayabas)', 'bayabas guava', 'fruit', 68, 2.6, 14.3, 1, 0.3, 5.4, U, 55, 'pc'],
    ['pineapple', 'Pineapple (pinya)', 'pinya pineapple', 'fruit', 50, 0.5, 13.1, 0.1, 0, 1.4, U],
    ['apple', 'Apple', 'mansanas apple', 'fruit', 52, 0.3, 13.8, 0.2, 0, 2.4, U, 182, 'pc'],
    ['orange', 'Orange (dalandan)', 'dalandan orange', 'fruit', 47, 0.9, 11.8, 0.1, 0, 2.4, U, 130, 'pc'],
    ['watermelon', 'Watermelon (pakwan)', 'pakwan watermelon', 'fruit', 30, 0.6, 7.6, 0.2, 0, 0.4, U],
    ['avocado', 'Avocado', 'abukado avocado', 'fruit', 160, 2, 8.5, 14.7, 2.1, 6.7, U, 200, 'pc'],
    ['coconut_meat', 'Coconut meat (buko)', 'buko niyog coconut', 'fruit', 354, 3.3, 15.2, 33.5, 29.7, 9, U],
    ['buko_juice', 'Coconut water (buko juice)', 'buko juice coconut water', 'other', 19, 0.7, 3.7, 0.2, 0.2, 1.1, U],
    ['jackfruit', 'Jackfruit, ripe (langka)', 'langka jackfruit', 'fruit', 95, 1.7, 23.2, 0.6, 0.2, 1.5, U],
    // ---------- Rice & carbs (cooked unless noted) ----------
    ['rice_white', 'White rice, cooked', 'kanin rice white', 'carb', 130, 2.7, 28.2, 0.3, 0.1, 0.4, U],
    ['rice_brown', 'Brown rice, cooked', 'brown rice kanin', 'carb', 123, 2.7, 25.6, 1, 0.2, 1.6, U],
    ['rice_glutinous', 'Glutinous rice, cooked (malagkit)', 'malagkit sticky rice', 'carb', 97, 2, 21.1, 0.2, 0, 1, U],
    ['bihon', 'Rice noodles (bihon), cooked', 'bihon rice noodles', 'carb', 108, 1.8, 24, 0.2, 0, 1, U],
    ['canton', 'Egg noodles (canton), cooked', 'canton egg noodles miki', 'carb', 138, 4.5, 25.2, 2.1, 0.4, 1.2, U],
    ['spaghetti', 'Spaghetti, cooked', 'spaghetti pasta', 'carb', 158, 5.8, 30.9, 0.9, 0.2, 1.8, U],
    ['macaroni', 'Macaroni, cooked', 'macaroni sopas pasta', 'carb', 158, 5.8, 30.9, 0.9, 0.2, 1.8, U],
    ['pandesal', 'Pandesal', 'pandesal bread', 'carb', 290, 9, 52, 5, 1.5, 2, E, 30, 'pc'],
    ['bread_white', 'White bread', 'tinapay bread loaf', 'carb', 265, 9, 49, 3.2, 0.7, 2.7, U, 28, 'slice'],
    ['bread_wheat', 'Whole wheat bread', 'wheat bread tinapay', 'carb', 250, 12.5, 43, 3.5, 0.8, 6, U, 28, 'slice'],
    ['oats_rolled', 'Rolled oats, dry', 'oats oatmeal rolled', 'carb', 379, 13.2, 67.7, 6.5, 1.1, 10.1, U],
    ['oats_steel', 'Steel-cut oats, dry', 'oats steel cut oatmeal', 'carb', 379, 13.2, 67.7, 6.5, 1.1, 10.1, U],
    ['potato', 'Potato (patatas)', 'patatas potato', 'carb', 77, 2, 17.5, 0.1, 0, 2.2, U, 170, 'pc'],
    ['kamote', 'Sweet potato (kamote)', 'kamote sweet potato', 'carb', 86, 1.6, 20.1, 0.1, 0, 3, U, 130, 'pc'],
    ['flour', 'Flour', 'harina flour', 'carb', 364, 10.3, 76.3, 1, 0.2, 2.7, U],
    ['breadcrumbs', 'Breadcrumbs', 'breadcrumbs', 'carb', 395, 13.4, 71.9, 5.3, 1.2, 4.5, U],
    ['cornstarch', 'Cornstarch', 'gawgaw cornstarch', 'carb', 381, 0.3, 91.3, 0.1, 0, 0.9, U],
    ['wrapper', 'Lumpia / siomai wrapper', 'lumpia wrapper', 'carb', 290, 8, 60, 1.5, 0.3, 1.8, E],
    ['sago', 'Sago pearls, cooked', 'sago tapioca pearls', 'carb', 135, 0.1, 33, 0, 0, 0.3, E],
    // ---------- Oils & sauces ----------
    ['oil_veg', 'Vegetable / canola oil', 'mantika oil canola vegetable', 'oil', 884, 0, 0, 100, 7.4, 0, U],
    ['oil_olive', 'Olive oil', 'olive oil', 'oil', 884, 0, 0, 100, 13.8, 0, U],
    ['oil_evoo', 'Extra virgin olive oil', 'evoo extra virgin olive oil', 'oil', 884, 0, 0, 100, 13.8, 0, U],
    ['oil_coconut', 'Coconut oil', 'coconut oil langis niyog', 'oil', 884, 0, 0, 100, 82.5, 0, U],
    ['butter', 'Butter', 'mantikilya butter', 'oil', 717, 0.9, 0.1, 81.1, 51.4, 0, U],
    ['coconut_milk', 'Coconut milk (gata)', 'gata coconut milk cream', 'oil', 230, 2.3, 5.5, 23.8, 21.1, 2.2, U],
    ['soy_sauce', 'Soy sauce (toyo)', 'toyo soy sauce', 'oil', 53, 8.1, 4.9, 0.6, 0.1, 0.8, U],
    ['vinegar', 'Vinegar (suka)', 'suka vinegar', 'oil', 18, 0, 0.1, 0, 0, 0, U],
    ['patis', 'Fish sauce (patis)', 'patis fish sauce', 'oil', 35, 5.1, 3.6, 0, 0, 0, U],
    ['bagoong', 'Shrimp paste (bagoong)', 'bagoong alamang shrimp paste', 'oil', 120, 15, 5, 4, 1, 0, E],
    ['oyster_sauce', 'Oyster sauce', 'oyster sauce', 'oil', 51, 1.4, 10.9, 0.3, 0, 0.3, U],
    ['tomato_sauce', 'Tomato sauce', 'tomato sauce', 'oil', 24, 1.2, 5.3, 0.2, 0, 1.5, U],
    ['banana_ketchup', 'Banana ketchup', 'banana ketchup catsup', 'oil', 110, 0.2, 27, 0.1, 0, 0.5, E],
    ['tamarind_mix', 'Sinigang mix (sampalok)', 'sampalok tamarind sinigang mix', 'oil', 340, 5, 70, 3, 1, 2, E],
    ['peanut_butter', 'Peanut butter', 'peanut butter mani', 'oil', 588, 25, 20, 50, 10.1, 6, U],
    ['mayonnaise', 'Mayonnaise', 'mayo mayonnaise', 'oil', 680, 1, 0.6, 75, 11.7, 0, U],
    ['sugar', 'Sugar', 'asukal sugar', 'other', 387, 0, 100, 0, 0, 0, U],
    ['cocoa_tablea', 'Cocoa tablea', 'tablea cocoa tsokolate', 'other', 501, 12, 30, 40, 24, 15, E],
    // ---------- Other ----------
    ['milk', 'Milk, whole', 'gatas milk', 'other', 61, 3.2, 4.8, 3.3, 1.9, 0, U],
    ['evap_milk', 'Evaporated milk', 'evap evaporated milk', 'other', 134, 6.8, 10, 7.6, 4.6, 0, U],
    ['condensed_milk', 'Condensed milk', 'condensada condensed milk', 'other', 321, 7.9, 54.4, 8.7, 5.5, 0, U],
    ['cheese', 'Cheese', 'keso cheese', 'other', 371, 18, 7, 31, 19, 0, U],
    ['greek_yogurt', 'Greek yogurt, plain', 'yogurt greek', 'other', 59, 10.2, 3.6, 0.4, 0.1, 0, U],
    ['whey', 'Whey protein', 'whey protein powder', 'other', 400, 80, 8, 6, 3, 0, E, 30, 'scoop'],
    ['peanuts', 'Peanuts (mani)', 'mani peanuts', 'other', 567, 25.8, 16.1, 49.2, 6.8, 8.5, U],
    ['almonds', 'Almonds', 'almonds nuts', 'other', 579, 21.2, 21.6, 49.9, 3.8, 12.5, U],
    ['chia', 'Chia seeds', 'chia seeds', 'other', 486, 16.5, 42.1, 30.7, 3.3, 34.4, U],
    ['garlic_rice', 'Garlic rice (sinangag), cooked', 'sinangag garlic fried rice kanin', 'carb', 180, 3.1, 30, 5, 0.8, 0.6, E, 160, 'cup'],
    ['coffee_3in1', 'Coffee 3-in-1 (sachet)', 'kape 3in1 instant coffee nescafe', 'other', 450, 5, 70, 16, 14, 0, E, 20, 'sachet'],
    ['green_tea_sweet', 'Green tea, sweetened (bottled)', 'green tea sweetened bottled c2', 'other', 30, 0, 7.5, 0, 0, 0, E, 500, 'bottle'],
    ['coffee', 'Coffee, black', 'kape coffee black', 'other', 1, 0.1, 0, 0, 0, 0, U, 240, 'cup'],
    ['green_tea', 'Green tea, unsweetened', 'green tea tsaa unsweetened', 'other', 1, 0.2, 0, 0, 0, 0, U, 240, 'cup'],
    ['softdrink', 'Soft drink (cola)', 'softdrinks soda coke cola', 'other', 42, 0, 10.6, 0, 0, 0, U],
    // ---------- more (v2) ----------
    ['tuna_fresh', 'Tuna, fresh (tanigue/tuna)', 'tuna tanigue kinilaw isda fresh', 'meat', 109, 24.4, 0, 0.5, 0.1, 0, U],
    ['chicken_intestine', 'Chicken intestine (isaw)', 'isaw bituka manok', 'meat', 180, 16, 0, 12, 4, 0, E],
    ['pork_ribs', 'Pork ribs (tadyang)', 'tadyang baboy pork ribs spareribs', 'meat', 277, 15.5, 0, 23.4, 7.6, 0, U],
    ['fishball', 'Fishball', 'fishball fish ball street food', 'meat', 160, 8, 20, 5, 1.5, 0.5, E, 8, 'pc'],
    ['quail_egg', 'Quail egg (pugo)', 'itlog pugo quail egg', 'meat', 158, 13, 0.4, 11, 3.6, 0, U, 9, 'egg'],
    ['egg_yolk', 'Egg yolk', 'pula ng itlog yolk', 'meat', 322, 15.9, 3.6, 26.5, 9.6, 0, U, 17, 'yolk'],
    ['egg_white', 'Egg white', 'puti ng itlog egg white', 'meat', 52, 10.9, 0.7, 0.2, 0, 0, U, 33, 'white'],
    ['ube', 'Purple yam (ube)', 'ube purple yam', 'carb', 118, 1.5, 27.9, 0.2, 0, 4.1, U],
    ['rice_flour', 'Rice flour (galapong)', 'galapong rice flour', 'carb', 366, 6, 80, 1.4, 0.4, 2.4, U],
    ['instant_noodles', 'Instant noodles (1 pack)', 'instant pancit canton lucky me noodles', 'carb', 470, 9, 63, 20, 9, 2.4, E, 80, 'pack'],
    ['burger_bun', 'Burger bun', 'bun tinapay burger', 'carb', 279, 9.5, 50, 4.3, 1, 2.2, U, 50, 'bun'],
    ['french_fries', 'French fries (cooked)', 'fries french fries', 'carb', 312, 3.4, 41, 15, 2.3, 3.8, U],
    ['pizza', 'Pizza (cheese/pepperoni)', 'pizza', 'carb', 266, 11, 33, 10, 4.5, 2.3, U, 107, 'slice'],
    ['ensaymada', 'Ensaymada', 'ensaymada bread', 'carb', 380, 7, 48, 18, 9, 1, E, 75, 'pc'],
    ['spanish_bread', 'Spanish bread', 'spanish bread tinapay', 'carb', 350, 7, 55, 11, 4, 1.5, E, 50, 'pc'],
    ['cheese_roll', 'Cheese roll', 'cheese roll bread', 'carb', 360, 9, 50, 14, 6, 1.5, E, 55, 'pc'],
    ['hopia', 'Hopia (monggo/ube)', 'hopia', 'carb', 380, 6, 60, 13, 5, 2, E, 45, 'pc'],
    ['cereal', 'Breakfast cereal (corn flakes)', 'cereal corn flakes', 'carb', 357, 7.5, 84, 0.4, 0.1, 3.3, U],
    ['quinoa', 'Quinoa, cooked', 'quinoa', 'carb', 120, 4.4, 21.3, 1.9, 0.2, 2.8, U],
    ['dark_chocolate', 'Dark chocolate 70–85%', 'dark chocolate tsokolate cocoa', 'other', 598, 7.8, 45.9, 42.6, 24.5, 10.9, U, 10, 'square'],
    ['stevia', 'Stevia (sweetener)', 'stevia sweetener sugar free', 'other', 0, 0, 0, 0, 0, 0, U, 1, 'packet'],
    ['honey', 'Honey', 'pulot honey', 'other', 304, 0.3, 82.4, 0, 0, 0.2, U],
    ['ice_cream', 'Ice cream', 'sorbetes ice cream', 'other', 207, 3.5, 23.6, 11, 6.8, 0.7, U],
    ['cottage_cheese', 'Cottage cheese', 'cottage cheese', 'other', 98, 11.1, 3.4, 4.3, 1.7, 0, U],
    ['kiwi', 'Kiwi', 'kiwi', 'fruit', 61, 1.1, 14.7, 0.5, 0, 3, U, 75, 'pc'],
    ['grapes', 'Grapes (ubas)', 'ubas grapes', 'fruit', 69, 0.7, 18.1, 0.2, 0.1, 0.9, U],
    ['strawberries', 'Strawberries', 'strawberry', 'fruit', 32, 0.7, 7.7, 0.3, 0, 2, U],
    ['lanzones', 'Lanzones', 'lanzones', 'fruit', 57, 0.8, 14.6, 0.2, 0, 1.1, P],
    ['rambutan', 'Rambutan', 'rambutan', 'fruit', 82, 0.7, 20.9, 0.2, 0, 0.9, U],
    ['spinach', 'Spinach', 'spinach alugbati', 'veg', 23, 2.9, 3.6, 0.4, 0.1, 2.2, U],
    ['mushroom', 'Mushroom', 'kabute mushroom', 'veg', 22, 3.1, 3.3, 0.3, 0, 1, U],
  ];
  const ING = {};
  for (const r of ROWS) {
    const [id, name, alt, group, kcal, p, c, f, sat, fib, src, pcG, pcL] = r;
    ING[id] = { id, name, alt, group, per100: { kcal, p, c, f, sat, fib }, src, pc: pcG ? { g: pcG, label: pcL } : null };
  }

  // ---------- Dishes: base recipe + variants (grams per serving, raw). Estimates. ----------
  // method: raw (boiled/steamed) | grill | air | pan | deep ; oil: default amount key for that method
  const D = (id, name, alt, serving, base, variants, method, oil) => ({ id, name, alt, serving, base, variants, method, oil: oil || null });
  const V = (id, name, alt, add, cuts) => ({ id, name, alt: alt || '', add, cuts: cuts || null });
  const SILOG = [['rice_white', 158], ['garlic', 6], ['egg', 50]];
  const DISHES = [
    D('adobo', 'Adobo', 'adobong', '1 cup', [['soy_sauce', 15], ['vinegar', 15], ['garlic', 6], ['sugar', 2]], [
      V('pork', 'Pork', 'baboy', [['pork_belly', 100]], { 'Belly (liempo)': 'pork_belly', 'Lean (kasim)': 'pork_lean' }),
      V('chicken', 'Chicken', 'manok', [['chicken_thigh_skin', 130]], { 'Thigh, skin on': 'chicken_thigh_skin', 'Thigh, skinless': 'chicken_thigh', 'Breast': 'chicken_breast' }),
      V('beef', 'Beef', 'baka', [['beef_chuck', 110]]),
      V('porkchicken', 'Pork & Chicken', 'baboy manok', [['pork_belly', 65], ['chicken_thigh_skin', 70]]),
      V('kangkong', 'Kangkong', 'gulay vegetable', [['kangkong', 150]]),
      V('pusit', 'Squid', 'pusit', [['squid', 140]])], 'pan', 'tsp'),
    D('sinigang', 'Sinigang', 'sinigang na', '1 bowl', [['tamarind_mix', 8], ['tomato', 40], ['onion', 20], ['kangkong', 40], ['sitaw', 30], ['talong', 30], ['okra', 20], ['patis', 5]], [
      V('pork', 'Pork', 'baboy', [['pork_belly', 70]], { 'Belly (liempo)': 'pork_belly', 'Lean (kasim)': 'pork_lean' }),
      V('shrimp', 'Shrimp', 'hipon', [['shrimp', 120]]),
      V('fish', 'Fish (bangus)', 'isda bangus', [['bangus', 140]]),
      V('beef', 'Beef', 'baka', [['beef_shank', 130]])], 'raw'),
    D('bicol', 'Bicol Express', 'bicol express', '1 cup', [['coconut_milk', 80], ['onion', 20], ['garlic', 5], ['bagoong', 10]], [
      V('pork', 'Pork', 'baboy', [['pork_belly', 90]], { 'Belly (liempo)': 'pork_belly', 'Lean (kasim)': 'pork_lean' }),
      V('chicken', 'Chicken', 'manok', [['chicken_thigh', 120]]),
      V('veg', 'Vegetable', 'gulay sitaw kalabasa', [['sitaw', 80], ['kalabasa', 80]])], 'pan', 'tsp'),
    D('karekare', 'Kare-kare', 'kare kare', '1 cup', [['peanut_butter', 30], ['sitaw', 40], ['talong', 40], ['pechay', 40], ['flour', 5], ['bagoong', 15]], [
      V('oxtail', 'Oxtail', 'buntot', [['oxtail', 150]]),
      V('beef', 'Beef', 'baka', [['beef_chuck', 130]]),
      V('pata', 'Pork (pata)', 'baboy pata', [['pork_hock', 150]]),
      V('seafood', 'Seafood', 'hipon pusit', [['shrimp', 70], ['squid', 60]])], 'pan', 'tsp'),
    D('tinola', 'Tinola', 'tinolang', '1 bowl', [['ginger', 8], ['onion', 20], ['sayote', 80], ['malunggay', 15], ['patis', 8]], [
      V('chicken', 'Chicken', 'manok', [['chicken_thigh_skin', 150]], { 'Thigh, skin on': 'chicken_thigh_skin', 'Thigh, skinless': 'chicken_thigh', 'Breast': 'chicken_breast' }),
      V('papaya', 'Chicken, with papaya', 'manok papaya', [['chicken_thigh_skin', 150], ['papaya_green', 60]]),
      V('fish', 'Fish', 'isda tilapia', [['tilapia', 150]])], 'pan', 'tsp'),
    D('sisig', 'Sisig', 'sisig', '1 cup', [['onion', 30], ['mayonnaise', 10], ['soy_sauce', 5], ['egg', 25]], [
      V('pork', 'Pork', 'baboy', [['pork_belly', 80], ['pork_liver', 20]]),
      V('chicken', 'Chicken', 'manok', [['chicken_thigh', 110]]),
      V('bangus', 'Bangus', 'isda', [['bangus', 110]]),
      V('tuna', 'Tuna', '', [['tuna_can', 100]]),
      V('tofu', 'Tofu', 'tokwa', [['tofu', 150]])], 'pan', 'tbsp'),
    D('menudo', 'Menudo', 'menudo', '1 cup', [['tomato_sauce', 60], ['potato', 60], ['carrot', 30], ['pork_liver', 20], ['bell_pepper', 15]], [
      V('pork', 'Pork', 'baboy', [['pork_lean', 110]]),
      V('chicken', 'Chicken', 'manok', [['chicken_thigh', 110]])], 'pan', 'tsp'),
    D('caldereta', 'Caldereta', 'kaldereta', '1 cup', [['tomato_sauce', 60], ['potato', 60], ['carrot', 30], ['bell_pepper', 15], ['pork_liver', 15], ['cheese', 10]], [
      V('beef', 'Beef', 'baka', [['beef_chuck', 130]]),
      V('goat', 'Goat', 'kambing', [['goat', 130]]),
      V('chicken', 'Chicken', 'manok', [['chicken_thigh', 130]]),
      V('pork', 'Pork', 'baboy', [['pork_lean', 130]])], 'pan', 'tsp'),
    D('afritada', 'Afritada', 'apritada', '1 cup', [['tomato_sauce', 60], ['potato', 60], ['carrot', 30], ['bell_pepper', 20]], [
      V('chicken', 'Chicken', 'manok', [['chicken_thigh_skin', 140]], { 'Thigh, skin on': 'chicken_thigh_skin', 'Thigh, skinless': 'chicken_thigh', 'Breast': 'chicken_breast' }),
      V('pork', 'Pork', 'baboy', [['pork_lean', 120]])], 'pan', 'tsp'),
    D('mechado', 'Mechado', 'mechado', '1 cup', [['beef_chuck', 130], ['tomato_sauce', 50], ['potato', 60], ['soy_sauce', 10], ['onion', 15]], [V('beef', 'Beef', 'baka', [])], 'pan', 'tsp'),
    D('bistek', 'Bistek Tagalog', 'bistek beef steak', '1 cup', [['soy_sauce', 15], ['onion', 40]], [
      V('beef', 'Beef', 'baka', [['beef_lean', 120]]), V('pork', 'Pork', 'baboy', [['pork_lean', 120]])], 'pan', 'tbsp'),
    D('giniling', 'Giniling', 'giniling picadillo', '1 cup', [['potato', 40], ['carrot', 25], ['peas', 20], ['tomato_sauce', 30], ['onion', 15]], [
      V('pork', 'Pork', 'baboy', [['pork_ground', 100]]), V('beef', 'Beef', 'baka', [['beef_ground', 100]]), V('chicken', 'Chicken', 'manok', [['chicken_thigh', 100]])], 'pan', 'tsp'),
    D('curry', 'Chicken curry', 'kari curry', '1 cup', [['potato', 60], ['carrot', 30], ['coconut_milk', 60], ['onion', 15]], [
      V('chicken', 'Chicken', 'manok', [['chicken_thigh', 130]], { 'Thigh, skinless': 'chicken_thigh', 'Thigh, skin on': 'chicken_thigh_skin', 'Breast': 'chicken_breast' })], 'pan', 'tsp'),
    D('lechon_kawali', 'Lechon kawali', 'lechon kawali liempo', '150 g', [], [V('pork', 'Pork belly', 'baboy liempo', [['pork_belly', 150]])], 'deep'),
    D('crispy_pata', 'Crispy pata', 'crispy pata', '200 g', [], [V('pata', 'Pork hock', 'pata', [['pork_hock', 200]])], 'deep'),
    D('liempo', 'Inihaw na liempo', 'inihaw liempo grilled pork', '150 g', [['soy_sauce', 10], ['sugar', 3]], [V('pork', 'Pork belly', 'baboy', [['pork_belly', 150]])], 'grill'),
    D('inasal', 'Chicken inasal', 'inasal', '1 piece', [['vinegar', 10]], [
      V('paa', 'Leg quarter (paa)', 'paa', [['chicken_thigh_skin', 200]]),
      V('pecho', 'Breast (pecho)', 'pecho', [['chicken_breast', 200]])], 'grill', 'tsp'),
    D('fried_chicken', 'Fried chicken', 'pritong manok', '1 piece', [['flour', 10]], [
      V('thigh', 'Thigh', 'hita', [['chicken_thigh_skin', 130]]),
      V('breast', 'Breast', 'pecho', [['chicken_breast', 160]]),
      V('wing', 'Wings (2)', 'pakpak', [['chicken_wing', 90]])], 'deep'),
    D('pork_chop', 'Pork chop', 'porkchop', '1 chop', [], [V('pork', 'Pork chop', 'baboy', [['pork_loin', 150]])], 'pan', 'tbsp'),
    D('fried_fish', 'Fried fish', 'pritong isda', '1 fish', [], [
      V('bangus', 'Bangus (daing)', 'daing na bangus', [['bangus', 160], ['vinegar', 10]]),
      V('galunggong', 'Galunggong (2)', 'gg', [['galunggong', 150]]),
      V('tilapia', 'Tilapia', '', [['tilapia', 180]]),
      V('tuyo', 'Tuyo (3)', '', [['tuyo', 45]])], 'pan', 'tbsp'),
    D('grilled_fish', 'Inihaw na isda', 'grilled fish inihaw', '1 fish', [['tomato', 30], ['onion', 15]], [
      V('bangus', 'Bangus', '', [['bangus', 200]]), V('tilapia', 'Tilapia', '', [['tilapia', 200]])], 'grill'),
    D('paksiw', 'Paksiw na isda', 'paksiw', '1 serving', [['vinegar', 30], ['talong', 40], ['ampalaya', 30], ['ginger', 5], ['garlic', 5]], [
      V('bangus', 'Bangus', '', [['bangus', 150]]), V('galunggong', 'Galunggong', '', [['galunggong', 150]])], 'raw'),
    D('escabeche', 'Escabeche', 'sweet sour fish', '1 serving', [['sugar', 15], ['vinegar', 15], ['bell_pepper', 20], ['carrot', 20], ['cornstarch', 5]], [
      V('tilapia', 'Tilapia', '', [['tilapia', 150]]), V('lapu', 'Fish fillet', '', [['tilapia', 150]])], 'deep'),
    D('tortang_talong', 'Tortang talong', 'eggplant omelette', '1 piece', [['talong', 120], ['egg', 50]], [
      V('plain', 'Plain', '', []), V('giniling', 'With ground pork', 'giniling', [['pork_ground', 40]])], 'pan', 'tbsp'),
    D('monggo', 'Ginisang monggo', 'monggo munggo', '1 cup', [['monggo_dry', 50], ['malunggay', 15], ['garlic', 5], ['onion', 15], ['tomato', 20]], [
      V('pork', 'With pork', 'baboy', [['pork_lean', 30]]), V('shrimp', 'With shrimp', 'hipon', [['shrimp', 30]]), V('veg', 'Vegetarian', 'gulay', [])], 'pan', 'tsp'),
    D('pinakbet', 'Pinakbet', 'pakbet', '1 cup', [['talong', 50], ['ampalaya', 40], ['okra', 30], ['kalabasa', 50], ['sitaw', 30], ['tomato', 30], ['bagoong', 12]], [
      V('pork', 'With pork', 'baboy', [['pork_belly', 30]]), V('veg', 'Vegetarian', 'gulay', [])], 'pan', 'tsp'),
    D('laing', 'Laing', 'laing', '1 cup', [['taro_leaves', 60], ['coconut_milk', 100], ['bagoong', 8]], [
      V('pork', 'With pork', 'baboy', [['pork_belly', 20]]), V('veg', 'Vegetarian', '', [])], 'raw'),
    D('chopsuey', 'Chopsuey', 'chop suey', '1 cup', [['cabbage', 50], ['carrot', 25], ['cauliflower', 40], ['peas', 30], ['oyster_sauce', 10], ['cornstarch', 5]], [
      V('chicken', 'Chicken & shrimp', 'manok hipon', [['chicken_breast', 40], ['shrimp', 20]]), V('veg', 'Vegetarian', 'gulay', [])], 'pan', 'tsp'),
    D('ginataan', 'Ginataang kalabasa at sitaw', 'ginataang gulay', '1 cup', [['kalabasa', 120], ['sitaw', 50], ['coconut_milk', 70]], [
      V('shrimp', 'With shrimp', 'hipon', [['shrimp', 30]]), V('pork', 'With pork', 'baboy', [['pork_belly', 30]]), V('veg', 'Vegetarian', '', [])], 'raw'),
    D('nilaga', 'Nilaga', 'nilagang', '1 bowl', [['potato', 60], ['cabbage', 40], ['pechay', 30], ['corn', 50], ['onion', 15], ['patis', 8]], [
      V('beef', 'Beef', 'baka', [['beef_shank', 140]]), V('pork', 'Pork', 'baboy', [['pork_lean', 130]])], 'raw'),
    D('bulalo', 'Bulalo', 'bulalo', '1 bowl', [['corn', 60], ['cabbage', 40], ['pechay', 30], ['patis', 8]], [
      V('beef', 'Beef shank', 'baka', [['beef_shank', 180], ['bone_marrow', 20]])], 'raw'),
    D('dinuguan', 'Dinuguan', 'dinuguan', '1 cup', [['pork_blood', 80], ['vinegar', 15], ['garlic', 5]], [V('pork', 'Pork', 'baboy', [['pork_belly', 70]])], 'pan', 'tsp'),
    D('tokwat_baboy', "Tokwa't baboy", 'tokwat baboy tofu pork', '1 serving', [['soy_sauce', 10], ['vinegar', 15], ['onion', 10]], [V('pork', 'Pork & tofu', '', [['tofu', 100], ['pork_belly', 60]])], 'deep'),
    D('rice', 'Rice', 'kanin', '1 cup', [], [
      V('white', 'White', '', [['rice_white', 158]]), V('brown', 'Brown', '', [['rice_brown', 195]]),
      V('garlic', 'Garlic fried (sinangag)', 'sinangag', [['rice_white', 158], ['garlic', 8]])], 'raw'),
    D('silog', 'Silog meal', 'silog tapsilog tocilog longsilog', '1 plate', SILOG, [
      V('tapa', 'Tapsilog', 'tapa', [['tapa', 100]]), V('tocino', 'Tocilog', 'tocino', [['tocino', 100]]),
      V('longganisa', 'Longsilog', 'longganisa', [['longganisa', 100]]), V('bangus', 'Bangsilog', 'bangus', [['bangus', 150]]),
      V('corned', 'Cornsilog', 'corned beef', [['corned_beef', 80]]), V('hotdog', 'Hotsilog', 'hotdog', [['hotdog', 90]])], 'pan', 'tbsp'),
    D('lugaw', 'Lugaw', 'lugaw arroz caldo goto congee', '1 bowl', [['rice_white', 150], ['ginger', 5], ['garlic', 3], ['patis', 5]], [
      V('plain', 'Plain lugaw', '', []), V('arroz', 'Arroz caldo', 'chicken', [['chicken_thigh', 60], ['egg', 25]]), V('goto', 'Goto', 'beef', [['beef_chuck', 50]])], 'raw'),
    D('champorado', 'Champorado', 'champorado', '1 bowl', [['rice_glutinous', 180], ['cocoa_tablea', 15], ['sugar', 20], ['evap_milk', 30]], [V('plain', 'Classic', '', [])], 'raw'),
    D('pancit', 'Pancit', 'pansit', '1 cup', [['cabbage', 40], ['carrot', 20], ['soy_sauce', 8]], [
      V('bihon', 'Bihon', '', [['bihon', 150], ['chicken_breast', 30]]),
      V('canton', 'Canton', '', [['canton', 150], ['pork_lean', 30], ['shrimp', 20]]),
      V('palabok', 'Palabok', '', [['bihon', 160], ['shrimp', 25], ['egg', 25], ['chicharon', 8]])], 'pan', 'tsp'),
    D('spaghetti_ph', 'Spaghetti, Filipino style', 'spaghetti jollibee sweet', '1 cup', [['spaghetti', 180], ['tomato_sauce', 70], ['banana_ketchup', 20], ['sugar', 8], ['cheese', 15]], [
      V('hotdog', 'With hotdog & pork', '', [['hotdog', 30], ['pork_ground', 40]])], 'pan', 'tsp'),
    D('sopas', 'Sopas', 'macaroni soup', '1 bowl', [['macaroni', 100], ['evap_milk', 60], ['carrot', 20], ['cabbage', 20]], [
      V('chicken', 'Chicken', 'manok', [['chicken_breast', 50], ['hotdog', 20]])], 'raw'),
    D('lumpia', 'Lumpia', 'lumpiang', '1 serving', [], [
      V('shanghai', 'Shanghai (5 pcs)', 'shanghai', [['pork_ground', 75], ['carrot', 15], ['onion', 10], ['wrapper', 25]]),
      V('sariwa', 'Sariwa (1 pc)', 'fresh', [['cabbage', 40], ['kamote', 40], ['green_beans', 30], ['tofu', 20], ['wrapper', 15], ['peanuts', 10], ['sugar', 5]]),
      V('togue', 'Togue (2 pcs)', 'gulay', [['togue', 80], ['carrot', 20], ['wrapper', 20]])], 'deep'),
    D('embutido', 'Embutido', 'embutido', '1 slice', [['pork_ground', 100], ['egg', 15], ['carrot', 10], ['cheese', 10], ['breadcrumbs', 8]], [V('pork', 'Pork', '', [])], 'raw'),
    D('siopao', 'Siopao', 'siopao', '1 pc', [['flour', 60], ['sugar', 8]], [
      V('asado', 'Asado', '', [['pork_lean', 40], ['soy_sauce', 5]]), V('bolabola', 'Bola-bola', '', [['pork_ground', 40], ['egg', 10]])], 'raw'),
    D('siomai', 'Siomai (4 pcs)', 'siomai dimsum', '4 pcs', [['wrapper', 20]], [
      V('pork', 'Pork', 'baboy', [['pork_ground', 70], ['shrimp', 15]]), V('chicken', 'Chicken', 'manok', [['chicken_thigh', 85]])], 'raw'),
    D('ensaladang_talong', 'Ensaladang talong', 'eggplant salad', '1 cup', [['talong', 100], ['tomato', 40], ['onion', 15], ['vinegar', 10], ['bagoong', 5]], [V('plain', 'Classic', '', [])], 'grill'),
    D('turon', 'Turon', 'turon', '1 pc', [['saba', 100], ['sugar', 15], ['wrapper', 15]], [V('plain', 'Saba', '', []), V('langka', 'With langka', '', [['jackfruit', 15]])], 'deep'),
    D('banana_cue', 'Banana cue', 'bananacue', '1 stick (2 pcs)', [['saba', 200], ['sugar', 25]], [V('plain', 'Classic', '', [])], 'deep'),
    D('kamote_cue', 'Kamote cue', 'kamotecue', '1 stick', [['kamote', 150], ['sugar', 20]], [V('plain', 'Classic', '', [])], 'deep'),
    D('taho', 'Taho', 'taho', '1 cup', [['tofu_silken', 200], ['sugar', 25], ['sago', 30]], [V('plain', 'Classic', '', [])], 'raw'),
    D('halohalo', 'Halo-halo', 'halo halo', '1 glass', [['evap_milk', 60], ['condensed_milk', 15], ['sugar', 15], ['saba', 30], ['corn', 15], ['jackfruit', 15], ['sago', 20]], [V('plain', 'Classic', '', [])], 'raw'),
    D('oatmeal', 'Oatmeal', 'oats', '1 bowl', [['milk', 120]], [
      V('rolled', 'Rolled oats', 'old fashioned', [['oats_rolled', 40]]), V('steel', 'Steel-cut', '', [['oats_steel', 40]])], 'raw'),
    // ---------- more dishes (v2) ----------
    D('bbq', 'BBQ skewers', 'barbecue bbq inihaw stick', '2 sticks', [['banana_ketchup', 15], ['sugar', 8], ['soy_sauce', 8]], [
      V('pork', 'Pork', 'baboy', [['pork_belly', 40], ['pork_lean', 60]]), V('chicken', 'Chicken', 'manok', [['chicken_thigh', 100]])], 'grill'),
    D('isaw', 'Isaw', 'isaw street food', '3 sticks', [['vinegar', 10]], [V('chicken', 'Chicken', 'manok', [['chicken_intestine', 90]])], 'grill'),
    D('kinilaw', 'Kinilaw', 'kilawin ceviche', '1 cup', [['vinegar', 30], ['onion', 20], ['ginger', 5], ['cucumber', 30]], [
      V('tuna', 'Tuna / tanigue', '', [['tuna_fresh', 120]]), V('shrimp', 'Shrimp', 'hipon', [['shrimp', 120]])], 'raw'),
    D('batchoy', 'La Paz batchoy', 'batchoy noodle soup', '1 bowl', [['canton', 150], ['patis', 5], ['chicharon', 8], ['egg', 25]], [V('pork', 'Pork & liver', '', [['pork_lean', 40], ['pork_liver', 20]])], 'raw'),
    D('lomi', 'Lomi', 'lomi noodle soup', '1 bowl', [['canton', 180], ['egg', 25], ['cornstarch', 8], ['cabbage', 30]], [V('pork', 'Pork', '', [['pork_lean', 30], ['pork_liver', 15]])], 'raw'),
    D('mami', 'Mami', 'mami noodle soup', '1 bowl', [['canton', 150], ['pechay', 30], ['patis', 5]], [
      V('chicken', 'Chicken', 'manok', [['chicken_breast', 50]]), V('beef', 'Beef', 'baka', [['beef_chuck', 50]])], 'raw'),
    D('sotanghon', 'Sotanghon soup', 'sotanghon sopas', '1 bowl', [['bihon', 100], ['carrot', 20], ['cabbage', 30], ['patis', 5]], [V('chicken', 'Chicken', 'manok', [['chicken_breast', 50]])], 'raw'),
    D('pares', 'Beef pares with rice', 'pares', '1 bowl + rice', [['soy_sauce', 15], ['sugar', 10], ['rice_white', 158]], [V('beef', 'Beef', 'baka', [['beef_chuck', 130]])], 'raw'),
    D('humba', 'Humba', 'humba', '1 cup', [['soy_sauce', 15], ['sugar', 12], ['banana_blossom', 10]], [V('pork', 'Pork belly', 'baboy', [['pork_belly', 120]])], 'pan', 'tsp'),
    D('pochero', 'Pochero', 'puchero', '1 bowl', [['saba', 50], ['potato', 50], ['cabbage', 30], ['tomato_sauce', 40]], [
      V('pork', 'Pork', 'baboy', [['pork_belly', 70]]), V('beef', 'Beef', 'baka', [['beef_chuck', 90]]), V('chicken', 'Chicken', 'manok', [['chicken_thigh', 100]])], 'raw'),
    D('sinampalukan', 'Sinampalukang manok', 'sinampalukan', '1 bowl', [['tamarind_mix', 8], ['ginger', 5], ['tomato', 30], ['kangkong', 30]], [V('chicken', 'Chicken', 'manok', [['chicken_thigh_skin', 140]])], 'raw'),
    D('ampalaya', 'Ginisang ampalaya', 'ampalaya bitter gourd', '1 cup', [['ampalaya', 120], ['tomato', 30], ['onion', 15]], [
      V('egg', 'With egg', 'itlog', [['egg', 50]]), V('pork', 'With pork', 'baboy', [['pork_ground', 40]])], 'pan', 'tsp'),
    D('sayote', 'Ginisang sayote', 'sayote', '1 cup', [['sayote', 150], ['garlic', 4], ['onion', 10]], [V('pork', 'With pork', '', [['pork_ground', 30]]), V('veg', 'Vegetarian', '', [])], 'pan', 'tsp'),
    D('dinengdeng', 'Dinengdeng', 'inabraw', '1 bowl', [['kalabasa', 50], ['malunggay', 20], ['okra', 30], ['sitaw', 30], ['talong', 40], ['patis', 8]], [V('fish', 'With grilled fish', 'isda', [['bangus', 30]])], 'raw'),
    D('relleno', 'Rellenong bangus', 'relleno', '1 slice', [['pork_ground', 30], ['egg', 20], ['peas', 15], ['carrot', 15]], [V('bangus', 'Bangus', '', [['bangus', 120]])], 'pan', 'tbsp'),
    D('kwekkwek', 'Kwek-kwek / tokneneng', 'kwek kwek tokneneng', '1 serving', [['flour', 15]], [
      V('kwek', 'Kwek-kwek (5 quail eggs)', 'pugo', [['quail_egg', 45]]), V('tokneneng', 'Tokneneng (1 egg)', '', [['egg', 50]])], 'deep'),
    D('fishballs', 'Fishballs', 'fishball street food', '10 pcs', [['banana_ketchup', 10]], [V('plain', 'Classic', '', [['fishball', 80]])], 'deep'),
    D('leche_flan', 'Leche flan', 'flan', '1 slice', [['egg_yolk', 25], ['condensed_milk', 40], ['evap_milk', 30], ['sugar', 10]], [V('plain', 'Classic', '', [])], 'raw'),
    D('bibingka', 'Bibingka', 'bibingka', '1 pc', [['rice_flour', 45], ['coconut_milk', 40], ['sugar', 20], ['egg', 25], ['cheese', 10]], [V('plain', 'Classic', '', [])], 'grill'),
    D('maja', 'Maja blanca', 'maja', '1 slice', [['coconut_milk', 40], ['cornstarch', 15], ['sugar', 15], ['corn', 15], ['condensed_milk', 10]], [V('plain', 'Classic', '', [])], 'raw'),
    D('ube_halaya', 'Ube halaya', 'ube jam', '½ cup', [['ube', 80], ['condensed_milk', 25], ['butter', 8], ['evap_milk', 20]], [V('plain', 'Classic', '', [])], 'raw'),
    D('milktea', 'Milk tea', 'milktea boba pearl', '1 regular cup', [['milk', 100], ['sago', 60], ['green_tea', 250]], [
      V('regular', 'Regular sugar', '', [['sugar', 25]]), V('less', 'Less sugar', '', [['sugar', 12]]), V('stevia', 'Stevia', 'sugar free', [['stevia', 1]])], 'raw'),
    D('coffee_drink', 'Coffee drinks', 'kape latte cappuccino iced coffee', '1 cup', [['coffee', 30]], [
      V('latte', 'Latte', '', [['milk', 240]]), V('capp', 'Cappuccino', '', [['milk', 150]]), V('iced', 'Iced coffee, sweetened', '', [['milk', 100], ['sugar', 20]]), V('stevia', 'Iced coffee, stevia', '', [['milk', 100], ['stevia', 1]])], 'raw'),
    D('instant', 'Instant noodles', 'instant pancit canton lucky me', '1 pack', [], [
      V('one', '1 pack', '', [['instant_noodles', 80]]), V('two', '2 packs', '', [['instant_noodles', 160]]), V('egg', '1 pack + egg', 'itlog', [['instant_noodles', 80], ['egg', 50]])], 'raw'),
    D('burger', 'Burger', 'hamburger cheeseburger', '1 burger', [['burger_bun', 50], ['lettuce', 10], ['tomato', 15], ['mayonnaise', 8]], [
      V('cheese', 'Cheeseburger', '', [['beef_ground', 70], ['cheese', 15]]), V('plain', 'Hamburger', '', [['beef_ground', 70]]), V('chicken', 'Chicken burger', 'manok', [['chicken_breast', 90]])], 'grill'),
    D('fries', 'French fries', 'fries', 'medium', [], [V('s', 'Small', '', [['french_fries', 70]]), V('m', 'Medium', '', [['french_fries', 110]]), V('l', 'Large', '', [['french_fries', 150]])], 'raw'),
    D('pizza_d', 'Pizza', 'pizza', '1 slice', [], [V('one', '1 slice', '', [['pizza', 107]]), V('two', '2 slices', '', [['pizza', 214]])], 'raw'),
    D('pb_sandwich', 'Peanut butter sandwich', 'pb sandwich', '1 sandwich', [['peanut_butter', 32]], [
      V('white', 'White bread', '', [['bread_white', 56]]), V('wheat', 'Wheat bread', '', [['bread_wheat', 56]])], 'raw'),
    D('cereal_bowl', 'Cereal with milk', 'cereal', '1 bowl', [['milk', 200]], [V('flakes', 'Corn flakes', '', [['cereal', 40]])], 'raw'),
  ];

  // ---------- Cooking & oil ----------
  const METHODS = [['raw', 'Boiled'], ['grill', 'Grilled'], ['air', 'Air-fried'], ['pan', 'Pan-fried'], ['deep', 'Deep-fried']];
  const OIL_TYPES = [['oil_veg', 'Vegetable'], ['oil_olive', 'Olive'], ['oil_evoo', 'EVOO'], ['oil_coconut', 'Coconut'], ['butter', 'Butter'], ['none', 'None']];
  const OIL_AMTS = [['spray_l', 'Light spray', 1], ['spray_h', 'Heavy spray', 3], ['tsp', '1 tsp', 4.5], ['tbsp', '1 tbsp', 13.5], ['tbsp2', '2 tbsp', 27], ['absorb', 'Absorbed', null]];
  const METHOD_DEFAULT = { raw: { type: 'none', amt: null }, grill: { type: 'none', amt: null }, air: { type: 'oil_olive', amt: 'spray_l' }, pan: { type: 'oil_veg', amt: 'tbsp' }, deep: { type: 'oil_veg', amt: 'absorb' } };
  const usesOil = m => m !== 'raw';

  // ---------- Pure math ----------
  const KEYS = ['kcal', 'p', 'c', 'f', 'sat', 'fib'];
  const zero = () => ({ kcal: 0, p: 0, c: 0, f: 0, sat: 0, fib: 0 });
  function scale(per100, g) { const o = zero(); for (const k of KEYS) o[k] = (per100[k] || 0) * g / 100; return o; }
  function add(a, b) { const o = zero(); for (const k of KEYS) o[k] = (a[k] || 0) + (b[k] || 0); return o; }
  function mul(a, n) { const o = zero(); for (const k of KEYS) o[k] = (a[k] || 0) * n; return o; }
  function sumItems(items, db) { db = db || ING; return items.reduce((t, it) => { const ing = db[it.id]; return ing ? add(t, scale(ing.per100, it.g)) : t; }, zero()); }
  function round(t) { return { kcal: Math.round(t.kcal), p: +t.p.toFixed(1), c: +t.c.toFixed(1), f: +t.f.toFixed(1), sat: +t.sat.toFixed(1), fib: +t.fib.toFixed(1) }; }
  // Grams of oil for a cooking choice. Deep-fry absorption ≈ 10% of food weight (12% if breaded/battered).
  function oilGrams(method, amt, foodG, opts) {
    if (!usesOil(method) || !amt) return 0;
    if (amt === 'absorb') return Math.round(foodG * ((opts && opts.breaded) ? 0.12 : 0.10) * 10) / 10;
    if (amt === 'custom') return +(opts && opts.g) || 0;
    const a = OIL_AMTS.find(x => x[0] === amt); return a ? a[2] : 0;
  }
  // Ingredient list for a dish variant (+ optional cut swap), scaled by servings. Recipe-derived, no hardcoded totals.
  function dishItems(dish, variantId, cut, servings) {
    const v = dish.variants.find(x => x.id === variantId) || dish.variants[0], n = servings || 1;
    let add2 = v.add.map(([id, g]) => [id, g]);
    if (cut && v.cuts && v.cuts[cut]) { const def = Object.values(v.cuts)[0]; add2 = add2.map(([id, g]) => [id === def ? v.cuts[cut] : id, g]); }
    return [...dish.base, ...add2].map(([id, g]) => ({ id, g: Math.round(g * n * 10) / 10 }));
  }
  const foodWeight = items => items.reduce((s, it) => s + ((ING[it.id] && ING[it.id].group !== 'oil') ? it.g : 0), 0);
  // Full meal: ingredient items + one oil line. Returns { items (incl. oil), totals }.
  function buildMeal(items, method, oilType, oilAmt, opts) {
    const out = items.filter(it => !it.oil);
    const g = oilType && oilType !== 'none' ? oilGrams(method, oilAmt, foodWeight(out), opts) : 0;
    if (g > 0) out.push({ id: oilType, g, oil: true });
    return { items: out, totals: round(sumItems(out)) };
  }
  const fatQuality = t => ({ sat: +t.sat.toFixed(1), unsat: +Math.max(0, t.f - t.sat).toFixed(1), mostlyUnsat: t.f > 0 && t.sat / t.f < 0.33 });

  // ---------- Search ----------
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
  function score(q, text, fuzzy) {
    const t = norm(text), words = t.split(/\s+/).filter(Boolean); if (!q) return 0;
    if (t === q) return 120; if (t.startsWith(q)) return 100;
    if (words.some(w => w.startsWith(q))) return 90; if (t.includes(q)) return 60;
    let i = 0; for (const ch of t) if (ch === q[i]) i++;     // in-order letters ("bcl" → bicol)
    return fuzzy && i === q.length && q.length >= 3 && t[0] === q[0] ? 25 : 0;
  }
  // entries: [{key, name, alt, ...}] → sorted matches. Multi-word queries need every word to match.
  function search(query, entries) {
    const q = norm(query).trim(); if (!q) return [];
    const parts = q.split(/\s+/);
    return entries.map(e => {
      const hay = [e.name, e.alt || ''];
      let total = 0; for (const p of parts) { const s = Math.max(score(p, hay[0], true), score(p, hay[1])); if (!s) return null; total += s; }
      return { e, s: total + (score(q, e.name) >= 100 ? 30 : 0) - (e.name.length / 100) };
    }).filter(Boolean).sort((a, b) => b.s - a.s).filter((x, _, arr) => x.s >= arr[0].s * 0.5).map(x => x.e);
  }

  const API = { ING, DISHES, METHODS, OIL_TYPES, OIL_AMTS, METHOD_DEFAULT, usesOil, scale, add, mul, sumItems, round, oilGrams, dishItems, buildMeal, fatQuality, foodWeight, search, norm };
  root.FOODDB = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
