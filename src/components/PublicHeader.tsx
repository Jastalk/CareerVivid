
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Menu, X, ChevronDown, Briefcase, Users, FileText, Zap, Link as LinkIcon, Terminal, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import LanguageSelect from './LanguageSelect';
import { resolveUserDisplayName } from '../utils/userDisplayName';

interface PublicHeaderProps {
    variant?: 'default' | 'brutalist' | 'editorial';
    context?: 'default' | 'bio-link';
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ variant = 'editorial', context = 'default' }) => {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const { currentUser, userProfile, loading, logOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const isBrutalist = variant === 'brutalist';
    const isEditorial = variant === 'editorial';
    const dropdownItemClasses = isEditorial
        ? 'rounded-lg hover:bg-[#f6ecd9] dark:hover:bg-[#302e2a]'
        : 'rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800';
    const dropdownIconClasses = isEditorial
        ? 'bg-[#f4ead8] text-[#9a651f] rounded-md group-hover/item:bg-[#eadbc5] dark:bg-[#333029] dark:text-[#caa26c] dark:group-hover/item:bg-[#3b372f]'
        : '';
    const dropdownTitleClasses = isEditorial
        ? 'font-bold text-[#211b16] dark:text-[#f4f1e9]'
        : 'font-semibold text-gray-900 dark:text-white';
    const dropdownDescriptionClasses = isEditorial
        ? 'text-[#665a4a] dark:text-[#aaa39a]'
        : 'text-gray-500 dark:text-gray-400';
    const mobileGroupClasses = isEditorial
        ? 'border-l-2 border-[#e4d3bc] dark:border-[#37332d] space-y-3 my-2'
        : 'border-l-2 border-gray-100 dark:border-gray-800 space-y-3 my-2';
    const mobileGroupLabelClasses = isEditorial
        ? 'text-[#9a651f] dark:text-[#caa26c] font-black'
        : 'text-gray-400 font-semibold';
    const mobileLinkClasses = isEditorial
        ? 'text-sm font-semibold text-[#665a4a] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]'
        : 'text-sm text-gray-600 dark:text-gray-400';
    const profileEmail = currentUser?.email || userProfile?.email || '';
    const profileName = resolveUserDisplayName({
        profileDisplayName: userProfile?.displayName,
        email: profileEmail,
        authDisplayName: currentUser?.displayName,
        fallback: t('nav.member_fallback'),
    });
    const profileInitial = (profileName || profileEmail || 'C').trim().charAt(0).toUpperCase();
    const profileDropdownClasses = isEditorial
        ? 'rounded-2xl border border-[#e2d4c2] bg-[#fffaf1] shadow-xl shadow-[#6b4b1f]/10 dark:border-[#37332d] dark:bg-[#262522] dark:shadow-black/30'
        : 'rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900';
    const profileMenuItemClasses = isEditorial
        ? 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#211b16] transition-colors hover:bg-[#f6ecd9] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]'
        : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800';
    const productLabel = t('nav.product');
    const pricingLabel = t('nav.pricing');
    const resourcesLabel = t('nav.resources');
    const useCasesLabel = t('nav.use_cases');

    const NavItem: React.FC<{ name: string; hasDropdown?: boolean; href?: string }> = ({ name, hasDropdown, href }) => {
        // Brutalist: Uppercase, bold, hover effect
        const brutalistClasses = "flex items-center gap-1 text-sm font-black uppercase tracking-wide transition-all py-2 px-3 border-2 border-transparent hover:bg-black hover:text-white hover:border-black text-black";

        // Default: Existing styles
        const defaultClasses = isEditorial
            ? "flex items-center gap-1 py-2 text-sm font-semibold text-[#665a4a] transition-colors group-hover:text-[#211b16]"
            : "flex items-center gap-1 text-sm font-medium transition-colors py-2 text-gray-600 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400";

        const baseClasses = isBrutalist ? brutalistClasses : defaultClasses;

        return (
            <div className="relative group h-full flex items-center">
                {href ? (
                    <a href={href} className={baseClasses}>
                        {name}
                        {hasDropdown && <ChevronDown size={14} className={`transition-transform duration-200 group-hover:rotate-180 ${isBrutalist ? 'ml-1 stroke-[3px]' : ''}`} />}
                    </a>
                ) : (
                    <button className={baseClasses}>
                        {name}
                        {hasDropdown && <ChevronDown size={14} className={`transition-transform duration-200 group-hover:rotate-180 ${isBrutalist ? 'ml-1 stroke-[3px]' : ''}`} />}
                    </button>
                )}

                {hasDropdown && (
                    // Added pt-4 to create an invisible bridge, preventing mouseleave when moving to dropdown
                    <div className="absolute top-full left-0 w-64 pt-4 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                        <div className={`p-2 ${isBrutalist
                            ? 'border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none'
                            : isEditorial
                                ? 'rounded-xl border border-[#e2d4c2] bg-[#fffaf1] shadow-xl shadow-[#6b4b1f]/10 dark:border-[#37332d] dark:bg-[#262522] dark:shadow-black/30'
                                : 'rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                            }`}>

                            {/* Product Dropdown */}
                            {name === productLabel && (
                                <>
                                    <a href="/newresume" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-yellow-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-md group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-900/50'}`}>
                                            <FileText size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.resume_builder')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.resume_builder_desc')}</p>
                                        </div>
                                    </a>
                                    <a href="/portfolio" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-purple-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-md group-hover/item:bg-purple-100 dark:group-hover/item:bg-purple-900/50'}`}>
                                            <Briefcase size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.portfolio_builder')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.portfolio_builder_desc')}</p>
                                        </div>
                                    </a>
                                    <a href="/job-tracker" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-green-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-green-50 dark:bg-green-900/30 text-green-600 rounded-md group-hover/item:bg-green-100 dark:group-hover/item:bg-green-900/50'}`}>
                                            <Zap size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.job_tracker')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.job_tracker_desc')}</p>
                                        </div>
                                    </a>
                                    <a href="/bio-links" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-pink-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 rounded-md group-hover/item:bg-pink-100 dark:group-hover/item:bg-pink-900/50'}`}>
                                            <LinkIcon size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.bio_links')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.bio_links_desc')}</p>
                                        </div>
                                    </a>
                                </>
                            )}

                            {name === useCasesLabel && (
                                <>
                                    <a href="/job-tracker" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-yellow-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-md group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-900/50'}`}>
                                            <Briefcase size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.professional')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.professional_desc')}</p>
                                        </div>
                                    </a>
                                    <a href="/interview-studio" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-purple-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-md group-hover/item:bg-purple-100 dark:group-hover/item:bg-purple-900/50'}`}>
                                            <Zap size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.students')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.students_desc')}</p>
                                        </div>
                                    </a>
                                </>
                            )}

                            {name === pricingLabel && (
                                <>
                                    <a href={isBrutalist ? "#pricing" : "/pricing"} className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-yellow-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-md group-hover/item:bg-orange-100 dark:group-hover/item:bg-orange-900/50'}`}>
                                            <Zap size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.app_subscription')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.app_subscription_desc')}</p>
                                        </div>
                                    </a>
                                </>
                            )}

                            {name === resourcesLabel && (
                                <>
                                    <a href="/blog" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-green-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-green-50 dark:bg-green-900/30 text-green-600 rounded-md group-hover/item:bg-green-100 dark:group-hover/item:bg-green-900/50'}`}>
                                            <FileText size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.career_blog')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.career_blog_desc')}</p>
                                        </div>
                                    </a>
                                    {/* Professional API Link */}
                                    <a href="/developers/api" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-blue-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-md group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-900/50'}`}>
                                            <Terminal size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.professional_api')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.professional_api_desc')}</p>
                                        </div>
                                    </a>
                                    {/* Community Link */}
                                    <a href="/community" className={`flex items-start gap-3 p-3 transition-colors group/item ${isBrutalist ? 'hover:bg-orange-200 border-2 border-transparent hover:border-black' : dropdownItemClasses}`}>
                                        <div className={`p-2 ${isBrutalist ? 'bg-black text-white rounded-none' : isEditorial ? dropdownIconClasses : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-md group-hover/item:bg-orange-100 dark:group-hover/item:bg-orange-900/50'}`}>
                                            <Users size={18} strokeWidth={isBrutalist ? 3 : 2} />
                                        </div>
                                        <div>
                                            <div className={`text-sm ${isBrutalist ? 'font-black text-black uppercase' : dropdownTitleClasses}`}>{t('nav.community')}</div>
                                            <p className={`text-xs ${isBrutalist ? 'text-black font-bold' : dropdownDescriptionClasses}`}>{t('nav.community_discussion_desc')}</p>
                                        </div>
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${isBrutalist
            ? 'bg-white border-b-4 border-black'
            : isEditorial
                ? 'border-b border-[#e4d8c5] bg-[#f7f1e7]/90 backdrop-blur-xl dark:border-[#33312d] dark:bg-[#1f1f1d]/92'
                : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    {/* Logo - Always Original Style */}
                    <a href="/" className="flex items-center gap-3 group">
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Logo className="h-8 w-auto relative z-10 object-contain" />
                        </div>
                        <span className={`hidden lg:inline text-lg font-black tracking-tight ${isBrutalist ? 'text-black uppercase' : isEditorial ? 'text-[#8b5a16] dark:text-[#caa26c]' : 'text-gray-950 dark:text-white'}`}>
                            CareerVivid
                        </span>
                    </a>

                    {/* Desktop Nav — simple, digestible tags: one word per destination */}
                    <nav className="hidden md:flex items-center gap-8 h-full">
                        <NavItem name="Courses" href="/learning" />
                        <NavItem name="Interview" href="/interview-studio" />
                        <NavItem name="Jobs" href="/jobs/recommend" />
                        <NavItem name="Pricing" href="/pricing" />
                        <NavItem name={resourcesLabel} hasDropdown />
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {!isBrutalist && (
                            <button onClick={toggleTheme} className={`rounded-full p-2.5 transition-colors ${isEditorial ? 'text-[#8b6a3f] hover:bg-[#efe2cf] dark:text-[#aaa39a] dark:hover:bg-[#302e2a]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`} aria-label={t('nav.toggle_theme')}>
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            </button>
                        )}

                        {/* Language Selector */}
                        <div className="hidden sm:block">
                            <LanguageSelect />
                        </div>

                        {/* Desktop Auth Actions */}
                        <div className="hidden md:flex items-center gap-3">
                            {loading ? (
                                <div className={`h-11 w-44 animate-pulse rounded-full ${isEditorial ? 'bg-[#eadbc5] dark:bg-[#302e2a]' : 'bg-gray-200 dark:bg-gray-800'}`} aria-label={t('nav.loading_account_state')} />
                            ) : currentUser ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsProfileOpen(prev => !prev)}
                                        className={`flex min-w-[190px] items-center justify-between gap-3 rounded-full border px-2.5 py-2 text-left transition-colors ${isBrutalist
                                            ? 'border-3 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                            : isEditorial
                                                ? 'border-[#d9c7ad] bg-[#fffaf1] text-[#211b16] hover:bg-[#f6ecd9] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]'
                                            : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'
                                            }`}
                                        aria-expanded={isProfileOpen}
                                        aria-label={t('nav.open_profile_menu')}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            {currentUser.photoURL ? (
                                                <img src={currentUser.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                                            ) : (
                                                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${isEditorial ? 'bg-[#211b16] text-white dark:bg-[#f4f1e9] dark:text-[#1f1f1d]' : 'bg-primary-600 text-white'}`}>
                                                    {profileInitial}
                                                </span>
                                            )}
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-black">{profileName}</span>
                                                <span className={`block truncate text-xs font-semibold ${isEditorial ? 'text-[#766850] dark:text-[#aaa39a]' : 'text-gray-500 dark:text-gray-400'}`}>{profileEmail}</span>
                                            </span>
                                        </span>
                                        <ChevronDown size={16} className={`shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isProfileOpen && (
                                        <div className="absolute right-0 top-full z-50 mt-3 w-72">
                                            <div className={`p-2 ${profileDropdownClasses}`}>
                                                <div className={`mb-2 rounded-xl px-3 py-3 ${isEditorial ? 'bg-[#f6ecd9] dark:bg-[#302e2a]' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                                    <p className={`truncate text-sm font-black ${isEditorial ? 'text-[#211b16] dark:text-[#f4f1e9]' : 'text-gray-900 dark:text-white'}`}>{profileName}</p>
                                                    <p className={`truncate text-xs font-semibold ${isEditorial ? 'text-[#766850] dark:text-[#aaa39a]' : 'text-gray-500 dark:text-gray-400'}`}>{profileEmail}</p>
                                                </div>
                                                <a href="/dashboard" className={profileMenuItemClasses} onClick={() => setIsProfileOpen(false)}>
                                                    <LayoutDashboard size={17} />
                                                    {t('nav.dashboard')}
                                                </a>
                                                <a href="/profile" className={profileMenuItemClasses} onClick={() => setIsProfileOpen(false)}>
                                                    <Settings size={17} />
                                                    {t('nav.profile_settings')}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsProfileOpen(false);
                                                        logOut();
                                                    }}
                                                    className={`${profileMenuItemClasses} w-full`}
                                                >
                                                    <LogOut size={17} />
                                                    {t('nav.sign_out')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <a href={`/signin${context === 'bio-link' ? '?source=bio-link' : ''}`} className={`text-sm font-semibold transition-colors px-3 py-2 ${isBrutalist
                                        ? 'text-black hover:underline uppercase'
                                        : isEditorial
                                            ? 'text-[#665a4a] hover:text-[#211b16] dark:text-[#aaa39a] dark:hover:text-[#f4f1e9]'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}>
                                        {t('nav.login')}
                                    </a>
                                    <a href={`/signup${context === 'bio-link' ? '?source=bio-link' : ''}`} className={`font-bold text-sm transition-all transform hover:scale-105 ${isBrutalist
                                        ? 'px-6 py-2.5 bg-[#8b5cf6] text-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase'
                                        : isEditorial
                                            ? 'rounded-full bg-[#211b16] px-5 py-2.5 text-white shadow-lg shadow-[#6b4b1f]/15 hover:bg-[#3a2b20] dark:bg-[#f4f1e9] dark:text-[#1f1f1d] dark:hover:bg-[#ffffff]'
                                        : 'px-5 py-2.5 bg-gray-900 dark:bg-[#ffffff] text-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:shadow-xl'
                                        }`}>
                                        {t('nav.signup')}
                                    </a>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 ${isBrutalist ? 'text-black border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : isEditorial ? 'rounded-md text-[#665a4a] dark:text-[#aaa39a]' : 'rounded-md text-gray-600 dark:text-gray-300'}`} aria-label={isMenuOpen ? t('nav.close_menu') : t('nav.open_menu')}>
                                {isMenuOpen ? <X size={24} strokeWidth={isBrutalist ? 3 : 2} /> : <Menu size={24} strokeWidth={isBrutalist ? 3 : 2} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className={`md:hidden absolute top-20 left-0 right-0 z-40 ${isBrutalist
                    ? 'bg-white border-b-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
                    : isEditorial
                        ? 'border-b border-[#e4d3bc] bg-[#fffaf1] shadow-2xl shadow-[#6b4b1f]/10 animate-fade-in dark:border-[#37332d] dark:bg-[#262522] dark:shadow-black/30'
                        : 'bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-2xl animate-fade-in'
                    }`}>
                    <div className="px-4 py-6 flex flex-col gap-4">
                        {/* 1. Auth Actions (Top Priority) */}
                        <div className={`flex flex-col gap-3 pb-4 ${isEditorial ? 'border-b border-[#e4d3bc] dark:border-[#37332d]' : 'border-b border-gray-100 dark:border-gray-800'}`}>
                            {loading ? (
                                <div className={`h-24 w-full animate-pulse rounded-xl ${isEditorial ? 'bg-[#eadbc5] dark:bg-[#302e2a]' : 'bg-gray-200 dark:bg-gray-800'}`} aria-label={t('nav.loading_account_state')} />
                            ) : currentUser ? (
                                <>
                                    <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${isEditorial ? 'border-[#d9c7ad] bg-[#f6ecd9] dark:border-[#37332d] dark:bg-[#302e2a]' : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800'}`}>
                                        {currentUser.photoURL ? (
                                            <img src={currentUser.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" />
                                        ) : (
                                            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${isEditorial ? 'bg-[#211b16] text-white dark:bg-[#f4f1e9] dark:text-[#1f1f1d]' : 'bg-primary-600 text-white'}`}>
                                                {profileInitial}
                                            </span>
                                        )}
                                        <span className="min-w-0">
                                            <span className={`block truncate text-sm font-black ${isEditorial ? 'text-[#211b16] dark:text-[#f4f1e9]' : 'text-gray-900 dark:text-white'}`}>{profileName}</span>
                                            <span className={`block truncate text-xs font-semibold ${isEditorial ? 'text-[#766850] dark:text-[#aaa39a]' : 'text-gray-500 dark:text-gray-400'}`}>{profileEmail}</span>
                                        </span>
                                    </div>
                                    <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className={`w-full text-center py-3 font-bold transition-all ${isBrutalist
                                        ? 'bg-[#8b5cf6] text-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide'
                                        : isEditorial
                                            ? 'rounded-lg bg-[#211b16] text-white shadow-lg shadow-[#6b4b1f]/15 hover:bg-[#3a2b20] dark:bg-[#f4f1e9] dark:text-[#1f1f1d] dark:hover:bg-[#ffffff]'
                                        : 'bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-lg'
                                        }`}>
                                        {t('nav.go_to_dashboard')}
                                    </a>
                                    <a href="/profile" onClick={() => setIsMenuOpen(false)} className={`w-full text-center py-3 font-semibold transition-all ${isBrutalist
                                        ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide'
                                        : isEditorial
                                            ? 'rounded-lg border border-[#d9c7ad] bg-[#fffaf1] text-[#211b16] hover:bg-[#f6ecd9] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f1eee7] dark:hover:bg-[#302e2a]'
                                        : 'text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}>
                                        {t('nav.profile_settings')}
                                    </a>
                                    <button onClick={() => { logOut(); setIsMenuOpen(false); }} className={`w-full text-center py-3 font-semibold transition-all ${isBrutalist
                                        ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide'
                                        : isEditorial
                                            ? 'rounded-lg border border-[#d9c7ad] bg-[#fffaf1] text-[#211b16] hover:bg-[#f6ecd9] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f1eee7] dark:hover:bg-[#302e2a]'
                                        : 'text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}>
                                        {t('nav.sign_out')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <a href="/signup" onClick={() => setIsMenuOpen(false)} className={`w-full text-center py-3 font-bold transition-all ${isBrutalist
                                        ? 'bg-[#8b5cf6] text-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide'
                                        : isEditorial
                                            ? 'rounded-lg bg-[#211b16] text-white shadow-lg shadow-[#6b4b1f]/15 hover:bg-[#3a2b20] dark:bg-[#f4f1e9] dark:text-[#1f1f1d] dark:hover:bg-[#ffffff]'
                                        : 'bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-lg'
                                        }`}>
                                        {t('nav.signup')}
                                    </a>
                                    <a href="/signin" onClick={() => setIsMenuOpen(false)} className={`w-full text-center py-3 font-semibold transition-all ${isBrutalist
                                        ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide'
                                        : isEditorial
                                            ? 'rounded-lg border border-[#d9c7ad] bg-[#fffaf1] text-[#211b16] hover:bg-[#f6ecd9] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f1eee7] dark:hover:bg-[#302e2a]'
                                        : 'text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}>
                                        {t('nav.login')}
                                    </a>
                                </>
                            )}
                        </div>

                        {/* 2. Navigation Links */}
                        <div className="space-y-1">

                            {/* Primary tags — mirror the simple desktop nav */}
                            <div className={`pl-4 ${isBrutalist ? 'border-l-4 border-black ml-1 my-2 space-y-2' : mobileGroupClasses}`}>
                                <p className={`text-xs uppercase tracking-wider mb-2 ${isBrutalist ? 'font-black text-gray-500' : mobileGroupLabelClasses}`}>{productLabel}</p>
                                <a href="/learning" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>Courses</a>
                                <a href="/interview-studio" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>Interview</a>
                                <a href="/jobs/recommend" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>Jobs</a>
                                <a href="/newresume" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>{t('nav.ai_resume_builder')}</a>
                                <a href="/extension-welcome" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>{t('nav.chrome_extension')}</a>
                            </div>

                            {/* Pricing Group */}
                            <div className={`pl-4 ${isBrutalist ? 'border-l-4 border-black ml-1 my-2 space-y-2' : mobileGroupClasses}`}>
                                <p className={`text-xs uppercase tracking-wider mb-2 ${isBrutalist ? 'font-black text-gray-500' : mobileGroupLabelClasses}`}>{t('nav.pricing')}</p>
                                <a href={isBrutalist ? "#pricing" : "/pricing"} onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>{t('nav.app_subscription')}</a>
                            </div>

                            <div className={`pl-4 ${isBrutalist ? 'border-l-4 border-black ml-1 my-2 space-y-2' : mobileGroupClasses}`}>
                                <p className={`text-xs uppercase tracking-wider mb-2 ${isBrutalist ? 'font-black text-gray-500' : mobileGroupLabelClasses}`}>{resourcesLabel}</p>
                                <a href="/blog" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>{t('nav.blog')}</a>
                                <a href="/developers/api" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>{t('nav.professional_api')}</a>
                                <a href="/contact" onClick={() => setIsMenuOpen(false)} className={`block ${isBrutalist ? 'font-bold text-black uppercase hover:underline' : mobileLinkClasses}`}>{t('nav.contact')}</a>
                            </div>
                        </div>

                        {/* 3. Utilities */}
                        <div className={`pt-4 ${isEditorial ? 'border-t border-[#e4d3bc] dark:border-[#37332d]' : 'border-t border-gray-100 dark:border-gray-800'}`}>
                            <LanguageSelect />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};
export default PublicHeader;
