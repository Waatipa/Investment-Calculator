import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { pageHead } from "@/lib/markets";
import { sendContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact-us")({
  head: () => pageHead("Contact Us", "Send Investico Academy a message — enter your email address and we will reply to you."),
  component: ContactUs,
});

function ContactUs() {
  const send = useServerFn(sendContactMessage);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");
  const ok = /^\S+@\S+\.\S+$/.test(email);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("sending");
    try { await send({ data: { email, message } }); setState("sent"); setMessage(""); }
    catch (err) { setState(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
  };
  return <main className="info-page">
    <h1>Contact Us</h1>
    <p className="lead">Enter your email address first so we can reply, then write your message.</p>
    {state === "sent" ? <div className="info-card"><h3>Thank you!</h3><p>Your message has been received. We'll reply to {email} soon.</p></div> :
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <input className="info-input" type="email" required maxLength={255} placeholder="Your email address" aria-label="Your email address" value={email} onChange={e => setEmail(e.target.value)} />
      <textarea className="info-input info-textarea" required maxLength={5000} disabled={!ok} placeholder={ok ? "Your message" : "Enter your email address first"} aria-label="Your message" value={message} onChange={e => setMessage(e.target.value)} />
      <button className="info-cta" type="submit" disabled={!ok || !message.trim() || state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
      {!["idle", "sending"].includes(state) && <p role="alert" className="text-sm text-destructive">{state}</p>}
    </form>}
  </main>;
}
