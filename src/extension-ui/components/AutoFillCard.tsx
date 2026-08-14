import React from 'react';
import { CheckCircle, FileText, Layers3, ShieldCheck } from 'lucide-react';

export interface AutoFillResult {
    platform: string;
    filledCount: number;
    skippedCount: number;
    errorCount: number;
    timestamp: string;
}

interface AutoFillCardProps {
    isApplicationPage: boolean;
    atsPlatform: string | null;
    hasProfile: boolean;
    selectedResumeId: string | null;
    resumes: any[];
    onSelectResume: (resumeId: string) => void;
    fillResult: AutoFillResult | null;
}

export const AutoFillCard: React.FC<AutoFillCardProps> = ({
    isApplicationPage,
    atsPlatform,
    hasProfile,
    selectedResumeId,
    resumes,
    onSelectResume,
    fillResult
}) => {
    if (!isApplicationPage) return null;

    return (
        <div className="rounded-[22px] overflow-hidden shadow-[0_12px_30px_rgba(15,23,42,0.06)] border border-[#ececf4] bg-white">
            <div className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3f2ff] text-[#4a4392] text-[10px] font-semibold border border-[#e4e2ff]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7b75df] animate-pulse" />
                        {atsPlatform || 'Application'} detected
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-[#eef0ff] text-[#4a4392] flex items-center justify-center border border-[#e4e7ff]">
                        <Layers3 size={15} />
                    </div>
                </div>
                <h2 className="text-[15px] font-semibold text-slate-950 mt-2">Application workspace</h2>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Track the job context and prep tailored materials from your selected resume.</p>

                {hasProfile && (
                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        <FileText size={12} className="text-[#7b75df] flex-shrink-0" />
                        <span className="font-medium">Using:</span>
                        <select
                            value={selectedResumeId || resumes[0]?.id || ''}
                            onChange={(e) => onSelectResume(e.target.value)}
                            className="bg-transparent hover:bg-white/80 border border-[#e6e7ef] hover:border-[#c8c7f4] text-gray-700 text-xs font-semibold rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#7b75df] focus:border-[#7b75df] max-w-[170px] truncate shadow-sm transition-all cursor-pointer"
                        >
                            {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                    {resume.title || 'Untitled Resume'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                            <ShieldCheck size={13} />
                            Ready
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug text-emerald-700/80">
                            {hasProfile ? 'Profile synced' : 'Add a resume to enable profile sync'}
                        </p>
                    </div>
                    <div className="rounded-xl border border-[#e7e8f0] bg-[#f8f8fb] px-2.5 py-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                            <CheckCircle size={13} />
                            {fillResult ? fillResult.platform : atsPlatform || 'ATS'}
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                            {fillResult ? `${fillResult.filledCount} fields synced` : 'Application page detected'}
                        </p>
                    </div>
                </div>

                {fillResult && fillResult.skippedCount + fillResult.errorCount > 0 && (
                    <div className="mt-3 p-2.5 bg-white rounded-xl border border-gray-100 space-y-1.5">
                        <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                            <CheckCircle size={14} />
                            Sync Complete - {fillResult.platform}
                        </div>
                        <div className="flex gap-3 text-xs">
                            <span className="text-green-600 font-medium">{fillResult.filledCount} filled</span>
                            {fillResult.skippedCount > 0 && (
                                <span className="text-amber-500 font-medium">{fillResult.skippedCount} skipped</span>
                            )}
                            {fillResult.errorCount > 0 && (
                                <span className="text-red-500 font-medium">{fillResult.errorCount} errors</span>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400">
                            Review skipped or errored fields directly on the application page.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
