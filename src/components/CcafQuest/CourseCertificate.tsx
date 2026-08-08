import React from 'react';
import { Award, Download, Linkedin, Facebook } from 'lucide-react';
import { useQuestLocale } from './useQuestLocale';
import { downloadShareCard } from './questShareCard';
import { FloatingCard } from '../FloatingCard';

interface CourseCertificateProps {
    missions: number;
    xp: number;
    /** Share of missions cleared without a wrong answer. */
    perfect: number;
    domains: { order: number; name: string; weight: number }[];
}

/**
 * Shown on the home page once every mission is cleared: download the card, or
 * post the achievement.
 *
 * The finale already offers the same download, but it plays once and is gone.
 * A certificate you can only collect in the two seconds after finishing is a
 * certificate most people never collect, so it lives here permanently too.
 *
 * Sharing hands off to each network's own dialog rather than posting anything:
 * the player stays in control of what actually gets published, and we never
 * hold a social token.
 */
export const CourseCertificate: React.FC<CourseCertificateProps> = ({ missions, xp, perfect, domains }) => {
    const { t } = useQuestLocale();

    const card = {
        title: t('ccaf_quest.finale_title'),
        seal: t('ccaf_quest.finale_seal'),
        missions,
        xp,
        perfect,
        labels: {
            missions: t('ccaf_quest.missions'),
            xp: t('ccaf_quest.total_xp'),
            perfect: t('ccaf_quest.first_try'),
        },
        domains,
    };

    /** Query strings and hashes would only confuse the crawler's preview. */
    const pageUrl = typeof window === 'undefined'
        ? ''
        : `${window.location.origin}${window.location.pathname}`;

    const share = (network: 'linkedin' | 'facebook') => {
        const url = encodeURIComponent(pageUrl);
        const target = network === 'linkedin'
            ? `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
            : `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        // noopener: the share window must never get a handle on this one.
        window.open(target, '_blank', 'noopener,noreferrer,width=640,height=640');
    };

    return (
        <FloatingCard
            wrapperClassName="mt-4"
            className="border-[#1d9e75]/35 bg-gradient-to-br from-[#eefaf4]/90 to-[#fff8ec]/90 p-5 dark:border-[#1d9e75]/25 dark:from-[#12312a]/80 dark:to-[#2f2413]/80"
        >
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#0f6b50] dark:text-[#8fe0c6]">
                <Award size={16} /> {t('ccaf_quest.certificate_title')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#155f49] dark:text-[#bfe5d8]">
                {t('ccaf_quest.certificate_desc')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => downloadShareCard(card)}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd166] to-[#f5871f] px-4 py-2 text-xs font-black text-[#4a2c00] transition-transform hover:scale-[1.03] active:scale-95"
                >
                    <Download size={14} /> {t('ccaf_quest.certificate_download')}
                </button>
                <button
                    type="button"
                    onClick={() => share('linkedin')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0a66c2] px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.03] active:scale-95"
                >
                    <Linkedin size={14} /> LinkedIn
                </button>
                <button
                    type="button"
                    onClick={() => share('facebook')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1877f2] px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.03] active:scale-95"
                >
                    <Facebook size={14} /> Facebook
                </button>
            </div>
        </FloatingCard>
    );
};

export default CourseCertificate;
