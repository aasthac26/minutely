import type {
  ActionItem, ActionItemWithMeeting, Analytics, AskResult, Comment, MeetingDetail,
  MeetingListItem, Participant, SearchHit, Soundbite, Tag, Overview,
} from "./types";

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(BASE + path, {
    cache: "no-store",
    ...init,
    headers: init.body && !isForm ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export interface Filters {
  q: string; participant: string; tag: string; from: string; to: string;
  sort: "date_desc" | "date_asc";
}

export const api = {
  meetings: (f: Filters) => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.participant) p.set("participant", f.participant);
    if (f.tag) p.set("tag", f.tag);
    if (f.from) p.set("date_from", f.from);
    if (f.to) p.set("date_to", f.to);
    p.set("sort", f.sort);
    return req<MeetingListItem[]>(`/meetings?${p}`);
  },
  meeting: (id: number | string) => req<MeetingDetail>(`/meetings/${id}`),
  createFromPaste: (b: { title: string; transcript_text: string; meeting_date?: string }) =>
    req<MeetingDetail>("/meetings/paste", json("POST", b)),
  createFromUpload: (fd: FormData) => req<MeetingDetail>("/meetings/upload", { method: "POST", body: fd }),
  updateMeeting: (id: number, b: { title?: string; participants?: string[]; tags?: string[] }) =>
    req<MeetingDetail>(`/meetings/${id}`, json("PATCH", b)),
  deleteMeeting: (id: number) => req<void>(`/meetings/${id}`, { method: "DELETE" }),

  participants: () => req<Participant[]>("/participants"),
  tags: () => req<Tag[]>("/tags"),

  actionItems: (q: { is_done?: boolean; assignee?: string } = {}) => {
    const p = new URLSearchParams();
    if (q.is_done !== undefined) p.set("is_done", String(q.is_done));
    if (q.assignee) p.set("assignee", q.assignee);
    return req<ActionItemWithMeeting[]>(`/action-items?${p}`);
  },
  createActionItem: (mid: number, b: { text: string; assignee?: string | null; due_date?: string | null }) =>
    req<ActionItem>(`/meetings/${mid}/action-items`, json("POST", b)),
  updateActionItem: (id: number, b: Partial<{ text: string; assignee: string | null; due_date: string | null; is_done: boolean }>) =>
    req<ActionItem>(`/action-items/${id}`, json("PATCH", b)),
  deleteActionItem: (id: number) => req<void>(`/action-items/${id}`, { method: "DELETE" }),

  comments: (mid: number) => req<Comment[]>(`/meetings/${mid}/comments`),
  addComment: (mid: number, body: string, segment_id?: number) =>
    req<Comment>(`/meetings/${mid}/comments`, json("POST", { body, segment_id })),
  deleteComment: (id: number) => req<void>(`/comments/${id}`, { method: "DELETE" }),

  soundbites: (mid: number) => req<Soundbite[]>(`/meetings/${mid}/soundbites`),
  generateSoundbites: (mid: number) =>
    req<Soundbite[]>(`/meetings/${mid}/soundbites/generate`, { method: "POST" }),
  deleteSoundbite: (id: number) => req<void>(`/soundbites/${id}`, { method: "DELETE" }),

  search: (q: string) => req<SearchHit[]>(`/search?q=${encodeURIComponent(q)}`),
  analytics: (mid: number) => req<Analytics>(`/meetings/${mid}/analytics`),
  overview: () => req<Overview>("/analytics/overview"),
  ask: (mid: number, question: string) => req<AskResult>(`/meetings/${mid}/ask`, json("POST", { question })),
  exportUrl: (mid: number, format: "md" | "txt" | "json") => `${BASE}/meetings/${mid}/export?format=${format}`,
};