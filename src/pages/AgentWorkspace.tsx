/**
 * Full-screen Career Agent workspace at /agent.
 *
 * Replaces the BYO-key sandbox that used to live here — that page read a raw
 * Gemini key from localStorage and ran the model loop in the browser, which is
 * fine for a developer experiment and not shippable as a feature.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getPathFromUrl } from '../utils/navigation';
import { CareerAgentPanel } from '../features/agent/CareerAgentPanel';
import { useAuth } from '../contexts/AuthContext';

export const AgentWorkspace: React.FC = () => {
    const { currentUser } = useAuth();
    // App.tsx re-renders this on popstate, so reading the path here is enough.
    const path = getPathFromUrl();

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col bg-white dark:bg-gray-950">
            <Helmet>
                <title>Career Agent | CareerVivid</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            {!currentUser ? (
                <div className="flex flex-1 items-center justify-center px-6 text-center">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Career Agent</h1>
                        <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                            Sign in to let the agent build your resume, set up your job tracker, and plan
                            what to learn next.
                        </p>
                        <a
                            href="/login"
                            className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
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
