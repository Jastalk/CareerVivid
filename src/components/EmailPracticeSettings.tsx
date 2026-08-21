import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, Info, Loader2, Mail, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EmailPreferences } from '../types';

type EmailCategoryKey = NonNullable<EmailPreferences['categories']> extends Partial<Record<infer K, boolean>>
    ? K & string
    : never;

type PreferenceRow = {
    id: string;
    title: string;
    description: string;
    categoryKeys: EmailCategoryKey[];
    trackKeys: string[];
    lifecycleKeys: string[];
};

const preferenceRows: PreferenceRow[] = [
    {
        id: 'onboarding',
        title: 'Onboarding and workspace tips',
        description: 'Profile setup, resume context, and practical ways to keep your job-search workspace current.',
        categoryKeys: ['onboarding', 'activation'],
        trackKeys: ['onboarding', 'activation'],
        lifecycleKeys: ['onboarding_welcome', 'first_resume_completed_tailor_job'],
    },
    {
        id: 'feature_spotlight',
        title: 'Product and editor updates',
        description: 'Focused notes about AI editor workflows, resume improvements, and new workspace features.',
        categoryKeys: ['feature_spotlight'],
        trackKeys: ['feature_spotlight', 'product_updates'],
        lifecycleKeys: ['feature_ai_editor'],
    },
    {
        id: 'weekly_digest',
        title: 'Weekly status digest',
        description: 'A compact summary of saved jobs, deadlines, interviews, and prep modules.',
        categoryKeys: ['weekly_digest'],
        trackKeys: ['weekly_digest', 'digest'],
        lifecycleKeys: ['weekly_digest'],
    },
    {
        id: 'milestone',
        title: 'Resume milestones and score updates',
        description: 'Resume review completions, score improvements, recruiter engagement, and similar progress moments.',
        categoryKeys: ['milestone'],
        trackKeys: ['resume_performance', 'score_update', 'shared_resume'],
        lifecycleKeys: [
            'review_completed_score_suggestions',
            'resume_performance_milestone',
            'shared_resume_recruiter_engagement',
        ],
    },
    {
        id: 'practice',
        title: 'Interview practice reminders',
        description: 'Personalized practice prompts and reminders based on interview prep activity.',
        categoryKeys: ['practice'],
        trackKeys: ['practice', 'scheduled_practice', 'interview_practice'],
        lifecycleKeys: ['interview_practice_reminder'],
    },
    {
        id: 'advocacy',
        title: 'Feedback and review requests',
        description: 'Occasional requests for product feedback, reviews, or research participation.',
        categoryKeys: ['advocacy'],
        trackKeys: ['advocacy', 'reviews', 'feedback'],
        lifecycleKeys: ['advocacy_value_request'],
    },
];

const defaultCategories: NonNullable<EmailPreferences['categories']> = {
    onboarding: true,
    activation: true,
    feature_spotlight: true,
    weekly_digest: true,
    milestone: true,
    practice: true,
    advocacy: true,
};

const defaultPreferences: EmailPreferences = {
    enabled: true,
    frequency: 'every_week',
    topicSource: 'smart',
    manualTopic: '',
    disabled: false,
    unsubscribed: false,
    disabledCategories: [],
    disabledTracks: [],
    categories: defaultCategories,
    tracks: Object.fromEntries(preferenceRows.flatMap(row => row.trackKeys.map(key => [key, true]))),
    lifecycleCategories: Object.fromEntries(preferenceRows.flatMap(row => row.lifecycleKeys.map(key => [key, true]))),
};

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');

const includesAny = (values: string[] | undefined, keys: string[]) => {
    if (!values?.length) return false;
    const normalized = values.map(normalizeKey);
    return keys.some(key => normalized.includes(normalizeKey(key)));
};

const updateMutedList = (values: string[] | undefined, keys: string[], muted: boolean) => {
    const current = new Set((values || []).map(normalizeKey));
    keys.forEach(key => {
        const normalized = normalizeKey(key);
        if (muted) current.add(normalized);
        else current.delete(normalized);
    });
    return Array.from(current).sort();
};

const hasModernPreferenceShape = (incoming?: EmailPreferences) => Boolean(
    incoming?.disabled === true ||
    incoming?.unsubscribed === true ||
    incoming?.categories ||
    incoming?.tracks ||
    incoming?.lifecycleCategories ||
    incoming?.disabledCategories?.length ||
    incoming?.disabledTracks?.length
);

const mergePreferences = (incoming?: EmailPreferences): EmailPreferences => {
    const modernShape = hasModernPreferenceShape(incoming);
    const incomingCategories = incoming?.categories || {};
    const incomingTracks = incoming?.tracks || {};
    const incomingLifecycleCategories = incoming?.lifecycleCategories || {};

    return {
        ...defaultPreferences,
        ...(incoming || {}),
        enabled: modernShape ? incoming?.enabled !== false : true,
        disabled: incoming?.disabled === true,
        unsubscribed: incoming?.unsubscribed === true,
        disabledCategories: [...(incoming?.disabledCategories || [])],
        disabledTracks: [...(incoming?.disabledTracks || [])],
        categories: {
            ...defaultPreferences.categories,
            ...incomingCategories,
            practice: incomingCategories.practice ?? (modernShape ? defaultPreferences.categories?.practice : (incoming ? incoming.enabled === true : defaultPreferences.categories?.practice)),
        },
        tracks: {
            ...defaultPreferences.tracks,
            ...incomingTracks,
        },
        lifecycleCategories: {
            ...defaultPreferences.lifecycleCategories,
            ...incomingLifecycleCategories,
        },
    };
};

const isGlobalPaused = (preferences: EmailPreferences) =>
    preferences.unsubscribed === true || preferences.disabled === true || preferences.enabled === false;

const isRowEnabled = (preferences: EmailPreferences, row: PreferenceRow) => {
    if (isGlobalPaused(preferences)) return false;
    if (includesAny(preferences.disabledCategories, row.categoryKeys)) return false;
    if (includesAny(preferences.disabledTracks, [...row.trackKeys, ...row.lifecycleKeys])) return false;

    const categoryEnabled = row.categoryKeys.every(key => preferences.categories?.[key] !== false);
    const trackEnabled = row.trackKeys.every(key => preferences.tracks?.[key] !== false);
    const lifecycleEnabled = row.lifecycleKeys.every(key => preferences.lifecycleCategories?.[key] !== false);

    return categoryEnabled && trackEnabled && lifecycleEnabled;
};

export default function EmailPracticeSettings() {
    const { userProfile, updateUserProfile } = useAuth();
    const [preferences, setPreferences] = useState<EmailPreferences>(() => mergePreferences(userProfile?.emailPreferences));
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    useEffect(() => {
        setPreferences(mergePreferences(userProfile?.emailPreferences));
    }, [userProfile?.emailPreferences]);

    const activeCount = useMemo(
        () => preferenceRows.filter(row => isRowEnabled(preferences, row)).length,
        [preferences]
    );

    const allOptionalPaused = activeCount === 0 || isGlobalPaused(preferences);

    const setAllOptionalTracks = (enabled: boolean) => {
        setPreferences(prev => ({
            ...prev,
            enabled,
            disabled: !enabled,
            unsubscribed: false,
            disabledCategories: enabled ? [] : preferenceRows.flatMap(row => row.categoryKeys),
            disabledTracks: enabled ? [] : preferenceRows.flatMap(row => row.trackKeys),
            categories: {
                ...(prev.categories || {}),
                ...Object.fromEntries(preferenceRows.flatMap(row => row.categoryKeys.map(key => [key, enabled]))),
            },
            tracks: {
                ...(prev.tracks || {}),
                ...Object.fromEntries(preferenceRows.flatMap(row => row.trackKeys.map(key => [key, enabled]))),
            },
            lifecycleCategories: {
                ...(prev.lifecycleCategories || {}),
                ...Object.fromEntries(preferenceRows.flatMap(row => row.lifecycleKeys.map(key => [key, enabled]))),
            },
        }));
    };

    const setRowEnabled = (row: PreferenceRow, enabled: boolean) => {
        setPreferences(prev => ({
            ...prev,
            enabled: true,
            disabled: false,
            unsubscribed: false,
            disabledCategories: updateMutedList(prev.disabledCategories, row.categoryKeys, !enabled),
            disabledTracks: updateMutedList(prev.disabledTracks, [...row.trackKeys, ...row.lifecycleKeys], !enabled),
            categories: {
                ...(prev.categories || {}),
                ...Object.fromEntries(row.categoryKeys.map(key => [key, enabled])),
            },
            tracks: {
                ...(prev.tracks || {}),
                ...Object.fromEntries(row.trackKeys.map(key => [key, enabled])),
            },
            lifecycleCategories: {
                ...(prev.lifecycleCategories || {}),
                ...Object.fromEntries(row.lifecycleKeys.map(key => [key, enabled])),
            },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);

        if (preferences.topicSource === 'manual' && !preferences.manualTopic.trim()) {
            setStatus({ type: 'error', msg: 'Please enter a topic for manual practice prompts.' });
            setSaving(false);
            return;
        }

        try {
            /*
             * Saving with anything enabled is the explicit opt-in that ends the
             * first-week window in emailPolicy. It is stamped only when a track
             * is actually on, so a user who opens settings and switches
             * everything off does not accidentally re-subscribe themselves.
             */
            const wantsEmail = preferences.enabled !== false
                && preferences.unsubscribed !== true
                && preferences.disabled !== true;

            await updateUserProfile({
                emailPreferences: {
                    ...preferences,
                    manualTopic: preferences.manualTopic.trim(),
                    ...(wantsEmail ? { optInAt: Date.now() } : {}),
                },
            });
            setStatus({ type: 'success', msg: 'Email preferences saved.' });
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            console.error('Error saving email preferences:', error);
            setStatus({ type: 'error', msg: 'Email preferences could not be saved.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="bg-white dark:bg-[#161b22] p-6 lg:p-8 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow duration-300">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f2ff] text-[#4a4392] dark:bg-primary-900/30 dark:text-primary-300">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Email preferences</h2>
                        <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                            Choose which CareerVivid email tracks can reach your inbox. Account, security, and billing messages stay on.
                        </p>
                    </div>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    <Bell className="h-3.5 w-3.5" />
                    {activeCount} active tracks
                </span>
            </div>

            <div className="mb-5 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <label className="flex items-start justify-between gap-4">
                    <span>
                        <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">Pause optional lifecycle emails</span>
                        <span className="mt-0.5 block text-xs leading-5 text-gray-600 dark:text-gray-400">
                            Stops optional onboarding, feature, digest, practice, milestone, and feedback emails. Required account notifications are still sent.
                        </span>
                    </span>
                    <span className="relative mt-1 inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={allOptionalPaused}
                            onChange={event => setAllOptionalTracks(!event.target.checked)}
                            className="sr-only peer"
                        />
                        <span className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/50 dark:bg-gray-700" />
                        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                    </span>
                </label>
            </div>

            <div className="grid gap-3">
                {preferenceRows.map(row => {
                    const checked = isRowEnabled(preferences, row);

                    return (
                        <label
                            key={row.id}
                            className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-[#c8c5f2] dark:border-gray-800 dark:bg-[#0f131a] dark:hover:border-primary-700/60"
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{row.title}</span>
                                <span className="mt-0.5 block text-xs leading-5 text-gray-600 dark:text-gray-400">{row.description}</span>
                            </span>
                            <span className="relative inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={event => setRowEnabled(row, event.target.checked)}
                                    className="sr-only peer"
                                />
                                <span className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-[#4a4392] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4a4392]/40 dark:bg-gray-700" />
                                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                            </span>
                        </label>
                    );
                })}
            </div>

            <div className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-[#0f131a] sm:grid-cols-[minmax(0,1fr)_220px]">
                <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-900 dark:text-gray-100">Digest frequency</span>
                    <select
                        value={preferences.frequency}
                        onChange={event => setPreferences(prev => ({ ...prev, frequency: event.target.value as EmailPreferences['frequency'] }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4a4392]/40 dark:border-gray-800 dark:bg-[#0a0c10] dark:text-gray-100"
                    >
                        <option value="daily">Daily</option>
                        <option value="every_3_days">Every 3 days</option>
                        <option value="every_5_days">Every 5 days</option>
                        <option value="every_week">Every week</option>
                        <option value="every_10_days">Every 10 days</option>
                        <option value="every_14_days">Every 2 weeks</option>
                    </select>
                </label>

                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs leading-5 text-gray-600 dark:border-gray-800 dark:bg-[#0a0c10] dark:text-gray-400">
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#4a4392]" />
                        Required emails
                    </div>
                    Billing, security, subscription, and account receipts remain enabled.
                </div>
            </div>

            {isRowEnabled(preferences, preferenceRows.find(row => row.id === 'practice') as PreferenceRow) && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0f131a]">
                    <div className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">Practice prompt topic</div>
                    <div className="grid gap-3">
                        <label className="flex items-start gap-3">
                            <input
                                type="radio"
                                name="topicSource"
                                value="smart"
                                checked={preferences.topicSource !== 'manual'}
                                onChange={() => setPreferences(prev => ({ ...prev, topicSource: 'smart' }))}
                                className="mt-1 h-4 w-4 border-gray-300 text-[#4a4392] focus:ring-[#4a4392]"
                            />
                            <span>
                                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Smart recommendation</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">Use your latest resume, interview history, and saved job context.</span>
                            </span>
                        </label>
                        <label className="flex items-start gap-3">
                            <input
                                type="radio"
                                name="topicSource"
                                value="manual"
                                checked={preferences.topicSource === 'manual'}
                                onChange={() => setPreferences(prev => ({ ...prev, topicSource: 'manual' }))}
                                className="mt-1 h-4 w-4 border-gray-300 text-[#4a4392] focus:ring-[#4a4392]"
                            />
                            <span className="w-full">
                                <span className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100">Choose a topic</span>
                                {preferences.topicSource === 'manual' && (
                                    <input
                                        type="text"
                                        value={preferences.manualTopic}
                                        onChange={event => setPreferences(prev => ({ ...prev, manualTopic: event.target.value }))}
                                        placeholder="e.g., Senior Software Engineer behavioral questions"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4a4392]/40 dark:border-gray-800 dark:bg-[#0a0c10] dark:text-gray-100"
                                    />
                                )}
                            </span>
                        </label>
                    </div>
                </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {status ? (
                    <div className={`rounded-xl px-4 py-3 text-sm ${status.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                        }`}>
                        <div className="flex items-start gap-2">
                            {status.type === 'success' ? <Info className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
                            <span>{status.msg}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                        Saving these settings may send a confirmation email so users have a record of the change.
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4a4392] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#514abf] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save preferences
                </button>
            </div>
        </section>
    );
}
