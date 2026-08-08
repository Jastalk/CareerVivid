import React, { useState } from 'react';
import { Loader2, Lock, Send, Trash2 } from 'lucide-react';
import type { RecruiterNote } from '../types';
import { addRecruiterNote, deleteRecruiterNote } from '../services/recruiterNotesService';

interface RecruiterNotesPanelProps {
  sessionId: string;
  notes: RecruiterNote[];
  canManage: boolean;
  isLoading?: boolean;
}

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const RecruiterNotesPanel: React.FC<RecruiterNotesPanelProps> = ({ sessionId, notes, canManage, isLoading }) => {
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const body = draft.trim();
    if (!body) return;
    setIsSaving(true);
    setError(null);
    try {
      await addRecruiterNote(sessionId, body);
      setDraft('');
    } catch (err: any) {
      console.error('Failed to add recruiter note:', err);
      setError(err?.message || 'Could not save note. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteRecruiterNote(sessionId, noteId);
    } catch (err) {
      console.error('Failed to delete recruiter note:', err);
    }
  };

  return (
    <section className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1] p-4 dark:border-[#302e2a] dark:bg-[#1f1f1d]">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Recruiter notes</h3>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8b5a16] dark:text-[#caa26c]">
            <Lock size={11} /> Private to your branch — candidate never sees these.
          </p>
        </div>
      </header>

      {canManage ? (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note for the next recruiter touch."
            rows={2}
            className="w-full resize-none rounded-lg border border-[#e4d3bc] bg-white px-3 py-2 text-[13px] text-[#211b16] placeholder-[#9a8d7d] focus:border-[#8b5a16] focus:outline-none focus:ring-1 focus:ring-[#8b5a16] dark:border-[#302e2a] dark:bg-[#262522] dark:text-[#f4f1e9] dark:placeholder-[#73695e]"
          />
          {error ? <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!draft.trim() || isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#211b16] px-3 py-1.5 text-[12px] font-bold text-[#fffaf1] transition hover:bg-[#3a2f26] disabled:cursor-not-allowed disabled:bg-[#9a8d7d] dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)] dark:hover:bg-[#e8e1d2]"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {isSaving ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="py-3 text-center text-xs text-[#6b6358] dark:text-[#aaa39a]">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="py-3 text-center text-xs text-[#6b6358] dark:text-[#aaa39a]">
          No notes yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-[#e4d3bc]/70 bg-white p-2.5 dark:border-[#302e2a] dark:bg-[#262522]">
              <p className="text-[13px] leading-5 text-[#211b16] dark:text-[#f4f1e9]">{note.body}</p>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6b6358] dark:text-[#aaa39a]">
                <span>{note.authorName} · {formatTimestamp(note.createdAt)}</span>
                {canManage ? (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    aria-label="Delete note"
                  >
                    <Trash2 size={11} />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecruiterNotesPanel;
