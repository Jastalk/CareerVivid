import React, { useState } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Check, 
  Trash2, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  ShieldCheck
} from 'lucide-react';
import { useAIReview, AISuggestion, suggestionAssertsNewFact } from '../../../contexts/AIReviewContext';
import { ResumeData } from '../../../types';
import { buildResumeWithReviewSuggestions } from '../../../utils/aiReviewSuggestions';
import { calculateResumeScore } from '../../../utils/resumeScoreUtils';
import {
  getLocalizedReviewTagLabel,
  getResumeReviewLanguageProfile,
} from '../../../utils/aiReviewLanguage';

interface AIReviewPanelProps {
  resume: ResumeData;
  currentUserUid: string;
  onUpdate: (updates: Partial<ResumeData>) => void;
}

/**
 * Where the paced progress stops while waiting on the real result.
 *
 * Short of 100 deliberately: the last stretch belongs to the response actually
 * arriving, so the bar never claims to be finished before the work is.
 */
const SCAN_PROGRESS_CEILING = 92;

export const AIReviewPanel: React.FC<AIReviewPanelProps> = ({ resume, currentUserUid, onUpdate }) => {
  const {
    suggestions,
    selectedSuggestionIds,
    hoveredSuggestionId,
    setHoveredSuggestionId,
    isScanning,
    hasScanned,
    scanResume,
    applySelected,
    ignoreSelected,
    toggleSuggestion,
    toggleAll,
    clearSuggestions
  } = useAIReview();

  const [groupBy, setGroupBy] = useState<'section' | 'priority'>('section');
  const [scanProgress, setScanProgress] = useState(0);
  const reviewLanguage = React.useMemo(() => getResumeReviewLanguageProfile(resume), [resume]);
  const reviewUI = reviewLanguage.ui;
  const previousReviewLanguageCodeRef = React.useRef(reviewLanguage.code);

  React.useEffect(() => {
    if (previousReviewLanguageCodeRef.current === reviewLanguage.code) return;
    previousReviewLanguageCodeRef.current = reviewLanguage.code;
    clearSuggestions();
  }, [clearSuggestions, reviewLanguage.code]);

  /*
   * Paced progress while the scan runs, so the wait has a shape.
   *
   * It stops short of 100 on purpose — the bar completes when the real result
   * lands, not when this timer says so. The ceiling is applied to the RESULT
   * rather than the input, which is what was wrong before: the old guard
   * returned early only if p was ALREADY past the cap, so a step from 91 could
   * add up to 19 and render "105% — Polishing recommended edits…". A progress
   * bar reading over 100 tells the user the thing they are waiting on is
   * broken, right at the moment they are being asked to trust its output.
   */
  React.useEffect(() => {
    let interval: number;
    if (isScanning) {
      setScanProgress(0);
      interval = window.setInterval(() => {
        setScanProgress((p) => Math.min(SCAN_PROGRESS_CEILING, p + Math.floor(Math.random() * 15) + 5));
      }, 600);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleScan = async () => {
    await scanResume(resume, currentUserUid);
  };

  const getProgressLabel = (progress: number) => {
    if (progress < 25) return reviewUI.progress[0];
    if (progress < 50) return reviewUI.progress[1];
    if (progress < 75) return reviewUI.progress[2];
    if (progress < 90) return reviewUI.progress[3];
    return reviewUI.progress[4];
  };

  // Grouping logic
  const getGroupedSuggestions = () => {
    const groups: Record<string, AISuggestion[]> = {};

    suggestions.forEach((s) => {
      let key = reviewUI.sections.other;
      if (groupBy === 'section') {
        if (s.category === 'skills') key = reviewUI.sections.skills;
        else if (s.category === 'experience') key = reviewUI.sections.experience;
        else if (s.category === 'summary') key = reviewUI.sections.summary;
        else if (s.category === 'personalDetails') key = reviewUI.sections.personalDetails;
      } else {
        if (s.priority === 'high') key = reviewUI.priorities.high;
        else if (s.priority === 'medium') key = reviewUI.priorities.medium;
        else if (s.priority === 'low') key = reviewUI.priorities.low;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return groups;
  };

  const grouped = getGroupedSuggestions();
  const hasSuggestions = suggestions.length > 0;
  /** True only when the two groupings would actually produce different lists. */
  const groupingIsMeaningful =
    new Set(suggestions.map((s) => s.category)).size > 1
    || new Set(suggestions.map((s) => s.priority)).size > 1;
  const allSelected = hasSuggestions && selectedSuggestionIds.size === suggestions.length;
  const someSelected = hasSuggestions && selectedSuggestionIds.size > 0 && selectedSuggestionIds.size < suggestions.length;
  const currentScore = calculateResumeScore(resume).overallScore;
  const projectedResume = hasSuggestions
    ? buildResumeWithReviewSuggestions(resume, suggestions, selectedSuggestionIds)
    : resume;
  const projectedScore = hasSuggestions
    ? calculateResumeScore(projectedResume).overallScore
    : currentScore;

  return (
    <div className="h-full flex flex-col relative text-gray-800 dark:text-gray-200">
      
      {/* 1. INITIAL READY TO SCAN STATE */}
      {!hasSuggestions && !isScanning && (
        <div className="flex-grow flex flex-col justify-center items-center p-6 text-center space-y-6 animate-fade-in">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl relative group ${
            hasScanned
              ? 'bg-emerald-600 shadow-emerald-500/20'
              : 'bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-indigo-500/20'
          }`}>
            {hasScanned ? (
              <Check className="w-8 h-8 text-white" />
            ) : (
              <>
                <BrainCircuit className="w-8 h-8 text-white animate-pulse" />
                <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1.5 -right-1.5 animate-bounce" />
              </>
            )}
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {hasScanned ? reviewUI.noActionableEdits : reviewUI.scanWithAIReview}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {hasScanned
                ? reviewUI.noEditsBody(currentScore)
                : reviewUI.scanBody}
            </p>
          </div>

          {!hasScanned && (
            <div className="w-full max-w-xs bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800 space-y-2.5 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{reviewUI.proofPoints[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>{reviewUI.proofPoints[1]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>{reviewUI.proofPoints[2]}</span>
            </div>
            </div>
          )}

          <button
            onClick={handleScan}
            className="w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-[#2b164f] to-indigo-800 hover:from-indigo-850 hover:to-[#2b164f] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Sparkles size={16} />
            <span>{hasScanned ? reviewUI.scanAgain : reviewUI.scanResume}</span>
          </button>
        </div>
      )}

      {/* 2. SCANNING LOADER STATE */}
      {isScanning && (
        <div className="flex-grow flex flex-col justify-center items-center p-6 text-center space-y-6 animate-fade-in">
          <div className="relative flex items-center justify-center w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950/30" />
            <div 
              className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" 
              style={{ animationDuration: '0.8s' }}
            />
            <BrainCircuit className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>

          <div className="space-y-1.5 max-w-xs">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider animate-pulse">
              {reviewUI.assessmentLabel}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold tracking-wide">
              {scanProgress}% — {getProgressLabel(scanProgress)}
            </p>
          </div>

          <div className="w-full max-w-xs bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300 ease-out" 
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. SUGGESTIONS LIST CHECKLIST STATE */}
      {hasSuggestions && !isScanning && (
        <>
          {/* Filter Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
            {/*
              * Only offer the grouping switch when it would change something.
              *
              * With four suggestions that are all skills and all medium
              * priority — the common case — both modes render one identical
              * group, so pressing either button appeared to do nothing and the
              * two words were left to explain themselves. A control that
              * changes nothing is worse than no control: it makes people
              * wonder what they missed. Below the threshold the header just
              * states what they are looking at.
              */}
            {groupingIsMeaningful ? (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{reviewUI.groupBy}</span>
                <div className="ml-1 flex rounded-lg bg-gray-200/60 p-0.5 dark:bg-gray-800">
                  <button
                    onClick={() => setGroupBy('section')}
                    title="Group by resume section — skills, experience, summary"
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${groupBy === 'section' ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {reviewUI.section}
                  </button>
                  <button
                    onClick={() => setGroupBy('priority')}
                    title="Group by impact — highest-impact suggestions first"
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${groupBy === 'priority' ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {reviewUI.priority}
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {suggestions.length} {suggestions.length === 1 ? 'suggestion' : 'suggestions'}
              </span>
            )}

            <button
              onClick={clearSuggestions}
              className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wider"
            >
              {reviewUI.clearReview}
            </button>
          </div>

          {/* Checklist Area */}
          <div className="flex-grow overflow-y-auto p-3 space-y-4 custom-scrollbar pb-24">
            {Object.entries(grouped).map(([groupTitle, list]) => (
              <div key={groupTitle} className="space-y-2 animate-fade-in">
                {/* Group Divider */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    {groupTitle} ({list.length} {reviewUI.suggestions})
                  </h4>
                </div>

                {/* Suggestion Cards */}
                {list.map((s) => {
                  const isChecked = selectedSuggestionIds.has(s.id);
                  const isHovered = hoveredSuggestionId === s.id;

                  return (
                    <div
                      key={s.id}
                      onMouseEnter={() => setHoveredSuggestionId(s.id)}
                      onMouseLeave={() => setHoveredSuggestionId(null)}
                      onClick={() => toggleSuggestion(s.id)}
                      className={`
                        group border rounded-xl p-3.5 space-y-2 cursor-pointer transition-all duration-200 relative overflow-hidden
                        ${isChecked 
                          ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-800/80 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/10' 
                          : 'bg-gray-50/50 dark:bg-gray-900/10 border-gray-150 dark:border-gray-800 opacity-60 hover:opacity-100 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-200'
                        }
                        ${isHovered ? 'shadow-lg border-indigo-400 dark:border-indigo-600 scale-[1.01]' : ''}
                      `}
                    >
                      {/* Top Meta info */}
                      <div className="flex items-start justify-between gap-2 select-none">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            s.category === 'skills' 
                              ? 'bg-orange-400' 
                              : s.category === 'experience'
                                ? 'bg-indigo-500'
                                : 'bg-purple-500'
                          }`} />
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {s.title}
                          </span>
                        </div>

                        {/* Custom styled checkbox */}
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 group-hover:border-indigo-400'
                        }`}>
                          {isChecked && <Check size={10} className="stroke-[3]" />}
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                        {s.explanation}
                      </p>

                      {/*
                        * Say why this one is not already ticked.
                        *
                        * An unchecked box next to ticked ones otherwise looks
                        * like a glitch, and the user clicks it to "fix" the
                        * inconsistency — which is the opposite of asking them
                        * to think about whether the claim is true.
                        */}
                      {suggestionAssertsNewFact(s) && (
                        <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[10px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          <ShieldCheck size={12} className="mt-px shrink-0" />
                          {/\[ADD NUMBER\]/i.test(s.suggestedText)
                            ? 'Replace [ADD NUMBER] with your real figure before applying.'
                            : 'Only add this if you have actually done it — you may be asked about it in the interview.'}
                        </p>
                      )}

                      {/* Visual Changes badge comparison */}
                      {isChecked && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1 text-[10px] leading-relaxed">
                          {s.type === 'delete' && (
                            <div className="flex items-center flex-wrap gap-1 font-bold text-red-500">
                              <span>{reviewUI.remove}</span>
                              <span className="line-through decoration-red-500 decoration-2 text-red-600 dark:text-red-400">{s.originalText}</span>
                            </div>
                          )}
                          {s.type === 'add' && (
                            <div className="flex items-center flex-wrap gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                              <span>{reviewUI.add}</span>
                              <span className="border-b-2 border-emerald-500/90 pb-[1px]">{s.suggestedText}</span>
                            </div>
                          )}
                          {s.type === 'replace' && (
                            <div className="flex flex-col gap-1 w-full font-bold">
                              <div className="flex items-center flex-wrap gap-1 text-red-500">
                                <span className="opacity-60 text-[9px] uppercase tracking-wider w-10">{reviewUI.old}</span>
                                <span className="line-through decoration-red-500 decoration-2 text-red-600 dark:text-red-400 font-medium">{s.originalText}</span>
                              </div>
                              <div className="flex items-center flex-wrap gap-1 text-emerald-600 dark:text-emerald-400">
                                <span className="opacity-60 text-[9px] uppercase tracking-wider w-10">{reviewUI.new}</span>
                                <span className="border-b-2 border-emerald-500/90 pb-[1px] font-medium">{s.suggestedText}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 pt-1 select-none">
                        {s.tags.map((tag) => (
                          <span 
                            key={tag} 
                            className={`
                              text-[9px] font-bold px-1.5 py-0.5 rounded border
                              ${tag === 'Stay Relevant' 
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/20' 
                                : tag === 'Tailor Resume'
                                  ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20'
                              }
                            `}
                          >
                            {getLocalizedReviewTagLabel(tag, reviewLanguage)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Floating Action Toolbar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-gray-800/95 border-t border-gray-150 dark:border-gray-800 backdrop-blur flex items-center justify-between shrink-0 shadow-lg select-none z-10">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleAll(!allSelected)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  allSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : someSelected 
                      ? 'bg-indigo-400 border-indigo-400 text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                }`}
                title={allSelected ? reviewUI.deselectAll : reviewUI.selectAll}
              >
                {allSelected && <Check size={10} className="stroke-[3]" />}
                {someSelected && <span className="w-1.5 h-0.5 bg-white rounded-full" />}
              </button>

            <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-950 dark:text-white leading-none">
                  {selectedSuggestionIds.size} {reviewUI.selected}
                </span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                  {reviewUI.score} {currentScore} → {projectedScore}
                </span>
            </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={ignoreSelected}
                disabled={selectedSuggestionIds.size === 0}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold rounded-lg text-xs transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reviewUI.ignore}
              </button>
              <button
                onClick={() => applySelected(resume, onUpdate)}
                disabled={selectedSuggestionIds.size === 0}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check size={12} className="stroke-[2.5]" />
                <span>{reviewUI.apply}</span>
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
