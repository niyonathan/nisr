import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Database, Droplets, Globe2, Lightbulb, MapPinned, Package, Sprout, TrendingDown, Users } from "lucide-react";
import { useData } from "../data";
import { cropText, fmt, pct } from "../format";
import RwandaMap from "../components/RwandaMap";
import { HeroStat, LinkTile, PageHero, RankList, Section, Tabs } from "../components/ui";

function Finding({ icon: Icon, value, title, text, to, tone }) {
  return (
    <Link to={to} className="card group flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(18,59,122,0.12)]">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}><Icon size={24} /></span>
      <b className="num font-display text-4xl leading-none text-nisr-blue">{value}</b>
      <h3 className="text-[17px]">{title}</h3>
      <p className="flex-1 text-[15px] text-nisr-muted">{text}</p>
      <span className="inline-flex items-center gap-1 font-bold text-nisr-blue">Read more <ArrowRight size={16} /></span>
    </Link>
  );
}

const MAP_TOPICS = {
  noWater: { label: "No water for irrigation", get: (d) => d.no_water_rate, fmt: pct, desc: true, title: "Districts lacking water", action: "Build water sources: valley dams, rainwater harvesting." },
  cantAfford: { label: "Can't afford irrigation", get: (d) => d.cannot_afford_irrigation_rate, fmt: pct, desc: true, title: "Where cost blocks irrigation", action: "Equipment subsidies and loans." },
  fert: { label: "Fertilizer use", get: (d) => d.inorganic_fertilizer_rate, fmt: pct, desc: false, title: "Lowest fertilizer use", action: "Input access and extension advice." },
  advice: { label: "Post-harvest advice", get: (d) => d.extension_post_harvest_rate, fmt: pct, desc: false, title: "Least post-harvest advice", action: "Train farmers on drying and storage." },
};

export default function Overview() {
  const D = useData();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("noWater");
  const [district, setDistrict] = useState("Musanze");
  const [crop, setCrop] = useState("Maize");

  const reliable = D.districts.filter((d) => !d.low_sample);
  const worstWater = [...reliable].sort((a, b) => b.no_water_rate - a.no_water_rate)[0];
  const maizeFert = D.getEffects("Maize").find((e) => e.practice === "inorganic_fertilizer");
  const maizeSeed = D.getEffects("Maize").find((e) => e.practice === "improved_seed");
  const mango = D.fruit.find((f) => f.fruit === "Mango");
  const lowMaize = [...D.districtsForCrop("Maize")].sort((a, b) => a.median - b.median)[0];

  const t = MAP_TOPICS[topic];
  const values = Object.fromEntries(D.districts.map((d) => [d.district, t.get(d)]));
  const ranked = reliable.map((d) => ({ label: d.district, value: t.get(d) }))
    .sort((a, b) => (t.desc ? b.value - a.value : a.value - b.value)).slice(0, 5)
    .map((r) => ({ ...r, display: t.fmt(r.value) }));

  const quick = D.getDistrictCrop(district, crop) || D.getCrop(crop);

  return (
    <>
      <PageHero eyebrow="NISR Agricultural Household Survey 2024" title="What Rwanda's farms tell us"
        intro="See how your harvest compares with farms like yours, which practices go with bigger harvests, and where Rwanda should invest in water, soil, storage and markets.">
        <div className="grid grid-cols-2 gap-3.5">
          <HeroStat value={fmt(D.survey.households)} label="farming households surveyed" />
          <HeroStat value={D.survey.districts} label="districts covered" />
          <HeroStat value={fmt(D.survey.cropRecords)} label="crops recorded on plots" />
          <HeroStat value={D.farmCrops.length} label="crops with yield estimates" />
        </div>
      </PageHero>

      {/* Quick farm check */}
      <div className="wrap relative z-10 -mt-14">
        <div className="card grid items-end gap-5 p-6 md:grid-cols-[1fr_1fr_auto_1.2fr]">
          <div><label className="label" htmlFor="q-district">District</label>
            <select id="q-district" className="field" value={district} onChange={(e) => setDistrict(e.target.value)}>{D.districtNames.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label" htmlFor="q-crop">Crop</label>
            <select id="q-crop" className="field" value={crop} onChange={(e) => setCrop(e.target.value)}>{D.farmCrops.map((c) => <option key={c}>{c}</option>)}</select></div>
          <button className="btn-primary justify-center" onClick={() => navigate(`/my-farm?district=${encodeURIComponent(district)}&crop=${encodeURIComponent(crop)}`)}>
            Check my farm <ArrowRight size={18} />
          </button>
          <div className="rounded-xl bg-nisr-mist px-4 py-3">
            <span className="text-sm font-bold text-nisr-muted">Farms like yours harvest about</span>
            <b className="num block font-display text-3xl text-nisr-navy">{fmt(quick?.median)} <small className="text-base font-semibold text-nisr-muted">kg/ha</small></b>
          </div>
        </div>
      </div>

      <Section eyebrow="Key findings" title="Six things the survey shows" intro="Every number comes straight from the AHS 2024 survey, weighted to represent all of Rwanda's farms.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Finding icon={Droplets} tone="bg-[#e3eef9] text-nisr-blue" value={pct(D.national.irrigated)} title="of farm plots are irrigated"
            text={`In ${worstWater.district}, ${pct(worstWater.no_water_rate)} of plots have no water available to irrigate.`} to="/irrigation" />
          <Finding icon={Sprout} tone="bg-[#e2f3e8] text-[#1d7a46]" value={pct(maizeFert.effect, true)} title="maize yield with mineral fertilizer"
            text="Compared with similar maize plots that don't use it, in the same district and season." to="/soil-fertility" />
          <Finding icon={Lightbulb} tone="bg-[#fff1d9] text-[#8a5300]" value={pct(D.national.improved_seed)} title="of crops are grown from improved seed"
            text={`Yet maize from improved seed yields ${pct(maizeSeed.effect, true)} more than similar plots.`} to="/productivity" />
          <Finding icon={TrendingDown} tone="bg-[#fde4e1] text-[#b3261e]" value={pct(D.national.production_decreased)} title="of crops produced less than last season"
            text="Farmers reported a smaller harvest than the season before for four in ten crops grown." to="/productivity" />
          <Finding icon={BarChart3} tone="bg-[#e3eef9] text-nisr-blue" value={`${fmt(lowMaize.median)} kg`} title="per ha: lowest typical maize yield"
            text={`${lowMaize.district}, against ${fmt(D.getCrop("Maize").p75)} kg/ha on Rwanda's better maize farms.`} to="/productivity" />
          <Finding icon={Package} tone="bg-[#ffeedd] text-[#b45a14]" value={pct(mango.sold)} title="of mangoes are sold"
            text={`Most of Rwanda's ${fmt(mango.tonnes)} tonnes of mangoes are eaten at home: room for drying, juice and processing.`} to="/post-harvest" />
        </div>
      </Section>

      <Section alt eyebrow="Districts" title="Where should we act first?" intro="Pick a topic to colour the map. Click any district to open its full profile.">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="card p-6">
            <Tabs label="Map topic" value={topic} onChange={setTopic} options={Object.entries(MAP_TOPICS).map(([value, o]) => ({ value, label: o.label }))} />
            <div className="mt-5"><RwandaMap values={values} format={t.fmt} caption={t.label} /></div>
          </div>
          <div className="card p-6">
            <h3 className="text-lg">{t.title}</h3>
            <p className="mb-3 mt-1 text-[15px] text-nisr-muted">Action: {t.action}</p>
            <RankList rows={ranked} />
          </div>
        </div>
      </Section>

      <Section eyebrow="Explore by topic" title="Go deeper" intro="Each topic page follows the same steps: the main answer, key numbers, a map, and the districts to act on.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LinkTile to="/irrigation" icon={Droplets} title="Irrigation" text="Where farmers lack water, and where they lack money for equipment." />
          <LinkTile to="/soil-fertility" icon={Sprout} title="Soil & Fertility" text="Fertilizer use, erosion risk and how both relate to harvests." />
          <LinkTile to="/productivity" icon={BarChart3} title="Productivity" text="Yield gaps by crop and district, and what the model expects with better inputs." />
          <LinkTile to="/post-harvest" icon={Package} title="Post-harvest & Value" text="What gets sold, what stays home, and where advice on storage is missing." />
          <LinkTile to="/exports" icon={Globe2} title="Exports" text="Where coffee, avocado and other export crops are grown, and how well." />
          <LinkTile to="/districts" icon={MapPinned} title="District profiles" text="All indicators for each of Rwanda's 30 districts on one page." />
        </div>
      </Section>

      <Section alt eyebrow="How it works" title="From a national survey to local decisions">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [Database, "1. The survey", `NISR visited ${fmt(D.survey.households)} farming households in all 30 districts and recorded ${fmt(D.survey.cropRecords)} crops on their plots: area, harvest, seed, fertilizer, water and soil care.`],
            [BarChart3, "2. The analysis", `We calculated yield for ${fmt(D.survey.validYields)} crops, weighted results to represent all of Rwanda, compared similar plots with and without each practice, and hid any group under 30 plots.`],
            [Users, "3. The decisions", "Farmers see what farms like theirs achieve and what helps. Planners see which districts need water, inputs, advice or market support first."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="card p-6">
              <Icon size={28} className="text-nisr-blue" />
              <h3 className="mt-3 text-lg">{title}</h3>
              <p className="mt-2 text-[15px] text-nisr-muted">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[15px] text-nisr-muted">
          Want the details? Read the <Link to="/about" className="font-bold">data and method</Link>. Typical {cropText("Maize")} figures on this page use {fmt(D.getCrop("Maize").n)} surveyed maize plots.
        </p>
      </Section>
    </>
  );
}
