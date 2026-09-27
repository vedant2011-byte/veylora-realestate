"use client";

import { useState } from "react";
import { INSTAGRAM_URL } from "@/lib/utils";

/**
 * Enquiry form — demo prototype: validates and confirms locally,
 * clearly telling the user nothing was sent to a server.
 */
export default function EnquiryForm({ propertyLabel }: { propertyLabel: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Please add your name.";
    if (!/^[+\d][\d\s-]{7,14}$/.test(phone.trim())) errs.phone = "Enter a valid phone number.";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "That email doesn't look right.";
    setErrors(errs);
    if (Object.keys(errs).length === 0) setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-sage/40 bg-sage/10 p-8 text-center" role="status">
        <p className="font-display text-2xl font-semibold tracking-tight text-sage-deep">Thank you, {name.split(" ")[0]}.</p>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
          This is a demo prototype, so nothing was actually sent — in production
          this enquiry would reach the {propertyLabel} desk instantly.
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-amber-deep"
        >
          Reach us on Instagram
        </a>
      </div>
    );
  }

  const field =
    "h-13 w-full rounded-xl border bg-white/70 px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-ink-mute/60 focus:border-amber-deep";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor="eq-name" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Name
        </label>
        <input id="eq-name" className={field} style={{ borderColor: errors.name ? "#b4552d" : undefined }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
        {errors.name && <p className="mt-1 text-[12px] text-clay">{errors.name}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="eq-phone" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            Phone
          </label>
          <input id="eq-phone" type="tel" className={field} style={{ borderColor: errors.phone ? "#b4552d" : undefined }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXX21" autoComplete="tel" />
          {errors.phone && <p className="mt-1 text-[12px] text-clay">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="eq-email" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            Email <span className="font-normal normal-case tracking-normal text-ink-mute">(optional)</span>
          </label>
          <input id="eq-email" type="email" className={field} style={{ borderColor: errors.email ? "#b4552d" : undefined }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          {errors.email && <p className="mt-1 text-[12px] text-clay">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="eq-msg" className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Message
        </label>
        <textarea
          id="eq-msg"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`I'd like to know more about ${propertyLabel}…`}
          className="w-full rounded-xl border border-ink/20 bg-white/70 px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-ink-mute/60 focus:border-amber-deep"
        />
      </div>

      <button
        type="submit"
        className="h-13 w-full rounded-full bg-amber text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
      >
        Send Enquiry
      </button>
      <p className="text-center text-[11px] leading-relaxed text-ink-mute">
        Demo prototype — submissions stay on this device.
      </p>
    </form>
  );
}
