/**
 * The public templates gallery.
 *
 * 36 real, distinct document designs is indexable content most competitors do
 * not have and some fake. The list is read from `TEMPLATES` rather than written
 * out by hand, so adding a template adds it here — a gallery that silently
 * omits half the product is worse than no gallery.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { navigate } from '../utils/navigation';
import { TEMPLATES } from '../templates';
import { useAuth } from '../contexts/AuthContext';

/**
 * Groups a reader actually chooses between.
 *
 * Anything not named here falls into "Modern and minimal", so a newly added
 * template appears in the gallery instead of disappearing from it.
 */
const GROUPS: Array<{ title: string; blurb: string; ids: string[] }> = [
    {
        title: 'Classic and traditional',
        blurb: 'Conventional layouts for fields that expect one — law, academia, finance, medicine.',
        ids: ['Harvard', 'Chicago', 'Classic', 'Serif', 'Academic', 'Executive', 'Corporate', 'Professional'],
    },
    {
        title: 'Creative and visual',
        blurb: 'For work that is itself visual. Use them when the portfolio is the point.',
        ids: ['Creative', 'Artistic', 'Vibrant', 'Infographic', 'Wave', 'Geometric', 'Timeline', 'Sydney', 'Bold', 'Dynamic'],
    },
    {
        title: 'Technical',
        blurb: 'Room for stacks, projects and links without crowding out the results.',
        ids: ['Technical', 'Quantum', 'Vertex', 'Orion', 'Apex', 'Slate', 'Zenith', 'Pinnacle', 'Cascade'],
    },
];

const groupedTemplates = () => {
    const claimed = new Set(GROUPS.flatMap((g) => g.ids));
    const rest = TEMPLATES.filter((t) => !claimed.has(t.id)).map((t) => t.id);
    return [
        ...GROUPS.map((g) => ({
            ...g,
            // Filtered against TEMPLATES so a renamed or removed template cannot
            // leave a card here pointing at nothing.
            templates: TEMPLATES.filter((t) => g.ids.includes(t.id)),
        })),
        {
            title: 'Modern and minimal',
            blurb: 'The safest default. Clean single-column layouts that survive an ATS and a six-second skim equally well.',
            ids: rest,
            templates: TEMPLATES.filter((t) => rest.includes(t.id)),
        },
    ].filter((g) => g.templates.length > 0);
};

const FAQS = [
    {
        q: 'Are these resume templates really free?',
        a: `Yes. All ${TEMPLATES.length} templates are available on the free plan with unlimited PDF downloads and no card required.`,
    },
    {
        q: 'Which resume template is best for ATS?',
        a: 'Any single-column template with conventional section headings parses most reliably — Modern, Simple, Classic, Minimalist and Harvard are all safe choices. Every CareerVivid template uses selectable text rather than images, which is the part that matters most.',
    },
    {
        q: 'Can I switch templates after writing my resume?',
        a: 'Yes. Content and design are stored separately, so changing template keeps all of your text and lets you compare designs instantly.',
    },
];

const ResumeTemplatesPage: React.FC = () => {
    const { currentUser } = useAuth();
    const start = () => navigate(currentUser ? '/newresume' : '/signup');
    const groups = groupedTemplates();

    return (
        <div className="min-h-screen bg-[var(--cv-bg-public)]">
            <Helmet>
                {/* One expression, not two children: Helmet requires <title> to
                    receive a single string, and `{n} Free…` is an array. The
                    "| CareerVivid" suffix comes from the shell's titleTemplate. */}
                <title>{`${TEMPLATES.length} Free Resume Templates`}</title>
                <meta
                    name="description"
                    content={`Browse ${TEMPLATES.length} free resume templates — classic, modern, creative, and technical. Every template is editable, ATS-friendly, and downloadable as PDF at no cost.`}
                />
                <link rel="canonical" href="https://careervivid.app/resume-templates" />
            </Helmet>

            <PublicHeader variant="editorial" />

            <main className="pt-24">
                <section className="mx-auto max-w-4xl px-4 pb-10 pt-10 text-center sm:px-6 lg:px-8">
                    <h1 className="text-4xl font-black leading-tight text-[var(--cv-text-heading)] sm:text-5xl">
                        {TEMPLATES.length} resume templates, free to use
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--cv-text-body)]">
                        Pick one, fill it in, and download it as a PDF. Switching templates keeps your
                        content, so trying another costs you nothing but a click.
                    </p>
                    <button
                        type="button"
                        onClick={start}
                        className="cv-design-button-primary mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-black"
                    >
                        Start with any template
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </section>

                {groups.map((group) => (
                    <section key={group.title} className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
                        <h2 className="text-2xl font-black text-[var(--cv-text-heading)]">{group.title}</h2>
                        <p className="mb-6 mt-2 max-w-2xl text-sm leading-relaxed text-[var(--cv-text-body)]">
                            {group.blurb}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {group.templates.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={start}
                                    className="cv-design-card cv-design-card-hover p-4 text-left"
                                >
                                    <h3 className="text-base font-black text-[var(--cv-text-heading)]">
                                        {template.name}
                                    </h3>
                                    <div className="mt-3 flex items-center gap-1.5" aria-label={`${template.availableColors.length} colour options`}>
                                        {template.availableColors.slice(0, 6).map((colour) => (
                                            <span
                                                key={colour}
                                                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                                                style={{ backgroundColor: colour }}
                                            />
                                        ))}
                                    </div>
                                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--cv-text-muted)]">
                                        <Check className="h-3 w-3" />
                                        Free · PDF export
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}

                <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
                    <h2 className="mb-6 text-2xl font-black text-[var(--cv-text-heading)]">
                        Frequently asked questions
                    </h2>
                    <div className="space-y-5">
                        {FAQS.map(({ q, a }) => (
                            <div key={q} className="cv-design-card p-5">
                                <h3 className="mb-2 text-base font-black text-[var(--cv-text-heading)]">{q}</h3>
                                <p className="text-sm leading-relaxed text-[var(--cv-text-body)]">{a}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default ResumeTemplatesPage;
