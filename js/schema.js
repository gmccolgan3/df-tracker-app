'use strict';
// Field definitions. They drive the forms, the detail pages and the CSV export,
// so adding a field here is usually all it takes to start tracking it.
//
// Field types: text, textarea, number, date, select, rating (1–5), ref (link to another record).
// Fields before the first `group` are the essentials shown at the top of a form; each `group`
// starts a section that folds away. A field keyed `notes` always goes last.
// `showIf` hides a field unless it applies. Short select lists show as tap-to-pick chips.

const SCHEMA_VERSION = 2;

// Hylocereus was folded into Selenicereus in 2017; growers still use both names.
const SPECIES = [
  'S. undatus (white flesh, pink skin)',
  'S. costaricensis / polyrhizus (red flesh)',
  'S. megalanthus (yellow skin)',
  'Interspecific hybrid',
  'Other / unknown',
];
const SKIN = ['Pink / red', 'Yellow', 'Orange', 'Other'];
const FLESH = ['White', 'Light pink', 'Pink', 'Red', 'Magenta / purple', 'Other'];

const PLANT_STATUS = ['Active', 'Dead', 'Given away', 'Culled'];
const POLLEN_SOURCES = ['Another plant', 'Self', 'Open / insects'];
// Each fruit is tagged when it is pollinated and followed until it is eaten (or lost).
const FRUIT_STAGES = ['Growing', 'Harvested', 'Eaten', 'Lost'];
const picked = (r) => r.stage === 'Harvested' || r.stage === 'Eaten';
const LOG_KINDS = ['Flower buds', 'Flowers opened', 'Growth', 'Pruning', 'Fertilizer / treatment', 'Pest / disease', 'Note'];

const FIELDS = {
  varieties: [
    { k: 'name', label: 'Name', type: 'text', required: true },
    { k: 'species', label: 'Species / group', type: 'select', options: SPECIES },
    { k: 'fleshColor', label: 'Flesh color', type: 'select', options: FLESH },
    { k: 'skinColor', label: 'Skin color', type: 'select', options: SKIN },
    { k: 'selfFertile', label: 'Self-fertile', type: 'select', options: ['Unknown', 'Yes', 'Partly', 'No'],
      hint: 'Can it set fruit with its own pollen? Many types cannot.' },
    { k: 'origin', label: 'Origin', type: 'select', options: ['Named variety', 'Own hybrid', 'Unknown'] },
    { k: 'fromPlantId', label: 'Selected from seedling', type: 'ref', ref: 'plants',
      showIf: (r) => r.origin === 'Own hybrid', hint: 'The seedling this variety was named from' },

    { group: 'More about it', k: 'synonyms', label: 'Other names', type: 'text', hint: 'Names it also goes by, separated by commas' },
    { k: 'pollinator', label: 'As a pollen donor', type: 'select', options: ['Unknown', 'Good', 'Fair', 'Poor'],
      hint: 'How well its pollen sets fruit on other varieties' },
    { k: 'source', label: 'Source / breeder', type: 'text' },
    { k: 'traits', label: 'Reported traits', type: 'textarea',
      hint: 'What nurseries and growers claim. Your own measurements go on fruit records.' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],

  plants: [
    { k: 'tag', label: 'Tag', type: 'text', required: true, hint: 'Whatever is written on the plant label' },
    { k: 'origin', label: 'Origin', type: 'select', options: ['Acquired', 'Cutting', 'Seedling'], required: true },
    { k: 'varietyId', label: 'Variety', type: 'ref', ref: 'varieties',
      hint: 'For a seedling, leave this empty until you name it' },
    { k: 'parentPlantId', label: 'Cut from', type: 'ref', ref: 'plants', showIf: (r) => r.origin === 'Cutting' },
    { k: 'crossId', label: 'Seedling of', type: 'ref', ref: 'crosses', showIf: (r) => r.origin === 'Seedling' },
    { k: 'source', label: 'Bought or received from', type: 'text', showIf: (r) => r.origin === 'Acquired' },
    { half: true, k: 'date', label: 'Started', type: 'date', hint: 'When you got it, rooted it, or it germinated' },
    { half: true, k: 'location', label: 'Location', type: 'text', hint: 'Bed, post, pot or greenhouse spot' },
    { k: 'status', label: 'Status', type: 'select', options: PLANT_STATUS },

    { group: 'Grafting', k: 'grafted', label: 'Grafted', type: 'select', options: ['No', 'Yes'],
      hint: 'This plant (the scion) is grafted onto a rootstock' },
    { k: 'rootstockId', label: 'Rootstock', type: 'ref', ref: 'varieties', showIf: (r) => r.grafted === 'Yes',
      hint: 'Add the rootstock under Varieties if it is not listed' },
    { k: 'graftDate', label: 'Graft date', type: 'date', showIf: (r) => r.grafted === 'Yes' },
    { k: 'graftMethod', label: 'Method', type: 'select', options: ['Flat', 'Cleft / wedge', 'Side', 'Other'],
      showIf: (r) => r.grafted === 'Yes' },
    { k: 'graftTook', label: 'Graft took', type: 'select', options: ['Waiting', 'Yes', 'No'], showIf: (r) => r.grafted === 'Yes' },

    { group: 'Plant traits', k: 'vigor', label: 'Vigor', type: 'rating', low: 'Weak', high: 'Very vigorous' },
    { k: 'spines', label: 'Spines', type: 'select', options: ['Few / soft', 'Average', 'Many / sharp'] },
    { k: 'stemColor', label: 'Stem color', type: 'select', options: ['Green', 'Blue-green / waxy', 'Purple tinge', 'Other'] },
    { k: 'firstFlower', label: 'First flowered', type: 'date', hint: 'For seedlings this shows how long they took to bloom' },
    { k: 'health', label: 'Disease, pests, weather damage', type: 'textarea',
      hint: 'e.g. stem canker, anthracnose, sunburn, cold damage' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],

  crosses: [
    { half: true, k: 'code', label: 'Cross code', type: 'text', required: true, hint: 'Write it on the flower tag' },
    { half: true, k: 'date', label: 'Pollinated on', type: 'date', required: true },
    { k: 'seedPlantId', label: 'Seed parent ♀', type: 'ref', ref: 'plants', required: true,
      hint: 'The plant whose flower you pollinated' },
    { k: 'pollenSource', label: 'Pollen from', type: 'select', options: POLLEN_SOURCES, required: true },
    { k: 'pollenPlantId', label: 'Pollen parent ♂', type: 'ref', ref: 'plants', showIf: (r) => r.pollenSource === 'Another plant' },
    { k: 'flowers', label: 'Flowers pollinated', type: 'number', step: 1, min: 0 },
    { k: 'fruitSet', label: 'Fruits set', type: 'number', step: 1, min: 0,
      hint: 'Fill in once you can tell, usually after 1–2 weeks. 0 means none set.' },

    { group: 'Pollination details', k: 'pollenAge', label: 'Pollen', type: 'select', options: ['Fresh', 'Stored'],
      showIf: (r) => r.pollenSource === 'Another plant', hint: 'Stored means kept in the fridge or freezer' },
    { k: 'timing', label: 'Time pollinated', type: 'select', options: ['Evening', 'Night', 'Early morning'],
      hint: 'Flowers open at night and close by mid-morning' },
    { k: 'bagged', label: 'Flower bagged', type: 'select', options: ['Yes', 'No'], hint: 'Bagging keeps out stray pollen' },

    { group: 'Seeds', k: 'seedsSown', label: 'Seeds sown', type: 'number', step: 1, min: 0 },
    { k: 'sownDate', label: 'Sown on', type: 'date' },
    { k: 'germinated', label: 'Seeds germinated', type: 'number', step: 1, min: 0 },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],

  fruits: [
    { half: true, k: 'tag', label: 'Fruit tag', type: 'text', required: true, hint: 'The number or name on the fruit’s label' },
    { half: true, k: 'pollinatedDate', label: 'Pollinated on', type: 'date', required: true },
    { k: 'plantId', label: 'Growing on ♀', type: 'ref', ref: 'plants', required: true, hint: 'The plant whose flower was pollinated' },
    { k: 'pollenSource', label: 'Pollinated with', type: 'select', options: POLLEN_SOURCES, required: true },
    { k: 'pollenPlantId', label: 'Pollen from ♂', type: 'ref', ref: 'plants', showIf: (r) => r.pollenSource === 'Another plant' },
    { k: 'crossId', label: 'Part of cross', type: 'ref', ref: 'crosses',
      hint: 'Optional. Picking one fills in the plant, date and pollen from that pollination.' },
    { k: 'stage', label: 'Stage', type: 'select', options: FRUIT_STAGES, required: true },
    { half: true, k: 'harvestDate', label: 'Harvested on', type: 'date', required: true, showIf: picked },
    { half: true, k: 'eatenDate', label: 'Eaten on', type: 'date', showIf: (r) => r.stage === 'Eaten' },
    { half: true, k: 'lostDate', label: 'Lost on', type: 'date', showIf: (r) => r.stage === 'Lost' },
    { half: true, k: 'lostReason', label: 'What happened', type: 'select', options: ['Dropped', 'Rotted', 'Pests / animals', 'Split open', 'Other'],
      showIf: (r) => r.stage === 'Lost' },
    { half: true, k: 'weight', label: 'Weight', type: 'number', unit: 'g', step: 1, min: 0 },
    { half: true, k: 'brixCenter', label: 'Brix, center', type: 'number', unit: '°Bx', step: 0.1, min: 0,
      hint: 'Refractometer reading. 11–15 is typical for white flesh.' },
    { k: 'overall', label: 'Overall', type: 'rating', low: 'Not worth keeping', high: 'Breed from it' },

    { half: true, group: 'Size', k: 'length', label: 'Length', type: 'number', unit: 'mm', step: 1, min: 0 },
    { half: true, k: 'diameter', label: 'Width', type: 'number', unit: 'mm', step: 1, min: 0, hint: 'At the widest point' },
    { half: true, k: 'peelThickness', label: 'Peel thickness', type: 'number', unit: 'mm', step: 0.1, min: 0 },
    { half: true, k: 'pulpWeight', label: 'Flesh weight', type: 'number', unit: 'g', step: 1, min: 0,
      hint: 'Weight after peeling, for the edible share' },

    { group: 'Look', k: 'shape', label: 'Shape', type: 'select', options: ['Round', 'Oval', 'Oblong', 'Irregular'] },
    { k: 'fleshColor', label: 'Flesh color', type: 'select', options: FLESH },
    { k: 'skinColor', label: 'Skin color', type: 'select', options: SKIN },
    { k: 'bracts', label: 'Bracts (scales)', type: 'select', options: ['Short', 'Medium', 'Long'] },
    { k: 'bractColor', label: 'Bract color', type: 'select', options: ['Green', 'Green tips', 'Red / pink', 'Yellow'] },
    { k: 'cracking', label: 'Cracking', type: 'select', options: ['None', 'Minor', 'Severe'] },
    { k: 'appearance', label: 'Appearance', type: 'rating', low: 'Poor', high: 'Beautiful' },

    { group: 'Taste', k: 'brixEdge', label: 'Brix, near the peel', type: 'number', unit: '°Bx', step: 0.1, min: 0 },
    { k: 'sweetness', label: 'Sweetness', type: 'rating', low: 'Bland', high: 'Very sweet' },
    { k: 'acidity', label: 'Tartness', type: 'rating', low: 'None', high: 'Very tart' },
    { k: 'flavor', label: 'Flavor', type: 'rating', low: 'Watery', high: 'Rich' },
    { k: 'texture', label: 'Texture', type: 'rating', low: 'Mushy', high: 'Firm, crisp' },
    { k: 'seeds', label: 'Seeds', type: 'select', options: ['Few / small', 'Average', 'Many / large'] },
    { k: 'tasteNotes', label: 'Taste notes', type: 'textarea' },

    { group: 'Keeping', k: 'shelfLife', label: 'Shelf life', type: 'number', unit: 'days', step: 1, min: 0,
      hint: 'Days at room temperature before it softened' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],

  logs: [
    { k: 'plantId', label: 'Plant', type: 'ref', ref: 'plants', required: true },
    { k: 'date', label: 'Date', type: 'date', required: true },
    { k: 'kind', label: 'What happened', type: 'select', options: LOG_KINDS, required: true },
    { k: 'count', label: 'How many', type: 'number', step: 1, min: 0, hint: 'Buds, flowers, new stems…' },
    { k: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

// Measurements apply once a fruit is picked, so they stay out of the way while it grows.
for (const f of FIELDS.fruits.slice(FIELDS.fruits.findIndex((x) => x.k === 'weight'))) if (!f.showIf && f.k !== 'notes') f.showIf = picked;

// Stores that can carry photos.
const PHOTO_STORES = ['varieties', 'plants', 'crosses', 'fruits', 'logs'];
