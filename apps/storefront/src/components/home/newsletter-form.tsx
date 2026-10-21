"use client"

import * as React from "react"
import { Button, useToast } from "@t9/ui"

/**
 * Sign-up form. Subscriptions need a consent record and an email provider (Phases 4 and 6), so for
 * now it validates and says honestly that sign-up isn't open yet rather than pretending to save.
 */
export function NewsletterForm({ heading, text }: { heading: string; text?: string }) {
  const { toast } = useToast()
  const [error, setError] = React.useState("")
  const id = React.useId()

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-panel bg-teal-mist p-6 md:p-10">
      <h2
        id={`${id}-h`}
        className="font-display text-[clamp(24px,4vw,34px)] font-extrabold leading-tight"
      >
        {heading}
      </h2>
      {text ? <p className="mt-1 max-w-[56ch]">{text}</p> : null}
      <form
        noValidate
        className="mt-4 flex max-w-lg flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const email = String(new FormData(e.currentTarget).get("email") ?? "").trim()
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            setError("Enter a valid email address.")
            return
          }
          setError("")
          toast({
            title: "Sign-up opens soon",
            description: "Newsletter subscriptions are not switched on yet.",
          })
        }}
      >
        <div className="grid flex-1 gap-1">
          <label htmlFor={`${id}-e`} className="sr-only">
            Email address
          </label>
          <input
            id={`${id}-e`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className="h-12 rounded-full border border-line-strong bg-surface px-5 text-base"
          />
          {error ? (
            <p id={`${id}-err`} role="alert" className="px-2 text-sm text-sale">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit">Subscribe</Button>
      </form>
    </section>
  )
}
