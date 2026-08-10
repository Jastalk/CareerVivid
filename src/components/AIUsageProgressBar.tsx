import React from 'react';
import { Sparkles } from 'lucide-react';
import { FREE_PLAN_CREDIT_LIMIT, PRO_PLAN_CREDIT_LIMIT, PRO_MAX_PLAN_CREDIT_LIMIT, ENTERPRISE_PLAN_CREDIT_LIMIT } from '../config/creditCosts';

interface AIUsageProgressBarProps {
    used: number;
    limit: number;
    isPremium: boolean;
    onUpgradeClick?: () => void;
    variant?: 'default' | 'minimal' | 'compact' | 'mobile-line';
    /** Explicit plan name to display; falls back to inferring from the limit. */
    planLabel?: string;
}

const AIUsageProgressBar: React.FC<AIUsageProgressBarProps> = ({
    used,
    limit,
    isPremium,
    onUpgradeClick,
    variant = 'default',
    planLabel
}) => {
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const remaining = limit - used;

    // Color based on usage
    const getBarColor = () => {
        if (percentage >= 90) return 'from-red-500 to-red-600';
        if (percentage >= 70) return 'from-orange-500 to-orange-600';
        return 'from-primary-500 to-primary-600';
    };

    const getTextColor = () => {
        if (percentage >= 90) return 'text-red-600 dark:text-red-400';
        if (percentage >= 70) return 'text-orange-600 dark:text-orange-400';
        return 'text-gray-700 dark:text-gray-400';
    };

    // Helper to get plan label using the same constants as AuthContext
    const getPlanLabel = () => {
        if (planLabel) return planLabel;
        if (limit === PRO_MAX_PLAN_CREDIT_LIMIT) return 'Max';
        if (limit === PRO_PLAN_CREDIT_LIMIT) return 'Pro';
        if (limit >= ENTERPRISE_PLAN_CREDIT_LIMIT) return 'Enterprise';
        return 'CareerVivid';
    };

    if (variant === 'compact') {
        return (
            <button
                onClick={onUpgradeClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={`${remaining} credits remaining (${getPlanLabel()})`}
            >
                <Sparkles className="text-blue-500 dark:text-blue-400" size={14} />
                <span className={`text-xs font-semibold ${getTextColor()}`}>
                    {used}/{limit}
                </span>
            </button>
        );
    }

    if (variant === 'mobile-line') {
        return (
            <div className="w-full flex flex-col gap-1 py-1" onClick={onUpgradeClick}>
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{getPlanLabel()} Credits</span>
                    <span className={`text-[10px] font-bold ${getTextColor()}`}>{used}/{limit}</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getBarColor()} transition-all duration-300`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
        );
    }

    const containerClasses = variant === 'default'
        ? "bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm"
        : "w-full";

    return (
        <div className={containerClasses}>
            <div className={`flex items-center justify-between ${variant === 'default' ? 'mb-1.5' : 'mb-1'}`}>
                <div className="flex items-center gap-1.5">
                    <Sparkles className="text-blue-500 dark:text-blue-400" size={14} />
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{getPlanLabel()} AI Credits</span>
                </div>
                {remaining <= Math.min(limit * 0.3, 20) && remaining > 0 && !isPremium && (
                    <button
                        onClick={onUpgradeClick}
                        className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded hover:from-amber-600 hover:to-amber-700 transition-all font-semibold"
                    >
                        Upgrade
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className={`relative w-full ${variant === 'default' ? 'h-1.5 mb-1.5' : 'h-2 mb-1'} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner`}>
                <div
                    className={`h-full bg-gradient-to-r ${getBarColor()} transition-all duration-500`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Usage Text */}
            <div className="flex items-center justify-between text-[10px] uppercase tracking-tighter">
                <span className={`font-black ${getTextColor()}`}>
                    {used} / {limit} USED
                </span>
                {remaining > 0 ? (
                    <span className="font-bold text-[var(--cv-text-muted)]">{remaining} LEFT</span>
                ) : (
                    <span className="text-red-600 dark:text-red-400 font-black">LIMIT REACHED</span>
                )}
            </div>
        </div>
    );
};

export default AIUsageProgressBar;
