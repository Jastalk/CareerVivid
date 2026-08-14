import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { isVersionMismatchError, requestVersionRecovery } from './VersionUpdateBoundary';

type RouteErrorBoundaryProps = {
  children: React.ReactNode;
  routeKey: string;
};

type RouteErrorBoundaryState = {
  error: unknown;
};

class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown) {
    if (isVersionMismatchError(error)) {
      void requestVersionRecovery('route-boundary');
    }
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (prevProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  private reloadRoute = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.history.pushState(null, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="cv-warm-page cv-warm-grid flex min-h-screen items-center justify-center px-4 py-10 text-[#211b16] dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
        <section className="w-full max-w-md rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/95 p-6 text-center shadow-[0_18px_60px_rgba(33,27,22,0.08)] dark:border-[#37332d] dark:bg-[#262522]/95">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0d4d8] bg-[#fff0f2] text-[#be3d52] dark:border-[#553038] dark:bg-[#3a2529] dark:text-[#ff9aaa]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-bold">This page hit a loading problem</h1>
          <p className="mt-2 text-sm leading-6 text-[#665a4a] dark:text-[#aaa39a]">
            Your workspace is still safe. Refresh this page, or return to the dashboard and reopen the item.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={this.reloadRoute}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4a4392] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#544cc4] focus:outline-none focus:ring-2 focus:ring-[#8d88e6] focus:ring-offset-2 focus:ring-offset-[#fffaf1] dark:focus:ring-offset-[#262522]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e4d3bc] bg-white px-4 py-3 text-sm font-bold text-[#211b16] shadow-sm transition hover:bg-[#fff4e2] focus:outline-none focus:ring-2 focus:ring-[#8d88e6] focus:ring-offset-2 focus:ring-offset-[#fffaf1] dark:border-[#37332d] dark:bg-[#302e2a] dark:text-[#f4f1e9] dark:hover:bg-[#36332f] dark:focus:ring-offset-[#262522]"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </section>
      </div>
    );
  }
}

export default RouteErrorBoundary;
