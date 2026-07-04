/**
 * RTK Query service (ADR-0001, ADR-0004): instead of fetching, the custom
 * `ipcBaseQuery` forwards every request through `window.api.invoke` so the main
 * process owns transport, auth, TLS — and, since v0.7, protocol translation.
 *
 * Endpoints emit protocol-NEUTRAL intent ops (`getTorrents`, `torrentAction`,
 * …); the active profile's adapter in the main process returns already-
 * normalized shared types, so there are no `transformResponse` blocks here.
 * Torrent identity is the infohash string across the board.
 *
 * Conventions:
 * - Every endpoint arg includes `profileId`, so cache entries are naturally
 *   keyed per server; switching servers additionally calls `resetApiState()`
 *   (see connectionSlice) so stale daemon data can never be shown.
 * - Mutations invalidate the `Torrents` list tag and per-id `Torrent` tags;
 *   the next poll refetches. No optimistic updates in the MVP.
 */
import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { AddResult, Capabilities, InvokeRequest, RpcError, TorrentOp } from '@shared/types'
import type {
  SessionInfo,
  BandwidthGroup,
  SessionStats,
  Torrent,
  TorrentDetail
} from '@shared/transmission'

export interface RpcQueryArgs {
  profileId: string
  op: TorrentOp
  params?: Record<string, unknown>
}

const ipcBaseQuery: BaseQueryFn<RpcQueryArgs, unknown, RpcError> = async (args) => {
  const res = await window.api.invoke(args as InvokeRequest)
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
  sequentialDownload?: boolean
  addToTopOfQueue?: boolean
  skipHashCheck?: boolean
}

export const rpcApi = createApi({
  reducerPath: 'rpcApi',
  baseQuery: ipcBaseQuery,
  tagTypes: ['Torrents', 'Torrent', 'Session', 'SessionStats', 'Groups', 'Capabilities'],
  endpoints: (build) => ({
    getCapabilities: build.query<Capabilities, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'getCapabilities' }),
      providesTags: ['Capabilities']
    }),
    getSession: build.query<SessionInfo, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'getSession' }),
      providesTags: ['Session']
    }),
    setSession: build.mutation<unknown, { profileId: string; fields: Partial<SessionInfo> }>({
      query: ({ profileId, fields }) => ({ profileId, op: 'setSession', params: { fields } }),
      invalidatesTags: ['Session']
    }),
    getSessionStats: build.query<SessionStats, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'getSessionStats' }),
      providesTags: ['SessionStats']
    }),
    portTest: build.mutation<{ 'port-is-open': boolean }, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'portTest' })
    }),
    blocklistUpdate: build.mutation<{ 'blocklist-size': number }, { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'blocklistUpdate' }),
      invalidatesTags: ['Session']
    }),
    getGroups: build.query<BandwidthGroup[], { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'getGroups' }),
      providesTags: ['Groups']
    }),
    setGroup: build.mutation<
      unknown,
      { profileId: string; group: Partial<BandwidthGroup> & { name: string } }
    >({
      query: ({ profileId, group }) => ({ profileId, op: 'setGroup', params: { group } }),
      invalidatesTags: ['Groups']
    }),
    freeSpace: build.query<{ path: string; 'size-bytes': number }, { profileId: string; path: string }>({
      query: ({ profileId, path }) => ({ profileId, op: 'freeSpace', params: { path } })
    }),
    getTorrents: build.query<Torrent[], { profileId: string }>({
      query: ({ profileId }) => ({ profileId, op: 'getTorrents' }),
      providesTags: ['Torrents']
    }),
    getTorrentDetail: build.query<TorrentDetail | undefined, { profileId: string; id: string }>({
      query: ({ profileId, id }) => ({ profileId, op: 'getTorrentDetail', params: { id } }),
      providesTags: (_res, _err, { id }) => [{ type: 'Torrent', id }]
    }),
    torrentAction: build.mutation<
      unknown,
      {
        profileId: string
        action: 'torrent-start' | 'torrent-start-now' | 'torrent-stop' | 'torrent-verify' | 'torrent-reannounce'
        ids: string[]
      }
    >({
      query: ({ profileId, action, ids }) => ({ profileId, op: 'torrentAction', params: { action, ids } }),
      invalidatesTags: (_r, _e, { ids }) => ['Torrents', ...ids.map((id) => ({ type: 'Torrent' as const, id }))]
    }),
    queueMove: build.mutation<
      unknown,
      {
        profileId: string
        ids: string[]
        direction: 'queue-move-top' | 'queue-move-up' | 'queue-move-down' | 'queue-move-bottom'
      }
    >({
      query: ({ profileId, ids, direction }) => ({ profileId, op: 'queueMove', params: { direction, ids } }),
      invalidatesTags: ['Torrents']
    }),
    removeTorrent: build.mutation<unknown, { profileId: string; ids: string[]; deleteData: boolean }>({
      query: ({ profileId, ids, deleteData }) => ({ profileId, op: 'removeTorrent', params: { ids, deleteData } }),
      invalidatesTags: ['Torrents']
    }),
    addTorrent: build.mutation<AddResult, AddTorrentArgs>({
      query: ({
        profileId,
        magnet,
        metainfoBase64,
        downloadDir,
        paused,
        unwantedIndices,
        labels,
        sequentialDownload,
        addToTopOfQueue,
        skipHashCheck
      }) => ({
        profileId,
        op: 'addTorrent',
        params: {
          magnet,
          metainfoBase64,
          downloadDir,
          paused,
          unwantedIndices,
          labels,
          sequentialDownload,
          addToTopOfQueue,
          skipHashCheck
        }
      }),
      invalidatesTags: ['Torrents']
    }),
    setTorrent: build.mutation<
      unknown,
      { profileId: string; ids: string[]; fields: Record<string, unknown> }
    >({
      query: ({ profileId, ids, fields }) => ({ profileId, op: 'setTorrent', params: { ids, fields } }),
      invalidatesTags: (_r, _e, { ids }) => ['Torrents', ...ids.map((id) => ({ type: 'Torrent' as const, id }))]
    }),
    renamePath: build.mutation<
      { path: string; name: string; id: string },
      { profileId: string; id: string; path: string; name: string }
    >({
      query: ({ profileId, id, path, name }) => ({ profileId, op: 'renamePath', params: { id, path, name } }),
      invalidatesTags: (_r, _e, { id }) => ['Torrents', { type: 'Torrent', id }]
    }),
    setLocation: build.mutation<
      unknown,
      { profileId: string; ids: string[]; location: string; move: boolean }
    >({
      query: ({ profileId, ids, location, move }) => ({ profileId, op: 'setLocation', params: { ids, location, move } }),
      invalidatesTags: (_r, _e, { ids }) => ['Torrents', ...ids.map((id) => ({ type: 'Torrent' as const, id }))]
    })
  })
})

export const {
  useGetCapabilitiesQuery,
  useGetSessionQuery,
  useSetSessionMutation,
  useGetSessionStatsQuery,
  usePortTestMutation,
  useBlocklistUpdateMutation,
  useGetGroupsQuery,
  useSetGroupMutation,
  useFreeSpaceQuery,
  useGetTorrentsQuery,
  useGetTorrentDetailQuery,
  useTorrentActionMutation,
  useQueueMoveMutation,
  useRemoveTorrentMutation,
  useAddTorrentMutation,
  useSetTorrentMutation,
  useRenamePathMutation,
  useSetLocationMutation
} = rpcApi
