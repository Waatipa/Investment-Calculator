import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canGoBack, pageLabel, previousVisit, RETURN_HIGHLIGHT_MS, type PageVisit } from "@/lib/navigation-trail";

type LocalStep = { label: string; back: () => void; source: string | null };
type TrailContext = { visits: PageVisit[]; steps: LocalStep[]; back: () => void; register: (labels: string[], back: () => void) => void; clear: () => void };
const Context = createContext<TrailContext | null>(null);

function controlKey(el: Element): string {
  const stable = el.getAttribute("aria-label") ?? el.getAttribute("data-company") ?? el.getAttribute("data-nav-id");
  if (stable) return `${el.tagName}|${stable}`;
  return [el.tagName, el.getAttribute("href"), el.getAttribute("aria-label"), el.getAttribute("data-company"), el.getAttribute("data-nav-id"), el.textContent?.trim().replace(/\s+/g, " ").slice(0, 140)].join("|");
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const href = useRouterState({ select: s => s.location.href });
  const [visits, setVisits] = useState<PageVisit[]>([{ href, label: pageLabel(href.split("?")[0] ?? href), source: null, scroll: 0 }]);
  const [steps, setSteps] = useState<LocalStep[]>([]);
  const stepsRef = useRef<LocalStep[]>([]);
  const lastClick = useRef<string | null>(null);
  const lastHref = useRef(href);
  const returning = useRef(false);
  const highlightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const highlight = useCallback((key: string | null, scroll?: number) => {
    if (scroll != null) window.scrollTo({ top: scroll, behavior: "instant" });
    if (!key) return;
    let tries = 0;
    const find = () => {
      const el = Array.from(document.querySelectorAll("a,button,[role=button]")).find(e => controlKey(e) === key);
      if (!el && tries++ < 30) { highlightTimers.current.push(setTimeout(find, 100)); return; }
      if (!(el instanceof HTMLElement)) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: "center", behavior: "instant" });
      el.classList.add("navigation-return-highlight");
      el.focus({ preventScroll: true });
      highlightTimers.current.push(setTimeout(() => el.classList.remove("navigation-return-highlight"), RETURN_HIGHLIGHT_MS));
    };
    highlightTimers.current.push(setTimeout(find, 80));
  }, []);
  useEffect(() => {
    const capture = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("a,button,[role=button]") : null;
      if (el && !el.closest("[data-navigation-trail]")) {
        lastClick.current = controlKey(el);
        setVisits(old => old.map((v, i) => i === old.length - 1 ? { ...v, source: lastClick.current, scroll: window.scrollY } : v));
      }
    };
    document.addEventListener("click", capture, true);
    const unsubscribe = router.history.subscribe(({ action }) => { returning.current = action.type === "BACK" || action.type === "GO" || action.type === "FORWARD"; });
    return () => { document.removeEventListener("click", capture, true); unsubscribe(); highlightTimers.current.forEach(clearTimeout); };
  }, [router]);
  useEffect(() => {
    if (lastHref.current === href) return;
    lastHref.current = href;
    stepsRef.current = []; setSteps([]);
    setVisits(old => {
      const i = returning.current ? previousVisit(old, href) : -1;
      returning.current = false;
      if (i >= 0) { const dest = old[i]; if (dest) highlight(dest.source, dest.scroll); return old.slice(0, i + 1); }
      const prior = old.map((v, n) => n === old.length - 1 ? { ...v, source: lastClick.current, scroll: window.scrollY } : v);
      return [...prior, { href, label: pageLabel(href.split("?")[0] ?? href), source: null, scroll: 0 }];
    });
  }, [href, highlight]);
  const register = useCallback((labels: string[], back: () => void) => {
    const old = stepsRef.current;
    const next = labels.map((label, i) => ({ label, back, source: old[i]?.label === label ? old[i]?.source ?? null : lastClick.current }));
    stepsRef.current = next; setSteps(next);
  }, []);
  const clear = useCallback(() => { const first = stepsRef.current[0]; stepsRef.current = []; setSteps([]); if (first) highlight(first.source); }, [highlight]);
  const back = () => {
    const step = stepsRef.current.at(-1);
    if (step) { step.back(); highlight(step.source); return; }
    if (visits.length > 1) { returning.current = true; router.history.back(); }
  };
  return <Context.Provider value={{ visits, steps, back, register, clear }}>{children}</Context.Provider>;
}

export function useNavigationStep(labels: string[], onBack: () => void, active = true) {
  const ctx = useContext(Context);
  const register = ctx?.register, clear = ctx?.clear;
  const callback = useRef(onBack); callback.current = onBack;
  const key = JSON.stringify(labels);
  useEffect(() => { if (active) register?.(JSON.parse(key) as string[], () => callback.current()); }, [key, active, register]);
  useEffect(() => () => { if (active) clear?.(); }, [active, clear]);
}

export function NavigationTrail({ inDialog = false }: { inDialog?: boolean }) {
  const ctx = useContext(Context);
  if (!ctx) return null;
  const labels = [...ctx.visits.map(v => v.label), ...ctx.steps.map(s => s.label)];
  return <div data-navigation-trail className={`navigation-trail${inDialog ? " navigation-trail-dialog" : ""}`}>
    <Button variant="ghost" onClick={ctx.back} disabled={!canGoBack(ctx.visits, ctx.steps.length)} className="navigation-back"><ArrowLeft /><span>Back</span></Button>
    <nav aria-label="Breadcrumb" className="navigation-crumbs"><ol>{labels.map((label, i) => <li key={`${i}-${label}`} aria-current={i === labels.length - 1 ? "page" : undefined}>{i > 0 && <ChevronRight aria-hidden="true" />}<span>{label}</span></li>)}</ol></nav>
  </div>;
}