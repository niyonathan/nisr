import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Compass, Landmark, MapPinned, Wheat } from "lucide-react";
import { useData } from "../data";
import { useFarm } from "../farm";
import { fmt } from "../format";
import AskBox from "../components/AskBox";
import { HELP_TOPICS } from "../components/Layout";
import { Section } from "../components/ui";

const START = [
  { to: "/my-farm", icon: Wheat, title: "Estimate my harvest", text: "Answer 5 quick questions and get a written report for your field.", who: "For farmers" },
  { to: "/rwanda#where-to-act", icon: Landmark, title: "Where to invest", text: "Districts that need water, fertilizer or training first.", who: "For planners" },
  { to: "/districts", icon: MapPinned, title: "My district", text: "Everything the survey found about farming in one district.", who: "For everyone" },
  { to: "/rwanda", icon: Compass, title: "Rwanda at a glance", text: "The big picture: key findings and maps for all 30 districts.", who: "For everyone" },
];

export default function Home() {
  const D = useData();
  const { farm } = useFarm();
  const [params] = useSearchParams();
  const inputRef = useRef(null);
  const q = params.get("q");
  useEffect(() => { if (params.get("ask")) inputRef.current?.focus(); }, [params]);

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b63b4] via-nisr-blue to-[#0a4f94]">
        <div className="wrap relative z-10 pb-24 pt-14">
          <div className="mx-auto max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9fd3f5]">NISR Agricultural Household Survey 2024</span>
            <h1 className="mt-3 text-[34px] leading-[1.1] text-white sm:text-5xl">
              {farm.district ? `What would you like to know about your farm in ${farm.district}?` : "What would you like to know about your farm?"}
            </h1>
            <p className="mb-7 mt-4 text-lg text-[#d8e8f8]">
              Ask in your own words. Answers come from {fmt(D.survey.households)} farming households surveyed in all {D.survey.districts} districts of Rwanda.
            </p>
            <AskBox ref={inputRef} initialQuestion={q} />
          </div>
        </div>
        <svg className="absolute inset-x-0 -bottom-px z-0 h-[90px] w-full" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120 C 220 70 420 80 620 110 S 980 140 1180 100 S 1380 90 1440 105 V150 H0Z" fill="#fff" opacity=".16" />
          <path d="M0 132 C 260 110 520 112 760 128 S 1200 140 1440 122 V150 H0Z" fill="#fff" />
        </svg>
      </div>

      <Section eyebrow="Or start with what you need" title="Choose a starting point">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {START.map((s) => (
            <Link key={s.title} to={s.to} className="card group flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(18,59,122,0.12)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e3eef9] text-nisr-blue"><s.icon size={24} /></span>
              <span className="text-xs font-semibold uppercase tracking-wide text-nisr-muted">{s.who}</span>
              <span className="font-display text-lg text-nisr-navy">{s.title}</span>
              <span className="flex-1 text-[15px] text-nisr-muted">{s.text}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-nisr-blue">Start <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </Section>

      <Section alt eyebrow="What do you need help with?" title="Get help on a specific problem"
        intro="Each area answers one of the questions farmers and planners ask most, using the survey data.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {HELP_TOPICS.map((t) => (
            <Link key={t.to} to={t.to} className="card group flex flex-col gap-2 p-5 transition hover:shadow-[0_12px_28px_rgba(18,59,122,0.12)]">
              <t.icon size={26} className="text-nisr-blue" />
              <span className="font-display text-[17px] text-nisr-navy">{t.label}</span>
              <span className="flex-1 text-[15px] text-nisr-muted">{t.text}</span>
              <span className="w-fit rounded bg-[#e3eef9] px-1.5 py-0.5 text-[11px] font-semibold text-nisr-blue">Challenge area: {t.challenge}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 text-center sm:grid-cols-4">
          {[[fmt(D.survey.households), "farming households surveyed"], [D.survey.districts, "districts covered"], [fmt(D.survey.cropRecords), "crops recorded on plots"], [D.farmCrops.length, "crops with harvest estimates"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-nisr-mist px-4 py-5">
              <b className="num block font-display text-3xl text-nisr-navy">{v}</b>
              <span className="text-[15px] text-nisr-muted">{l}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
