/**
 * RTK Query service for the Transmission daemon, per ADR-0001: instead of
 * fetching, the custom `ipcBaseQuery` forwards every request through
 * `window.api.rpc` so the main process owns HTTP, auth, and TLS.
 *
 * Conventions:
 * - Every endpoint arg includes `profileId`, so cache entries are naturally
 *   keyed per server; switching servers additionally calls `resetApiState()`
 *   (see connectionSlice) so stale daemon data can never be shown.
 * - Mutations invalidate the `Torrents` list tag and per-id `Torrent` tags;
 *   the next poll refetches. No optimistic updates in the MVP.
 * - `torrent-get` uses Transmission 4.x `format: 'table'` (compact rows)
 *   and re-hydrates objects via `tableToObjects`.
 */
import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { RpcError } from '@shared/types'
import {
  TORRENT_DETAIL_FIELDS,
  TORRENT_LIST_FIELDS,
  deriveSwarm,
  tableToObjects,
  type SessionInfo,
  type SessionStats,
  type Torrent,
  type TorrentDetail,
  type TrackerStat
} from '@shared/transmission'

export interface RpcQueryArgs {
  profileId: string
  method: string
  arguments?: Record<string, unknown>
}

const ipcBaseQuery: BaseQueryFn<RpcQueryArgs, unknown, RpcError> = async (args) => {
  const res = await window.api.rpc({
    profileId: args.profileId,
    method: args.method,
    arguments: args.arguments
  })
  return res.ok ? { data: res.data } : { error: res.error }
}

export interface AddTorrentArgs {
  profileId: string
  magnet?: string
  metainfoBase64?: string
  downloadDir?: string
  paused?: boolean
  unwantedIndices?: number[]
  labels?: string[]
}

export const rpcApi = createApi({
  reducerPath: 'rpcApi',
  baseQuery: ipcBaseQuery,
  tagTypes: ['Torrents', 'Torrent', 'Session', 'SessionStats'],
  endpoints: (build) => ({
    getSession: build.query<SessionInfo, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, method: 'session-get' }),
      providesTags: ['Session']
    }),
    setSession: build.mutation<unknown, { profileId: string; fields: Partial<SessionInfo> }>({
      query: ({ profileId, fields }) => ({ profileId, method: 'session-set', arguments: fields }),
      invalidatesTags: ['Session']
    }),
    getSessionStats: build.query<SessionStats, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, method: 'session-stats' }),
      providesTags: ['SessionStats']
    }),
    portTest: build.mutation<{ 'port-is-open': boolean }, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, method: 'port-test' })
    }),
    freeSpace: build.query<{ path: string; 'size-bytes': number }, { profileId: string; path: string }>({
      query: ({ profileId, path }) => ({ profileId, method: 'free-space', arguments: { path } })
    }),
    getTorrents: build.query<Torrent[], { profileId: string }>({
      query: ({ profileId }) => ({
        profileId,
        method: 'torrent-get',
        arguments: { fields: TORRENT_LIST_FIELDS, format: 'table' }
      }),
      transformResponse: (raw: { torrents: unknown[][] }) =>
        tableToObjects<Torrent & { trackerStats?: TrackerStat[] }>(raw.torrents).map((t) => {
          // Strip the heavy trackerStats array before it enters the cache;
          // only the derived swarm aggregates are kept on list torrents.
          const { trackerStats, ...rest } = t
          return { ...rest, ...deriveSwarm(trackerStats) } as Torrent
        }),
      providesTags: ['Torrents']
    }),
    getTorrentDetail: build.query<TorrentDetail | undefined, { profileId: string; id: number }>({
      query: ({ profileId, id }) => ({
        profileId,
        method: 'torrent-get',
        arguments: { ids: [id], fields: TORRENT_DETAIL_FIELDS }
      }),
      transformResponse: (raw: { torrents: TorrentDetail[] }) => {
        const t = raw.torrents[0]
        return t ? { ...t, ...deriveSwarm(t.trackerStats) } : t
      },
      providesTags: (_res, _err, { id }) => [{ type: 'Torrent', id }]
    }),
    torrentAction: build.mutation<
      unknown,
      {
        profileId: string
        action: 'torrent-start' | 'torrent-start-now' | 'torrent-stop' | 'torrent-verify' | 'torrent-reannounce'
        ids: number[]
      }
    >({
      query: ({ profileId, action, ids }) => ({ profileId, method: action, arguments: { ids } }),
      invalidatesTags: (_r, _e, { ids }) => ['Torrents', ...ids.map((id) => ({ type: 'Torrent' as const, id }))]
    }),
    queueMove: build.mutation<
      unknown,
      {
        profileId: string
        ids: number[]
        direction: 'queue-move-top' | 'queue-move-up' | 'queue-move-down' | 'queue-move-bottom'
      }
    >({
      query: ({ profileId, ids, direction }) => ({ profileId, method: direction, arguments: { ids } }),
      invalidatesTags: ['Torrents']
    }),
    removeTorrent: build.mutation<unknown, { profileId: string; ids: number[]; deleteData: boolean }>({
      query: ({ profileId, ids, deleteData }) => ({
        profileId,
        method: 'torrent-remove',
        arguments: { ids, 'delete-local-data': deleteData }
      }),
      invalidatesTags: ['Torrents']
    }),
    addTorrent: build.mutation<
      { 'torrent-added'?: { id: number; name: string }; 'torrent-duplicate'?: { id: number; name: string } },
      AddTorrentArgs
    >({
      query: ({ profileId, magnet, metainfoBase64, downloadDir, paused, unwantedIndices, labels }) => ({
        profileId,
        method: 'torrent-add',
        arguments: {
          ...(magnet ? { filename: magnet } : {}),
          ...(metainfoBase64 ? { metainfo: metainfoBase64 } : {}),
          ...(downloadDir ? { 'download-dir': downloadDir } : {}),
          ...(paused !== undefined ? { paused } : {}),
          ...(unwantedIndices && unwantedIndices.length ? { 'files-unwanted': unwantedIndices } : {}),
          ...(labels && labels.length ? { labels } : {})
        }
      }),
      invalidatesTags: ['Torrents']
    }),
    setTorrent: build.mutation<
      unknown,
      { profileId: string; ids: number[]; fields: Record<string, unknown> }
    >({
      query: ({ profileId, ids, fields }) => ({
        profileId,
        method: 'torrent-set',
        arguments: { ids, ...fields }
      }),
      invalidatesTags: (_r, _e, { ids }) => ['Torrents', ...ids.map((id) => ({ type: 'Torrent' as const, id }))]
    }),
    setLocation: build.mutation<
      unknown,
      { profileId: string; ids: number[]; location: string; move: boolean }
    >({
      query: ({ profileId, ids, location, move }) => ({
        profileId,
        method: 'torrent-set-location',
        arguments: { ids, location, move }
      }),
      invalidatesTags: (_r, _e, { ids }) => ['Torrents', ...ids.map((id) => ({ type: 'Torrent' as const, id }))]
    })
  })
})

export const {
  useGetSessionQuery,
  useSetSessionMutation,
  useGetSessionStatsQuery,
  usePortTestMutation,
  useFreeSpaceQuery,
  useGetTorrentsQuery,
  useGetTorrentDetailQuery,
  useTorrentActionMutation,
  useQueueMoveMutation,
  useRemoveTorrentMutation,
  useAddTorrentMutation,
  useSetTorrentMutation,
  useSetLocationMutation
} = rpcApi
