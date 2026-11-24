import { create } from 'zustand';
import type { EngineTick, MatchEvent, MatchSummary, PauseReason } from '../types/match.ts';

export type FeedFilter = 'ALL' | 'KEY';
const FEED_CAP = 300;

interface MatchStoreState {
  view: EngineTick | null;
  feed: MatchEvent[];
  alert: { reason: PauseReason; message: string } | null;
  summary: MatchSummary | null;
  /** True when the Analytics Room was opened from match history rather than a live full-time. */
  reviewing: boolean;
  error: string | null;
  focusMode: boolean;
  feedFilter: FeedFilter;
  /** Player selected in the XI as the one coming off (2-click substitution). */
  subOutId: string | null;
  setView: (v: EngineTick) => void;
  pushEvents: (e: MatchEvent[]) => void;
  setAlert: (a: MatchStoreState['alert']) => void;
  setSummary: (s: MatchSummary | null, reviewing?: boolean) => void;
  setError: (e: string | null) => void;
  toggleFocus: () => void;
  setFeedFilter: (f: FeedFilter) => void;
  setSubOut: (id: string | null) => void;
  reset: (feed?: MatchEvent[]) => void;
}

export const useMatch = create<MatchStoreState>(set => ({
  view: null,
  feed: [],
  alert: null,
  summary: null,
  reviewing: false,
  error: null,
  focusMode: false,
  feedFilter: 'ALL',
  subOutId: null,
  setView: view => set({ view }),
  pushEvents: events => set(s => ({ feed: [...s.feed, ...events].slice(-FEED_CAP) })),
  setAlert: alert => set({ alert }),
  setSummary: (summary, reviewing = false) => set({ summary, reviewing }),
  setError: error => set({ error }),
  toggleFocus: () => set(s => ({ focusMode: !s.focusMode })),
  setFeedFilter: feedFilter => set({ feedFilter }),
  setSubOut: subOutId => set({ subOutId }),
  reset: (feed = []) => set({ view: null, feed: feed.slice(-FEED_CAP), alert: null, summary: null, reviewing: false, error: null, subOutId: null })
}));
