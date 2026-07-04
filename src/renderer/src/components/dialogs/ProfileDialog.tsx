import { useEffect, useState } from 'react'
import type { ProfileInput, ServerType } from '@shared/types'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { deleteProfile, saveProfile } from '@/features/connection/connectionSlice'
import { closeProfileEditor } from '@/features/ui/uiSlice'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { LabeledCheckbox } from '@/components/ui/checkbox'

/** Per-server-type connection defaults, applied when the type is switched. */
const TYPE_DEFAULTS: Record<ServerType, { port: number; rpcPath: string; label: string }> = {
  transmission: { port: 9091, rpcPath: '/transmission/rpc', label: 'Transmission' },
  deluge: { port: 8112, rpcPath: '/json', label: 'Deluge' },
  qbittorrent: { port: 8080, rpcPath: '', label: 'qBittorrent' }
}

const EMPTY: ProfileInput = {
  name: '',
  serverType: 'transmission',
  host: '',
  port: 9091,
  useTls: false,
  allowSelfSignedCert: false,
  rpcPath: '/transmission/rpc',
  username: ''
}

export function ProfileDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const editorId = useAppSelector((s) => s.ui.profileEditorId)
  const profiles = useAppSelector((s) => s.connection.profiles)
  const open = editorId !== undefined
  const editing = editorId ? profiles.find((p) => p.id === editorId) : undefined

  const [form, setForm] = useState<ProfileInput>(EMPTY)
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : EMPTY)
      setPassword('')
      setPasswordTouched(false)
      setTestResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editorId])

  if (!open) return null

  const close = (): void => {
    dispatch(closeProfileEditor())
  }
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]): void =>
    setForm((f) => ({ ...f, [key]: value }))

  // Switching server type re-applies that type's default port/path when the
  // current values are still a known default (never clobbers custom entries).
  const setServerType = (serverType: ServerType): void =>
    setForm((f) => {
      const wasDefault = Object.values(TYPE_DEFAULTS)
      const port = wasDefault.some((d) => d.port === f.port) ? TYPE_DEFAULTS[serverType].port : f.port
      const rpcPath = wasDefault.some((d) => d.rpcPath === f.rpcPath)
        ? TYPE_DEFAULTS[serverType].rpcPath
        : f.rpcPath
      return { ...f, serverType, port, rpcPath }
    })

  const isDeluge = form.serverType === 'deluge'
  // qBittorrent's API base is fixed (/api/v2) — no user-editable path.
  const showRpcPath = form.serverType !== 'qbittorrent'

  const inputWithPassword = (): ProfileInput => ({
    ...form,
    id: editing?.id,
    password: passwordTouched ? password : undefined
  })

  const test = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    const res = await window.api.testConnection({ ...inputWithPassword(), password })
    setTesting(false)
    setTestResult(
      res.ok
        ? `Connected — ${TYPE_DEFAULTS[form.serverType].label} ${(res.data as { version: string }).version}`
        : res.error.message
    )
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    const result = await dispatch(saveProfile(inputWithPassword()))
    setSaving(false)
    if (saveProfile.fulfilled.match(result)) {
      close()
    }
  }

  const removeProfile = async (): Promise<void> => {
    if (editing) {
      await dispatch(deleteProfile(editing.id))
      close()
    }
  }

  const valid = form.name.trim() && form.host.trim() && form.port > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title={editing ? 'Edit server' : 'Add server'}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Display name" className="col-span-2">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Home NAS" autoFocus />
            </Field>
            <Field label="Server type">
              <select
                value={form.serverType}
                onChange={(e) => setServerType(e.target.value as ServerType)}
                className="h-9 w-full rounded-md border border-surface-300 bg-surface-50 px-2 text-sm dark:border-surface-600 dark:bg-surface-900"
              >
                <option value="transmission">Transmission</option>
                <option value="deluge">Deluge</option>
                <option value="qbittorrent">qBittorrent</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Host" className="col-span-2">
              <Input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="nas.local" />
            </Field>
            <Field label="Port">
              <Input
                type="number"
                value={form.port}
                onChange={(e) => set('port', Number(e.target.value))}
              />
            </Field>
          </div>
          {showRpcPath && (
            <Field label={isDeluge ? 'Web UI path' : 'RPC path'}>
              <Input value={form.rpcPath} onChange={(e) => set('rpcPath', e.target.value)} />
            </Field>
          )}
          <div className="space-y-2">
            <LabeledCheckbox
              checked={form.useTls}
              onCheckedChange={(v) => set('useTls', v)}
              label="Use HTTPS"
            />
            {form.useTls && (
              <LabeledCheckbox
                checked={form.allowSelfSignedCert}
                onCheckedChange={(v) => set('allowSelfSignedCert', v)}
                label="Allow self-signed certificate"
              />
            )}
          </div>
          <div className={isDeluge ? '' : 'grid grid-cols-2 gap-2'}>
            {!isDeluge && (
              <Field label="Username">
                <Input value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="off" />
              </Field>
            )}
            <Field label={isDeluge ? 'Web UI password' : 'Password'}>
              <Input
                type="password"
                value={password}
                placeholder={editing?.hasPassword ? '••••••• (unchanged)' : ''}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordTouched(true)
                }}
                autoComplete="new-password"
              />
            </Field>
          </div>

          {testResult && (
            <p
              className={
                testResult.startsWith('Connected')
                  ? 'text-xs text-success-600 dark:text-success-400'
                  : 'text-xs text-danger-600 dark:text-danger-400'
              }
            >
              {testResult}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {editing && (
              <Button variant="destructive" size="sm" onClick={() => void removeProfile()}>
                Delete
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="secondary" onClick={() => void test()} disabled={!valid || testing}>
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
            <Button onClick={() => void save()} disabled={!valid || saving}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
