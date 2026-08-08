import React, { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import type { AgencyBranchProfile, AgencyPrepSession } from '../types';
import { buildExportFilename, buildSessionsCsv } from '../services/pilotExportService';
import { formatMinutesSaved, summarizeTimeSaved } from '../utils/timeSaved';

interface PilotSummaryExportButtonProps {
  branch: AgencyBranchProfile | null;
  sessions: AgencyPrepSession[];
}

const PilotSummaryExportButton: React.FC<PilotSummaryExportButtonProps> = ({ branch, sessions }) => {
  const [isPreparing, setIsPreparing] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    setIsPreparing(true);
    try {
      const url = buildSessionsCsv(sessions);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildExportFilename(branch);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsPreparing(false);
    }
  };

  const handlePrint = () => {
    if (!printableRef.current) return;
    const printContents = printableRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${branch?.branchName || 'CareerVivid'} pilot summary</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; color: #211b16; background: #fffaf1; }
            h1 { font-size: 22px; margin: 0 0 4px 0; }
            h2 { font-size: 14px; margin: 24px 0 8px; color: #8b5a16; text-transform: uppercase; letter-spacing: 0.06em; }
            table { border-collapse: collapse; width: 100%; font-size: 13px; }
            th, td { border-bottom: 1px solid #e4d3bc; padding: 8px 12px; text-align: left; }
            th { background: #fdf5e8; }
            .hero { display: inline-block; padding: 14px 18px; border: 1px solid #e4d3bc; border-radius: 12px; background: #fdf5e8; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const timeSaved = summarizeTimeSaved(sessions);
  const topLifts = [...sessions]
    .filter((session) => typeof session.scoreDelta === 'number' && session.scoreDelta > 0)
    .sort((a, b) => (b.scoreDelta || 0) - (a.scoreDelta || 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <button
        onClick={handleDownload}
        disabled={isPreparing || sessions.length === 0}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#211b16] px-3 py-2 text-[13px] font-bold text-[#fffaf1] transition hover:bg-[#3a2f26] disabled:cursor-not-allowed disabled:bg-[#9a8d7d] dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)] dark:hover:bg-[#e8e1d2]"
      >
        <Download size={13} /> Download CSV
      </button>
      <button
        onClick={handlePrint}
        disabled={sessions.length === 0}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e4d3bc] bg-white px-3 py-2 text-[13px] font-bold text-[#211b16] transition hover:bg-[#fdf5e8] disabled:cursor-not-allowed disabled:bg-[#f1ece2] dark:border-[#302e2a] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
      >
        <Printer size={13} /> Print summary
      </button>
      <p className="text-[11px] text-[#6b6358] dark:text-[#aaa39a]">
        Exports include progress only — no resume content or notes.
      </p>

      {/* Printable hidden region (used by print window) */}
      <div ref={printableRef} className="hidden">
        <h1>{branch?.branchName || 'CareerVivid Agency Partner Pilot'}</h1>
        <p>Pilot summary generated {new Date().toLocaleDateString()}</p>
        <div className="hero">
          <p style={{ margin: 0, fontSize: 12, color: '#8b5a16' }}>Recruiter time saved</p>
          <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700 }}>{formatMinutesSaved(timeSaved.totalMinutes)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>across {sessions.length} candidates</p>
        </div>
        <h2>Funnel snapshot</h2>
        <table>
          <thead><tr><th>Stage</th><th>Count</th></tr></thead>
          <tbody>
            <tr><td>Sessions</td><td>{sessions.length}</td></tr>
            <tr><td>Ready</td><td>{sessions.filter((s) => s.status === 'ready' || s.status === 'shared').length}</td></tr>
            <tr><td>Shared</td><td>{sessions.filter((s) => s.consentToShare || s.status === 'shared').length}</td></tr>
          </tbody>
        </table>
        <h2>Top score lifts</h2>
        <table>
          <thead><tr><th>Candidate</th><th>From</th><th>To</th><th>Δ</th></tr></thead>
          <tbody>
            {topLifts.length === 0 ? (
              <tr><td colSpan={4}>No score lifts recorded yet.</td></tr>
            ) : topLifts.map((session) => (
              <tr key={session.id}>
                <td>{session.candidateName}</td>
                <td>{session.startingScore ?? '—'}</td>
                <td>{session.latestScore ?? '—'}</td>
                <td>+{session.scoreDelta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PilotSummaryExportButton;
