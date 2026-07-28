import React from 'react';
import { Html } from '@react-three/drei';
import type { PlacedDomain } from '../../lib/questSource';
import { useQuestLocale } from './useQuestLocale';

interface DomainLabelsProps {
    domains: PlacedDomain[];
    /** Completion ratio per domain order, drives the progress pill. */
    litByDomain: Record<number, number>;
    /** Only rendered from the overview, where districts read as regions. */
    visible: boolean;
}

/**
 * District signage for the bird's-eye view. From up here the city stops being
 * a place to walk and becomes the exam syllabus: one labelled region per
 * domain, with its weight and how much of it is done.
 */
export const DomainLabels: React.FC<DomainLabelsProps> = ({ domains, litByDomain, visible }) => {
    const { localize } = useQuestLocale();
    if (!visible) return null;

    return (
        <>
            {domains.map(domain => {
                const ratio = litByDomain[domain.order] ?? 0;
                const cleared = Math.round(ratio * domain.missions.length);
                return (
                    <Html
                        key={domain.id}
                        center
                        position={[domain.district.center[0], 16, domain.district.center[1]]}
                        zIndexRange={[15, 0]}
                    >
                        <div className="pointer-events-none w-44 select-none rounded-2xl bg-[#171411]/90 px-3 py-2.5 text-center text-white shadow-xl backdrop-blur-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#ffb066]">
                                Domain {domain.order} · {domain.weight}%
                            </p>
                            <p className="mt-0.5 truncate text-[13px] font-extrabold leading-tight">
                                {localize(domain.name)}
                            </p>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#f5871f] to-[#1d9e75]"
                                    style={{ width: `${ratio * 100}%` }}
                                />
                            </div>
                            <p className="mt-1 text-[10px] font-semibold text-white/70">
                                {cleared}/{domain.missions.length}
                            </p>
                        </div>
                    </Html>
                );
            })}
        </>
    );
};

export default DomainLabels;
