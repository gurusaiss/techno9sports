import * as React from "react"

/**
 * Radix only restores focus to a Dialog.Trigger. Our openers are ordinary buttons that flip
 * controlled state, so remember what had focus when the dialog mounted and put it back on close.
 * Pass the returned handler to Dialog.Content's onCloseAutoFocus.
 */
export function useReturnFocus(userHandler?: (event: Event) => void) {
  const [opener] = React.useState<Element | null>(() =>
    typeof document === "undefined" ? null : document.activeElement,
  )
  return React.useCallback(
    (event: Event) => {
      userHandler?.(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      if (opener instanceof HTMLElement && opener !== document.body) opener.focus()
    },
    [opener, userHandler],
  )
}
