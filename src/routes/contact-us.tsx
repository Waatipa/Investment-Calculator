import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { pageHead } from "@/lib/markets";

const TO = "walterchaipa16@gmail.com";

export const Route = createFileRoute("/contact-us")({
  head: () => pageHead("Contact Us", "Send Investico Academy a message — enter your email address and we will reply to you."),
  component: ContactUs,
});

function ContactUs() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(`Message from ${email}`)}&body=${encodeURIComponent(`From: ${email}\n\n${message}`)}`;
  };
  return <main className="info-page">
    <h1>Contact Us</h1>
    <p className="lead">Enter your email address first so we can reply, then write your message.</p>
    <form onSubmit={send} className="mt-6 grid gap-3">
      <input className="info-input" type="email" required placeholder="Your email address" aria-label="Your email address" value={email} onChange={e => setEmail(e.target.value)} />
      <textarea className="info-input info-textarea" required disabled={!email.includes("@")} placeholder={email.includes("@") ? "Your message" : "Enter your email address first"} aria-label="Your message" value={message} onChange={e => setMessage(e.target.value)} />
      <button className="info-cta" type="submit" disabled={!email.includes("@") || !message.trim()}>Send message</button>
    </form>
    <p className="info-fine mt-4">Your message opens in your email app, addressed to {TO}.</p>
  </main>;
}
