"use client"

import * as React from "react"
import { Button } from "@t9/ui"
import { lookupPincodeAction } from "@/app/actions/checkout"
import { INDIA_STATES } from "@/config/india-states"
import { Field } from "./field"

export interface AddressValues {
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
}

export const EMPTY_ADDRESS: AddressValues = {
  first_name: "",
  last_name: "",
  phone: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
}

export interface PincodeNote {
  ok: boolean
  text: string
  cod?: boolean
}

export function AddressFields({
  value,
  onChange,
  errors = {},
  onPincode,
}: {
  value: AddressValues
  onChange: (next: AddressValues) => void
  errors?: Record<string, string>
  onPincode?: (note: PincodeNote | null) => void
}) {
  const [note, setNote] = React.useState<PincodeNote | null>(null)
  const set =
    (k: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value })
  const latest = React.useRef(value)
  React.useEffect(() => {
    latest.current = value
  })

  const onPin = async (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6)
    onChange({ ...latest.current, postal_code: pin })
    if (pin.length !== 6) {
      setNote(null)
      onPincode?.(null)
      return
    }
    const r = await lookupPincodeAction(pin)
    if (latest.current.postal_code !== pin) return
    if (!r.ok || !r.info) {
      const n = { ok: false, text: r.error ?? "Couldn't check that pincode." }
      setNote(n)
      onPincode?.(n)
      return
    }
    const i = r.info
    if (i.found)
      onChange({
        ...latest.current,
        postal_code: pin,
        city: i.city ?? latest.current.city,
        province: i.state ?? latest.current.province,
      })
    const n: PincodeNote = i.serviceable
      ? {
          ok: true,
          cod: i.cod_allowed,
          text: `${i.found ? `${i.city}, ${i.state}. ` : ""}We deliver here.`,
        }
      : { ok: false, text: `Sorry, we don't deliver to ${pin} yet.` }
    setNote(n)
    onPincode?.(n)
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          value={value.first_name}
          onChange={set("first_name")}
          autoComplete="given-name"
          error={errors.first_name}
        />
        <Field
          label="Last name"
          value={value.last_name}
          onChange={set("last_name")}
          autoComplete="family-name"
          error={errors.last_name}
        />
      </div>
      <Field
        label="Mobile number"
        value={value.phone}
        onChange={set("phone")}
        inputMode="tel"
        autoComplete="tel-national"
        hint="For delivery updates."
        error={errors.phone}
      />
      <Field
        label="Pincode"
        value={value.postal_code}
        onChange={(e) => void onPin(e.target.value)}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        error={errors.postal_code ?? (note && !note.ok ? note.text : undefined)}
        hint={note?.ok ? note.text : undefined}
      />
      <Field
        label="Flat, house no., building, street"
        value={value.address_1}
        onChange={set("address_1")}
        autoComplete="address-line1"
        error={errors.address_1}
      />
      <Field
        label="Area, landmark (optional)"
        value={value.address_2}
        onChange={set("address_2")}
        autoComplete="address-line2"
        error={errors.address_2}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="City"
          value={value.city}
          onChange={set("city")}
          autoComplete="address-level2"
          error={errors.city}
        />
        <div className="grid gap-1.5">
          <label htmlFor="province" className="text-sm font-semibold">
            State
          </label>
          <select
            id="province"
            value={value.province}
            onChange={set("province")}
            autoComplete="address-level1"
            aria-invalid={errors.province ? true : undefined}
            aria-describedby={errors.province ? "province-err" : undefined}
            className="h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
          >
            <option value="">Choose state</option>
            {INDIA_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.province ? (
            <p id="province-err" role="alert" className="text-[13px] font-semibold text-sale">
              {errors.province}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function SubmitRow({
  pending,
  label,
  onCancel,
}: {
  pending: boolean
  label: string
  onCancel?: () => void
}) {
  return (
    <div className="flex gap-3">
      <Button type="submit" size="lg" loading={pending}>
        {label}
      </Button>
      {onCancel ? (
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  )
}
