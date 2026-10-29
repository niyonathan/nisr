/**
 * Rule-based question answering over the AHS 2024 summaries.
 * It recognises a district, a crop and a topic in the question, then writes the answer from
 * the survey numbers. It never invents a figure: if something is missing it asks for it.
 * Text uses **double asterisks** for emphasis; the UI renders those parts in bold.
 */
import { cropText, fmt, pct } from "./format";

/** Plain user-facing areas, each tied to a Track 1 challenge area for the judges. */
export const AREAS = {
  harvest: { label: "Estimate my harvest", challenge: "Agricultural productivity", to: "/my-farm" },
  water: { label: "Water for my crops", challenge: "Small-scale irrigation", to: "/irrigation" },
  soil: { label: "Improve my soil", challenge: "Soil conservation & fertility management", to: "/soil-fertility" },
  compare: { label: "Compare harvests", challenge: "Agricultural productivity", to: "/productivity" },
  store: { label: "Store and sell my harvest", challenge: "Post-harvest storage, processing & value addition", to: "/post-harvest" },
  export: { label: "Crops for export", challenge: "Export market opportunities", to: "/exports" },
  invest: { label: "Where to invest", challenge: "All areas: planning and policy", to: "/rwanda#where-to-act" },
};

// Longer phrases first so "sweet potato" wins over "potato".
const CROP_WORDS = [
  ["sweet potato", "Sweet potato"], ["ibijumba", "Sweet potato"],
  ["climbing bean", "Climbing bean"], ["bush bean", "Bush bean"], ["french bean", "French beans"],
  ["irish potato", "Irish potato"], ["potato", "Irish potato"], ["ibirayi", "Irish potato"],
  ["maize", "Maize"], ["corn", "Maize"], ["ibigori", "Maize"],
  ["bean", "Bush bean"], ["ibishyimbo", "Bush bean"],
  ["cassava", "Cassava"], ["imyumbati", "Cassava"],
  ["cooking banana", "Cooking banana"], ["dessert banana", "Dessert banana"], ["banana", "Cooking banana"], ["ibitoki", "Cooking banana"],
  ["rice", "Paddy rice"], ["umuceri", "Paddy rice"],
  ["sorghum", "Sorghum"], ["amasaka", "Sorghum"],
  ["soy", "Soybean"], ["wheat", "Wheat"], ["ingano", "Wheat"],
  ["groundnut", "Groundnut"], ["peanut", "Groundnut"], ["pea", "Pea"], ["taro", "Taro"],
  ["coffee", "Coffee"], ["ikawa", "Coffee"], ["tomato", "Tomato"], ["cabbage", "Cabbage"],
  ["eggplant", "Eggplant"], ["sunflower", "Sun flower"],
];
const FRUIT_WORDS = ["avocado", "mango", "papaya", "guava", "orange", "lemon", "tree tomato", "fruit", "milk"];

const TOPIC_WORDS = [
  ["invest", ["invest", "priorit", "which district", "where should", "government", "policy", "planner", "budget", "most need"]],
  ["export", ["export", "abroad", "foreign", "international"]],
  ["water", ["water", "irrigat", "dry", "drought", "rain", "pump", "amazi"]],
  ["soil", ["soil", "fertiliz", "fertilis", "manure", "compost", "npk", "dap", "urea", "erosion", "terrace", "ifumbire"]],
  ["store", ["store", "storage", "sell", "sold", "market", "price", "buyer", "spoil", "rot", "lose", "loss", "process", "dry my", "after harvest", "post-harvest", "value"]],
  ["compare", ["compare", "versus", " vs ", "better than", "best district", "highest", "lowest"]],
  ["harvest", ["harvest", "yield", "grow more", "produce", "production", "increase", "how much", "improve", "more"]],
];

const has = (q, word) => new RegExp(`(^|[^a-z])${word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(q);

export function parseQuestion(text, D) {
  const q = ` ${text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ")} `;
  const districts = D.districtNames.filter((d) => q.includes(d.toLowerCase()));
  let crop = null;
  for (const [word, name] of CROP_WORDS) {
    if (has(q, word) && D.getCrop(name)) { crop = name; break; }
  }
  const fruit = FRUIT_WORDS.find((f) => has(q, f)) || null;
  const topic = TOPIC_WORDS.find(([, words]) => words.some((w) => has(q, w)))?.[0] || null;
  return { districts, district: districts[0] || null, crop, fruit, topic };
}

const effectFor = (D, crop, practice) => D.getEffects(crop).find((e) => e.practice === practice);
const clearEffects = (D, crop) =>
  D.getEffects(crop).filter((e) => e.sig && e.effect > 0 && ["improved_seed", "inorganic_fertilizer", "organic_fertilizer", "pesticide", "anti_erosion"].includes(e.practice))
    .sort((a, b) => b.effect - a.effect);
const districtLink = (d) => ({ to: `/districts/${encodeURIComponent(d)}`, label: `Everything about ${d}` });

function harvestAnswer(D, district, crop) {
  const nat = D.getCrop(crop);
  const local = D.getDistrictCrop(district, crop);
  const src = local || nat;
  const diff = local ? local.median / nat.median - 1 : null;
  const helps = clearEffects(D, crop);
  const paragraphs = [
    local
      ? `Farms growing ${cropText(crop)} in ${district} usually harvest about **${fmt(local.median)} kg per hectare**. That is ${diff >= 0 ? `**${pct(diff)} above**` : `**${pct(-diff)} below**`} the average for Rwanda (${fmt(nat.median)} kg).`
      : `There are too few ${cropText(crop)} farms surveyed in ${district} to give a local figure. Across Rwanda, farms usually harvest about **${fmt(nat.median)} kg per hectare**.`,
    `The best quarter of these farms harvest **${fmt(src.p75)} kg per hectare or more**, so there is room to grow.`,
    helps.length
      ? `In the survey, ${cropText(crop)} plots harvest more when farmers use ${helps.slice(0, 3).map((e) => `**${e.label.toLowerCase()}** (${pct(e.effect, true)})`).join(", ")}, compared with similar plots that don't.`
      : `The survey doesn't show a clear link between any single practice and bigger ${cropText(crop)} harvests yet. Ask your sector agronomist about the best varieties and spacing.`,
  ];
  return {
    area: "harvest",
    title: `Your ${cropText(crop)} harvest in ${district}`,
    facts: [
      { label: "Usual harvest", value: `${fmt(src.median)} kg/ha` },
      { label: "Best farms", value: `${fmt(src.p75)}+ kg/ha` },
      { label: "Based on", value: `${fmt(src.n)} plots` },
    ],
    paragraphs,
    links: [
      { to: `/my-farm?district=${encodeURIComponent(district)}&crop=${encodeURIComponent(crop)}`, label: "Get my full harvest report" },
      districtLink(district),
    ],
    followUps: [`Water for crops in ${district}`, `Is fertilizer worth it for ${cropText(crop)}?`, `Where is ${cropText(crop)} harvest highest?`],
  };
}

function waterAnswer(D, district) {
  const d = D.getDistrict(district), N = D.national;
  const big = d.no_water_rate >= d.cannot_afford_irrigation_rate;
  return {
    area: "water",
    title: `Water for crops in ${district}`,
    facts: [
      { label: "Plots irrigated", value: pct(d.irrigated_rate) },
      { label: "No water nearby", value: pct(d.no_water_rate) },
      { label: "Can't afford it", value: pct(d.cannot_afford_irrigation_rate) },
    ],
    paragraphs: [
      `Only **${pct(d.irrigated_rate)}** of farm plots in ${district} are irrigated (Rwanda: ${pct(N.irrigated)}).`,
      `On **${pct(d.no_water_rate)}** of plots farmers say there is no water to use, and on **${pct(d.cannot_afford_irrigation_rate)}** water exists but equipment costs too much.`,
      big
        ? `Here the main problem is **missing water**. Rainwater harvesting tanks, valley dams and shared water channels would help most. Ask your sector office about local projects.`
        : `Here the main problem is **cost**. Ask your SACCO or sector office about subsidies for pumps and small irrigation kits, or share equipment through a cooperative.`,
    ],
    links: [{ to: "/irrigation", label: "Water for crops across Rwanda" }, districtLink(district)],
    followUps: [`Improve my soil in ${district}`, `Which districts lack water most?`, `Maize harvest in ${district}`],
  };
}

function soilAnswer(D, district, crop) {
  const d = district ? D.getDistrict(district) : null, N = D.national;
  const fert = crop ? effectFor(D, crop, "inorganic_fertilizer") : null;
  const manure = crop ? effectFor(D, crop, "organic_fertilizer") : null;
  const paragraphs = [];
  if (d) paragraphs.push(`In ${district}, **${pct(d.inorganic_fertilizer_rate)}** of plots use fertilizer (Rwanda: ${pct(N.inorganic_fertilizer)}) and **${pct(d.organic_fertilizer_rate)}** use manure or compost. **${pct(d.erosion_threat_rate)}** report erosion and ${pct(d.anti_erosion_rate)} have terraces, ditches or grass strips.`);
  if (crop && fert) paragraphs.push(fert.sig && fert.effect > 0
    ? `${crop} plots that use fertilizer harvest **${pct(fert.effect, true)}** compared with similar plots without it.`
    : `For ${cropText(crop)}, the survey doesn't show a clear harvest gain from fertilizer yet (${pct(fert.effect, true)}, not enough evidence).`);
  if (crop && manure && manure.sig && manure.effect > 0) paragraphs.push(`Manure or compost goes with **${pct(manure.effect, true)}** on ${cropText(crop)} plots.`);
  if (!crop) {
    const top = D.effects.filter((e) => e.practice === "inorganic_fertilizer" && e.sig && e.effect > 0).sort((a, b) => b.effect - a.effect).slice(0, 3);
    paragraphs.push(`Fertilizer goes with the biggest harvest gains for ${top.map((e) => `**${cropText(e.crop)}** (${pct(e.effect, true)})`).join(", ")}.`);
  }
  paragraphs.push("Keep slopes covered, maintain terraces before the rains, and ask your agronomist which fertilizer and amount suit your crop.");
  return {
    area: "soil",
    title: `Improve the soil${district ? ` in ${district}` : ""}${crop ? ` for ${cropText(crop)}` : ""}`,
    facts: d ? [
      { label: "Use fertilizer", value: pct(d.inorganic_fertilizer_rate) },
      { label: "Use manure", value: pct(d.organic_fertilizer_rate) },
      { label: "Report erosion", value: pct(d.erosion_threat_rate) },
    ] : [],
    paragraphs,
    links: [{ to: "/soil-fertility", label: "Soil and fertilizer across Rwanda" }, ...(district ? [districtLink(district)] : [])],
    followUps: [district ? `Water for crops in ${district}` : "Which districts lack water most?", `Is fertilizer worth it for ${crop ? cropText(crop) : "beans"}?`, "Where to invest first?"],
  };
}

function storeAnswer(D, district, fruit) {
  const N = D.national;
  const d = district ? D.getDistrict(district) : null;
  const f = fruit && fruit !== "fruit" && fruit !== "milk" ? D.fruit.find((x) => x.fruit.toLowerCase() === fruit) : null;
  const avocado = D.fruit.find((x) => x.fruit === "Avocado"), mango = D.fruit.find((x) => x.fruit === "Mango");
  const milkSold = D.milk.reduce((s, m) => s + m.sold * m.n, 0) / D.milk.reduce((s, m) => s + m.n, 0);
  const paragraphs = [
    d
      ? `Only **${pct(d.extension_post_harvest_rate)}** of farming households in ${district} got advice on storing their harvest this season (Rwanda: ${pct(N.extension_post_harvest)}).`
      : `Only **${pct(N.extension_post_harvest)}** of farming households in Rwanda got advice on storing their harvest this season.`,
    f
      ? `${f.fruit}: about **${fmt(f.tonnes)} tonnes** are grown, and **${pct(f.sold)}** is sold at around ${fmt(f.price)} RWF/kg. Most is grown in ${f.topDistrict}.`
      : fruit === "milk"
        ? `About **${pct(milkSold)}** of the milk that households produce is sold; the rest is used at home.`
        : `Most fruit is eaten at home: only **${pct(mango.sold)}** of mangoes are sold, against **${pct(avocado.sold)}** of avocados. Drying, juice-making and selling through cooperatives can turn more of the harvest into income.`,
    "Dry crops well before storing, use sealed (hermetic) bags against insects, and compare several buyers before selling.",
  ];
  return {
    area: "store",
    title: `Store and sell your harvest${district ? ` in ${district}` : ""}`,
    facts: [],
    paragraphs,
    links: [{ to: "/post-harvest", label: "Storage and selling across Rwanda" }, ...(district ? [districtLink(district)] : [])],
    followUps: ["How much avocado is sold?", district ? `Water for crops in ${district}` : "Which districts lack water most?", "Crops for export"],
  };
}

function exportAnswer(D) {
  const c = D.getCrop("Coffee");
  const avocado = D.fruit.find((x) => x.fruit === "Avocado");
  const best = D.districtsForCrop("Coffee").sort((a, b) => b.median - a.median)[0];
  return {
    area: "export",
    title: "Crops for export",
    facts: [{ label: "Coffee, usual harvest", value: `${fmt(c.median)} kg/ha` }, { label: "Avocado sold", value: pct(avocado.sold) }],
    paragraphs: [
      `Coffee was found on **${fmt(c.n)}** surveyed plots, usually harvesting **${fmt(c.median)} kg per hectare**; ${best.district} leads with ${fmt(best.median)} kg.`,
      `Avocado is the most commercial fruit: **${pct(avocado.sold)}** of about ${fmt(avocado.tonnes)} tonnes is sold, mostly from ${avocado.topDistrict}.`,
      "Export earnings and destinations come from NISR's trade statistics, which are not part of this farm survey.",
    ],
    links: [{ to: "/exports", label: "Crops for export" }],
    followUps: ["How much avocado is sold?", "Where is coffee harvest highest?", "Where to invest first?"],
  };
}

function investAnswer(D) {
  const r = D.districts.filter((d) => !d.low_sample);
  const top = (k, asc = false) => [...r].sort((a, b) => (asc ? a[k] - b[k] : b[k] - a[k])).slice(0, 3);
  const list = (rows, k) => rows.map((d) => `**${d.district}** (${pct(d[k])})`).join(", ");
  return {
    area: "invest",
    title: "Where to invest first",
    facts: [],
    paragraphs: [
      `**Water sources** (dams, rainwater harvesting): plots with no water are most common in ${list(top("no_water_rate"), "no_water_rate")}.`,
      `**Irrigation equipment support** (subsidies, loans): cost blocks irrigation most in ${list(top("cannot_afford_irrigation_rate"), "cannot_afford_irrigation_rate")}.`,
      `**Fertilizer access**: use is lowest in ${list(top("inorganic_fertilizer_rate", true), "inorganic_fertilizer_rate")}.`,
      `**Storage training**: post-harvest advice reaches fewest households in ${list(top("extension_post_harvest_rate", true), "extension_post_harvest_rate")}.`,
    ],
    links: [{ to: "/rwanda#where-to-act", label: "See it on the map" }, { to: "/districts", label: "All 30 districts" }],
    followUps: [`Water for crops in ${top("no_water_rate")[0].district}`, "Crops for export", "Where is maize harvest highest?"],
  };
}

function compareAnswer(D, crop, districts) {
  const rows = D.districtsForCrop(crop).sort((a, b) => b.median - a.median);
  const picked = districts.length >= 2 ? districts.map((d) => D.getDistrictCrop(d, crop)).filter(Boolean) : [];
  const paragraphs = picked.length >= 2
    ? picked.map((r) => `In **${r.district}**, ${cropText(crop)} farms usually harvest **${fmt(r.median)} kg per hectare** (best farms ${fmt(r.p75)}+).`)
    : [
      `${crop} harvest is highest in ${rows.slice(0, 3).map((r) => `**${r.district}** (${fmt(r.median)} kg/ha)`).join(", ")}.`,
      `It is lowest in ${rows.slice(-3).reverse().map((r) => `**${r.district}** (${fmt(r.median)} kg/ha)`).join(", ")}.`,
    ];
  return {
    area: "compare",
    title: `Compare ${cropText(crop)} harvests`,
    facts: [{ label: "Average for Rwanda", value: `${fmt(D.getCrop(crop).median)} kg/ha` }],
    paragraphs,
    links: [{ to: "/productivity", label: "Compare harvests for every crop" }],
    followUps: [`Is fertilizer worth it for ${cropText(crop)}?`, `${crop} harvest in ${rows[rows.length - 1]?.district || "Musanze"}`, "Where to invest first?"],
  };
}

function districtAnswer(D, district) {
  const d = D.getDistrict(district);
  const crops = D.cropsInDistrict(district).sort((a, b) => b.n - a.n).slice(0, 3);
  return {
    area: "invest",
    title: `Farming in ${district}`,
    facts: [
      { label: "Plots irrigated", value: pct(d.irrigated_rate) },
      { label: "Use fertilizer", value: pct(d.inorganic_fertilizer_rate) },
      { label: "Got farm advice", value: pct(d.extension_this_season_rate) },
    ],
    paragraphs: [
      `${district} is in ${d.province} Province. The survey visited **${d.n_households}** farming households there.`,
      `The most common crops are ${crops.map((c) => `**${cropText(c.crop)}** (usually ${fmt(c.median)} kg/ha)`).join(", ")}.`,
    ],
    links: [districtLink(district)],
    followUps: crops.map((c) => `${c.crop} harvest in ${district}`).concat(`Water for crops in ${district}`).slice(0, 3),
  };
}

/**
 * Turns a question into an answer, or into a follow-up question when the district or crop is missing.
 * farm: the remembered {district, crop}, used to fill gaps.
 */
export function answer(text, D, farm = {}) {
  const p = parseQuestion(text, D);
  const district = p.district || null;
  const crop = p.crop || null;
  const topic = p.topic || (crop && district ? "harvest" : crop ? "compare" : district ? "district" : null);

  if (topic === "invest") return investAnswer(D);
  if (topic === "compare" || (topic === "harvest" && /highest|lowest|best|where is/i.test(text))) {
    const c = crop || farm.crop;
    if (!c) return { ask: "crop", question: "Which crop should I compare?", text };
    return compareAnswer(D, c, p.districts);
  }
  if (topic === "export" || (crop === "Coffee" && !district)) return exportAnswer(D);
  if (topic === "store") return storeAnswer(D, district || farm.district, p.fruit);
  if (topic === "soil") return soilAnswer(D, district || farm.district, crop || farm.crop);
  if (topic === "water") {
    const d = district || farm.district;
    if (!d) return { ask: "district", question: "Which district is your farm in?", text };
    return waterAnswer(D, d);
  }
  if (topic === "harvest") {
    const d = district || farm.district, c = crop || farm.crop;
    if (!d) return { ask: "district", question: "Which district is your farm in?", text };
    if (!c) return { ask: "crop", question: "Which crop do you grow?", text };
    return harvestAnswer(D, d, c);
  }
  if (topic === "district") return districtAnswer(D, district);
  return {
    unknown: true,
    title: "I couldn't match that to the survey data",
    paragraphs: ["I can answer questions about **harvests, water, soil and fertilizer, storage and selling, and export crops**, for any of Rwanda's 30 districts. Try one of these:"],
    followUps: ["How can I grow more maize in Musanze?", "Water for crops in Kayonza", "Where to invest first?"],
  };
}

/** Adds the missing district or crop to the original question and answers again. */
export function completeQuestion(pending, value) {
  return pending.ask === "district" ? `${pending.text} in ${value}` : `${pending.text} ${value}`;
}

export const SUGGESTIONS = [
  "How can I grow more maize in Musanze?",
  "Which districts lack water most?",
  "Is fertilizer worth it for Irish potato?",
  "How can I store and sell my avocados?",
];
