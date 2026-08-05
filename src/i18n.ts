
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LANGUAGES } from './constants';
import { getInitialLanguagePreference } from './utils/languagePreference';

/**
 * Cache key for the translation files.
 *
 * In a production build Vite replaces `import.meta.env.VITE_BUILD_ID` at build
 * time, so every deploy gets a fresh value and an edited string reaches users
 * on their next load rather than whenever their cache happens to expire.
 *
 * In dev there is no such value, so this falls back to the module's own load
 * time — a page refresh refetches, which is what you want while writing copy.
 */
// `import.meta.env` exists under Vite and is undefined in the Next.js server
// build, which shares this module — so it is read defensively, the same way
// firebase.ts reads its config.
const BUILD_ID: string =
    import.meta.env?.VITE_BUILD_ID
    || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BUILD_ID : undefined)
    || String(Date.now());

const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguagePreference(),
    fallbackLng: 'en',
    supportedLngs: supportedCodes,
    load: 'languageOnly', // e.g. en-US -> en
    debug: false,

    ns: ['translation'],
    defaultNS: 'translation',

    backend: {
      // Versioned, or the browser keeps serving the copy it fetched first and
      // any newly added string renders as its raw key — `ccaf_quest.reset_yes`
      // instead of "Yes, start over". A plain reload does not clear it; the
      // response is in the HTTP cache with no revalidation hint, so only the
      // URL changing forces a refetch.
      //
      // BUILD_ID changes per build in production and per session in dev, so a
      // string edit is picked up immediately while an unchanged file still
      // caches normally.
      loadPath: `/locales/{{lng}}/translation.json?v=${BUILD_ID}`,
    },

    detection: {
      order: ['path', 'localStorage', 'navigator', 'htmlTag'],
      lookupFromPathIndex: 0,
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false, // Disable suspense to prevent loading issues
    }
  });

export default i18n;
