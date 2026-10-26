import * as React from "react"

export function AnnouncementBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label="Announcement"
      className="bg-teal px-3 py-2 text-center text-[13px] font-medium text-white"
    >
      {children}
    </div>
  )
}
