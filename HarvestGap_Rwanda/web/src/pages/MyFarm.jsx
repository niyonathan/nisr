import { Link, useSearchParams } from "react-router-dom";
import { Check, Droplets, Package, Sprout, Mountain, TrendingUp } from "lucide-react";
import { useData } from "../data";
import { cropText, fmt, pct } from "../format";
import { BarList, Card, Note, PageHero, Pill, Section } from "../components/ui";

const FARM_PRACTICES = [
  ["improved_seed", "Improved seed"],
  ["inorganic_fertilizer", "Mineral fertilizer (NPK, DAP, urea)"],
  ["organic_fertilizer", "Manure or compost"],
  ["pesticide", "Pesticide or fungicide"],
];

/** Where this farm's district sits against Rwanda: middle-half band plus two markers. */
function RangeBar({ local, national, place }) {
  const max = Math.max(local.p75, national.p75) * 1.2;
  const pos = (v) => `${(100 * v) / max}%`;
  return (
    <div>
      <div className="relative mt-8 h-3 rounded-full bg-[#e6edf5]">
        <div className="absolute inset-y-0 rounded-full bg-[#a9cbee]" style={{ left: pos(local.p25), width: `calc(${pos(local.p75)} - ${pos(local.p25)})` }} />
        {[[national.median, `Rwanda ${fmt(national.median)}`, "-top-7", "#123b7a"], [local.median, `${place} ${fmt(local.median)}`, "top-5", "#0a5ca8"]].map(([v, label, at, color]) => (
          <span key={label} className={`absolute ${at} -translate-x-1/2 whitespace-nowrap text-xs font-bold`} style={{ left: pos(v), color }}>
            {label}
          </span>
        ))}
        <span className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded bg-nisr-navy" style={{ left: pos(national.median) }} />
        <span className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded bg-nisr-blue" style={{ left: pos(local.median) }} />
      </div>
      <p className="mt-10 text-sm text-nisr-muted">Shaded band: the middle half of farms, {fmt(local.p25)}–{fmt(local.p75)} kg/ha.</p>
    </div>
  );
}

export default function MyFarm() {
  const D = useData();
  const [params, setParams] = useSearchParams();
  const district = D.districtNames.includes(params.get("district")) ? params.get("district") : "Musanze";
  const crop = D.farmCrops.includes(params.get("crop")) ? params.get("crop") : "Maize";
  const area = Math.max(0.01, parseFloat(params.get("area")) || 0.5);
  const used = new Set((params.get("uses") || "").split(",").filter(Boolean));

  const update = (patch) => {
    const next = { district, crop, area: String(area), uses: [...used].join(","), ...patch };
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== "")), { replace: true });
  };
  const toggle = (p) => {
    const s = new Set(used);
    s.has(p) ? s.delete(p) : s.add(p);
    update({ uses: [...s].join(",") });
  };

  const national = D.getCrop(crop);
  const local = D.getDistrictCrop(district, crop);
  const src = local || national;
  const place = local ? district : "Rwanda";
  const diff = src.median / national.median - 1;
  const effects = D.getEffects(crop).filter((e) => FARM_PRACTICES.some(([p]) => p === e.practice) && e.effect > 0).sort((a, b) => b.sig - a.sig || b.effect - a.effect);
  const notYet = effects.filter((e) => e.sig && !used.has(e.practice));
  const scenario = D.getScenario(district, crop);
  const info = D.getDistrict(district);

  const others = D.districtsForCrop(crop).sort((a, b) => b.median - a.median)
    .map((r) => ({ label: r.district, value: r.median, display: `${fmt(r.median)} kg/ha`, highlight: r.district === district, to: `/districts/${encodeURIComponent(r.district)}` }));

  const advice = [
    {
      icon: Droplets, title: "Water",
      text: `${pct(info.irrigated_rate)} of plots in ${district} are irrigated. ${pct(info.no_water_rate)} have no water nearby and ${pct(info.cannot_afford_irrigation_rate)} can't afford equipment. Ask your sector agronomist about rainwater harvesting or shared irrigation.`,
      tone: info.no_water_rate + info.cannot_afford_irrigation_rate >= 0.4 ? ["red", "High need"] : info.no_water_rate + info.cannot_afford_irrigation_rate >= 0.15 ? ["amber", "Medium need"] : ["green", "Low need"],
    },
    {
      icon: Sprout, title: "Soil fertility",
      text: `${pct(info.inorganic_fertilizer_rate)} of plots here use mineral fertilizer and ${pct(info.organic_fertilizer_rate)} use manure or compost.${local ? ` For ${cropText(crop)} in ${district}, ${pct(local.fert)} use mineral fertilizer.` : ""}`,
      tone: ["blue", "Survey data"],
    },
    {
      icon: Mountain, title: "Soil conservation",
      text: `${pct(info.anti_erosion_rate)} of plots have terraces, ditches or grass strips; ${pct(info.erosion_threat_rate)} report erosion. Keep slopes covered and maintain terraces before the rains.`,
      tone: ["blue", "Survey data"],
    },
    {
      icon: Package, title: "After harvest",
      text: `Only ${pct(info.extension_post_harvest_rate)} of farm households in ${district} received post-harvest advice this season. Dry produce well, store it in sealed bags, and compare buyers before selling.`,
      tone: ["grey", "General advice"],
    },
  ];

  return (
    <>
      <PageHero compact eyebrow="My Farm" title="How does my harvest compare?"
        intro="Choose your district, crop and land size. See what similar farms harvested in the 2024 survey, and what was linked to bigger harvests." />

      <div className="wrap relative z-10 -mt-16 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form className="card grid content-start gap-4 p-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="district">District</label>
              <select id="district" className="field" value={district} onChange={(e) => update({ district: e.target.value })}>{D.districtNames.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div><label className="label" htmlFor="crop">Crop</label>
              <select id="crop" className="field" value={crop} onChange={(e) => update({ crop: e.target.value })}>{D.farmCrops.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="label" htmlFor="area">Land size (hectares)</label>
            <input id="area" className="field" type="number" min="0.01" max="100" step="0.05" defaultValue={area} inputMode="decimal"
              onChange={(e) => parseFloat(e.target.value) > 0 && update({ area: e.target.value })} /></div>
          <fieldset>
            <legend className="label">What do you already use?</legend>
            <div className="grid gap-2">
              {FARM_PRACTICES.map(([p, label]) => (
                <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${used.has(p) ? "border-nisr-blue bg-[#f1f7fd]" : "border-[#d6e2ef]"}`}>
                  <input type="checkbox" className="h-[18px] w-[18px] accent-nisr-blue" checked={used.has(p)} onChange={() => toggle(p)} /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <Note>Results update as you change your answers. Your answers stay in this page's link, so you can share it.</Note>
        </form>

        <div className="card grid content-start gap-6 p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <span className="text-sm font-bold text-nisr-muted">Farms like yours harvest about</span>
              <b className="num block font-display text-5xl text-nisr-navy">{fmt(src.median)} <small className="text-lg font-semibold text-nisr-muted">kg/ha</small></b>
              <div className="mt-2.5"><Pill tone={diff >= 0.05 ? "green" : diff <= -0.05 ? "amber" : "blue"}>{pct(diff, true)} vs Rwanda's typical {cropText(crop)} farm</Pill></div>
            </div>
            <div>
              <span className="text-sm font-bold text-nisr-muted">On {area} ha that is roughly</span>
              <b className="num block font-display text-5xl text-nisr-navy">{fmt(src.median * area)} <small className="text-lg font-semibold text-nisr-muted">kg</small></b>
              <p className="mt-2.5 text-sm text-nisr-muted">Based on {fmt(src.n)} {cropText(crop)} plots {local ? `in ${district}` : `across Rwanda (too few in ${district})`}, AHS 2024.</p>
            </div>
          </div>
          <RangeBar local={src} national={national} place={place} />
          <div className="rounded-xl border border-[#cfe1f4] bg-[#f1f7fd] p-5">
            <b className="num font-display text-2xl text-nisr-blue">{fmt(src.p75)} kg/ha or more</b>
            <p className="mt-1 text-[15px] text-nisr-muted">
              is what the best quarter of these farms harvest.{" "}
              {notYet.length ? <>Linked to bigger harvests, not used yet: <b className="text-nisr-navy">{notYet.map((e) => e.label.toLowerCase()).join(", ")}</b>.</> : "You already use the practices most linked to bigger harvests."}
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-lg">What goes with bigger {cropText(crop)} harvests</h3>
            {effects.length ? (
              <BarList rows={effects.map((e) => ({ label: `${e.label}${used.has(e.practice) ? " ✓" : ""}`, value: e.effect, display: pct(e.effect, true), faint: !e.sig }))} />
            ) : <p className="text-nisr-muted">No clear links measured for this crop yet.</p>}
            <div className="mt-3"><Note>Yield on plots using each practice vs similar plots that don't (same district and season). Faded: not statistically clear. ✓ = you use it.</Note></div>
          </div>
        </div>
      </div>

      {scenario && (
        <Section title={`What if more ${cropText(crop)} farms in ${district} used better inputs?`}
          intro="Our yield model estimates the average harvest if plots without these inputs adopted them, at the amounts similar farmers use.">
          <div className="grid gap-5 md:grid-cols-3">
            <Card><span className="text-sm font-bold text-nisr-muted">Model estimate today</span><b className="num block font-display text-4xl text-nisr-navy">{fmt(scenario.now)} <small className="text-base">kg/ha</small></b></Card>
            <Card><span className="text-sm font-bold text-nisr-muted">With {scenario.inputs.toLowerCase()}</span><b className="num block font-display text-4xl text-nisr-blue">{fmt(scenario.withInputs)} <small className="text-base">kg/ha</small></b></Card>
            <Card><span className="text-sm font-bold text-nisr-muted">Expected change</span><b className="num flex items-center gap-2 font-display text-4xl text-[#1d7a46]"><TrendingUp /> {pct(scenario.gain, true)}</b>
              <p className="mt-1 text-sm text-nisr-muted">{pct(scenario.lacking)} of these plots don't use them yet.</p></Card>
          </div>
          <div className="mt-4"><Note>A model estimate for similar plots, not a promise. Weather, pests and soil also matter.</Note></div>
        </Section>
      )}

      <Section alt title={`${crop}: how ${district} compares`} intro={`Typical ${cropText(crop)} yield in every district with at least 30 surveyed plots. ${district} is highlighted.`}>
        <div className="card p-6">
          {others.length ? <BarList rows={others} /> : <p className="text-nisr-muted">Not enough district data for this crop.</p>}
        </div>
      </Section>

      <Section title={`Advice for farms in ${district}`} intro="Based on what the survey recorded in your district. Confirm crop-specific choices with your sector agronomist.">
        <div className="grid gap-5 md:grid-cols-2">
          {advice.map(({ icon: Icon, title, text, tone }) => (
            <div key={title} className="card flex gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e3eef9] text-nisr-blue"><Icon size={24} /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg">{title}</h3><Pill tone={tone[0]}>{tone[1]}</Pill></div>
                <p className="mt-1.5 text-[15px] text-nisr-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 text-[15px] text-nisr-muted"><Check size={18} className="text-[#1d7a46]" /> See everything about {district} on its <Link className="font-bold" to={`/districts/${encodeURIComponent(district)}`}>district profile</Link>.</div>
      </Section>
    </>
  );
}
