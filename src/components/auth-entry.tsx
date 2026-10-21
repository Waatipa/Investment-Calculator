import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SheetClose } from "@/components/ui/sheet";

const NEXT = "/broadcast";

/**
 * Sign-in entry point. Reads the session only after hydration so server and
 * client markup always match. In the header it is a button; inside the mobile
 * menu it renders as ordinary menu rows.
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

  if (!ready) return variant === "menu" ? null : <span className="auth-entry" aria-busy="true" />;

  if (variant === "menu") {
    if (!email) return <SheetClose asChild>
      <Link to="/auth" search={{ next: NEXT }} className="m-row auth-entry-menu"><LogIn /><span>Sign in</span></Link>
    </SheetClose>;
    return <>
      <span className="m-row auth-entry-who"><span>{email}</span></span>
      <SheetClose asChild><Link to={NEXT} className="m-row"><Radio /><span>Broadcast</span></Link></SheetClose>
      <button type="button" className="m-row" onClick={signOut}><LogOut /><span>Sign out</span></button>
    </>;
  }

  if (email) {
    return <span className="auth-entry">
      <span className="auth-entry-user" title={email}>{email}</span>
      <Link to={NEXT} className="auth-entry-broadcast"><Radio />Broadcast</Link>
      <button type="button" className="auth-entry-out" onClick={signOut}><LogOut />Sign out</button>
    </span>;
  }

  return <span className="auth-entry">
    <Link to="/auth" search={{ next: NEXT }} className="auth-entry-signin"><LogIn />Sign in</Link>
  </span>;
}
