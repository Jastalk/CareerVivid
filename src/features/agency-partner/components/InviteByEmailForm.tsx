import React, { useState } from 'react';
import { CheckCircle2, Loader2, Mail, Send } from 'lucide-react';
import { sendAgencyInvite } from '../services/agencyInvitesService';

interface InviteByEmailFormProps {
  branchId: string;
  /** When true, the callable queues a [DEMO]-prefixed email and skips suppression. */
  demo?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InviteByEmailForm: React.FC<InviteByEmailFormProps> = ({ branchId, demo }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'warn' | 'err'; message: string } | null>(null);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setFeedback({ tone: 'err', message: 'Enter a valid candidate email address.' });
      return;
    }
    setIsSending(true);
    setFeedback(null);
    try {
      const result = await sendAgencyInvite({
        branchId,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        message: message.trim() || undefined,
        demo,
      });
      if (result.queued) {
        setFeedback({
          tone: 'ok',
          message: `Invite email queued${demo ? ' (demo)' : ''}${result.mailId ? ` · mail ${result.mailId}` : ''}.`,
        });
      } else {
        setFeedback({ tone: 'warn', message: `Invite recorded — email not sent (${result.reason}).` });
      }
      setEmail('');
      setFirstName('');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to send agency invite:', err);
      setFeedback({ tone: 'err', message: err?.message || 'Could not send invite. Try again.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="rounded-2xl border border-[#e4d3bc] bg-white p-5 dark:border-[#302e2a] dark:bg-[#1f1f1d]">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf5e8] text-[#8b5a16] dark:bg-[#262522] dark:text-[#caa26c]">
          <Mail size={15} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Invite by email</h3>
          <p className="text-xs text-[#6b6358] dark:text-[#aaa39a]">
            Send a prep link directly to a candidate. Respects their email preferences.
          </p>
        </div>
      </header>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-xs font-semibold text-[#211b16] dark:text-[#f4f1e9]">
          Candidate email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="candidate@example.com"
            className="mt-1 w-full rounded-lg border border-[#e4d3bc] bg-white px-3 py-2 text-[13px] font-normal text-[#211b16] focus:border-[#8b5a16] focus:outline-none focus:ring-1 focus:ring-[#8b5a16] dark:border-[#302e2a] dark:bg-[#262522] dark:text-[#f4f1e9]"
          />
        </label>
        <label className="text-xs font-semibold text-[#211b16] dark:text-[#f4f1e9]">
          First name (optional)
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Priya"
            className="mt-1 w-full rounded-lg border border-[#e4d3bc] bg-white px-3 py-2 text-[13px] font-normal text-[#211b16] focus:border-[#8b5a16] focus:outline-none focus:ring-1 focus:ring-[#8b5a16] dark:border-[#302e2a] dark:bg-[#262522] dark:text-[#f4f1e9]"
          />
        </label>
      </div>

      <label className="mt-2 block text-xs font-semibold text-[#211b16] dark:text-[#f4f1e9]">
        Short note (optional)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Looking forward to placing you — please clean this up first."
          className="mt-1 w-full resize-none rounded-lg border border-[#e4d3bc] bg-white px-3 py-2 text-[13px] font-normal text-[#211b16] focus:border-[#8b5a16] focus:outline-none focus:ring-1 focus:ring-[#8b5a16] dark:border-[#302e2a] dark:bg-[#262522] dark:text-[#f4f1e9]"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#6b6358] dark:text-[#aaa39a]">
          Daily limit: 50 invites per branch.
        </p>
        <button
          type="submit"
          disabled={isSending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#211b16] px-4 py-2 text-[13px] font-bold text-[#fffaf1] transition hover:bg-[#3a2f26] disabled:cursor-not-allowed disabled:bg-[#9a8d7d] dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)] dark:hover:bg-[#e8e1d2]"
        >
          {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {isSending ? 'Sending…' : `Send invite${demo ? ' (demo)' : ''}`}
        </button>
      </div>

      {feedback ? (
        <p
          className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${
            feedback.tone === 'ok'
              ? 'text-emerald-700 dark:text-emerald-300'
              : feedback.tone === 'warn'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.tone === 'ok' ? <CheckCircle2 size={12} /> : null}
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
};

export default InviteByEmailForm;
