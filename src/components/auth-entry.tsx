import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SheetClose } from "@/components/ui/sheet";

const NEXT = "/broadcast";

/**
 * Shows the sign-in entry point in the header (and mobile menu). Reads the
 * session only after hydration so server and client markup always match.
 */
export function AuthEntry({ variant = "header" }: { variant?: "header" | "menu" }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const apply = (session: { user?: { email?: string } | null } | null) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setEmail(null);
  }

  if (!ready) return <span className={`auth-entry ${variant === "menu" ? "auth-entry-menu" : ""}`} aria-busy="true" />;

  if (email) {
    const name = email.split("@")[0];
    return <span className={`auth-entry ${variant === "menu" ? "auth-entry-menu" : ""}`}>
      <span className="auth-entry-user" title={email}>{name}</span>
      <Link to={NEXT} className="auth-entry-broadcast"><Radio />Broadcast</Link>
      <Button variant="ghost" size="sm" className="auth-entry-out" onClick={signOut}><LogOut />Sign out</Button>
    </span>;
  }

  const link = <Link to="/auth" search={{ next: NEXT }} className="auth-entry-signin"><LogIn />Sign in</Link>;
  return variant === "menu"
    ? <SheetClose asChild>{link}</SheetClose>
    : <span className="auth-entry">{link}</span>;
}
