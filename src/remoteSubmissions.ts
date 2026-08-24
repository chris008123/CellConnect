import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { TeacherSubmission } from "./types";

const TABLE = "teacher_submissions";

interface SubmissionRow {
  id: string;
  teacher_name: string;
  date: string;
  attendees: TeacherSubmission["attendees"];
  submitted_at: string;
  updated_at: string;
}

function rowToSubmission(row: SubmissionRow): TeacherSubmission {
  return {
    id: row.id,
    teacherName: row.teacher_name,
    date: row.date,
    attendees: row.attendees ?? [],
    submittedAt: row.submitted_at,
  };
}

function submissionToRow(sub: TeacherSubmission) {
  return {
    id: sub.id,
    teacher_name: sub.teacherName,
    date: sub.date,
    attendees: sub.attendees,
    submitted_at: sub.submittedAt,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchSubmissionsForDate(
  date: string
): Promise<TeacherSubmission[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("date", date)
    .order("submitted_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as SubmissionRow[]).map(rowToSubmission);
}

export async function upsertSubmissionRemote(
  sub: TeacherSubmission
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(submissionToRow(sub), { onConflict: "id" });

  if (error) throw error;
}

export async function deleteSubmissionRemote(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Subscribes to any insert/update/delete on teacher_submissions for a given
 * date. Calls onChange() (no payload needed — caller just refetches) whenever
 * something changes. Returns the channel so the caller can unsubscribe later.
 */
export function subscribeToDateChanges(
  date: string,
  onChange: () => void
): RealtimeChannel {
  return supabase
    .channel(`teacher_submissions_${date}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLE,
        filter: `date=eq.${date}`,
      },
      () => onChange()
    )
    .subscribe();
}

export function unsubscribeChannel(channel: RealtimeChannel | null): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
