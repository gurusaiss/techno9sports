"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button, useToast } from "@t9/ui"
import { deleteAddressAction, saveAddressAction, updateProfileAction } from "@/app/actions/account"
import { signOutAction } from "@/app/actions/auth"
import { useCart } from "@/components/cart/cart-provider"
import { useSession } from "@/components/session-provider"
import type { Customer, CustomerAddress } from "@/lib/customer"
import { AddressFields, EMPTY_ADDRESS, SubmitRow, type AddressValues } from "./address-form"
import { Field } from "./field"

export function ProfileForm({ customer }: { customer: Customer }) {
  const { toast } = useToast()
  const { refresh } = useSession()
  const [v, setV] = React.useState({
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    email: customer.email ?? "",
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [pending, setPending] = React.useState(false)
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.value })

  return (
    <form
      noValidate
      className="grid max-w-lg gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        const r = await updateProfileAction(v)
        setPending(false)
        setErrors(r.fields ?? {})
        if (r.ok) {
          toast({ title: "Details saved", variant: "success" })
          void refresh()
        } else toast({ title: r.error ?? "Couldn't save", variant: "error" })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          value={v.first_name}
          onChange={set("first_name")}
          autoComplete="given-name"
          error={errors.first_name}
        />
        <Field
          label="Last name"
          value={v.last_name}
          onChange={set("last_name")}
          autoComplete="family-name"
          error={errors.last_name}
        />
      </div>
      <Field
        label="Email"
        type="email"
        value={v.email}
        onChange={set("email")}
        autoComplete="email"
        error={errors.email}
        hint="Order updates and invoices are sent here."
      />
      <Field
        label="Mobile number"
        value={customer.phone ?? ""}
        readOnly
        disabled
        hint="Signed in with this number."
      />
      <SubmitRow pending={pending} label="Save details" />
    </form>
  )
}

function toValues(a: CustomerAddress): AddressValues {
  return {
    first_name: a.first_name,
    last_name: a.last_name,
    phone: a.phone,
    address_1: a.address_1,
    address_2: a.address_2 ?? "",
    city: a.city,
    province: a.province,
    postal_code: a.postal_code,
  }
}

function AddressEditor({
  id,
  initial,
  onDone,
}: {
  id?: string
  initial: AddressValues
  onDone: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [v, setV] = React.useState(initial)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [pending, setPending] = React.useState(false)
  return (
    <form
      noValidate
      className="grid gap-4 rounded-card border border-line bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        const r = await saveAddressAction(v, id)
        setPending(false)
        setErrors(r.fields ?? {})
        if (!r.ok) return toast({ title: r.error ?? "Couldn't save", variant: "error" })
        toast({ title: "Address saved", variant: "success" })
        router.refresh()
        onDone()
      }}
    >
      <AddressFields value={v} onChange={setV} errors={errors} />
      <SubmitRow pending={pending} label="Save address" onCancel={onDone} />
    </form>
  )
}

export function AddressBook({ addresses }: { addresses: CustomerAddress[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [editing, setEditing] = React.useState<string | "new" | null>(null)
  return (
    <div className="grid max-w-2xl gap-4">
      {addresses.length === 0 && editing !== "new" ? (
        <p className="text-muted">No saved addresses yet.</p>
      ) : null}
      <ul className="grid gap-3">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id}>
              <AddressEditor id={a.id} initial={toValues(a)} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface p-4"
            >
              <address className="text-[15px] not-italic leading-relaxed">
                <b>
                  {a.first_name} {a.last_name}
                </b>
                <br />
                {a.address_1}
                {a.address_2 ? `, ${a.address_2}` : ""}
                <br />
                {a.city}, {a.province} {a.postal_code}
                <br />
                <span className="text-muted">Mobile {a.phone}</span>
              </address>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(a.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const r = await deleteAddressAction(a.id)
                    if (!r.ok)
                      return toast({ title: r.error ?? "Couldn't remove", variant: "error" })
                    router.refresh()
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <AddressEditor initial={EMPTY_ADDRESS} onDone={() => setEditing(null)} />
      ) : (
        <Button
          variant="secondary"
          onClick={() => setEditing("new")}
          className="justify-self-start"
        >
          <Plus className="size-4" aria-hidden /> Add an address
        </Button>
      )}
    </div>
  )
}

export function SignOutButton() {
  const router = useRouter()
  const { refresh } = useSession()
  const { reload } = useCart()
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await signOutAction()
        await Promise.all([refresh(), reload()])
        router.replace("/")
        router.refresh()
      }}
    >
      Sign out
    </Button>
  )
}
