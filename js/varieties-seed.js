'use strict';
// Optional starter list of commonly grown dragon fruit (pitaya) varieties, loaded from
// More → "Load starter varieties". Edit freely; names already in the app are skipped.
//
// Sources: Growables.org "Pitaya Species and Named Varieties" (G), Gardener's Path "11 of the Best
// Dragon Fruit Cultivars" (GP), Epic Gardening "7 Best Dragon Fruit Varieties" (EG), and
// graftingdragonfruits.com (GD). Brix and size are what those pages report, not measurements.
// Names, parentage and self-fertility are inconsistent between nurseries, so anything the sources
// disagree on is "Unknown" and the conflict is noted in `traits`. Pollen-donor quality is not
// documented anywhere I found, so it is "Unknown" unless a source says otherwise.
// Verify against the plants you actually hold before relying on any of it.

const [SP_UNDATUS, SP_RED, SP_YELLOW, SP_HYBRID, SP_OTHER] = SPECIES;

const V = (name, species, skinColor, fleshColor, selfFertile, source, traits, extra = {}) =>
  ({ name, species, skinColor, fleshColor, selfFertile, pollinator: 'Unknown', origin: 'Named variety', source, traits, ...extra });

const VARIETY_SEED = [
  V('American Beauty', SP_OTHER, 'Pink / red', 'Magenta / purple', 'Yes', 'Guatemala (G); breeder not stated',
    'Listed as an S. guatemalensis cultivar (GP). Brix 18.5 (GP). About 0.5–1 lb, round. Soft, juicy, sweet. G, GP, EG agree it is self-fertile; GD calls it a "universal pollinator" (a nursery claim).',
    { pollinator: 'Good' }),
  V('Physical Graffiti', SP_HYBRID, 'Pink / red', 'Magenta / purple', 'Unknown', 'California (G); breeder not stated',
    'Reported as S. guatemalensis × S. undatus (GP, EG). Brix just under 18 (GP). Up to 1.5 lb, oblong. Balanced sweet/acid, raspberry and kiwi notes (EG). Sources conflict on self-fertility: G says yes; GP and EG say no / needs a red-fleshed pollinator.'),
  V('Purple Haze', SP_HYBRID, 'Pink / red', 'Magenta / purple', 'Unknown', 'California (G); breeder not stated',
    'Reported as S. guatemalensis × S. undatus (GP). Brix 19 (GP). 1–2 lb, oval. Very sweet, grape and kiwi hints. Sources conflict on self-fertility: G says yes; GP and some nurseries say no.'),
  V('Dark Star', SP_HYBRID, 'Pink / red', 'Magenta / purple', 'Unknown', 'Paul Thomson hybrid, possibly originally "9S" (EG)',
    'Reported as S. guatemalensis × S. undatus (GP). Brix 19 (GP, EG). Up to 1.5 lb. Sweet, mild grape flavor. Sources conflict on self-fertility: G says yes; GP and EG say no / needs another cultivar.'),
  V("Halley's Comet", SP_HYBRID, 'Pink / red', 'Magenta / purple', 'Unknown', 'California (G); breeder not stated',
    'Reported as S. undatus × S. guatemalensis (GP). Brix 16.7 (GP). Large, round, 1–2 lb; "not overly sweet" (GP) but "sweet, good" (G). Sources conflict on self-fertility: G says yes; GP and nursery listings say no.'),
  V('Cosmic Charlie', SP_OTHER, 'Pink / red', 'Pink', 'Yes', 'California (G); breeder not stated',
    'About 0.75–1.25 lb. Grape / kiwi-like flavor (G). One retailer lists it as S. costaricensis; G does not state species. Said to be a sibling of Purple Haze and Physical Graffiti (one source). No Brix figure found.'),
  V('Vietnamese White', SP_UNDATUS, 'Pink / red', 'White', 'Yes', 'Unknown',
    'Tangy, juicy, crisp white flesh (EG). EG says self-fertile. Brix not stated. Possibly the same as "Vietnam Jaina" but no source says so.'),
  V('Sugar Dragon', SP_HYBRID, 'Pink / red', 'Magenta / purple', 'Yes', 'Unknown',
    'Reported as S. guatemalensis × an unknown species (GP). Brix about 18, mature plants reportedly in the 20s (EG, GP). Small, 8–12 oz, oval. Rosewater / berry undertones (GP).'),
  V('Delight', SP_HYBRID, 'Pink / red', 'White', 'Yes', 'Paul Thomson; California Rare Fruit Growers seedling selection (EG)',
    'Reported as S. polyrhizus × S. undatus (G) or S. undatus × S. guatemalensis (GP). Brix 18 or higher (GP). Medium, oval, 0.5–1 lb. Sweet, firm. G and EG say white flesh; GP says light pink.'),
  V('Palora', SP_YELLOW, 'Yellow', 'White', 'Unknown', 'Ecuador (EG)',
    'Yellow-skinned S. megalanthus type. Brix in the high 20s (EG). Sizeable, larger than typical yellow types. Pineapple and honey flavor (EG). Self-fertility is not stated for it specifically; yellow types usually need a compatible pollen source, so check.'),
  V('Colombiana', SP_YELLOW, 'Yellow', 'White', 'Yes', 'NW South America (GP); breeder not stated',
    'S. megalanthus. Brix 21 (GP). Small, oblong, about 5 oz, with large black seeds. Extremely sweet. GP also calls it "Yellow Dragon"; G lists a separate "Yellow Dragon" from Florida (0.5–0.75 lb, sweet, self-fertile).',
    { synonyms: 'Yellow Dragon' }),
  V('Yellow Thai', SP_HYBRID, 'Pink / red', 'White', 'Yes', 'Unknown',
    'Reported as S. megalanthus × S. undatus (GP). Brix 18.5 or higher (GP). Oblong, large, over 1 lb. Sweet and tart, like pink lemonade. Soft pink skin with yellow bracts.'),
  V('David Bowie', SP_UNDATUS, 'Pink / red', 'White', 'Yes', 'California (G); breeder not stated',
    'About 0.5–1 lb, oval. Sweet and tangy (G, GP). Brix not stated.'),
  V('Lisa', SP_RED, 'Pink / red', 'Red', 'No', 'Nicaraguan type (GP); breeder not stated',
    'Reported as S. monacanthus (GP). Brix 18 (GP). Oval, about 1 lb. Sweet and acidic, smooth texture. Self-sterile per GP.'),
  V('Alice', SP_OTHER, 'Pink / red', 'White', 'No', 'California (G); breeder not stated',
    '0.5–1 lb. Semisweet. Self-sterile per G. Species and Brix not stated.'),
  V('Bloody Mary', SP_RED, 'Pink / red', 'Red', 'No', 'California (G); breeder not stated',
    'Listed as H. polyrhizus (G). Small, 0.25–0.5 lb. Semisweet. Self-sterile per G.'),
  V('Costa Rican Sunset', SP_OTHER, 'Pink / red', 'Red', 'No', 'Costa Rica (G)',
    'Small, 0.25–0.5 lb. Self-sterile per G. Species and Brix not stated.'),
  V('Guyute', SP_OTHER, 'Pink / red', 'White', 'Yes', 'Central America (G)',
    '0.5–1 lb. Sweet. Self-fertile per G. Species and Brix not stated.'),
  V('Harpua', SP_OTHER, 'Pink / red', 'White', 'Yes', 'Central America (G)',
    '0.75–1 lb. Semisweet. Self-fertile per G. Species and Brix not stated.'),
  V('L.A. Woman', SP_OTHER, 'Pink / red', 'White', 'No', 'California (G)',
    '0.75–1.5 lb. Sweet, but G notes a bad aftertaste. Self-sterile per G (listed there as "L.A. Women"). Species and Brix not stated.'),
  V('Lake Atitlan', SP_OTHER, 'Pink / red', 'White', 'Yes', 'Guatemala (G)',
    '0.75–1 lb. Sweet, tangy. Self-fertile per G. Species and Brix not stated.'),
  V('Makisupa', SP_OTHER, 'Pink / red', 'Pink', 'Yes', 'Central America (G)',
    '0.75–1 lb. Sweet, slightly astringent. Self-fertile per G. Species and Brix not stated.'),
  V('Neitzl', SP_OTHER, 'Pink / red', 'White', 'Yes', 'California (G)',
    '0.75–1 lb. Sweet. Self-fertile per G. Species and Brix not stated.'),
  V('Red Jaina', SP_OTHER, 'Pink / red', 'Red', 'No', 'Florida (G)',
    '0.5–0.75 lb. Semisweet. Self-sterile per G. Species and Brix not stated.'),
  V('Seoul Kitchen', SP_UNDATUS, 'Pink / red', 'White', 'Yes', 'Florida (G)',
    'Listed as H. undatus (G). 0.75–1 lb. Sweet. Self-fertile per G. Brix not stated.'),
  V('Thompson', SP_OTHER, 'Pink / red', 'White', 'Yes', 'California (G)',
    '0.75–1.5 lb. Sweet. Self-fertile per G. Species and Brix not stated. Not clear whether this is the same as the Paul Thomson selections.'),
  V('Vietnam Jaina', SP_OTHER, 'Pink / red', 'White', 'Yes', 'Vietnam (G)',
    '0.5–1.5 lb. Semisweet. Self-fertile per G. Species and Brix not stated. May be the same as Vietnamese White; no source says so.'),
  V('Voodoo Child', SP_OTHER, 'Pink / red', 'Pink', 'Yes', 'Florida (G)',
    'Very small, 0.15–0.25 lb. Sweet, grape-like. Self-fertile per G. Species and Brix not stated.'),
  V('Zamorano', SP_OTHER, 'Pink / red', 'Red', 'Yes', 'Honduras (G)',
    '0.5–1 lb. Sweet, mild. Self-fertile per G. Species and Brix not stated.'),
];
