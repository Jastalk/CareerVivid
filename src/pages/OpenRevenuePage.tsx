import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    ArrowDownRight,
    ArrowUpRight,
    BadgeCheck,
    CalendarDays,
    CreditCard,
    Eye,
    FileText,
    Lock,
    Receipt,
    ShieldCheck,
    TrendingUp,
    Users,
} from 'lucide-react';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';

type RevenueSummary = {
    grossRevenueCents: number;
    netRevenueCents: number;
    stripeFeesCents: number;
    refundedCents: number;
    chargeCount: number;
};

type RevenuePoint = {
    label: string;
    date: string;
    grossRevenueCents: number;
    netRevenueCents: number;
    chargeCount: number;
};

type OpenRevenueStats = {
    ok: boolean;
    verified: boolean;
    source: string;
    sourceMode?: 'balance_transactions' | 'charges';
    currency: string;
    lastUpdated: string;
    activeSubscriptions: number;
    allTime: RevenueSummary;
    last30Days: RevenueSummary;
    previous30Days: RevenueSummary;
    monthToDate: RevenueSummary;
    dailyRevenue: RevenuePoint[];
    monthlyRevenue: RevenuePoint[];
    inspectedTransactionCount: number;
    isLimitedByPageCap: boolean;
    netRevenueIncludesStripeFees?: boolean;
    privacy: {
        customerDataIncluded: boolean;
        paymentDataIncluded: boolean;
        aggregateOnly: boolean;
    };
};

const emptySummary: RevenueSummary = {
    grossRevenueCents: 0,
    netRevenueCents: 0,
    stripeFeesCents: 0,
    refundedCents: 0,
    chargeCount: 0,
};

const buildFallbackPoints = (count: number, unit: 'day' | 'month'): RevenuePoint[] => {
    const now = new Date();

    return Array.from({ length: count }, (_, index) => {
        const date = new Date(now);
        if (unit === 'day') {
            date.setUTCDate(now.getUTCDate() - (count - 1 - index));
        } else {
            date.setUTCMonth(now.getUTCMonth() - (count - 1 - index), 1);
        }

        return {
            label: new Intl.DateTimeFormat('en-US', unit === 'day'
                ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
                : { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date),
            date: date.toISOString().slice(0, 10),
            grossRevenueCents: 0,
            netRevenueCents: 0,
            chargeCount: 0,
        };
    });
};

const fallbackStats: OpenRevenueStats = {
    ok: true,
    verified: false,
    source: 'not configured',
    sourceMode: 'charges',
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    activeSubscriptions: 0,
    allTime: emptySummary,
    last30Days: emptySummary,
    previous30Days: emptySummary,
    monthToDate: emptySummary,
    dailyRevenue: buildFallbackPoints(30, 'day'),
    monthlyRevenue: buildFallbackPoints(12, 'month'),
    inspectedTransactionCount: 0,
    isLimitedByPageCap: false,
    netRevenueIncludesStripeFees: false,
    privacy: {
        customerDataIncluded: false,
        paymentDataIncluded: false,
        aggregateOnly: true,
    },
};

const formatMoney = (cents: number, currency: string, compact = false) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: compact ? 1 : amount % 1 === 0 ? 0 : 2,
        notation: compact ? 'compact' : 'standard',
    }).format(amount);
};

const formatDateTime = (isoDate: string) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    }).format(new Date(isoDate));
};

const formatFullDate = (isoDate: string) => {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${isoDate}T00:00:00Z`));
};

const calculateChange = (current: number, previous: number): { text: string; up: boolean | null } => {
    if (previous <= 0 && current > 0) return { text: 'New', up: true };
    if (previous <= 0) return { text: '—', up: null };
    const change = ((current - previous) / previous) * 100;
    return { text: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`, up: change >= 0 };
};

/** Shimmering placeholder sized like a number — shown while Stripe data loads
 * so visitors never see a misleading $0. Inherits text color at low opacity. */
const NumberShimmer: React.FC<{ wide?: boolean }> = ({ wide = false }) => (
    <span
        className={`inline-block h-[0.85em] ${wide ? 'w-28' : 'w-14'} animate-pulse rounded-lg bg-current opacity-[0.18] align-middle`}
        aria-label="Loading"
        role="status"
    />
);

/* ------------------------------------------------------------------ */
/* KPI tile                                                            */
/* ------------------------------------------------------------------ */

const KpiTile: React.FC<{
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    icon: React.ReactNode;
    delta?: { text: string; up: boolean | null };
}> = ({ label, value, sub, icon, delta }) => (
    <div className="group relative overflow-hidden rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6557d2]/40 hover:shadow-[0_14px_30px_-14px_rgba(101,87,210,0.55)] dark:border-[#37332d] dark:bg-[#262522] dark:hover:border-[#a99ffb]/40">
        {/* Sheen that only resolves on hover, so a tile reads as a surface you can
            interact with rather than a static box. */}
        <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(101,87,210,0.12), transparent 60%)' }}
        />
        <div className="relative flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a651f] dark:text-[#caa26c]">{label}</p>
            <span className="text-[#9a651f]/70 transition-transform duration-200 group-hover:scale-110 group-hover:text-[#6557d2] dark:text-[#caa26c]/70 dark:group-hover:text-[#a99ffb]">{icon}</span>
        </div>
        <p className="relative mt-2.5 text-2xl font-black tabular-nums tracking-tight text-[#211b16] dark:text-[#f4f1e9] xl:text-3xl">{value}</p>
        <div className="relative mt-1.5 flex items-center gap-1.5">
            {delta && delta.up !== null && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${delta.up
                    ? 'bg-[#eef9f2] text-[#15803d] dark:bg-[#1d3226] dark:text-[#86e0a8]'
                    : 'bg-[#fdeef1] text-[#b03a54] dark:bg-[#3c2229] dark:text-[#f4a5b8]'}`}>
                    {delta.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {delta.text}
                </span>
            )}
            {sub && <p className="truncate text-[11px] font-semibold text-[#8a7a66] dark:text-[#aaa39a]">{sub}</p>}
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/* Interactive chart — click a bar to inspect the actual numbers       */
/* ------------------------------------------------------------------ */

const InteractiveRevenueChart: React.FC<{
    daily: RevenuePoint[];
    monthly: RevenuePoint[];
    currency: string;
    loading: boolean;
}> = ({ daily, monthly, currency, loading }) => {
    const [range, setRange] = useState<'daily' | 'monthly'>('daily');
    const [measure, setMeasure] = useState<'gross' | 'net'>('gross');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const points = range === 'daily' ? daily : monthly;
    const valueOf = (point: RevenuePoint) =>
        Math.max(measure === 'gross' ? point.grossRevenueCents : point.netRevenueCents, 0);
    const maxValue = Math.max(...points.map(valueOf), 1);

    const totals = useMemo(() => {
        const sum = points.reduce((acc, point) => acc + valueOf(point), 0);
        const transactions = points.reduce((acc, point) => acc + point.chargeCount, 0);
        const best = points.reduce((acc, point) => (valueOf(point) > valueOf(acc) ? point : acc), points[0]);
        const activePeriods = points.filter((point) => valueOf(point) > 0).length;
        return { sum, transactions, best, activePeriods };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [points, measure]);

    const selected = selectedIndex !== null ? points[selectedIndex] : null;
    // The hovered bar drives the floating readout. It is deliberately separate
    // from `selected`: hovering previews a period, clicking pins it, so moving
    // the cursor away never destroys what the reader chose to keep on screen.
    const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
    // A running total, which is what gives the curve its one-directional climb.
    // Plotting the per-period value instead would swing back to zero on every
    // quiet month and read as noise rather than a trend.
    const cumulative = useMemo(() => {
        let running = 0;
        return points.map((point) => (running += valueOf(point)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [points, measure]);
    const maxCum = Math.max(cumulative[cumulative.length - 1] || 1, 1);
    const xAt = (i: number) => (points.length <= 1 ? 0 : (i / (points.length - 1)) * 100);
    const yAt = (i: number) => 100 - (cumulative[i] / maxCum) * 100;
    const linePath = points.map((_, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(3)},${yAt(i).toFixed(3)}`).join(' ');
    const areaPath = `${linePath} L100,100 L0,100 Z`;
    const hoveredPct = hoveredIndex !== null ? ((hoveredIndex + 0.5) / points.length) * 100 : 0;
    // Near the ends the card would overflow the plot, so the anchor slides from
    // centred to edge-aligned instead of being clipped.
    const hoverShift = hoveredPct < 18 ? '-12%' : hoveredPct > 82 ? '-88%' : '-50%';
    const placeholderHeight = (index: number) => 18 + ((index * 37) % 61);
    const visibleLabels = range === 'daily' ? [0, 7, 14, 21, 29] : [0, 3, 6, 9, 11];

    const switchRange = (next: 'daily' | 'monthly') => {
        setRange(next);
        setSelectedIndex(null);
        setHoveredIndex(null);
    };

    return (
        <div className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-5 shadow-sm dark:border-[#37332d] dark:bg-[#262522] sm:p-6">
            {/* Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">Verified revenue</h2>
                    <p className="mt-0.5 text-xs font-semibold text-[#8a7a66] dark:text-[#aaa39a]">
                        Hover the curve for running totals · click to pin that {range === 'daily' ? 'day' : 'month'} below.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border border-[#e4d3bc] bg-white p-0.5 dark:border-[#37332d] dark:bg-[#1f1f1d]">
                        {(['daily', 'monthly'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => switchRange(option)}
                                className={`rounded-[10px] px-3 py-1.5 text-xs font-black transition ${range === option
                                    ? 'bg-[#211b16] text-[#fffaf1] dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]'
                                    : 'text-[#8a7a66] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]'}`}
                            >
                                {option === 'daily' ? '30 days' : '12 months'}
                            </button>
                        ))}
                    </div>
                    <div className="flex rounded-xl border border-[#e4d3bc] bg-white p-0.5 dark:border-[#37332d] dark:bg-[#1f1f1d]">
                        {(['gross', 'net'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setMeasure(option)}
                                className={`rounded-[10px] px-3 py-1.5 text-xs font-black capitalize transition ${measure === option
                                    ? 'bg-[#6557d2] text-white'
                                    : 'text-[#8a7a66] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]'}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="mt-6 grid grid-cols-[44px_1fr] gap-3">
                <div className="flex h-64 flex-col justify-between text-right text-[10px] font-bold text-[#8a7a66] dark:text-[#aaa39a]">
                    <span>{formatMoney(maxCum, currency, true)}</span>
                    <span>{formatMoney(maxCum / 2, currency, true)}</span>
                    <span>$0</span>
                </div>
                <div
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="relative flex h-64 items-end gap-[3px] border-b border-l border-[#e4d3bc] bg-[linear-gradient(to_bottom,rgba(148,116,70,0.1)_1px,transparent_1px)] bg-[length:100%_25%] px-1 dark:border-[#37332d] dark:bg-[linear-gradient(to_bottom,rgba(202,162,108,0.12)_1px,transparent_1px)]"
                >
                    {/* Stock-style cumulative curve. The bars showed each period in
                        isolation; the area shows the business climbing. */}
                    {!loading && (
                        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6557d2" stopOpacity="0.42" />
                                    <stop offset="100%" stopColor="#6557d2" stopOpacity="0.02" />
                                </linearGradient>
                                <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#8d83f6" />
                                    <stop offset="100%" stopColor="#6557d2" />
                                </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#revFill)" />
                            <path
                                d={linePath}
                                fill="none"
                                stroke="url(#revLine)"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                            {hoveredIndex !== null && (
                                <>
                                    <line
                                        x1={xAt(hoveredIndex)} y1={0} x2={xAt(hoveredIndex)} y2={100}
                                        stroke="#6557d2" strokeOpacity="0.35" strokeWidth={1}
                                        strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
                                    />
                                    <circle
                                        cx={xAt(hoveredIndex)} cy={yAt(hoveredIndex)} r={5}
                                        fill="#ffffff" stroke="#6557d2" strokeWidth={3}
                                        vectorEffect="non-scaling-stroke"
                                        style={{ filter: 'drop-shadow(0 3px 8px rgba(101,87,210,0.55))' }}
                                    />
                                </>
                            )}
                        </svg>
                    )}

                    {/* Invisible hit columns. The curve itself is one path, so the
                        pointer needs per-period targets to resolve which point it is on. */}
                    {points.map((point, index) => {
                        const isSelected = selectedIndex === index;
                        const showLabel = visibleLabels.includes(index);
                        return (
                            <div
                                key={`${point.date}-${index}`}
                                onMouseEnter={() => !loading && setHoveredIndex(index)}
                                className="relative z-10 flex h-full min-w-0 flex-1 items-end justify-center"
                            >
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setSelectedIndex(isSelected ? null : index)}
                                    onFocus={() => !loading && setHoveredIndex(index)}
                                    aria-label={`${point.label}: ${formatMoney(valueOf(point), currency)} ${measure}`}
                                    aria-pressed={isSelected}
                                    className="h-full w-full rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6557d2]"
                                    style={{ background: isSelected ? 'rgba(101,87,210,0.10)' : 'transparent' }}
                                />
                                {showLabel && (
                                    <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold transition-colors ${hoveredIndex === index ? 'text-[#6557d2] dark:text-[#a99ffb]' : 'text-[#8a7a66] dark:text-[#aaa39a]'}`}>
                                        {point.label}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* Floating readout. Anchored to the hovered bar's top edge so the
                        numbers appear where the reader is already looking. */}
                    {hovered && !loading && (
                        <div
                            aria-hidden
                            className="pointer-events-none absolute z-30 w-max min-w-[148px] rounded-xl border border-[#e4d3bc] bg-white/95 px-3 py-2 shadow-[0_16px_38px_-12px_rgba(33,27,22,0.4)] backdrop-blur-sm dark:border-[#37332d] dark:bg-[#1f1f1d]/95"
                            style={{
                                left: `${hoveredPct}%`,
                                // Sits above the bar, but min() stops a tall bar from
                                // pushing the card out of the plot and over the
                                // Gross/Net toggle above it.
                                bottom: `min(calc(${(100 - yAt(hoveredIndex as number)).toFixed(2)}% + 16px), calc(100% - 96px))`,
                                transform: `translateX(${hoverShift})`,
                            }}
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9a651f] dark:text-[#caa26c]">
                                {range === 'daily' ? formatFullDate(hovered.date) : hovered.label}
                            </p>
                            <p className="mt-1 text-xl font-black leading-none tabular-nums text-[#211b16] dark:text-[#f4f1e9]">
                                {formatMoney(cumulative[hoveredIndex as number], currency)}
                            </p>
                            <div className="mt-2 flex items-center gap-3 border-t border-[#efe3d2] pt-1.5 text-[10px] font-bold text-[#8a7a66] dark:border-[#37332d] dark:text-[#aaa39a]">
                                <span className="capitalize">{measure} to date</span>
                                <span className="tabular-nums">+{formatMoney(valueOf(hovered), currency)}</span>
                                <span className="tabular-nums">
                                    {hovered.chargeCount} {hovered.chargeCount === 1 ? 'txn' : 'txns'}
                                </span>
                                {selectedIndex !== hoveredIndex && <span className="text-[#6557d2] dark:text-[#a99ffb]">click to pin</span>}
                            </div>
                        </div>
                    )}
                    {loading && (
                        <span className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-[#e4d3bc] bg-white/90 px-3 py-1 text-[11px] font-black text-[#9a651f] shadow-sm dark:border-[#37332d] dark:bg-[#1f1f1d]/90 dark:text-[#caa26c]">
                            Fetching live Stripe data…
                        </span>
                    )}
                </div>
            </div>

            {/* Inspector: real numbers for the clicked point */}
            <div className="mt-9 rounded-2xl border border-[#e4d3bc] bg-white p-4 dark:border-[#37332d] dark:bg-[#1f1f1d]">
                {selected ? (
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a651f] dark:text-[#caa26c]">
                                {range === 'daily' ? formatFullDate(selected.date) : selected.label}
                            </p>
                            <p className="text-xs font-semibold text-[#8a7a66] dark:text-[#aaa39a]">Verified Stripe aggregate for this {range === 'daily' ? 'day' : 'month'}</p>
                        </div>
                        {[
                            ['Gross', formatMoney(selected.grossRevenueCents, currency)],
                            ['Net', formatMoney(selected.netRevenueCents, currency)],
                            ['Transactions', String(selected.chargeCount)],
                        ].map(([label, value]) => (
                            <div key={label} className="text-right sm:pl-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a7a66] dark:text-[#aaa39a]">{label}</p>
                                <p className="text-lg font-black tabular-nums text-[#211b16] dark:text-[#f4f1e9]">{value}</p>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setSelectedIndex(null)}
                            className="justify-self-end rounded-lg border border-[#e4d3bc] px-2.5 py-1.5 text-[11px] font-black text-[#8a7a66] transition hover:text-[#211b16] dark:border-[#37332d] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]"
                        >
                            Clear
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#8a7a66] dark:text-[#aaa39a]">
                        <span>
                            {loading ? 'Loading period summary…' : (
                                <>Period total <span className="text-[#211b16] dark:text-[#f4f1e9]">{formatMoney(totals.sum, currency)}</span> · {totals.transactions} transactions · {totals.activePeriods} active {range === 'daily' ? 'days' : 'months'}</>
                            )}
                        </span>
                        {!loading && totals.best && valueOf(totals.best) > 0 && (
                            <span>
                                Best {range === 'daily' ? 'day' : 'month'}: <span className="text-[#211b16] dark:text-[#f4f1e9]">{totals.best.label} · {formatMoney(valueOf(totals.best), currency)}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const OpenRevenuePage: React.FC = () => {
    const [stats, setStats] = useState<OpenRevenueStats>(fallbackStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadRevenue = async () => {
            setLoading(true);
            setError(null);

            const configuredApiUrl = import.meta.env.VITE_OPEN_REVENUE_API_URL as string | undefined;
            const isLocalPreview = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = configuredApiUrl || (isLocalPreview ? '' : '/api/open-revenue');

            if (!apiUrl) {
                setStats({ ...fallbackStats, lastUpdated: new Date().toISOString() });
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(apiUrl, {
                    headers: { Accept: 'application/json' },
                });
                const contentType = response.headers.get('content-type') || '';
                if (!response.ok || !contentType.includes('application/json')) {
                    throw new Error('Revenue endpoint is not available in this environment.');
                }

                const payload = await response.json() as OpenRevenueStats;
                if (!cancelled && payload.ok) {
                    setStats(payload);
                }
            } catch (incomingError) {
                if (!cancelled) {
                    setError(incomingError instanceof Error ? incomingError.message : 'Revenue data is not available.');
                    setStats(fallbackStats);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadRevenue();

        return () => {
            cancelled = true;
        };
    }, []);

    const revenueDelta = useMemo(
        () => calculateChange(stats.last30Days.grossRevenueCents, stats.previous30Days.grossRevenueCents),
        [stats.last30Days.grossRevenueCents, stats.previous30Days.grossRevenueCents],
    );

    const avgTransactionCents = stats.allTime.chargeCount > 0
        ? Math.round(stats.allTime.grossRevenueCents / stats.allTime.chargeCount)
        : 0;

    const money = (cents: number) => (loading ? <NumberShimmer wide /> : formatMoney(cents, stats.currency));

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'CareerVivid Open Revenue & Earnings',
        description: 'A public, read-only aggregate revenue and earnings dashboard for CareerVivid.',
        url: 'https://careervivid.app/earning',
        creator: {
            '@type': 'Organization',
            name: 'CareerVivid',
            url: 'https://careervivid.app/',
        },
        measurementTechnique: 'Stripe aggregate balance transaction reporting',
        isAccessibleForFree: true,
    };

    return (
        <div className="cv-public-warm-page min-h-screen bg-[#f7f1e7] text-[#211b16] selection:bg-amber-200/60 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
            <Helmet titleTemplate="%s">
                <title>Open Revenue & Earnings | CareerVivid</title>
                <meta
                    name="description"
                    content="CareerVivid shares aggregate read-only revenue metrics from Stripe so job seekers and partners can see the business being built in public."
                />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
                <link rel="canonical" href="https://careervivid.app/earning" />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Open Revenue & Earnings | CareerVivid" />
                <meta property="og:description" content="A public read-only view of CareerVivid aggregate revenue and earnings, verified from Stripe without exposing customer data." />
                <meta property="og:url" content="https://careervivid.app/earning" />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Helmet>

            <MenuBar />

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Compact professional header */}
                <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c6ab] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9a651f] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#caa26c]">
                            <Eye className="h-3.5 w-3.5" />
                            Open startup
                        </div>
                        <h1 className="mt-4 text-4xl font-black leading-none tracking-tight sm:text-5xl">
                            Open metrics
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                            Aggregate revenue straight from Stripe, read-only and public by default. No customer names, invoices, cards, or emails — just the business signal.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${stats.verified
                            ? 'bg-[#eef9f2] text-[#15803d] dark:bg-[#1d3226] dark:text-[#86e0a8]'
                            : 'bg-[#fdf3d7] text-[#8a642f] dark:bg-[#39332a] dark:text-[#f0d9a8]'}`}>
                            <BadgeCheck size={14} />
                            {loading ? 'Verifying with Stripe…' : stats.verified ? 'Stripe verified' : 'Awaiting Stripe connection'}
                        </span>
                        <span className="text-[11px] font-bold text-[#8a7a66] dark:text-[#aaa39a]">
                            {loading ? 'Updating…' : `Last updated ${formatDateTime(stats.lastUpdated)}`}
                        </span>
                    </div>
                </section>

                {error && (
                    <div className="mt-6 rounded-2xl border border-[#eeddc0] bg-[#fdf3d7] p-4 text-sm font-bold text-[#8a642f] dark:border-[#51483c] dark:bg-[#39332a] dark:text-[#f0d9a8]">
                        {error}
                    </div>
                )}

                {/* KPI row */}
                <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <KpiTile
                        label="Last 30 days"
                        value={money(stats.last30Days.grossRevenueCents)}
                        icon={<TrendingUp size={15} />}
                        delta={loading ? undefined : revenueDelta}
                        sub={loading ? 'vs previous 30 days' : 'vs previous 30 days'}
                    />
                    <KpiTile
                        label="Month to date"
                        value={money(stats.monthToDate.grossRevenueCents)}
                        icon={<CalendarDays size={15} />}
                        sub={loading ? '…' : `${stats.monthToDate.chargeCount} transactions`}
                    />
                    <KpiTile
                        label="All-time gross"
                        value={money(stats.allTime.grossRevenueCents)}
                        icon={<Receipt size={15} />}
                        sub={loading ? '…' : `${stats.allTime.chargeCount} transactions`}
                    />
                    <KpiTile
                        label="Net (30 days)"
                        value={money(stats.last30Days.netRevenueCents)}
                        icon={<CreditCard size={15} />}
                        sub={stats.netRevenueIncludesStripeFees ? 'after Stripe fees' : 'before fee detail'}
                    />
                    <KpiTile
                        label="Avg transaction"
                        value={loading ? <NumberShimmer /> : formatMoney(avgTransactionCents, stats.currency)}
                        icon={<Receipt size={15} />}
                        sub="all-time average"
                    />
                    <KpiTile
                        label="Subscriptions"
                        value={loading ? <NumberShimmer /> : String(stats.activeSubscriptions)}
                        icon={<Users size={15} />}
                        sub="active now · identities private"
                    />
                </section>

                {/* Interactive chart */}
                <section className="mt-8">
                    <InteractiveRevenueChart
                        daily={stats.dailyRevenue}
                        monthly={stats.monthlyRevenue}
                        currency={stats.currency}
                        loading={loading}
                    />
                </section>

                {/* Breakdown + policy */}
                <section className="mt-8 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-5 shadow-sm dark:border-[#37332d] dark:bg-[#262522]">
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#9a651f] dark:text-[#caa26c]">30-day breakdown</h2>
                        <dl className="mt-4 space-y-3">
                            {[
                                ['Gross revenue', stats.last30Days.grossRevenueCents, false],
                                ['Refunds', -stats.last30Days.refundedCents, true],
                                ['Stripe fees', -stats.last30Days.stripeFeesCents, true],
                                ['Net revenue', stats.last30Days.netRevenueCents, false],
                            ].map(([label, cents, negative], index, list) => (
                                <div
                                    key={label as string}
                                    className={`flex items-center justify-between gap-3 ${index === list.length - 1 ? 'border-t border-[#e4d3bc] pt-3 dark:border-[#37332d]' : ''}`}
                                >
                                    <dt className={`text-sm font-bold ${index === list.length - 1 ? 'text-[#211b16] dark:text-[#f4f1e9]' : 'text-[#665a4a] dark:text-[#aaa39a]'}`}>{label as string}</dt>
                                    <dd className={`text-sm font-black tabular-nums ${negative ? 'text-[#b03a54] dark:text-[#f4a5b8]' : 'text-[#211b16] dark:text-[#f4f1e9]'}`}>
                                        {loading ? <NumberShimmer /> : `${(negative as boolean) && (cents as number) !== 0 ? '−' : ''}${formatMoney(Math.abs(cents as number), stats.currency)}`}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-4 text-[11px] font-semibold leading-5 text-[#8a7a66] dark:text-[#aaa39a]">
                            {stats.netRevenueIncludesStripeFees
                                ? 'Net = gross − refunds − Stripe fees.'
                                : 'The current key exposes charge totals; fee detail requires a broader read scope.'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-5 shadow-sm dark:border-[#37332d] dark:bg-[#262522]">
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#9a651f] dark:text-[#caa26c]">What's public</h2>
                        <div className="mt-4 space-y-3">
                            {[
                                [Eye, 'Public', 'Revenue totals, transaction counts, subscription count, update time.'],
                                [Lock, 'Private', 'Customer names, emails, payment methods, invoices, workspace data.'],
                                [FileText, 'Read-only', 'This page cannot create charges or reach private Stripe records.'],
                            ].map(([Icon, title, detail]) => {
                                const PolicyIcon = Icon as typeof Eye;
                                return (
                                    <div key={title as string} className="flex gap-3">
                                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3f2ff] text-[#6557d2] dark:bg-[#34314e] dark:text-[#b7b2ff]">
                                            <PolicyIcon className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-black text-[#211b16] dark:text-[#f4f1e9]">{title as string}</p>
                                            <p className="mt-0.5 text-xs font-semibold leading-5 text-[#7b6d5b] dark:text-[#aaa39a]">{detail as string}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-5 shadow-sm dark:border-[#37332d] dark:bg-[#262522]">
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#9a651f] dark:text-[#caa26c]">Source & method</h2>
                        <div className="mt-4 flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef9f2] text-[#15803d] dark:bg-[#1d3226] dark:text-[#86e0a8]">
                                <ShieldCheck className="h-4 w-4" />
                            </span>
                            <p className="text-xs font-semibold leading-5 text-[#665a4a] dark:text-[#aaa39a]">
                                Generated from a restricted Stripe key on Firebase Functions — {stats.sourceMode === 'balance_transactions' ? 'aggregate balance transactions' : 'charge and subscription data'}. Only totals, counts, dates, and currency reach the browser.
                            </p>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#eadcc7] bg-white/70 p-3 dark:border-[#37332d] dark:bg-[#1f1f1d]/70">
                                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a7a66] dark:text-[#aaa39a]">Data inspected</dt>
                                <dd className="mt-1 text-xl font-black tabular-nums">{loading ? <NumberShimmer /> : stats.inspectedTransactionCount}</dd>
                            </div>
                            <div className="rounded-xl border border-[#eadcc7] bg-white/70 p-3 dark:border-[#37332d] dark:bg-[#1f1f1d]/70">
                                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a7a66] dark:text-[#aaa39a]">Page cap</dt>
                                <dd className="mt-1 text-xl font-black">{loading ? <NumberShimmer /> : stats.isLimitedByPageCap ? 'Hit' : 'Clear'}</dd>
                            </div>
                        </dl>
                    </div>
                </section>

                {/* CTA strip */}
                <section className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#211b16] bg-[#211b16] p-6 text-[#fffaf1] sm:flex-row dark:border-[#37332d]">
                    <div>
                        <p className="text-lg font-black tracking-tight">Built in public. Priced in public.</p>
                        <p className="mt-1 text-sm font-semibold opacity-75">Every dollar above comes from job seekers we helped get hired.</p>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="/signup"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#6557d2] px-5 py-2.5 text-sm font-black !text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#544ac2]"
                        >
                            Start CareerVivid <ArrowUpRight className="h-4 w-4" />
                        </a>
                        <a
                            href="/pricing"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-sm font-black !text-[#fffaf1] transition hover:-translate-y-0.5 hover:bg-white/10"
                        >
                            View pricing
                        </a>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
};

export default OpenRevenuePage;
