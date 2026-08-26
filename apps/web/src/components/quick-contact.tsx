"use client";

import {
  Mail,
  MessageCircleMore,
  Phone,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ContactOption = {
  href?: string;
  icon?: LucideIcon;
  label: string;
  monogram?: string;
  tone: string;
};

function externalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function phoneUrl(value: string | undefined): string | undefined {
  const phone = value?.replace(/[^+\d]/g, "");
  return phone ? `tel:${phone}` : undefined;
}

function emailUrl(value: string | undefined): string | undefined {
  const email = value?.trim();
  return email ? `mailto:${email}` : undefined;
}

const CONTACT_OPTIONS: ContactOption[] = [
  {
    href: phoneUrl(process.env.NEXT_PUBLIC_CONTACT_PHONE),
    icon: Phone,
    label: "Phone",
    tone: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    href: externalUrl(process.env.NEXT_PUBLIC_CONTACT_FACEBOOK_URL),
    label: "Facebook",
    monogram: "f",
    tone: "bg-[#1877f2] hover:bg-[#1465cf]",
  },
  {
    href: externalUrl(process.env.NEXT_PUBLIC_CONTACT_ZALO_URL),
    icon: MessageCircleMore,
    label: "Zalo",
    tone: "bg-[#0068ff] hover:bg-[#0059db]",
  },
  {
    href: emailUrl(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    icon: Mail,
    label: "Gmail",
    tone: "bg-rose-500 hover:bg-rose-600",
  },
];

export function QuickContact() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 left-5 z-40 flex flex-col items-start gap-3 sm:bottom-6 sm:left-6"
    >
      <div
        id="quick-contact-menu"
        aria-label="Quick contact options"
        aria-hidden={!open}
        className={`flex flex-col-reverse gap-3 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {CONTACT_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          const delay = open
            ? index * 55
            : (CONTACT_OPTIONS.length - index - 1) * 35;
          const sharedClassName = `group relative grid size-11 place-items-center rounded-full text-white shadow-[0_9px_24px_rgba(15,23,42,0.2)] transition-[transform,opacity,background-color] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${option.tone} ${
            open
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-75 opacity-0"
          }`;

          const content = (
            <>
              {Icon ? (
                <Icon className="size-5" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className="font-sans text-2xl font-black leading-none"
                >
                  {option.monogram}
                </span>
              )}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {option.label}
                {!option.href ? " (not configured)" : ""}
              </span>
            </>
          );

          return option.href ? (
            <a
              key={option.label}
              href={option.href}
              aria-label={option.label}
              tabIndex={open ? 0 : -1}
              target={option.href.startsWith("http") ? "_blank" : undefined}
              rel={option.href.startsWith("http") ? "noreferrer" : undefined}
              onClick={() => setOpen(false)}
              className={sharedClassName}
              style={{ transitionDelay: `${delay}ms` }}
            >
              {content}
            </a>
          ) : (
            <button
              key={option.label}
              type="button"
              disabled
              aria-label={`${option.label} (not configured)`}
              tabIndex={-1}
              className={`${sharedClassName} cursor-not-allowed saturate-50 opacity-45`}
              style={{ transitionDelay: `${delay}ms` }}
            >
              {content}
            </button>
          );
        })}
      </div>

      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close quick contact menu" : "Open quick contact menu"}
        aria-controls="quick-contact-menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-14 place-items-center rounded-full border border-white/80 bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-[0_12px_32px_rgba(8,145,178,0.32)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(37,99,235,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
      >
        <span
          className={`absolute transition duration-200 motion-reduce:transition-none ${
            open ? "rotate-90 scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          <X className="size-6" aria-hidden="true" />
        </span>
        <span
          className={`transition duration-200 motion-reduce:transition-none ${
            open ? "-rotate-90 scale-50 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <MessageCircleMore className="size-6" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
