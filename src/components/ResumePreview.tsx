
import React, { ComponentType, LazyExoticComponent, Suspense } from 'react';
import { ResumeData, TemplateId, DEFAULT_FORMATTING_SETTINGS } from '../types';
import { sanitizeCustomCss } from '../utils/sanitizeCustomCss';


interface ResumePreviewProps {
  resume: ResumeData;
  template: TemplateId;
  previewId?: string;
  className?: string;
  previewRef?: React.RefObject<HTMLDivElement>;
  onUpdate?: (data: Partial<ResumeData>) => void;
  onFocus?: (fieldId: string) => void;
}

type ResumeTemplateComponent = ComponentType<any>;
type TemplateLoader = () => Promise<{ default: ResumeTemplateComponent }>;

const templateLoaders: Record<string, TemplateLoader> = {
  Sydney: () => import('./templates/SydneyTemplate').then((m) => ({ default: m.SydneyTemplate })),
  Modern: () => import('./templates/ModernTemplate').then((m) => ({ default: m.ModernTemplate })),
  Creative: () => import('./templates/CreativeTemplate').then((m) => ({ default: m.CreativeTemplate })),
  Professional: () => import('./templates/ProfessionalTemplate').then((m) => ({ default: m.ProfessionalTemplate })),
  Executive: () => import('./templates/ExecutiveTemplate').then((m) => ({ default: m.ExecutiveTemplate })),
  Minimalist: () => import('./templates/MinimalistTemplate').then((m) => ({ default: m.MinimalistTemplate })),
  Elegant: () => import('./templates/ElegantTemplate').then((m) => ({ default: m.ElegantTemplate })),
  Corporate: () => import('./templates/CorporateTemplate').then((m) => ({ default: m.CorporateTemplate })),
  Technical: () => import('./templates/TechnicalTemplate').then((m) => ({ default: m.TechnicalTemplate })),
  Artistic: () => import('./templates/ArtisticTemplate').then((m) => ({ default: m.ArtisticTemplate })),
  Vibrant: () => import('./templates/VibrantTemplate').then((m) => ({ default: m.VibrantTemplate })),
  Slate: () => import('./templates/SlateTemplate').then((m) => ({ default: m.SlateTemplate })),
  Academic: () => import('./templates/AcademicTemplate').then((m) => ({ default: m.AcademicTemplate })),
  Apex: () => import('./templates/ApexTemplate').then((m) => ({ default: m.ApexTemplate })),
  Bold: () => import('./templates/BoldTemplate').then((m) => ({ default: m.BoldTemplate })),
  Cascade: () => import('./templates/CascadeTemplate').then((m) => ({ default: m.CascadeTemplate })),
  Chicago: () => import('./templates/ChicagoTemplate').then((m) => ({ default: m.ChicagoTemplate })),
  Classic: () => import('./templates/ClassicTemplate').then((m) => ({ default: m.ClassicTemplate })),
  Compact: () => import('./templates/CompactTemplate').then((m) => ({ default: m.CompactTemplate })),
  Crisp: () => import('./templates/CrispTemplate').then((m) => ({ default: m.CrispTemplate })),
  Dynamic: () => import('./templates/DynamicTemplate').then((m) => ({ default: m.DynamicTemplate })),
  Geometric: () => import('./templates/GeometricTemplate').then((m) => ({ default: m.GeometricTemplate })),
  Harvard: () => import('./templates/HarvardTemplate').then((m) => ({ default: m.HarvardTemplate })),
  Infographic: () => import('./templates/InfographicTemplate').then((m) => ({ default: m.InfographicTemplate })),
  Monochrome: () => import('./templates/MonochromeTemplate').then((m) => ({ default: m.MonochromeTemplate })),
  Orion: () => import('./templates/OrionTemplate').then((m) => ({ default: m.OrionTemplate })),
  Pinnacle: () => import('./templates/PinnacleTemplate').then((m) => ({ default: m.PinnacleTemplate })),
  Quantum: () => import('./templates/QuantumTemplate').then((m) => ({ default: m.QuantumTemplate })),
  Serif: () => import('./templates/SerifTemplate').then((m) => ({ default: m.SerifTemplate })),
  Simple: () => import('./templates/SimpleTemplate').then((m) => ({ default: m.SimpleTemplate })),
  Spacious: () => import('./templates/SpaciousTemplate').then((m) => ({ default: m.SpaciousTemplate })),
  Swiss: () => import('./templates/SwissTemplate').then((m) => ({ default: m.SwissTemplate })),
  Timeline: () => import('./templates/TimelineTemplate').then((m) => ({ default: m.TimelineTemplate })),
  Vertex: () => import('./templates/VertexTemplate').then((m) => ({ default: m.VertexTemplate })),
  Wave: () => import('./templates/WaveTemplate').then((m) => ({ default: m.WaveTemplate })),
  Zenith: () => import('./templates/ZenithTemplate').then((m) => ({ default: m.ZenithTemplate })),
};

const lazyTemplateCache = new Map<string, LazyExoticComponent<ResumeTemplateComponent>>();

const getLazyResumeTemplate = (template: TemplateId) => {
  const safeTemplate = templateLoaders[template] ? template : 'Modern';
  const cachedTemplate = lazyTemplateCache.get(safeTemplate);
  if (cachedTemplate) return cachedTemplate;

  const LazyTemplate = React.lazy(templateLoaders[safeTemplate]);
  lazyTemplateCache.set(safeTemplate, LazyTemplate);
  return LazyTemplate;
};

/*
 * `customCss` is written by the AI Code Customizer on the owner's behalf, and
 * it lands in `#preview-id { ...customCss... }`. A public resume page renders
 * this very component for third-party viewers (PublicResumePage, and the
 * community feed), so a resume owner who can get an unbalanced `}` into that
 * string stops styling their resume and starts styling the page around it.
 *
 * The guard lives in src/utils/sanitizeCustomCss.ts because the portfolio
 * preview injects the same kind of AI-written string into the same kind of
 * scoping block, and two copies of a sanitizer is one copy that gets fixed.
 */

const escapeCssIdentifier = (value: string) => {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
};

// Wrapped in React.memo to prevent unnecessary re-renders when props haven't changed.
// This is crucial for performance as the resume preview can be expensive to render.
const ResumePreview: React.FC<ResumePreviewProps> = React.memo(({ resume, template, previewId: previewIdOverride, className, previewRef, onUpdate, onFocus }) => {
  const TemplateComponent = getLazyResumeTemplate(template);
  const templateProps = { resume, themeColor: resume.themeColor, titleFont: resume.titleFont, bodyFont: resume.bodyFont, onUpdate, onFocus };

  // Get formatting settings with defaults
  const fmt = {
    ...DEFAULT_FORMATTING_SETTINGS,
    ...(resume.formattingSettings || {}),
  };

  // CSS variables for real-time formatting
  const formattingStyles: React.CSSProperties = {
    '--body-scale': fmt.bodyScale,
    '--line-height': fmt.lineHeight,
    '--section-gap': `${fmt.sectionGap}rem`,
    '--paragraph-gap': `${fmt.paragraphGap}rem`,
    '--page-margin': `${fmt.pageMargin}rem`,
  } as React.CSSProperties;

  const previewId = previewIdOverride || `resume-preview-${resume.id || 'default'}`;
  const previewSelector = `#${escapeCssIdentifier(previewId)}`;
  const safeCustomCss = React.useMemo(() => sanitizeCustomCss(resume.customCss).css, [resume.customCss]);
  const formattingCss = `
    ${previewSelector} .cv-format-surface {
      font-size: calc(16px * var(--body-scale, 1));
      line-height: var(--line-height, 1.4);
      min-height: 297mm;
      background: #ffffff;
    }
    ${previewSelector} .cv-format-surface > :first-child {
      min-height: inherit;
    }
    ${previewSelector} .cv-format-surface > .flex {
      align-items: stretch;
    }
    ${previewSelector} .cv-format-surface :where(div, p, span, a, li) {
      line-height: var(--line-height, 1.4) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-xs) {
      font-size: calc(0.75rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-sm) {
      font-size: calc(0.875rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-base) {
      font-size: calc(1rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-md) {
      font-size: calc(1rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-lg) {
      font-size: calc(1.125rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-xl) {
      font-size: calc(1.25rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-2xl) {
      font-size: calc(1.5rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-3xl) {
      font-size: calc(1.875rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-4xl) {
      font-size: calc(2.25rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(.text-5xl) {
      font-size: calc(3rem * var(--body-scale, 1)) !important;
    }
    ${previewSelector} .cv-format-surface :where(section) {
      margin-bottom: var(--section-gap, 1.5rem) !important;
    }
    ${previewSelector} .cv-format-surface :where(p, ul, ol, [data-field-id$=".description"], [data-field-id="professionalSummary"]) {
      margin-bottom: var(--paragraph-gap, 0.5rem) !important;
    }
    ${previewSelector} .cv-format-surface > :first-child:not(.flex) {
      padding: var(--page-margin, 2rem) !important;
    }
    ${previewSelector} .cv-format-surface > .flex > aside {
      padding: var(--page-margin, 2rem) !important;
    }
    ${previewSelector} .cv-format-surface > .flex > main {
      padding: calc(var(--page-margin, 2rem) * 1.25) var(--page-margin, 2rem) !important;
    }
  `;

  return (
    <div
      id={previewId}
      data-resume-preview-root="true"
      /*
       * `cv-resume-document` marks this subtree as a printed document rather
       * than a surface of the app. index.css uses it to hold the whole resume
       * out of dark mode: the paper stays white, the ink stays dark, and the
       * PDF matches what is on screen whichever theme the user happens to be
       * in. Renaming it means updating those rules too.
       */
      className={`cv-resume-document w-full min-h-[297mm] max-w-full bg-white shadow-lg relative ${className || ''}`}
      ref={previewRef}
      style={formattingStyles}
    >
      {/* Scoped custom CSS injection — AI Code Customizer writes here */}
      <style>{formattingCss}</style>
      {safeCustomCss && (
        <style>{`${previewSelector} { ${safeCustomCss} }`}</style>
      )}
      <div className="cv-format-surface">
        <Suspense fallback={<div className="min-h-[297mm] bg-white" aria-label="Loading resume template" />}>
          <TemplateComponent {...templateProps} />
        </Suspense>
      </div>
    </div>
  );
});

export default ResumePreview;
