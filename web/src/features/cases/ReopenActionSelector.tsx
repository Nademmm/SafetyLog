import { localizeActionTypeLabel, localizeContentText, useLanguage } from '@/lib/i18n-helpers'
import type { CaseAction } from '@/types/safetylog'

interface ReopenActionSelectorProps {
  label: string
  actions: CaseAction[]
  selectedIds: number[]
  onToggle: (actionId: number) => void
}

export function ReopenActionSelector({
  label,
  actions,
  selectedIds,
  onToggle,
}: ReopenActionSelectorProps) {
  const { lang } = useLanguage()
  if (actions.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-semibold text-[var(--text)]">{label}</div>
      <div className="divide-y divide-[var(--rule)] rounded-[6px] border border-[var(--control)]">
        {actions.map((act) => {
          const checked = selectedIds.includes(act.id)
          return (
            <label
              key={act.id}
              className="flex min-h-[48px] cursor-pointer items-center gap-3 px-3.5 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-row)]"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(act.id)}
                className="h-5 w-5 shrink-0 rounded-[4px] accent-[var(--accent)] cursor-pointer"
              />
              <span className="min-w-0">
                <span className="font-semibold">
                  {localizeActionTypeLabel(lang, act.action_type_label, act.action_type)}
                </span>
                <span className="text-[var(--muted)]"> · {localizeContentText(lang, act.title)}</span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
