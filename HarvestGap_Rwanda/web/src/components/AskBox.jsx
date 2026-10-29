import { forwardRef, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Loader2, MessageCircle, Send } from "lucide-react";
import { useData } from "../data";
import { useFarm } from "../farm";
import { AREAS, answer, completeQuestion, parseQuestion, SUGGESTIONS } from "../advisor";

/** Renders text where **double asterisks** mark the important numbers. */
export function Rich({ text }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i} className="text-nisr-navy">{part}</b> : part));
}

const THINKING = (d, c) => [
  d && c ? `Finding ${c.toLowerCase()} farms in ${d}…` : d ? `Looking up farms in ${d}…` : "Reading the question…",
  "Comparing with the average for Rwanda…",
  "Checking what farmers who harvest more do…",
  "Writing the answer…",
];

/** "Thinking" steps shown before an answer, so users see the data being used. */
function Thinking({ steps, done }) {
  return (
    <ul className="grid gap-1.5 text-[15px] text-nisr-muted" aria-live="polite">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-2 transition-opacity ${i <= done ? "opacity-100" : "opacity-0"}`}>
          {i < done ? <Check size={16} className="text-[#1d7a46]" /> : <Loader2 size={16} className="animate-spin text-nisr-blue" />}
          {s}
        </li>
      ))}
    </ul>
  );
}

function AnswerCard({ result, onAsk }) {
  const area = AREAS[result.area];
  return (
    <div className="card p-5 sm:p-6">
      {area && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#e3eef9] px-2.5 py-1 font-semibold text-nisr-blue">{area.label}</span>
          <span className="text-nisr-muted">Challenge area: {area.challenge}</span>
        </div>
      )}
      <h3 className="text-xl">{result.title}</h3>
      {result.facts?.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {result.facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-nisr-mist px-3.5 py-3">
              <dt className="text-xs text-nisr-muted">{f.label}</dt>
              <dd className="num font-display text-xl font-semibold text-nisr-navy">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-4 grid gap-2.5 text-[16px] leading-relaxed text-nisr-ink">
        {result.paragraphs.map((p) => <p key={p}><Rich text={p} /></p>)}
      </div>
      {result.links?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {result.links.map((l, i) => (
            <Link key={l.to} to={l.to} className={i === 0 ? "btn-primary px-4 py-2.5 text-[15px]" : "inline-flex items-center gap-2 rounded-xl border border-nisr-line px-4 py-2.5 text-[15px] font-semibold text-nisr-blue hover:bg-nisr-mist"}>
              {l.label} <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      )}
      {!result.unknown && <p className="mt-4 text-sm text-nisr-muted">From the NISR Agricultural Household Survey 2024. These are what similar farms achieved, not guarantees.</p>}
      {result.followUps?.length > 0 && (
        <div className="mt-5 border-t border-nisr-line pt-4">
          <p className="mb-2 text-sm font-semibold text-nisr-navy">{result.unknown ? "Try:" : "Ask next:"}</p>
          <div className="flex flex-wrap gap-2">
            {result.followUps.map((q) => (
              <button key={q} onClick={() => onAsk(q)} className="rounded-full border border-[#cfe0f2] bg-[#f7fbff] px-3.5 py-2 text-left text-sm text-nisr-blue hover:bg-[#e8f2fd]">{q}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Follow-up question when the district or crop is missing: answer with one tap. */
function AskBack({ pending, onPick }) {
  const D = useData();
  const options = pending.ask === "district" ? D.districtNames : D.farmCrops.slice(0, 12);
  return (
    <div className="card p-5">
      <p className="font-display text-lg text-nisr-navy">{pending.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => onPick(o)} className="rounded-full border border-nisr-line px-3 py-1.5 text-sm text-nisr-navy hover:border-nisr-blue hover:bg-nisr-mist">{o}</button>
        ))}
      </div>
    </div>
  );
}

const AskBox = forwardRef(function AskBox({ initialQuestion }, inputRef) {
  const D = useData();
  const { farm, setFarm } = useFarm();
  const [text, setText] = useState("");
  const [thread, setThread] = useState([]);
  const endRef = useRef(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const ask = (q) => {
    const question = q.trim();
    if (!question) return;
    setText("");
    const parsed = parseQuestion(question, D);
    const steps = THINKING(parsed.district || farm.district, parsed.crop || farm.crop);
    const id = Date.now();
    setThread((t) => [...t, { id, question, steps, done: 0, result: null }]);
    const finish = () => {
      const result = answer(question, D, farm);
      if (parsed.district || parsed.crop) setFarm({ ...(parsed.district && { district: parsed.district }), ...(parsed.crop && { crop: parsed.crop }) });
      setThread((t) => t.map((m) => (m.id === id ? { ...m, done: steps.length, result } : m)));
    };
    if (reduced) return finish();
    steps.forEach((_, i) => setTimeout(() => setThread((t) => t.map((m) => (m.id === id ? { ...m, done: i + 1 } : m))), 350 * (i + 1)));
    setTimeout(finish, 350 * steps.length + 150);
    return undefined;
  };

  useEffect(() => { if (initialQuestion) ask(initialQuestion); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initialQuestion]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" }); }, [thread, reduced]);

  return (
    <div className="grid gap-4">
      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="card flex items-center gap-2 p-2 pl-4 shadow-[0_10px_30px_rgba(18,59,122,0.15)]">
        <MessageCircle className="shrink-0 text-nisr-blue" size={22} aria-hidden="true" />
        <label htmlFor="ask-input" className="sr-only">Ask a question about farming in Rwanda</label>
        <input id="ask-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off"
          placeholder={farm.district ? `e.g. How can I grow more ${(farm.crop || "maize").toLowerCase()} in ${farm.district}?` : "e.g. How can I grow more maize in Musanze?"}
          className="min-w-0 flex-1 bg-transparent py-3 text-[17px] text-nisr-ink placeholder:text-nisr-muted focus:outline-none" />
        <button type="submit" className="btn-primary px-4 py-3" aria-label="Ask"><Send size={18} /><span className="hidden sm:inline">Ask</span></button>
      </form>
      {thread.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border border-white/40 bg-white/15 px-3.5 py-2 text-sm text-white hover:bg-white/25">{q}</button>
          ))}
        </div>
      )}
      {thread.map((m, i) => (
        <div key={m.id} className="grid gap-3">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/20 px-4 py-2.5 text-[16px] text-white ring-1 ring-white/30">{m.question}</div>
          {!m.result && <div className="card p-5"><Thinking steps={m.steps} done={m.done} /></div>}
          {m.result?.ask && i === thread.length - 1 && <AskBack pending={m.result} onPick={(v) => ask(completeQuestion(m.result, v))} />}
          {m.result?.ask && i !== thread.length - 1 && <div className="card p-4 text-nisr-muted">{m.result.question}</div>}
          {m.result && !m.result.ask && <AnswerCard result={m.result} onAsk={ask} />}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
});

export default AskBox;
