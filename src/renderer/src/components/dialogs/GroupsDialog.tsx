import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { BandwidthGroup } from '@shared/transmission'
import { useAppDispatch, useAppSelector, useActiveProfileId } from '@/app/hooks'
import { setGroupsOpen } from '@/features/ui/uiSlice'
import { useGetGroupsQuery, useSetGroupMutation } from '@/services/rpcApi'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LabeledCheckbox } from '@/components/ui/checkbox'

/**
 * Bandwidth-group manager. Groups are named speed-limit pools; a torrent joins
 * one via its detail panel. Transmission's RPC creates a group on first
 * `group-set` and has NO delete method — a group simply stops existing once no
 * torrent references it, so this dialog creates and edits but cannot delete.
 */
function GroupRow({
  group,
  profileId
}: {
  group: BandwidthGroup
  profileId: string
}): React.JSX.Element {
  const [setGroup] = useSetGroupMutation()
  const save = (patch: Partial<BandwidthGroup>): void => {
    void setGroup({ profileId, group: { name: group.name, ...patch } })
  }
  return (
    <div className="space-y-2 rounded-md border border-surface-200 p-2.5 dark:border-surface-700">
      <p className="text-sm font-medium">{group.name}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <LabeledCheckbox
            checked={group['speed-limit-down-enabled']}
            onCheckedChange={(v) => save({ 'speed-limit-down-enabled': v })}
            label="Down (kB/s)"
          />
          <Input
            type="number"
            defaultValue={group['speed-limit-down']}
            disabled={!group['speed-limit-down-enabled']}
            onBlur={(e) => save({ 'speed-limit-down': Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <LabeledCheckbox
            checked={group['speed-limit-up-enabled']}
            onCheckedChange={(v) => save({ 'speed-limit-up-enabled': v })}
            label="Up (kB/s)"
          />
          <Input
            type="number"
            defaultValue={group['speed-limit-up']}
            disabled={!group['speed-limit-up-enabled']}
            onBlur={(e) => save({ 'speed-limit-up': Number(e.target.value) })}
          />
        </div>
      </div>
      <LabeledCheckbox
        checked={group.honorsSessionLimits}
        onCheckedChange={(v) => save({ honorsSessionLimits: v })}
        label="Also honor global limits"
      />
    </div>
  )
}

export function GroupsDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.groupsOpen)
  const profileId = useActiveProfileId()
  const { data: groups = [] } = useGetGroupsQuery({ profileId: profileId ?? '' }, { skip: !profileId || !open })
  const [setGroup] = useSetGroupMutation()
  const [newName, setNewName] = useState('')

  if (!open || !profileId) return null

  const close = (): void => {
    dispatch(setGroupsOpen(false))
  }

  const create = (): void => {
    const name = newName.trim()
    if (!name || groups.some((g) => g.name === name)) return
    void setGroup({ profileId, group: { name, 'speed-limit-down-enabled': true, 'speed-limit-down': 1000 } })
    setNewName('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title="Bandwidth groups">
        <div className="space-y-3">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Named speed-limit pools. Assign a torrent to a group from its detail panel.
          </p>

          {groups.length === 0 && (
            <p className="py-2 text-center text-xs text-surface-500">No groups yet</p>
          )}
          {groups.map((g) => (
            <GroupRow key={g.name} group={g} profileId={profileId} />
          ))}

          <div className="flex gap-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New group name"
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <Button variant="secondary" size="sm" onClick={create} disabled={!newName.trim()}>
              <Plus size={13} /> Create
            </Button>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
