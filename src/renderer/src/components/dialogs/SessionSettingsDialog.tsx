import { useEffect, useState } from 'react'
import type { SessionInfo } from '@shared/transmission'
import { useAppDispatch, useAppSelector, useActiveProfileId } from '@/app/hooks'
import { setSessionSettingsOpen } from '@/features/ui/uiSlice'
import {
  useBlocklistUpdateMutation,
  useGetSessionQuery,
  usePortTestMutation,
  useSetSessionMutation
} from '@/services/rpcApi'
import {
  ALL_DAYS,
  DAY_LABELS,
  hhmmToMinutes,
  isDayEnabled,
  minutesToHHMM,
  toggleDay
} from '@/lib/schedule'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { LabeledCheckbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/cn'

type Draft = Partial<SessionInfo>

export function SessionSettingsDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.sessionSettingsOpen)
  const profileId = useActiveProfileId()
  const { data: session } = useGetSessionQuery(
    { profileId: profileId ?? '' },
    { skip: !profileId || !open }
  )
  const [setSession, { isLoading: saving }] = useSetSessionMutation()
  const [portTest, { isLoading: testingPort }] = usePortTestMutation()
  const [blocklistUpdate, { isLoading: updatingBlocklist }] = useBlocklistUpdateMutation()
  const [portResult, setPortResult] = useState<string | null>(null)
  const [blocklistResult, setBlocklistResult] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({})

  useEffect(() => {
    if (open && session) {
      setDraft(session)
      setPortResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session])

  if (!open || !profileId) return null

  const close = (): void => {
    dispatch(setSessionSettingsOpen(false))
  }
  const set = <K extends keyof SessionInfo>(key: K, value: SessionInfo[K]): void =>
    setDraft((d) => ({ ...d, [key]: value }))

  const num = (v: unknown): number => (typeof v === 'number' ? v : 0)

  const save = async (): Promise<void> => {
    const fields: Record<string, unknown> = { ...draft }
    // read-only session fields must not be echoed back
    delete fields['version']
    delete fields['rpc-version']
    await setSession({ profileId, fields: fields as Partial<SessionInfo> })
    close()
  }

  const testPort = async (): Promise<void> => {
    setPortResult(null)
    const res = await portTest({ profileId })
    if ('data' in res && res.data) {
      setPortResult(res.data['port-is-open'] ? 'Port is open' : 'Port is closed')
    } else {
      setPortResult('Port test failed')
    }
  }

  const updateBlocklist = async (): Promise<void> => {
    setBlocklistResult('Updating…')
    const res = await blocklistUpdate({ profileId })
    setBlocklistResult(
      'data' in res && res.data
        ? `${res.data['blocklist-size'].toLocaleString()} rules loaded`
        : 'Update failed (check the URL)'
    )
  }

  if (!session) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent title="Server settings">
          <p className="py-4 text-center text-sm text-surface-500">Loading…</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title="Server settings" wide>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="col-span-2">
            <Field label="Default download folder">
              <Input
                value={draft['download-dir'] ?? ''}
                onChange={(e) => set('download-dir', e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase">Speed limits</p>
            <LabeledCheckbox
              checked={draft['speed-limit-down-enabled'] ?? false}
              onCheckedChange={(v) => set('speed-limit-down-enabled', v)}
              label="Limit download (kB/s)"
            />
            <Input
              type="number"
              value={num(draft['speed-limit-down'])}
              disabled={!draft['speed-limit-down-enabled']}
              onChange={(e) => set('speed-limit-down', Number(e.target.value))}
            />
            <LabeledCheckbox
              checked={draft['speed-limit-up-enabled'] ?? false}
              onCheckedChange={(v) => set('speed-limit-up-enabled', v)}
              label="Limit upload (kB/s)"
            />
            <Input
              type="number"
              value={num(draft['speed-limit-up'])}
              disabled={!draft['speed-limit-up-enabled']}
              onChange={(e) => set('speed-limit-up', Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase">Alternative limits</p>
            <LabeledCheckbox
              checked={draft['alt-speed-enabled'] ?? false}
              onCheckedChange={(v) => set('alt-speed-enabled', v)}
              label="Alternative limits on"
            />
            <Field label="Alt download (kB/s)">
              <Input
                type="number"
                value={num(draft['alt-speed-down'])}
                onChange={(e) => set('alt-speed-down', Number(e.target.value))}
              />
            </Field>
            <Field label="Alt upload (kB/s)">
              <Input
                type="number"
                value={num(draft['alt-speed-up'])}
                onChange={(e) => set('alt-speed-up', Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase">Seeding</p>
            <LabeledCheckbox
              checked={draft['seedRatioLimited'] ?? false}
              onCheckedChange={(v) => set('seedRatioLimited', v)}
              label="Stop seeding at ratio"
            />
            <Input
              type="number"
              step="0.1"
              value={num(draft['seedRatioLimit'])}
              disabled={!draft['seedRatioLimited']}
              onChange={(e) => set('seedRatioLimit', Number(e.target.value))}
            />
            <LabeledCheckbox
              checked={draft['start-added-torrents'] ?? true}
              onCheckedChange={(v) => set('start-added-torrents', v)}
              label="Start torrents when added"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase">Peers and network</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Global peer limit">
                <Input
                  type="number"
                  value={num(draft['peer-limit-global'])}
                  onChange={(e) => set('peer-limit-global', Number(e.target.value))}
                />
              </Field>
              <Field label="Per torrent">
                <Input
                  type="number"
                  value={num(draft['peer-limit-per-torrent'])}
                  onChange={(e) => set('peer-limit-per-torrent', Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Encryption">
              <select
                value={draft.encryption ?? 'preferred'}
                onChange={(e) => set('encryption', e.target.value as SessionInfo['encryption'])}
                className="h-8 w-full rounded-md border border-surface-300 bg-surface-50 px-2 text-sm dark:border-surface-600 dark:bg-surface-800"
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="tolerated">Tolerated</option>
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <Field label="Peer port" className="flex-1">
                <Input
                  type="number"
                  value={num(draft['peer-port'])}
                  onChange={(e) => set('peer-port', Number(e.target.value))}
                />
              </Field>
              <Button variant="secondary" size="sm" onClick={() => void testPort()} disabled={testingPort}>
                {testingPort ? 'Testing…' : 'Test port'}
              </Button>
            </div>
            {portResult && (
              <p
                className={
                  portResult === 'Port is open'
                    ? 'text-xs text-success-600 dark:text-success-400'
                    : 'text-xs text-danger-600 dark:text-danger-400'
                }
              >
                {portResult}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase">Alt-speed schedule</p>
            <LabeledCheckbox
              checked={draft['alt-speed-time-enabled'] ?? false}
              onCheckedChange={(v) => set('alt-speed-time-enabled', v)}
              label="Turn on alternative limits on a schedule"
            />
            <div className="grid grid-cols-2 gap-2">
              <Field label="From">
                <Input
                  type="time"
                  value={minutesToHHMM(num(draft['alt-speed-time-begin']))}
                  disabled={!draft['alt-speed-time-enabled']}
                  onChange={(e) => {
                    const m = hhmmToMinutes(e.target.value)
                    if (m !== null) set('alt-speed-time-begin', m)
                  }}
                />
              </Field>
              <Field label="To">
                <Input
                  type="time"
                  value={minutesToHHMM(num(draft['alt-speed-time-end']))}
                  disabled={!draft['alt-speed-time-enabled']}
                  onChange={(e) => {
                    const m = hhmmToMinutes(e.target.value)
                    if (m !== null) set('alt-speed-time-end', m)
                  }}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((label, i) => {
                const mask = num(draft['alt-speed-time-day']) || ALL_DAYS
                const on = isDayEnabled(mask, i)
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!draft['alt-speed-time-enabled']}
                    onClick={() => set('alt-speed-time-day', toggleDay(mask, i))}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40',
                      on
                        ? 'bg-accent-500 text-surface-50'
                        : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase">Blocklist</p>
            <LabeledCheckbox
              checked={draft['blocklist-enabled'] ?? false}
              onCheckedChange={(v) => set('blocklist-enabled', v)}
              label="Enable blocklist"
            />
            <Field label="Blocklist URL">
              <Input
                value={draft['blocklist-url'] ?? ''}
                disabled={!draft['blocklist-enabled']}
                onChange={(e) => set('blocklist-url', e.target.value)}
              />
            </Field>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-surface-500 dark:text-surface-400">
                {num(draft['blocklist-size']).toLocaleString()} rules
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void updateBlocklist()}
                disabled={updatingBlocklist || !draft['blocklist-enabled']}
              >
                {updatingBlocklist ? 'Updating…' : 'Update now'}
              </Button>
            </div>
            {blocklistResult && (
              <p className="text-xs text-surface-500 dark:text-surface-400">{blocklistResult}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
