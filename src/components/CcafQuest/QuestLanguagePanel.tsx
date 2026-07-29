import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../constants';
import {
    buildLocalizedPath,
    normalizeLanguageCode,
    setStoredLanguagePreference,
} from '../../utils/languagePreference';
import { hasTranslatedContent } from './useQuestLocale';

interface QuestLanguagePanelProps {
    open: boolean;
    onClose: () => void;
}

/**
 * In-game language switcher, opened with `L`.
 *
 * Deliberately does not reuse the site's LanguageSelect: that one navigates to
 * the localized path, which would remount the canvas and throw away the 3D
 * scene mid-mission. Here the language changes in place and the URL is
 * corrected with replaceState, which updates the address bar without waking
 * the router.
 *
 * Languages the questions have not been translated into are still offered —
 * the UI switches and the questions stay English — but they say so rather than
 * silently looking untranslated.
 */
export const QuestLanguagePanel: React.FC<QuestLanguagePanelProps> = ({ open, onClose }) => {
    const { t, i18n } = useTranslation();
    const current = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language) || 'en';
    const [cursor, setCursor] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // Open on whichever language is active, so the highlight starts somewhere useful.
    useEffect(() => {
        if (!open) return;
        const index = SUPPORTED_LANGUAGES.findIndex(l => l.code === current);
        setCursor(index < 0 ? 0 : index);
    }, [open, current]);

    const choose = useCallback((code: string) => {
        const normalized = setStoredLanguagePreference(code);
        (i18n as { changeLanguage?: (lng: string) => void }).changeLanguage?.(normalized);

        // Keep the address bar honest without triggering a route change.
        const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.history.replaceState(window.history.state, '', buildLocalizedPath(here, normalized));

        onClose();
    }, [i18n, onClose]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' || event.code === 'KeyL') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
                event.preventDefault();
                setCursor(c => {
                    const next = c + (event.code === 'ArrowDown' ? 1 : -1);
                    return (next + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length;
                });
                return;
            }
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                choose(SUPPORTED_LANGUAGES[cursor].code);
                return;
            }
            // Number keys jump straight to a language — the badge on each row
            // is the shortcut. Digit and numpad both, so either hand works.
            const digit = /^(Digit|Numpad)([1-9])$/.exec(event.code);
            if (digit) {
                const target = SUPPORTED_LANGUAGES[Number(digit[2]) - 1];
                if (!target) return;
                event.preventDefault();
                choose(target.code);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, cursor, choose, onClose]);

    if (!open) return null;

    return (
        <div
            // Above the mission dialog (z-50), which is fixed — so this is too,
            // or it would be trapped inside the canvas wrapper's stacking context.
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                ref={listRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('ccaf_quest.language_title')}
                className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#171411] text-white shadow-2xl"
                onClick={event => event.stopPropagation()}
            >
                <div className="border-b border-white/10 px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffb066]">
                        {t('ccaf_quest.language_kicker')}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold leading-tight">
                        {t('ccaf_quest.language_title')}
                    </h2>
                </div>

                {/* Language names must survive verbatim: AutoPageLocalizer would
                    otherwise translate them, rendering "日本語 (日本人)" instead of
                    "日本語 (Japanese)" and defeating the point of the picker. */}
                <div className="max-h-[52vh] overflow-y-auto py-2" data-no-auto-translate>
                    {SUPPORTED_LANGUAGES.map((lang, index) => {
                        const active = lang.code === current;
                        const highlighted = index === cursor;
                        const translated = hasTranslatedContent(lang.code);
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                // The badge is aria-hidden, so announce the shortcut properly.
                                aria-keyshortcuts={String(index + 1)}
                                onMouseEnter={() => setCursor(index)}
                                onClick={() => choose(lang.code)}
                                className={`flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition-colors ${
                                    highlighted ? 'bg-white/10' : 'bg-transparent'
                                }`}
                            >
                                <span className="flex min-w-0 items-center gap-3">
                                    {/* Doubles as the keyboard shortcut for this row. */}
                                    <span
                                        aria-hidden
                                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold tabular-nums ${
                                            active
                                                ? 'bg-[#ffb066] text-[#171411]'
                                                : highlighted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/55'
                                        }`}
                                    >
                                        {index + 1}
                                    </span>
                                    <span className="min-w-0">
                                        <span className={`block truncate text-sm font-bold ${active ? 'text-[#ffb066]' : 'text-white'}`}>
                                            {lang.nativeName}
                                        </span>
                                        <span className="block truncate text-[11px] text-white/45">{lang.name}</span>
                                    </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                    {!translated && (
                                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/55">
                                            {t('ccaf_quest.language_ui_only')}
                                        </span>
                                    )}
                                    {active && <span className="text-sm text-[#ffb066]">✓</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="border-t border-white/10 px-5 py-3">
                    <p className="text-[11px] font-semibold text-white/70">
                        {t('ccaf_quest.language_keys')}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                        {t('ccaf_quest.language_note')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QuestLanguagePanel;
