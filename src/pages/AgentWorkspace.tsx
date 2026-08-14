/**
 * Full-screen Career Agent workspace at /agent.
 *
 * Replaces the BYO-key sandbox that used to live here — that page read a raw
 * Gemini key from localStorage and ran the model loop in the browser, which is
 * fine for a developer experiment and not shippable as a feature.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles } from 'lucide-react';
import { getPathFromUrl } from '../utils/navigation';
import { CareerAgentPanel } from '../features/agent/CareerAgentPanel';
import { useAuth } from '../contexts/AuthContext';
import '../components/Landing/live/liveLanding.css';

export const AgentWorkspace: React.FC = () => {
    const { currentUser } = useAuth();
    // App.tsx re-renders this on popstate, so reading the path here is enough.
    const path = getPathFromUrl();

    // Full viewport, not `100vh - 4rem`: this route renders no app navbar, so
    // the subtracted 4rem was a strip of page background sitting under the
    // composer with nothing above it to account for. `dvh` also keeps the
    // composer clear of the URL bar on mobile.
    return (
        <div className="cvl flex h-[100dvh] flex-col">
            <Helmet>
                <title>Career Agent | CareerVivid</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            {!currentUser ? (
                <div className="flex flex-1 items-center justify-center px-5 py-10">
                    <div className="cvl-panel w-full max-w-sm p-6">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-xl"
                            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                        >
                            <Sparkles size={17} aria-hidden="true" />
                        </span>
                        <p
                            className="cvl-mono mt-4 text-[11px] uppercase tracking-[0.18em]"
                            style={{ color: 'var(--cvl-faint)' }}
                        >
                            career agent
                        </p>
                        <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight">
                            Sign in to start
                        </h1>
                        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                            The agent builds your resume, sets up your job tracker, and plans what to
                            learn next. It needs your account to do any of it.
                        </p>
                        <a
                            href="/login"
                            className="cvl-cta mt-5 inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-[14px] font-semibold transition"
                        >
                            Sign in
                        </a>
                    </div>
                </div>
            ) : (
                <CareerAgentPanel variant="full" route={path} />
            )}
        </div>
    );
};

export default AgentWorkspace;
