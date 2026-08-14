import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ExtensionProfile: React.FC = () => {
    const { logOut } = useAuth();

    const handleSignOut = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(
                [
                    'devModeAuth',
                    'isAuthenticated',
                    'autofillProfile',
                    'selectedResumeId',
                    'firebaseIdToken',
                    'firebaseRefreshToken',
                    'tokenExpirationTime',
                    'firebaseApiKey',
                    'uid',
                ],
                () => {
                    if (chrome.runtime && chrome.runtime.sendMessage) {
                        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', isAuthenticated: false }, () => {
                            const _ = chrome.runtime.lastError;
                        });
                    }
                    logOut();
                }
            );
        } else {
            logOut();
        }
    };

    return (
        <div className="p-5 flex flex-col items-center justify-center h-[500px] text-center bg-[#f8f8fb] text-gray-500">
            <div className="h-14 w-14 rounded-2xl bg-[#eef0ff] text-[#4a4392] flex items-center justify-center border border-[#e4e7ff] mb-4">
                <User size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-950">Profile</h3>
            <p className="text-sm mt-2 max-w-[240px]">Manage your account and extension session.</p>
            <button
                onClick={handleSignOut}
                className="mt-6 px-4 py-2 bg-white text-rose-600 rounded-xl border border-rose-100 text-sm font-semibold hover:bg-rose-50 transition-colors shadow-sm"
            >
                Sign out
            </button>
        </div>
    );
};

export default ExtensionProfile;
