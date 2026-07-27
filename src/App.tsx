
import React, { useState, useEffect, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { CartProvider } from './features/commerce/context/CartContext';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { isExtensionContext } from './services/extensionStorage';
import ExtensionLayout from './extension-ui/layout/ExtensionLayout';

type PreloadableComponent<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

const lazyWithPreload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> => {
  const Component = React.lazy(factory) as PreloadableComponent<T>;
  Component.preload = factory;
  return Component;
};

// Lazy load pages to drastically reduce initial JavaScript payload
const Dashboard = lazyWithPreload(() => import('./pages/Dashboard')); // Protected
const Editor = lazyWithPreload(() => import('./pages/Editor'));
const WhiteboardsPage = React.lazy(() => import('./pages/WhiteboardsPage'));
const WhiteboardEditor = React.lazy(() => import('./pages/WhiteboardEditor'));
const AgentPage = React.lazy(() => import('./pages/AgentPage'));
const GenerationHub = React.lazy(() => import('./pages/GenerationHub')); // Protected
const InterviewStudio = lazyWithPreload(() => import('./pages/InterviewStudio')); // Protected
const CompanyQuestPage = React.lazy(() => import('./pages/CompanyQuestPage')); // Protected
const SystemDesignCoursePracticePage = React.lazy(() => import('./pages/SystemDesignCoursePracticePage'));
const CcafQuestPage = React.lazy(() => import('./pages/CcafQuestPage'));
const CoursePage = React.lazy(() => import('./pages/CoursePage')); // Protected
const InteractiveLessonPage = React.lazy(() => import('./pages/InteractiveLessonPage')); // Protected
const CourseResumePage = React.lazy(() => import('./pages/CourseResumePage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage')); // Protected
const ChatBot = React.lazy(() => import('./components/ChatBot'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const SignInPage = React.lazy(() => import('./pages/SignInPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const ExtensionAuthCompletePage = React.lazy(() => import('./pages/ExtensionAuthCompletePage'));
const ExtensionWelcomePage = React.lazy(() => import('./pages/ExtensionWelcomePage'));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const OpenRevenuePage = React.lazy(() => import('./pages/OpenRevenuePage'));
const TechLandingPage = React.lazy(() => import('./pages/TechLandingPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const AdminLoginPage = React.lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminPage'));
const StrategyDashboard = React.lazy(() => import('./pages/admin/StrategyDashboard'));
const AcademicPartnerDashboard = React.lazy(() => import('./pages/academic/AcademicPartnerDashboard'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const JobTrackerPage = lazyWithPreload(() => import('./pages/JobTrackerPage'));
const JobsRecommendPage = React.lazy(() => import('./pages/JobsRecommendPage'));
const PdfPreviewPage = React.lazy(() => import('./pages/PdfPreviewPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const BlogListPage = React.lazy(() => import('./pages/BlogListPage'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPostPage'));
const PublicResumePage = React.lazy(() => import('./pages/PublicResumePage'));
const SubscriptionPage = React.lazy(() => import('./pages/SubscriptionPage'));
const PortfolioHub = React.lazy(() => import('./features/portfolio/pages/PortfolioHub'));
const PortfolioEditor = React.lazy(() => import('./features/portfolio/pages/PortfolioEditor'));
const PortfolioBuilderPage = React.lazy(() => import('./pages/PortfolioBuilderPage'));
const PublicPortfolioPage = React.lazy(() => import('./features/portfolio/pages/PublicPortfolioPage'));
const CheckoutSummary = React.lazy(() => import('./features/commerce/pages/CheckoutSummary'));
const DropProductGallery = React.lazy(() => import('./features/commerce/pages/DropProductGallery'));
const AssemblyLinePacking = React.lazy(() => import('./features/commerce/pages/AssemblyLinePacking'));
const CreateNewDrop = React.lazy(() => import('./features/commerce/pages/CreateNewDrop'));
const UpcomingDropsFeed = React.lazy(() => import('./features/commerce/pages/UpcomingDropsFeed'));
const BusinessCardPage = React.lazy(() => import('./pages/BusinessCardPage'));
const OrderNfcCardPage = React.lazy(() => import('./pages/OrderNfcCardPage'));
const PolicyPage = React.lazy(() => import('./pages/PolicyPage'));
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const BusinessPartnerDashboard = React.lazy(() => import('./pages/BusinessPartnerDashboard'));
const AgencyPartnerDashboard = React.lazy(() => import('./pages/AgencyPartnerDashboard'));
const AgencyPreparePage = React.lazy(() => import('./pages/AgencyPreparePage'));
const JobPostingEditor = React.lazy(() => import('./pages/JobPostingEditor'));
const JobMarketPage = React.lazy(() => import('./pages/JobMarketPage'));
const PublicJobBoardPage = React.lazy(() => import('./pages/PublicJobBoardPage'));
const IntegrationsPage = React.lazy(() => import('./pages/IntegrationsPage'));
const ProgrammaticSeoPage = React.lazy(() => import('./pages/ProgrammaticSeoPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const PermissionDeniedPage = React.lazy(() => import('./pages/PermissionDeniedPage'));
const ReferralLandingPage = React.lazy(() => import('./pages/ReferralLandingPage'));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage'));
const BioLinksPage = React.lazy(() => import('./pages/BioLinksPage'));
const CommerceDashboard = React.lazy(() => import('./features/commerce/pages/CommerceDashboard'));
const ProductPage = React.lazy(() => import('./features/commerce/pages/ProductPage'));
const GetMoreReview01 = React.lazy(() => import('./pages/bio-links/template/ticktok/GetMoreReview01'));
const ClientPortalPage = React.lazy(() => import('./pages/ClientPortalPage'));
const ServicePortfolioPage = React.lazy(() => import('./pages/ServicePortfolioPage'));
const ServicesPage = React.lazy(() => import('./pages/ServicesPage'));
const MerchantProductSubmission = React.lazy(() => import('./pages/MerchantProductSubmission'));
const FolderView = React.lazy(() => import('./pages/FolderView'));
const PartnerLandingPage = React.lazy(() => import('./pages/partners/PartnerLandingPage'));
const AcademicPartnerPage = React.lazy(() => import('./pages/partners/AcademicPartnerPage'));
const BusinessPartnerPage = React.lazy(() => import('./pages/partners/BusinessPartnerPage'));
const AgencyPartnerPage = React.lazy(() => import('./pages/partners/AgencyPartnerPage'));
const HRPartnerPage = React.lazy(() => import('./pages/partners/HRPartnerPage'));
const StudentAmbassadorPage = React.lazy(() => import('./pages/partners/StudentAmbassadorPage'));
const PartnerApplicationPage = React.lazy(() => import('./pages/partners/PartnerApplicationPage'));

// Community
const CommunityDashboard = React.lazy(() => import('./pages/community/CommunityDashboard'));
const CommunityEditor = React.lazy(() => import('./pages/community/CommunityEditor'));
const EditPost = React.lazy(() => import('./pages/community/EditPost'));
const CommunityPostPage = React.lazy(() => import('./pages/community/CommunityPostPage'));
const CommunityGuidelinesPage = React.lazy(() => import('./pages/community/CommunityGuidelinesPage'));
const MyPostsPage = React.lazy(() => import('./pages/community/MyPostsPage'));
const ApiDocsPage = React.lazy(() => import('./pages/ApiDocsPage'));
const DeveloperSettings = React.lazy(() => import('./pages/DeveloperSettings'));
const BillingDashboard = React.lazy(() => import('./pages/BillingDashboard'));
const DndWorkspaceProvider = React.lazy(() => import('./components/DndWorkspaceProvider'));

// import i18n from './i18n'; // Used in navigation.ts


// Navigation utility
import { navigate, getPathFromUrl } from './utils/navigation';
import { isCourseFreeForGuests } from './config/accessPolicy';


const LoadingFallback = () => (
  <div className="cv-warm-page cv-warm-grid flex h-screen flex-col items-center justify-center px-4 text-center">
    <div className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/90 px-6 py-5 shadow-sm dark:border-[#37332d] dark:bg-[#262522]/90">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4d3bc] bg-white text-[#9a651f] dark:border-[#37332d] dark:bg-[#302e2a] dark:text-[#caa26c]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <p className="mt-3 text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">Preparing your CareerVivid workspace...</p>
      <p className="mt-1 text-xs font-semibold text-[#665a4a] dark:text-[#aaa39a]">Loading your sign-in session.</p>
    </div>
  </div>
);

const AuthRedirect = ({ target }: { target: string }) => {
  useEffect(() => {
    navigate(target);
  }, [target]);
  return <LoadingFallback />;
};

import { useGuestDataMigration } from './hooks/useGuestDataMigration';
import SEOHelper from './components/SEOHelper';
import ProtectedRoute from './components/ProtectedRoute'; // [NEW] Protected Route Wrapper
import { NavigationProvider } from './contexts/NavigationContext';
import { useNavigation } from './contexts/NavigationContext';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';
import PWABadge from './components/PWABadge';
import CreditCelebration from './components/CreditCelebration';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import AutoPageLocalizer from './components/AutoPageLocalizer';

const RouteSuspense = ({ routeKey, children }: { routeKey: string; children: React.ReactNode }) => (
  <RouteErrorBoundary routeKey={routeKey}>
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
);

const WorkspaceDataEffects: React.FC = () => {
  useGuestDataMigration();
  useWorkspaceSync();
  return null;
};

const AppContent: React.FC = () => {
  const { currentUser, userProfile, loading, isAdmin, isAdminLoading, isEmailVerified } = useAuth();
  const [path, setPath] = useState(getPathFromUrl());
  const isExtensionWelcomeRoute = path === '/extension-welcome';

  // Run one-time initialization tasks
  useEffect(() => {
    if (isAdmin) {
      // Seed system templates in Firestore for dual-path generation
      import('./services/templateService').then(({ seedSystemTemplates }) => {
        seedSystemTemplates().catch(console.error);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!currentUser || loading) return;

    const preloadCoreWorkspaceRoutes = () => {
      void Dashboard.preload();
      void Editor.preload();
      void InterviewStudio.preload();
      void JobTrackerPage.preload();
    };

    // `typeof` check (not `'x' in window`) so TS doesn't narrow `window` to
    // `never` in the fallback branch — requestIdleCallback is always in the
    // lib type, but not always implemented (e.g. Safari).
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preloadCoreWorkspaceRoutes, { timeout: 3500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preloadCoreWorkspaceRoutes, 1800);
    return () => window.clearTimeout(timeoutId);
  }, [currentUser, loading]);

  // SEO Helper runs on every render to update canonical tags
  // Since App.tsx re-renders on path changes (due to setPath), this works perfectly.
  const isLearningRoute = path === '/learning' || path.startsWith('/learning/');

  useEffect(() => {
    const onPathChange = () => {
      setPath(getPathFromUrl());
    };
    window.addEventListener('popstate', onPathChange);
    // Also set initial path on load
    onPathChange();

    // Check for legacy hash-based shared links and redirect to history mode.
    // Old scheduled interview emails used /#/interview-studio/:id, so keep that path working on owned domains.
    const hashPath = window.location.hash?.startsWith('#/') ? window.location.hash.substring(1) : '';
    const isLegacyHashRoute =
      hashPath.startsWith('/shared/') ||
      hashPath.startsWith('/portfolio/') ||
      hashPath === '/interview-studio' ||
      hashPath.startsWith('/interview-studio/');

    if (isLegacyHashRoute) {
      window.history.replaceState(null, '', hashPath);
      setPath(getPathFromUrl()); // Update state to trigger re-render
    }

    return () => window.removeEventListener('popstate', onPathChange);
  }, []);

  // Special route for PDF generation - bypasses auth checks for speed/simplicity in headless env
  if (path === '/pdf-preview') {
    return (
      <ThemeProvider>
        <RouteSuspense routeKey={path}>
          <PdfPreviewPage />
        </RouteSuspense>
      </ThemeProvider>
    );
  }

  // Public Share Route (Accessible without auth)
  if (path.startsWith('/shared/')) {
    return (
      <ThemeProvider>
        <RouteSuspense routeKey={path}>
          <PublicResumePage />
        </RouteSuspense>
      </ThemeProvider>
    )
  }

  // Public Job Board Route. Keep app-owned job recommendations out of this catch-all.
  if (path.startsWith('/jobs/') && path !== '/jobs/recommend') {
    return (
      <ThemeProvider>
        <RouteSuspense routeKey={path}>
          <PublicJobBoardPage />
        </RouteSuspense>
      </ThemeProvider>
    )
  }


  // Portfolio Routing Helper
  // Supports: /portfolio/edit/ID, /portfolio/USERNAME/edit/ID
  const isPortfolioEditorRoute = /^\/portfolio\/([^/]+\/)?edit\//.test(path);

  // Supports: /portfolio/ID, /portfolio/USERNAME/ID
  // Must exclude Editor routes
  const isPublicPortfolioRoute = path.startsWith('/portfolio/') && !isPortfolioEditorRoute;

  if (isPublicPortfolioRoute) {
    return (
      <ThemeProvider>
        <RouteSuspense routeKey={path}>
          <PublicPortfolioPage />
        </RouteSuspense>
      </ThemeProvider>
    );
  }

  // Community — read-only routes render instantly (no auth wait)
  const isCommunityPostRoute = path.startsWith('/community/post/');
  if (path === '/community' || path === '/community/guidelines' || isCommunityPostRoute) {
    const communitySeo = path === '/community'
      ? (
        <SEOHelper
          title="CareerVivid Community"
          description="CareerVivid community articles, resume resources, job search workflows, and interview preparation guides."
        />
      )
      : path === '/community/guidelines'
        ? <SEOHelper title="Community Guidelines" description="Rules and best practices for the CareerVivid community." />
        : null;

    return (
      <ThemeProvider>
        <CartProvider>
          <NavigationProvider>
            <div className="min-h-screen bg-[#f7f1e7] text-[#211b16] dark:bg-[#1f1f1d] dark:text-[#f1eee7] font-sans">
              <Helmet
                titleTemplate="%s | CareerVivid"
                defaultTitle="CareerVivid Community | AI Career Workspace"
              />
              {communitySeo}
              <RouteSuspense routeKey={path}>
                {path === '/community' && <CommunityDashboard />}
                {path === '/community/guidelines' && <CommunityGuidelinesPage />}
                {isCommunityPostRoute && <CommunityPostPage />}
              </RouteSuspense>
            </div>
          </NavigationProvider>
        </CartProvider>
      </ThemeProvider>
    );
  }

  if (isExtensionWelcomeRoute) {
    return (
      <ThemeProvider>
        <CartProvider>
          <NavigationProvider>
            <div className="min-h-screen bg-[#f7f1e7] text-[#211b16] dark:bg-[#1f1f1d] dark:text-[#f1eee7] font-sans">
              <Helmet
                titleTemplate="%s | CareerVivid"
                defaultTitle="CareerVivid | The AI That Gets You Hired"
              />
              <SEOHelper isRobotsAllowed />
              <RouteSuspense routeKey={path}>
                <ExtensionWelcomePage />
              </RouteSuspense>
            </div>
          </NavigationProvider>
        </CartProvider>
      </ThemeProvider>
    );
  }

  if (loading || isAdminLoading) {
    return <LoadingFallback />;
  }

  // Admin Routing
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') {
      // If user is already a logged-in admin, redirect them to dashboard
      if (currentUser && isAdmin) {
        useEffect(() => navigate('/admin'), []);
        return null;
      }
      const accessDenied = !!currentUser && !isAdmin;
      return (
        <ThemeProvider>
          <RouteSuspense routeKey={path}>
            <AdminLoginPage accessDenied={accessDenied} />
          </RouteSuspense>
        </ThemeProvider>
      );
    }

    if (currentUser && isAdmin) {
      if (!isEmailVerified && currentUser.providerData[0]?.providerId === 'password') {
        return (
          <ThemeProvider>
            <RouteSuspense routeKey={path}>
              <VerifyEmailPage />
            </RouteSuspense>
          </ThemeProvider>
        );
      }

      if (path === '/admin/strategy') {
        return (
          <ThemeProvider>
            <RouteSuspense routeKey={path}>
              <StrategyDashboard />
            </RouteSuspense>
          </ThemeProvider>
        );
      }

      return (
        <ThemeProvider>
          <RouteSuspense routeKey={path}>
            <AdminDashboardPage />
          </RouteSuspense>
        </ThemeProvider>
      );
    } else {
      // If not logged in or not an admin, show permission denied
      return (
        <ThemeProvider>
          <RouteSuspense routeKey={path}>
            <PermissionDeniedPage requiredRole="Administrator" message="You need administrator privileges to access this page." />
          </RouteSuspense>
        </ThemeProvider>
      );
    }
  }

  // User and Public Routing
  let content;
  let showChatbot = false;

  if (currentUser && !(!isEmailVerified && currentUser.providerData[0]?.providerId === 'password')) {
    showChatbot = path === '/dashboard';
  }

  // 1. Verify Email Handling via specific route or override
  if (currentUser && !isEmailVerified && currentUser.providerData[0]?.providerId === 'password') {
    content = <VerifyEmailPage />;
  } else {
    // 2. Flattened Routing Logic

    // -- Authentication Routes --
    if (path === '/extension-auth-complete' || path.startsWith('/extension-auth-complete?')) {
      content = (
        <ProtectedRoute>
          <ExtensionAuthCompletePage />
        </ProtectedRoute>
      );
    } else if (path === '/extension-welcome') {
      content = <ExtensionWelcomePage />;
    } else if (path === '/signin' || path.startsWith('/signin?')) {
      const params = new URLSearchParams(window.location.search);
      const cliPort = params.get('cli_port');
      const redirect = params.get('redirect');
      const redirectTarget = redirect ? decodeURIComponent(redirect) : null;

      if (redirectTarget?.startsWith('/extension-welcome')) {
        content = <AuthRedirect target={redirectTarget} />;
      } else if (currentUser && !cliPort) {
        content = <AuthRedirect target={redirectTarget || '/dashboard'} />;
      } else {
        content = <SignInPage />;
      }
    } else if (path === '/signup') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      content = currentUser ? <AuthRedirect target={redirect ? decodeURIComponent(redirect) : '/onboarding'} /> : <SignUpPage />;
    } else if (path === '/auth') {
      if (currentUser) {
        content = <AuthRedirect target="/dashboard" />;
      } else {
        window.location.href = '/signin';
        content = <SignInPage />;
      }
    }

    // -- Protected Routes (Redirect to login if guest) --

    // Dashboard
    else if (path === '/dashboard') {
      content = (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
    }

    else if (path === '/onboarding' || path === '/quick-start') {
      content = (
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      );
    }

    // Generator / Resume Creation
    else if (path === '/newresume') {
      content = (
        <ProtectedRoute>
          <GenerationHub />
        </ProtectedRoute>
      );
    }

    // Job Tracker
    else if (path === '/job-tracker') {
      content = (
        <ProtectedRoute>
          <JobTrackerPage />
        </ProtectedRoute>
      );
    }
    else if (path === '/jobs/recommend') {
      content = (
        <ProtectedRoute>
          <JobsRecommendPage />
        </ProtectedRoute>
      );
    }
    // Legacy Tracker Redirect
    else if (path === '/tracker') {
      window.location.replace('/job-tracker');
      content = null; // Will trigger redirect
    }

    // Interview Studio — the catalog is browsable by guests (SaaS storefront);
    // deep links with a jobId still require an account.
    else if (path.startsWith('/interview-studio')) {
      const parts = path.split('/');
      const jobId = parts[2];
      content = jobId ? (
        <ProtectedRoute>
          <InterviewStudio jobId={jobId} />
        </ProtectedRoute>
      ) : (
        <InterviewStudio jobId={jobId} />
      );
    }

    // Company Quest — every quest page is browsable by guests (the storefront);
    // RUNNING a stage prompts the in-page auth gate, since attempts are scored
    // and consume AI credits.
    else if (path.startsWith('/quest/')) {
      const slug = path.split('/')[2];
      content = <CompanyQuestPage slug={slug} />;
    }

    // 3D Brick City Arcade Game Quest Course
    else if (path === '/learning/ccaf-quest' || path === '/learning/quest-game' || path === '/learning/game') {
      content = (
        <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0d0f14] text-white">Loading 3D Quest...</div>}>
          <CcafQuestPage />
        </React.Suspense>
      );
    }

    // AI-agent learning curriculum / course catalog — browsable by guests.
    else if (path === '/learning' || path.startsWith('/learning/')) {
      content = <CoursePage />;
    }

    // Interactive code-along lesson: /learn/:courseId/:exerciseId
    // The free course is open to everyone; the rest of the catalog needs an account.
    else if (path.startsWith('/learn/')) {
      const parts = path.split('/');
      const courseId = parts[2];
      const exerciseId = parts[3] || '';
      if (!exerciseId) {
        const resume = <CourseResumePage courseId={courseId} />;
        content = isCourseFreeForGuests(courseId) ? resume : <ProtectedRoute>{resume}</ProtectedRoute>;
      }
      else if (parts[4] === 'mock') {
        const practice = <SystemDesignCoursePracticePage courseId={courseId} exerciseId={exerciseId} />;
        content = isCourseFreeForGuests(courseId) ? practice : <ProtectedRoute>{practice}</ProtectedRoute>;
      } else {
      const lesson = (
        <InteractiveLessonPage key={`${courseId}/${exerciseId}`} courseId={courseId} exerciseId={exerciseId} />
      );
      content = isCourseFreeForGuests(courseId) ? lesson : (
        <ProtectedRoute>{lesson}</ProtectedRoute>
      );
      }
    }

    // Portfolio Hub (Main Dashboard for Portfolios)
    else if (path === '/portfolio') {
      content = (
        <ProtectedRoute>
          <PortfolioHub />
        </ProtectedRoute>
      );
    }

    // Whiteboard Hub (List View)
    else if (path === '/whiteboard') {
      content = (
        <ProtectedRoute>
          <WhiteboardsPage />
        </ProtectedRoute>
      );
    }

    // Whiteboard Editor
    else if (path.startsWith('/whiteboard/')) {
      const id = path.split('/')[2];
      content = (
        <ProtectedRoute>
          <WhiteboardEditor id={id} />
        </ProtectedRoute>
      );
    }

    // Profile & Settings
    else if (path === '/profile') {
      content = (
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      );
    }

    // Subscription / Billing
    else if (path === '/subscription' || path === '/billing') {
      content = (
        <ProtectedRoute>
          <BillingDashboard />
        </ProtectedRoute>
      );
    }

    // Business Partner Dashboard
    else if (path === '/business-partner/dashboard') {
      content = (
        <ProtectedRoute>
          <BusinessPartnerDashboard />
        </ProtectedRoute>
      );
    }

    // Agency Partner Dashboard
    else if (path === '/agency-partner/dashboard') {
      content = (
        <ProtectedRoute>
          <AgencyPartnerDashboard />
        </ProtectedRoute>
      );
    }

    // Dynamic Nested Folder View
    else if (path.startsWith('/folder/')) {
      content = (
        <ProtectedRoute>
          <DndWorkspaceProvider>
            <FolderView />
          </DndWorkspaceProvider>
        </ProtectedRoute>
      );
    }

    // Static Create & Build Hub
    else if (path === '/hub' || path === '/folder/create-build-hub') {
      content = (
        <ProtectedRoute>
          <DndWorkspaceProvider>
            <FolderView />
          </DndWorkspaceProvider>
        </ProtectedRoute>
      );
    }

    // -- Public / Shared Routes --

    // Editor (Handles its own auth/guest logic mostly, but /edit/:id usually implies protected found in auth block)
    // We'll wrap /edit/:id in ProtectedRoute to be safe, as it was in the Auth block.
    // /edit/guest is explicitly public.
    else if (path.startsWith('/edit/guest')) {
      content = <Editor resumeId="guest" />;
    }
    else if (path === '/agent') {
      content = <AgentPage />;
    }
    else if (path.startsWith('/edit/')) {
      const id = path.split('/')[2];
      content = (
        <ProtectedRoute>
          <Editor resumeId={id} />
        </ProtectedRoute>
      );
    }
    else if (path.startsWith('/prepare/')) {
      const agencySlug = path.split('/')[2];
      content = <AgencyPreparePage agencySlug={agencySlug} />;
    }

    // Portfolio Editor (Was accessible in both, keeping accessible)
    else if (isPortfolioEditorRoute) {
      content = <PortfolioEditor />;
    }
    else if (path === '/portfolio-builder') {
      content = <PortfolioBuilderPage />;
    }

    // Job Market (Was in Auth block, seemingly protected)
    else if (path.toLowerCase() === '/jobmarket' || path === '/job-market') {
      content = (
        <ProtectedRoute>
          <JobMarketPage />
        </ProtectedRoute>
      );
    }

    // Referrals (Was in Auth block)
    else if (path === '/referrals') {
      content = (
        <ProtectedRoute>
          <ReferralPage />
        </ProtectedRoute>
      );
    }

    // Community Platform — write-only routes (require auth)
    else if (path === '/community/new') {
      content = (
        <ProtectedRoute>
          <CommunityEditor />
        </ProtectedRoute>
      );
    }
    else if (path.startsWith('/community/edit/')) {
      content = (
        <ProtectedRoute>
          <EditPost />
        </ProtectedRoute>
      );
    }
    else if (path === '/my-posts' || path === '/community/my-posts') {
      content = (
        <ProtectedRoute>
          <MyPostsPage />
        </ProtectedRoute>
      );
    }
    // Developer API Docs — public
    else if (path === '/developers/api' || path === '/developers') {
      content = <ApiDocsPage />;
    }

    // Developer Settings (API Key management) — protected
    else if (path === '/developer') {
      content = (
        <ProtectedRoute>
          <DeveloperSettings />
        </ProtectedRoute>
      );
    }

    // Commerce / Checkout (Was in Auth block)
    else if (path === '/commerce') {
      content = <ProtectedRoute><CommerceDashboard /></ProtectedRoute>;
    }
    else if (path === '/checkout') {
      content = <ProtectedRoute><CheckoutSummary /></ProtectedRoute>;
    }
    // ... Commerce specialized routes (skipping exhaustive wrap for now to focus on main request, defaulting to accessible or explicit check)
    // Actually, let's keep them accessible if unsure, or wrap if they were in Auth.
    // They were in Auth.
    else if (path.startsWith('/drop/')) {
      content = <ProtectedRoute><DropProductGallery /></ProtectedRoute>;
    }
    else if (path === '/merchant/packing') {
      content = <ProtectedRoute><AssemblyLinePacking /></ProtectedRoute>;
    }
    else if (path === '/merchant/new-drop') {
      content = <ProtectedRoute><CreateNewDrop /></ProtectedRoute>;
    }
    else if (path === '/feed') {
      content = <ProtectedRoute><UpcomingDropsFeed /></ProtectedRoute>;
    }
    else if (path === '/merchant/submit') {
      content = <ProtectedRoute><MerchantProductSubmission /></ProtectedRoute>;
    }

    // Academic Partner
    else if (path === '/academic-partner') {
      content = (
        <ProtectedRoute>
          {userProfile?.role === 'academic_partner' || isAdmin ? <AcademicPartnerDashboard /> : <PermissionDeniedPage requiredRole="Academic Partner" message="Access denied." />}
        </ProtectedRoute>
      );
    }

    // Pages that are definitely public
    else if (path === '/pricing') { content = <PricingPage />; }
    else if (path === '/open') { content = <OpenRevenuePage />; }
    else if (path === '/demo') { content = <NotFoundPage />; }
    else if (path === '/contact') { content = <ContactPage />; }
    else if (path === '/services') { content = <ServicesPage />; }
    else if (path === '/service-portfolio') { content = <ServicePortfolioPage />; }
    else if (path === '/portal') { content = <ClientPortalPage />; }
    else if (path === '/policy') { content = <PolicyPage />; }
    else if (path === '/terms') { content = <TermsOfServicePage />; }
    else if (path === '/privacy') { content = <PrivacyPolicyPage />; }
    else if (path === '/referral') { content = <ReferralLandingPage />; }
    else if (path === '/bio-links') { content = <BioLinksPage />; }
    else if (path === '/bio-links/template/ticktok/get-more-review01') { content = <GetMoreReview01 />; }
    else if (path === '/blog') { content = <BlogListPage />; }
    else if (path.startsWith('/blog/')) {
      const id = path.split('/')[2];
      content = <BlogPostPage postId={id} />;
    }
    else if (path === '/tech-preview') { content = <TechLandingPage />; }
    else if (path === '/partners') { content = <PartnerLandingPage />; }
    else if (path === '/partners/academic') { content = <AcademicPartnerPage />; }
    else if (path === '/partners/business') { content = <BusinessPartnerPage />; }
    else if (path === '/partners/agency') { content = <AgencyPartnerPage />; }
    else if (path === '/partners/hiring') { content = <HRPartnerPage />; }
    else if (path === '/partners/students') { content = <StudentAmbassadorPage />; }
    else if (path === '/partners/apply') { content = <PartnerApplicationPage />; }
    else if (path === '/business-card') { content = <BusinessCardPage />; }
    else if (path === '/order-nfc-card') { content = <OrderNfcCardPage />; }
    else if (path === '/dashboard/integrations') {
      content = <ProtectedRoute><IntegrationsPage /></ProtectedRoute>;
    }

    // Product Page (Public)
    else if (path.startsWith('/p/')) {
      content = <ProductPage />;
    }

    // Programmatic SEO Route
    else if (path.startsWith('/topic/')) {
      const slug = path.split('/')[2];
      content = <ProgrammaticSeoPage slug={slug} />;
    }

    // Business Partner Jobs (Was in Auth block)
    else if (path === '/business-partner/jobs/new' || (path.startsWith('/business-partner/jobs/') && path.endsWith('/edit'))) {
      const jobId = path.endsWith('/edit') ? path.split('/')[3] : undefined;
      content = <ProtectedRoute><JobPostingEditor jobId={jobId} /></ProtectedRoute>;
    }

    // Authenticated users should treat root as their app home.
    else if (path === '/' && currentUser) {
      content = <AuthRedirect target="/dashboard" />;
    }

    // Public landing routes
    else if (path === '/' || path === '/product') {
      content = <LandingPage />;
    }

    // Fallback
    else {
      content = <NotFoundPage />;
    }
  }

  return (
    <ThemeProvider>
      <CartProvider>
        <NavigationProvider>
          <div className="min-h-screen bg-[#f7f1e7] text-[#211b16] dark:bg-[#1f1f1d] dark:text-[#f1eee7] font-sans">
            {currentUser && <WorkspaceDataEffects />}
            <Helmet
              titleTemplate="%s | CareerVivid"
              defaultTitle="CareerVivid | The AI That Gets You Hired"
            />
            {!isLearningRoute && (
              <SEOHelper
                isRobotsAllowed={![
                  '/dashboard',
                  '/onboarding',
                  '/quick-start',
                  '/profile',
                  '/billing',
                  '/subscription',
                  '/developer',
                  '/my-posts',
                  '/commerce',
                  '/checkout',
                  '/newresume',
                  '/job-tracker',
                  '/interview-studio',
                  '/portfolio',
                  '/whiteboard',
                  '/folder',
                  '/edit',
                  '/referrals',
                  '/extension-auth-complete',
                ].some(p => path.startsWith(p))}
              />
            )}
            <RouteSuspense routeKey={path}>
              {content}
              {showChatbot && <ChatBot />}
            </RouteSuspense>
          </div>
        </NavigationProvider>
      </CartProvider>
    </ThemeProvider>
  );
};
const App: React.FC = () => {
  const isExt = isExtensionContext();

  if (isExt) {
    return (
      <ThemeProvider>
        <AutoPageLocalizer />
        <RouteErrorBoundary routeKey="extension">
          <ExtensionLayout />
        </RouteErrorBoundary>
      </ThemeProvider>
    );
  }

  return (
    <>
      <AutoPageLocalizer />
      <AppContent />
      <CreditCelebration />
      <PWABadge />
    </>
  );
};

export default App;
