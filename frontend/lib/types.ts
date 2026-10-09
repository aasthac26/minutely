export interface Participant { id: number; name: string; email: string | null }
export interface Tag { id: number; name: string }

export interface MeetingListItem {
  id: number; title: string; meeting_date: string; duration_sec: number;
  source: string; participants: Participant[]; tags: Tag[];
}
export interface Segment {
  id: number; start_sec: number; end_sec: number; text: string; speaker: Participant | null;
}
export interface Topic { id: number; title: string; start_sec: number }
export interface ActionItem {
  id: number; text: string; due_date: string | null; is_done: boolean;
  source_segment_id: number | null; assignee: Participant | null;
}
export interface ActionItemWithMeeting extends ActionItem { meeting_id: number; meeting_title: string }
export interface Summary { overview: string; keywords: string }
export interface MeetingDetail extends MeetingListItem {
  media_url: string | null; summary: Summary | null; topics: Topic[];
  action_items: ActionItem[]; segments: Segment[];
}
export interface Comment { id: number; meeting_id: number; segment_id: number | null; body: string; created_at: string }
export interface Soundbite { id: number; meeting_id: number; title: string; start_sec: number; end_sec: number }
export interface SearchHit {
  meeting_id: number; meeting_title: string; meeting_date: string; segment_id: number;
  start_sec: number; speaker: string | null; snippet: string;
}
export interface SpeakerStat {
  name: string; words: number; turns: number; questions: number;
  longest_turn_words: number; share_pct: number; est_talk_sec: number;
}
export interface Analytics {
  duration_sec: number; total_words: number; words_per_min: number | null;
  total_questions: number; speakers: SpeakerStat[]; dominant_speaker: string | null;
  balanced: boolean; topics_count: number;
  action_items: { total: number; done: number; open: number; overdue: number; open_by_assignee: Record<string, number> };
}
export interface AskResult {
  answer: string; intent: "summary" | "action_items" | "search";
  sources: { segment_id: number; start_sec: number; timestamp: string; speaker: string; text: string }[];
}

export interface Overview {
  meetings: number; total_hours: number; completion_pct: number;
  action_items: { open: number; done: number };
  top_speakers: { name: string; words: number }[];
}