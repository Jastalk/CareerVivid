import React from 'react';
import { Briefcase, Loader2, Minus, Plus, RotateCcw, Trash2, Volume2, X } from 'lucide-react';
import { NO_NEXT_ACTION } from '../../types';

interface JobDetailHeaderProps {
  localJob: any;
  t: any;
  isVoiceDropdownOpen: boolean;
  setIsVoiceDropdownOpen: (open: boolean) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  handleVoiceReset: () => void;
  handleVoiceSelect: (voice: SpeechSynthesisVoice) => void;
  fontSize: number;
  handleFontSizeChange: (direction: 'increase' | 'decrease') => void;
  handleDelete: () => void;
  isDeleting: boolean;
  onClose: () => void;
}

const actionTone = 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200';

const JobDetailHeader: React.FC<JobDetailHeaderProps> = ({
  localJob, t, isVoiceDropdownOpen, setIsVoiceDropdownOpen, voices, selectedVoice,
  handleVoiceReset, handleVoiceSelect, fontSize, handleFontSizeChange, handleDelete,
  isDeleting, onClose,
}) => (
<header className="sticky top-0 z-20 flex-shrink-0 border-b border-[#e6dac8] bg-[#fffaf4]/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-[#1f1f1d]/95 sm:p-5">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
    <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e7ddcf] bg-white text-[#4a4392] shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-[#aaa6ff]">
            <Briefcase size={22} />
        </div>
        <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold leading-tight tracking-tight text-gray-950 dark:text-gray-100 sm:text-2xl" title={localJob.jobTitle}>
                {localJob.jobTitle || t('job_tracker.modal.job_title')}
            </h2>
            <p className="mt-0.5 truncate text-sm font-medium text-gray-500 dark:text-gray-400" title={localJob.companyName}>
                {localJob.companyName || t('job_tracker.modal.company')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-[#d9d7fb] bg-[#f3f2ff] px-2.5 py-1 font-semibold text-[#4a4392] dark:border-[#4a456f] dark:bg-[#302e4c] dark:text-[#c8c5ff]">
                    {localJob.applicationStatus}
                </span>
                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    {localJob.priority || 'Medium'} Priority
                </span>
                {localJob.nextAction && localJob.nextAction !== NO_NEXT_ACTION && (
                    <span className={`max-w-full truncate rounded-full border px-2.5 py-1 font-semibold ${actionTone}`} title={localJob.nextAction}>
                        Next: {localJob.nextAction}
                    </span>
                )}
            </div>
        </div>
    </div>
    <div className="flex items-center justify-end gap-2 flex-shrink-0">
        <div className="relative">
            <button
                onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                className={`rounded-lg p-2 transition-colors ${isVoiceDropdownOpen ? 'bg-[#f3f2ff] text-[#4a4392] dark:bg-[#302e4c] dark:text-[#c8c5ff]' : 'text-gray-500 hover:bg-white hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100'}`}
                title="Voice Settings"
            >
                <Volume2 size={20} />
            </button>
            {isVoiceDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-[#ececf4] dark:border-gray-700 rounded-xl shadow-xl z-50 p-2 max-h-80 overflow-y-auto flex flex-col gap-1">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 px-2 mt-1">Select Voice</h4>
                    <button
                        onClick={handleVoiceReset}
                        className="w-full text-left px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md flex items-center gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2"
                    >
                        <RotateCcw size={12} /> Reset to Default
                    </button>
                    {voices.map(voice => (
                        <button
                            key={voice.voiceURI}
                            onClick={() => handleVoiceSelect(voice)}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded-lg truncate transition-colors flex justify-between items-center ${selectedVoice?.voiceURI === voice.voiceURI ? 'bg-[#f3f2ff] dark:bg-[#302e4c] text-[#4a4392] dark:text-[#c8c5ff] font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
                        >
                            <span className="truncate flex-1">{voice.name}</span>
                            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{voice.lang}</span>
                        </button>
                    ))}
                    {voices.length === 0 && (
                        <div className="p-4 text-center">
                            <p className="text-sm text-gray-500 mb-1">No voices found</p>
                            <p className="text-xs text-gray-400">Your browser may not support voices without interaction.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
        <div className="flex items-center gap-1 border-r border-[#e4d8c8] pr-2 dark:border-gray-700">
            <button onClick={() => handleFontSizeChange('decrease')} disabled={fontSize === 0} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100" title="Decrease text size">
                <Minus size={18} />
            </button>
            <button onClick={() => handleFontSizeChange('increase')} disabled={fontSize === 2} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100" title="Increase text size">
                <Plus size={18} />
            </button>
        </div>
        <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300" title={t('job_tracker.modal.delete_btn')}>
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </button>
        <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100" title={t('common.close', { defaultValue: 'Close' })}><X /></button>
    </div>
  </div>
</header>
);

export default JobDetailHeader;
