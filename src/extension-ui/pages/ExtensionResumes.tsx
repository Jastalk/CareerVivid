/// <reference types="chrome" />
import React, { useEffect, useState } from 'react';
import { FileText, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useResumes } from '../../hooks/useResumes';
import { getAppUrl } from '../../utils/extensionUtils';

const ExtensionResumes: React.FC = () => {
    const { currentUser } = useAuth();
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser?.uid) {
            setResolvedUserId(currentUser.uid);
        } else {
            chrome.storage.local.get(['devModeAuth', 'autofillProfile', 'uid'], (res) => {
                if (res.devModeAuth) {
                    setResolvedUserId(null);
                } else if (res.uid) {
                    setResolvedUserId(res.uid);
                } else if (res.autofillProfile?.uid) {
                    setResolvedUserId(res.autofillProfile.uid);
                } else {
                    setResolvedUserId(null);
                }
            });
        }
    }, [currentUser]);

    const { resumes, isLoading } = useResumes(resolvedUserId);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncedId, setSyncedId] = useState<string | null>(null);

    // Load current selection from storage
    useEffect(() => {
        chrome.storage.local.get(['selectedResumeId'], (result) => {
            setSelectedResumeId((result.selectedResumeId as string | undefined) || null);
            setSyncedId((result.selectedResumeId as string | undefined) || null);
        });
    }, []);

    const handleSelectResume = async (resumeId: string) => {
        if (!resolvedUserId || syncingId) return;
        setSyncingId(resumeId);

        chrome.runtime.sendMessage({
            type: 'SYNC_PROFILE',
            userId: resolvedUserId,
            resumeId,
        }, (res) => {
            setSyncingId(null);
            if (res?.success) {
                setSelectedResumeId(resumeId);
                setSyncedId(resumeId);
            }
        });
    };

    return (
        <div className="min-h-[360px] w-[380px] bg-[#f8f8fb] font-sans text-gray-900">
            <div className="px-5 py-4 bg-white border-b border-[#ececf4]">
                <h2 className="text-sm font-semibold text-gray-900">Select active resume</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    CareerVivid uses this resume for matching and application support.
                </p>
            </div>

            <div className="p-4 space-y-2">
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-[#4a4392]" />
                    </div>
                )}

                {!isLoading && resumes.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400">No resumes found.</p>
                        <button
                            onClick={() => window.open(getAppUrl('/newresume'), '_blank')}
                            className="mt-3 text-sm font-semibold text-[#4a4392] hover:underline"
                        >
                            Create your first resume →
                        </button>
                    </div>
                )}

                {resumes.map((resume) => {
                    const isSelected = selectedResumeId === resume.id;
                    const isSyncing = syncingId === resume.id;
                    const isSynced = syncedId === resume.id;

                    return (
                        <button
                            key={resume.id}
                            onClick={() => handleSelectResume(resume.id!)}
                            disabled={isSyncing}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                                isSelected
                                    ? 'border-[#c8c7f4] bg-[#f5f4ff] shadow-sm'
                                    : 'border-[#ececf4] bg-white hover:border-[#d9d7fb] hover:bg-[#fbfbfd]'
                            }`}
                        >
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-[#e9e8ff] text-[#4a4392]' : 'bg-[#f4f5f8] text-gray-400'
                            }`}>
                                <FileText size={16} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                    {resume.title || 'Untitled Resume'}
                                </div>
                                {isSelected && (
                                    <div className="text-[10px] text-[#4a4392] font-semibold mt-0.5">
                                        Active resume
                                    </div>
                                )}
                            </div>

                            <div className="flex-shrink-0">
                                {isSyncing ? (
                                    <Loader2 size={16} className="animate-spin text-[#4a4392]" />
                                ) : isSelected ? (
                                    <div className="h-5 w-5 rounded-full bg-[#4a4392] flex items-center justify-center">
                                        <Check size={11} className="text-white" />
                                    </div>
                                ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {syncedId && (
                <div className="px-5 py-3 bg-green-50 border-t border-green-100 text-center">
                    <p className="text-xs text-green-700 font-medium">
                        Profile synced and ready
                    </p>
                </div>
            )}
        </div>
    );
};

export default ExtensionResumes;
