import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Bot, FileText, Briefcase, Mic, Terminal, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
    FREE_PLAN_CREDIT_LIMIT,
    PRO_PLAN_CREDIT_LIMIT,
    PRO_MAX_PLAN_CREDIT_LIMIT,
    AI_CREDIT_COSTS,
} from '../../config/creditCosts';
import { MODEL_RATES } from '@shared/credits';

/** Per-turn CLI prices, read from the one rate table rather than a parallel copy. */
const CLI_TURN_COST = {
    'gemini-2.5-flash-lite': MODEL_RATES['gemini-2.5-flash-lite'].cliTurnCost ?? 0.5,
    'gemini-2.5-flash': MODEL_RATES['gemini-2.5-flash'].cliTurnCost ?? 1,
    'gemini-2.5-pro': MODEL_RATES['gemini-2.5-pro'].cliTurnCost ?? 2,
} as const;
import { SUBSCRIPTION_CATALOG } from '../../config/subscriptionCatalog';

interface SliderConfig {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    costPerUse: number;
    max: number;
    step: number;
    color: string;
}

const SLIDERS: SliderConfig[] = [
    {
        id: 'agentTurns',
        label: 'CLI Agent turns (Flash, 1 cr)',
        description: 'Each message to cv agent costs 1 credit (Gemini 2.5 Flash)',
        icon: <Bot size={16} />,
        costPerUse: CLI_TURN_COST['gemini-2.5-flash'],
        max: 500,
        step: 10,
        color: '#6366f1',
    },
    {
        id: 'agentLiteTurns',
        label: 'CLI Agent turns (Flash Lite, 0.5 cr)',
        description: 'Fastest model at the lowest cost',
        icon: <Bot size={16} />,
        costPerUse: CLI_TURN_COST['gemini-2.5-flash-lite'],
        max: 500,
        step: 10,
        color: '#8b5cf6',
    },
    {
        id: 'agentProTurns',
        label: 'CLI Agent turns (Pro, 2 cr)',
        description: 'Deep reasoning with Gemini Pro (Pro plan required)',
        icon: <Bot size={16} />,
        costPerUse: CLI_TURN_COST['gemini-2.5-pro'],
        max: 200,
        step: 5,
        color: '#a855f7',
    },
    {
        id: 'resumeTailors',
        label: 'Resume tailorings',
        description: `AI resume tailoring — ${AI_CREDIT_COSTS.RESUME_TAILOR} credits each`,
        icon: <FileText size={16} />,
        costPerUse: AI_CREDIT_COSTS.RESUME_TAILOR,
        max: 100,
        step: 1,
        color: '#10b981',
    },
    {
        id: 'jobSearches',
        label: 'Job searches',
        description: `AI-powered job search & scoring — ${AI_CREDIT_COSTS.JOB_SEARCH} credit each`,
        icon: <Briefcase size={16} />,
        costPerUse: AI_CREDIT_COSTS.JOB_SEARCH,
        max: 200,
        step: 5,
        color: '#f59e0b',
    },
    {
        id: 'interviews',
        label: 'Voice interviews',
        description: `Technical system design voice interviews — ${AI_CREDIT_COSTS.TECH_INTERVIEW_VOICE} credits each`,
        icon: <Mic size={16} />,
        costPerUse: AI_CREDIT_COSTS.TECH_INTERVIEW_VOICE,
        max: 50,
        step: 1,
        color: '#ef4444',
    },
    {
        id: 'archGen',
        label: 'Architecture auto-gens',
        description: `Architecture diagram generation — ${AI_CREDIT_COSTS.ARCHITECTURE_AUTO_GEN} credits each`,
        icon: <Terminal size={16} />,
        costPerUse: AI_CREDIT_COSTS.ARCHITECTURE_AUTO_GEN,
        max: 50,
        step: 1,
        color: '#0ea5e9',
    },
];

interface PlanConfig {
    name: string;
    limit: number;
    color: string;
    price: string;
    accent: string;
}

const PLANS: PlanConfig[] = [
    { name: 'Free',       limit: FREE_PLAN_CREDIT_LIMIT,    color: '#6b7280', price: '$0/mo',    accent: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    { name: 'Pro',        limit: PRO_PLAN_CREDIT_LIMIT,     color: '#6366f1', price: `$${SUBSCRIPTION_CATALOG.pro.monthlyPrice}/mo`,    accent: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
    { name: 'Max',        limit: PRO_MAX_PLAN_CREDIT_LIMIT, color: '#a855f7', price: `$${SUBSCRIPTION_CATALOG.max.monthlyPrice}/mo`,   accent: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
];

export const CreditCalculator: React.FC = () => {
    const [values, setValues] = useState<Record<string, number>>(
        Object.fromEntries(SLIDERS.map((s) => [s.id, 0]))
    );
    const [selectedPlan, setSelectedPlan] = useState<PlanConfig>(PLANS[1]);

    const totalCredits = useMemo(
        () => SLIDERS.reduce((sum, s) => sum + values[s.id] * s.costPerUse, 0),
        [values]
    );

    const pct = Math.min((totalCredits / selectedPlan.limit) * 100, 100);
    const overLimit = totalCredits > selectedPlan.limit;
    const recommended = PLANS.find((p) => p.limit >= totalCredits) ?? PLANS[PLANS.length - 1];

    const breakdown = SLIDERS.filter((s) => values[s.id] > 0).map((s) => ({
        label: s.label,
        credits: values[s.id] * s.costPerUse,
        color: s.color,
    }));

    return (
        <section className="py-24 bg-gray-50 dark:bg-gray-950">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-bold mb-6">
                        <Zap size={15} /> Credit Calculator
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
                        Find Your Perfect Plan
                    </h2>
                    <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400 font-medium">
                        Drag the sliders to estimate how many credits you'll use each month.
                    </p>
                </div>

                <div className="grid lg:grid-cols-5 gap-10 items-start">
                    {/* Sliders */}
                    <div className="lg:col-span-3 space-y-6">
                        {SLIDERS.map((slider) => (
                            <div key={slider.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span style={{ color: slider.color }}>{slider.icon}</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{slider.label}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-gray-900 dark:text-white">{values[slider.id]}</span>
                                        <span className="text-xs text-gray-400 ml-1">uses</span>
                                        <div className="text-xs font-bold" style={{ color: slider.color }}>
                                            = {(values[slider.id] * slider.costPerUse).toFixed(1)} cr
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">{slider.description}</p>
                                <div className="relative">
                                    <div
                                        className="h-2 rounded-full mb-0 absolute top-0 left-0"
                                        style={{
                                            width: `${(values[slider.id] / slider.max) * 100}%`,
                                            background: slider.color,
                                            transition: 'width 0.2s ease',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <input
                                        type="range"
                                        min={0}
                                        max={slider.max}
                                        step={slider.step}
                                        value={values[slider.id]}
                                        onChange={(e) =>
                                            setValues((prev) => ({ ...prev, [slider.id]: Number(e.target.value) }))
                                        }
                                        className="w-full h-2 rounded-full appearance-none outline-none cursor-pointer relative"
                                        style={{
                                            background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${(values[slider.id] / slider.max) * 100}%, #e5e7eb ${(values[slider.id] / slider.max) * 100}%, #e5e7eb 100%)`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Panel */}
                    <div className="lg:col-span-2 sticky top-6 space-y-5">
                        {/* Plan Selector */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Compare with plan</p>
                            <div className="flex gap-2 flex-wrap">
                                {PLANS.map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => setSelectedPlan(p)}
                                        data-selected={selectedPlan.name === p.name}
                                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
                                            selectedPlan.name === p.name
                                                ? 'border-current shadow-sm scale-105'
                                                : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        } ${p.accent}`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Credit Gauge */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Estimated monthly usage</p>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-4xl font-black" style={{ color: overLimit ? '#ef4444' : selectedPlan.color }}>
                                    {totalCredits.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-400 font-medium">of {selectedPlan.limit.toLocaleString()} credits</span>
                            </div>

                            {/* Bar */}
                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: overLimit ? '#ef4444' : selectedPlan.color }}
                                    initial={false}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                                />
                            </div>

                            {/* Status */}
                            <AnimatePresence mode="wait">
                                {overLimit ? (
                                    <motion.div
                                        key="over"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50"
                                    >
                                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                                Exceeds {selectedPlan.name} plan by {(totalCredits - selectedPlan.limit).toFixed(1)} credits
                                            </p>
                                            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
                                                We recommend the <strong>{recommended.name} plan</strong> ({recommended.price})
                                            </p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="ok"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <CheckCircle2 size={16} className="text-green-500" />
                                        <span className="font-medium" style={{ color: selectedPlan.color }}>
                                            {selectedPlan.name} plan covers your usage ✓
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Breakdown */}
                        {breakdown.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Credit breakdown</p>
                                <div className="space-y-2.5">
                                    {breakdown.map((row) => (
                                        <div key={row.label} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                                            <span className="flex-grow text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
                                                {row.label}
                                            </span>
                                            <span className="text-xs font-bold" style={{ color: row.color }}>
                                                {row.credits.toFixed(1)} cr
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/25">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-black text-sm">Try CareerVivid free</span>
                                <Zap size={18} className="text-yellow-300" />
                            </div>
                            <p className="text-indigo-200 text-xs font-medium mb-5 leading-relaxed">
                                {FREE_PLAN_CREDIT_LIMIT} free AI credits every month — no credit card required.
                                <br />Use the CLI agent, search jobs, and tailor resumes instantly.
                            </p>
                            <a
                                href="/signup"
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-indigo-700 font-black text-sm hover:bg-indigo-50 transition-colors"
                            >
                                Get {FREE_PLAN_CREDIT_LIMIT} free credits <ChevronRight size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
