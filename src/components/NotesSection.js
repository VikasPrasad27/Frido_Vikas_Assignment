import { useState } from 'react';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Button } from './ui/Button';
import { MessageSquare, Send, User } from 'lucide-react';

export function NotesSection({ requestId, notes = [], onAddNote, isAddingNote }) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('Support Agent');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setError('');
    try {
      await onAddNote(requestId, {
        authorName: authorName.trim() || 'Support Agent',
        content: content.trim(),
      });
      setContent('');
    } catch (err) {
      setError(err.message || 'Failed to add note');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Chronological Notes & Audit Log ({notes.length})
        </h4>
        <span className="text-[11px] text-slate-400 font-medium">Immutable</span>
      </div>

      {/* Timeline of Notes */}
      {notes.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
          No notes recorded yet. Notes can be added at any point in the request lifecycle.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{note.authorName}</span>
                </div>
                <span title={formatDate(note.createdAt)} className="text-[11px] text-slate-400">
                  {formatRelativeTime(note.createdAt)}
                </span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-100 space-y-2">
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Agent Name"
            className="w-1/3 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a new immutable note..."
              required
              className="w-full pl-3 pr-10 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isAddingNote || !content.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
