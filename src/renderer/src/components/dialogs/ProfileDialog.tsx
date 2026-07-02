import { useEffect, useState } from 'react'
import type { ProfileInput } from '@shared/types'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { deleteProfile, saveProfile, setActiveProfile } from '@/features/connection/connectionSlice'
import { closeProfileEditor } from '@/features/ui/uiSlice'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { LabeledCheckbox } from '@/components/ui/checkbox'

const EMPTY: ProfileInput = {
  name: '',
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
        ? `Connected — Transmission ${(res.data as { version: string }).version}`
        : res.error.message
    )
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    const result = await dispatch(saveProfile(inputWithPassword()))
    setSaving(false)
    if (saveProfile.fulfilled.match(result)) {
      if (!editing) void dispatch(setActiveProfile(result.payload.id))
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
          <Field label="Display name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Home NAS" autoFocus />
          </Field>
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
          <Field label="RPC path">
            <Input value={form.rpcPath} onChange={(e) => set('rpcPath', e.target.value)} />
          </Field>
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Username">
              <Input value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Password">
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
                  ? 'text-xs text-green-600 dark:text-green-400'
                  : 'text-xs text-red-600 dark:text-red-400'
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
