"use client";
import { Activity, ArrowLeft, Download, FileText, ListChecks, ListTree, Pencil, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ActionItemList from "@/components/ActionItemList";
import { AvatarStack } from "@/components/Avatar";
import ChaptersPanel from "@/components/ChaptersPanel";
import EditMeetingModal from "@/components/EditMeetingModal";
import Modal from "@/components/Modal";
import Player from "@/components/Player";
import SummaryPanel from "@/components/SummaryPanel";
import SummaryTabs from "@/components/SummaryTabs";
import { useToast } from "@/components/Toast";
import TranscriptPane from "@/components/TranscriptPane";
import { api } from "@/lib/api";
import { fmtDate, fmtDuration } from "@/lib/format";
import type { Comment, MeetingDetail, Soundbite } from "@/lib/types";
import { usePlayer } from "@/lib/usePlayer";
  import AnalyticsTab from "@/components/AnalyticsTab";
  import AskMeeting from "@/components/AskMeeting";
 
export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const mid = Number(id);
  const router = useRouter();
  const toast = useToast();

  const [m, setM] = useState<MeetingDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [soundbites, setSoundbites] = useState<Soundbite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const player = usePlayer(m?.duration_sec ?? 0);

  useEffect(() => {
    let live = true;
    Promise.all([api.meeting(mid), api.comments(mid), api.soundbites(mid)])
      .then(([meeting, cs, sbs]) => { if (live) { setM(meeting); setComments(cs); setSoundbites(sbs); } })
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [mid]);
    const appliedStart = useRef(false);
  useEffect(() => {
    if (!m || appliedStart.current) return;
    appliedStart.current = true;
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (t > 0) player.seek(t);
  }, [m, player]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-extrabold">Meeting not found</h1>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <Link href="/" className="btn-primary mt-4">Back to meetings</Link>
      </div>
    );
  }
  if (!m) return <div className="m-6 h-96 animate-pulse rounded-2xl border border-line bg-surface" />;

  const seekPlay = (t: number) => player.seek(t, true);
  const jumpToSegment = (segmentId: number) => {
    const seg = m.segments.find((s) => s.id === segmentId);
    if (seg) seekPlay(seg.start_sec);
  };
  const guard = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : "Something went wrong", "error"); }
  };

    const addComment = (segmentId: number, body: string) =>
    guard(async () => {
      const created = await api.addComment(mid, body, segmentId);
      setComments((p) => [...p, created]);
      toast("Comment added");
    });
  const deleteComment = (cid: number) =>
    guard(async () => { await api.deleteComment(cid); setComments((p) => p.filter((c) => c.id !== cid)); toast("Comment deleted"); });
  const generate = () =>
    guard(async () => {
      setBusy(true);
      try { setSoundbites(await api.generateSoundbites(mid)); toast("Highlights generated"); } finally { setBusy(false); }
    });
  const deleteSoundbite = (sid: number) =>
    guard(async () => { await api.deleteSoundbite(sid); setSoundbites((p) => p.filter((s) => s.id !== sid)); });
  const remove = () =>
    guard(async () => { await api.deleteMeeting(mid); toast("Meeting deleted"); router.push("/"); });

  const openItems = m.action_items.filter((a) => !a.is_done).length;

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 lg:h-full lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-brand">
            <ArrowLeft className="size-3.5" />Meetings
          </Link>
          <h1 className="truncate text-xl font-extrabold tracking-tight">{m.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>{fmtDate(m.meeting_date)}</span>
            <span>{fmtDuration(m.duration_sec)}</span>
            <AvatarStack names={m.participants.map((p) => p.name)} />
            {m.tags.map((t) => <span key={t.id} className="rounded-full bg-bg px-2.5 py-0.5 font-medium">{t.name}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</button>
          <div className="relative">
            <button className="btn-ghost" onClick={() => setExportOpen((v) => !v)}><Download className="size-4" />Export</button>
            {exportOpen && (
              <div className="absolute right-0 z-30 mt-2 w-40 rounded-xl border border-line bg-surface p-1 text-sm shadow-lg">
                {(["md", "txt", "json"] as const).map((f) => (
                  <a key={f} href={api.exportUrl(m.id, f)} onClick={() => { setExportOpen(false); toast(`Exporting ${f.toUpperCase()}`, "info"); }}
                    className="block rounded-lg px-3 py-2 hover:bg-bg">
                    {f === "md" ? "Markdown (.md)" : f === "txt" ? "Plain text (.txt)" : "JSON (.json)"}
                  </a>
                ))}
              </div>
            )}
          </div>
          <button className="btn-ghost text-red-500" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" />Delete</button>
        </div>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:min-h-0">
          <Player
            duration={m.duration_sec} time={player.time} playing={player.playing} rate={player.rate}
            segments={m.segments} topics={m.topics}
            onToggle={player.toggle} onSeek={player.seek} onSkip={player.skip} onRate={player.setRate}
          />
          <TranscriptPane
            segments={m.segments} time={player.time} comments={comments}
            onSeek={seekPlay} onAddComment={addComment} onDeleteComment={deleteComment}
          />
        </div>

        <SummaryTabs
          tabs={[
            {
              key: "summary", label: "Summary", icon: FileText,
              content: <SummaryPanel meeting={m} soundbites={soundbites} busy={busy} onSeek={seekPlay} onGenerate={generate} onDeleteSoundbite={deleteSoundbite} />,
            },
            {
              key: "actions", label: "Actions", icon: ListChecks, badge: openItems,
              content: (
                <ActionItemList
                  meetingId={m.id} items={m.action_items} people={m.participants.map((p) => p.name)}
                  onChange={(items) => setM({ ...m, action_items: items })} onJump={jumpToSegment}
                />
              ),
            },
            {
              key: "chapters", label: "Chapters", icon: ListTree,
              content: <ChaptersPanel topics={m.topics} time={player.time} onSeek={seekPlay} />,
            },
              {
    key: "insights", label: "Insights", icon: Activity,
    content: <AnalyticsTab meetingId={m.id} refreshKey={`${m.action_items.length}-${openItems}`} />,
  },
  {
    key: "ask", label: "Ask", icon: Sparkles,
    content: <AskMeeting meetingId={m.id} onSeek={seekPlay} />,
  },
          ]}
        />
      </div>

      {editing && <EditMeetingModal meeting={m} onClose={() => setEditing(false)} onSaved={setM} />}
      {confirmDelete && (
        <Modal title="Delete this meeting?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-muted">
            This permanently deletes the transcript, summary, action items and comments for <b className="text-ink">{m.title}</b>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="btn-primary !bg-red-600" onClick={remove}>Delete meeting</button>
          </div>
        </Modal>
      )}
    </div>
  );
}