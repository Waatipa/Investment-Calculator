import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/markets";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/ask");

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => pageHead("Sign in | Investico Academy", "Sign in to Investico Academy to ask questions about Apple's verified SEC filings."),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const target = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: target }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_IN" && session) navigate({ to: target }); });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const res = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(target)}` } });
    setBusy(false);
    if (res.error) return setMessage(res.error.message);
    if (mode === "signup" && !res.data.session) setMessage("Check your email to confirm your account, then sign in.");
  }
  async function google() {
    sessionStorage.setItem("auth-next", target);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth?next=${encodeURIComponent(target)}` });
    if (result.error) setMessage(result.error.message ?? "Google sign-in failed.");
  }

  return <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-5 px-5 py-12">
    <div><h1 className="font-serif text-3xl font-bold text-foreground">{mode === "signin" ? "Sign in" : "Create your account"}</h1><p className="mt-2 text-sm text-muted-foreground">Save your questions about Apple's SEC filings and come back to them anytime.</p></div>
    <Button variant="outline" onClick={google}>Continue with Google</Button>
    <div className="text-center text-xs text-muted-foreground">or use email</div>
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm text-foreground">Email<Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></label>
      <label className="text-sm text-foreground">Password<Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="mt-1" /></label>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
    </form>
    <Button variant="link" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</Button>
  </main>;
}
