import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useResumes } from '../hooks/useResumes';
import { usePracticeHistory } from '../hooks/useJobHistory';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser, updateProfile } from 'firebase/auth';
import { ArrowLeft, KeyRound, Trash2, Loader2, User as UserIcon, CreditCard } from 'lucide-react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import EmailPracticeSettings from '../components/EmailPracticeSettings';
import { navigate } from '../utils/navigation';
import { getEmailDisplayName, resolveUserDisplayName } from '../utils/userDisplayName';
import '../components/Landing/live/liveLanding.css';

/** The label above a field, and the label above a section. Same face, same weight. */
const LABEL = 'cvl-mono text-[11px] uppercase tracking-[0.18em]';

/**
 * The quietest label tier. `on="inset"` steps it up one: `.cvl-panel-inset` is
 * --cvl-paper-2, a shade darker than the --cvl-paper that --cvl-faint is rated
 * against, and this is the smallest, most tightly tracked text on the page.
 */
const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'panel' | 'inset' }> = ({ children, on = 'panel' }) => (
    <p className={LABEL} style={{ color: on === 'inset' ? 'var(--cvl-muted)' : 'var(--cvl-faint)' }}>{children}</p>
);

const FIELD = 'cvl-field w-full px-3.5 py-2.5 text-[14px]';
const CTA = 'cvl-cta inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition disabled:opacity-60';
const BTN = 'cvl-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold disabled:opacity-60';

const ProfilePage: React.FC = () => {
    const { currentUser, userProfile, updateUserProfile, logOut, isPremium } = useAuth();
    const { t } = useTranslation();
    const { deleteAllResumes } = useResumes();
    const { deleteAllPracticeHistory } = usePracticeHistory();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Delete account state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Subscription management state
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalError, setPortalError] = useState('');

    // Upgrade Guide State
    const [showUpgradeGuide, setShowUpgradeGuide] = useState(() => {
        const step = localStorage.getItem('upgrade_guide_step');
        return step === '3';
    });

    // Display Name Edit State
    const [displayName, setDisplayName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameLoading, setNameLoading] = useState(false);
    const [nameError, setNameError] = useState('');
    const [nameSuccess, setNameSuccess] = useState('');

    const resolvedDisplayName = resolveUserDisplayName({
        profileDisplayName: userProfile?.displayName,
        email: userProfile?.email || currentUser?.email,
        authDisplayName: currentUser?.displayName,
        fallback: 'Community Member',
    });

    useEffect(() => {
        setDisplayName(resolvedDisplayName);
    }, [resolvedDisplayName]);

    const handleUpdateName = async () => {
        if (!currentUser) return;
        setNameLoading(true);
        setNameError('');
        setNameSuccess('');
        try {
            const nextDisplayName = displayName.trim() || getEmailDisplayName(currentUser.email);
            await updateProfile(currentUser, { displayName: nextDisplayName });
            await updateUserProfile({
                displayName: nextDisplayName,
                displayNameSource: displayName.trim() ? 'manual' : 'email',
            });
            setIsEditingName(false);
            setNameSuccess(t('profile.name_updated', 'Name updated successfully.'));
            setTimeout(() => setNameSuccess(''), 3000);
        } catch (error: any) {
            setNameError(error.message.replace('Firebase: ', ''));
        } finally {
            setNameLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError(t('profile.password_mismatch'));
            return;
        }
        if (!currentUser || !currentUser.email) {
            setPasswordError("Could not verify current user.");
            return;
        }

        setPasswordLoading(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);
            setPasswordSuccess(t('profile.password_updated'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPasswordError(error.message.replace('Firebase: ', ''));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE' || !currentUser || !currentUser.email) return;

        setDeleteError('');
        setDeleteLoading(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Delete all user data from Firestore
            await Promise.all([
                deleteAllResumes(),
                deleteAllPracticeHistory()
            ]);

            // Delete the user from Auth
            await deleteUser(currentUser);

            // Auth state will change and App.tsx will redirect to AuthPage
            logOut();

        } catch (error: any) {
            setDeleteError(error.message.replace('Firebase: ', ''));
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        setPortalError('');
        try {
            const createPortalLink = httpsCallable(functions, 'createPortalLink');
            const result: any = await createPortalLink();
            window.location.href = result.data.url;
        } catch (error: any) {
            console.error("Error creating portal link:", error);
            setPortalError(error.message.includes("No subscription found")
                ? t('profile.no_subscription_found', "You do not have a paid subscription to manage.")
                : t('profile.portal_error', "Could not open management portal. Please try again later.")
            );
        } finally {
            setPortalLoading(false);
        }
    };

    const planLabel = isPremium
        ? userProfile?.plan === 'pro' ? 'Pro'
            : userProfile?.plan === 'max' || userProfile?.plan === 'pro_max' ? 'Max'
                : userProfile?.plan === 'enterprise' ? 'Enterprise'
                    : t('profile.plan_premium')
        : t('profile.plan_free');

    const isPasswordAccount = currentUser?.providerData[0]?.providerId === 'password';

    return (
        <div className="cvl min-h-screen">
            {/* The modal is written inline rather than as a nested component: a
                component declared inside the render is a new type on every
                keystroke, which remounted these inputs and dropped focus. */}
            {isDeleteModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
                    style={{ background: 'color-mix(in srgb, var(--cvl-desk) 82%, transparent)' }}
                >
                    <div className="cvl-panel w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
                        <div className="flex items-start gap-3">
                            <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                style={{ background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                            >
                                <Trash2 size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <h2 id="delete-account-title" className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--cvl-danger)' }}>
                                    {t('profile.delete_modal_title')}
                                </h2>
                                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    {t('profile.delete_modal_desc')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label htmlFor="delete-confirm" className={LABEL} style={{ color: 'var(--cvl-faint)' }}>
                                    {t('profile.delete_modal_confirm')} <span className="cvl-mono font-bold" style={{ color: 'var(--cvl-danger)' }}>DELETE</span>
                                </label>
                                <input
                                    id="delete-confirm"
                                    type="text"
                                    autoComplete="off"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className={`${FIELD} cvl-mono mt-1.5`}
                                />
                            </div>
                            <div>
                                <label htmlFor="delete-password" className={LABEL} style={{ color: 'var(--cvl-faint)' }}>
                                    {t('profile.delete_modal_password')}
                                </label>
                                <input
                                    id="delete-password"
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder={t('profile.current_password')}
                                    className={`${FIELD} mt-1.5`}
                                />
                            </div>
                            {deleteError && (
                                <p className="text-[13px] font-semibold" style={{ color: 'var(--cvl-danger)' }} role="alert">{deleteError}</p>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className={BTN}>
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE' || deleteLoading || !deletePassword}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ background: 'var(--cvl-danger)', color: 'var(--cvl-desk)' }}
                            >
                                {deleteLoading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                                {deleteLoading ? t('profile.deleting') : t('profile.delete_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header
                className="sticky top-0 z-30 border-b backdrop-blur"
                style={{ borderColor: 'var(--cvl-line)', background: 'color-mix(in srgb, var(--cvl-paper) 88%, transparent)' }}
            >
                <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        title="Back to Dashboard"
                        className="cvl-btn-ghost -ml-2 flex h-10 w-10 items-center justify-center"
                    >
                        <ArrowLeft size={20} aria-hidden="true" />
                        <span className="sr-only">Back to Dashboard</span>
                    </button>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('profile.title')}</h1>
                </div>
            </header>

            <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                {/* Account */}
                <section className="cvl-panel p-5 sm:p-6" aria-labelledby="account-heading">
                    <div className="flex items-center gap-2.5">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                        >
                            <UserIcon size={16} aria-hidden="true" />
                        </span>
                        <h2 id="account-heading" className="text-[17px] font-semibold tracking-tight">{t('profile.account_info')}</h2>
                    </div>

                    <dl className="mt-5 space-y-5">
                        <div>
                            <dt className={LABEL} style={{ color: 'var(--cvl-faint)' }}>{t('profile.email')}</dt>
                            <dd className="mt-1.5 break-all text-[14px]">{currentUser?.email}</dd>
                        </div>

                        <div>
                            <dt className={LABEL} style={{ color: 'var(--cvl-faint)' }}>Display name</dt>
                            <dd className="mt-1.5">
                                {isEditingName ? (
                                    <div className="flex max-w-sm flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                            type="text"
                                            aria-label="Display name"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className={`${FIELD} sm:flex-1`}
                                        />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={handleUpdateName} disabled={nameLoading} className={CTA}>
                                                {nameLoading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                                                Save
                                            </button>
                                            <button type="button" onClick={() => setIsEditingName(false)} className={BTN}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-[14px] font-medium">@{resolvedDisplayName}</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingName(true)}
                                            className="text-[13px] font-semibold transition hover:opacity-80"
                                            style={{ color: 'var(--cvl-purple)' }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                                {nameError && <p className="mt-1.5 text-[13px] font-semibold" style={{ color: 'var(--cvl-danger)' }} role="alert">{nameError}</p>}
                                {nameSuccess && <p className="mt-1.5 text-[13px] font-semibold" style={{ color: 'var(--cvl-green)' }} role="status">{nameSuccess}</p>}
                            </dd>
                        </div>
                    </dl>

                    {currentUser?.providerData[0]?.providerId === 'google.com' && (
                        <p className="mt-5 border-t pt-4 text-[13px] leading-relaxed" style={{ borderColor: 'var(--cvl-line)', color: 'var(--cvl-muted)' }}>
                            {t('profile.google_signin_note')}
                        </p>
                    )}
                </section>

                {/* Email preferences — owns its own surface. */}
                <EmailPracticeSettings />

                {/* Password */}
                {isPasswordAccount && (
                    <section className="cvl-panel p-5 sm:p-6" aria-labelledby="password-heading">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                            >
                                <KeyRound size={16} aria-hidden="true" />
                            </span>
                            <h2 id="password-heading" className="text-[17px] font-semibold tracking-tight">{t('profile.change_password')}</h2>
                        </div>
                        <form onSubmit={handleChangePassword} className="mt-5 max-w-md space-y-4">
                            <div>
                                <label htmlFor="current-password" className={LABEL} style={{ color: 'var(--cvl-faint)' }}>
                                    {t('profile.current_password')}
                                </label>
                                <input
                                    id="current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                    className={`${FIELD} mt-1.5`}
                                />
                            </div>
                            <div>
                                <label htmlFor="new-password" className={LABEL} style={{ color: 'var(--cvl-faint)' }}>
                                    {t('profile.new_password')}
                                </label>
                                <input
                                    id="new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    className={`${FIELD} mt-1.5`}
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className={LABEL} style={{ color: 'var(--cvl-faint)' }}>
                                    {t('profile.confirm_password')}
                                </label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className={`${FIELD} mt-1.5`}
                                />
                            </div>
                            {passwordError && <p className="text-[13px] font-semibold" style={{ color: 'var(--cvl-danger)' }} role="alert">{passwordError}</p>}
                            {passwordSuccess && <p className="text-[13px] font-semibold" style={{ color: 'var(--cvl-green)' }} role="status">{passwordSuccess}</p>}
                            <button type="submit" disabled={passwordLoading} className={CTA}>
                                {passwordLoading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                                {t('profile.update_password')}
                            </button>
                        </form>
                    </section>
                )}

                {/* Subscription */}
                <section className="cvl-panel p-5 sm:p-6" aria-labelledby="subscription-heading">
                    <div className="flex items-center gap-2.5">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                        >
                            <CreditCard size={16} aria-hidden="true" />
                        </span>
                        <h2 id="subscription-heading" className="text-[17px] font-semibold tracking-tight">{t('profile.payment_subscription')}</h2>
                    </div>

                    <div className="cvl-panel-inset mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                            <Eyebrow on="inset">{t('profile.current_plan')}</Eyebrow>
                            <p className="mt-1 text-[18px] font-semibold tracking-tight" style={{ color: 'var(--cvl-purple)' }}>
                                {planLabel}
                            </p>
                        </div>
                        <span
                            className="cvl-mono rounded-md px-2 py-1 text-[11px] font-bold"
                            style={{
                                background: isPremium ? 'var(--cvl-green-soft)' : 'var(--cvl-paper)',
                                color: isPremium ? 'var(--cvl-green)' : 'var(--cvl-muted)',
                            }}
                        >
                            {isPremium ? 'active' : 'free tier'}
                        </span>
                    </div>

                    <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>{t('profile.beta_note')}</p>

                    {portalError && <p className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--cvl-danger)' }} role="alert">{portalError}</p>}

                    <div className="relative mt-5 inline-block">
                        <a
                            href="/subscription"
                            onClick={() => {
                                localStorage.setItem('upgrade_guide_step', '4'); // Mark as done
                                setShowUpgradeGuide(false);
                            }}
                            className={CTA}
                        >
                            {t('profile.manage_subscription')}
                        </a>
                        {/* Animated Arrow Logic - Step 3 - Pointing Left from Right Side */}
                        {!isPremium && showUpgradeGuide && (
                            <div className="animate-bounce-horizontal pointer-events-none absolute left-full top-1/2 ml-4 flex -translate-y-1/2 items-center gap-2">
                                <svg className="h-7 w-7 rotate-180" style={{ color: 'var(--cvl-amber)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                <span className="hidden whitespace-nowrap text-[13px] font-semibold sm:block" style={{ color: 'var(--cvl-amber)' }}>Upgrade Here</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Delete account */}
                <section
                    className="cvl-panel p-5 sm:p-6"
                    style={{ borderColor: 'var(--cvl-danger)' }}
                    aria-labelledby="danger-heading"
                >
                    <div className="flex items-center gap-2.5">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                        >
                            <Trash2 size={16} aria-hidden="true" />
                        </span>
                        <h2 id="danger-heading" className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--cvl-danger)' }}>
                            {t('profile.danger_zone')}
                        </h2>
                    </div>
                    <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                        {t('profile.delete_account_desc')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold transition hover:opacity-85"
                        style={{ borderColor: 'var(--cvl-danger)', background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                    >
                        <Trash2 size={15} aria-hidden="true" />
                        {t('profile.delete_account')}
                    </button>
                </section>
            </main>
        </div>
    );
};

export default ProfilePage;
