import { useTranslation } from 'react-i18next';
import type { QuestLocale, LocalizedText } from '../../lib/ccafMissions';

/**
 * Which UI languages the course content is actually written in. The app
 * supports more (see SUPPORTED_LANGUAGES in constants.ts); everything else
 * falls back to the English source text — which is also the language the real
 * exam is sat in. Keep this in step with QuestLocale in ccafMissions.ts.
 */
export const CONTENT_LOCALES: QuestLocale[] = ['en', 'zh'];

const baseTag = (language?: string | null): string => language?.toLowerCase().split('-')[0] ?? 'en';

/** Maps a UI language tag (`zh-CN`, `en-GB`, …) onto a content locale. */
export const contentLocaleFor = (language?: string | null): QuestLocale => {
    const base = baseTag(language);
    return (CONTENT_LOCALES as string[]).includes(base) ? (base as QuestLocale) : 'en';
};

/** True when the questions themselves are written in this UI language. */
export const hasTranslatedContent = (language?: string | null): boolean =>
    (CONTENT_LOCALES as string[]).includes(baseTag(language));

export const useQuestLocale = () => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language;
    const locale = contentLocaleFor(language);
    const localize = (text: LocalizedText) => text[locale] || text.en;
    return { locale, localize, t, language, translated: hasTranslatedContent(language) };
};
