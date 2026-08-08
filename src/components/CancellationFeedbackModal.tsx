import React, { useEffect, useState } from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';

interface CancellationFeedbackModalProps {
    isOpen: boolean;
    onConfirm: (data: { reason: string; feedback: string }) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const REASONS = [
    'Too expensive',
    'Found a job',
    'Missing features',
    'Technical issues',
    'Not using it enough',
    'Other',
];

const CancellationFeedbackModal: React.FC<CancellationFeedbackModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setSelectedReason('');
            setFeedback('');
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!selectedReason) return;
        onConfirm({ reason: selectedReason, feedback });
    };

    return (
        <div className="fixed inset-0 z-50 flex min-w-[320px] items-center justify-center px-4 py-6">
            <div className="absolute inset-0 bg-[#211b16]/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#e4d3bc] bg-white shadow-2xl dark:border-[#37332d] dark:bg-[#1f1f1d]">
                <div className="border-b border-[#eee3d2] bg-[#fffaf1] p-6 dark:border-[#37332d] dark:bg-[#262522]">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#625bd5] dark:bg-[#302e2a] dark:text-[#8d88e6]">
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a97935] dark:text-[#caa26c]">
                                Cancellation reason
                            </p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#211b16] dark:text-[#f4f1e9]">
                                What made you decide to leave?
                            </h2>
                            <p className="mt-3 text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                Your answer helps us improve CareerVivid. You can still keep your paid plan on the next step.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {REASONS.map((reason) => (
                            <button
                                key={reason}
                                type="button"
                                onClick={() => setSelectedReason(reason)}
                                className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                                    selectedReason === reason
                                        ? 'border-[#625bd5] bg-[#eef0ff] text-[#211b16] ring-2 ring-[#625bd5]/15 dark:border-[#8d88e6] dark:bg-[#302e2a] dark:text-[#f4f1e9]'
                                        : 'border-[#e9e1d6] bg-white text-[#665a4a] hover:border-[#d8c6ad] hover:bg-[#fffaf1] dark:border-[#37332d] dark:bg-[#262522] dark:text-[#d7d0c6] dark:hover:bg-[#302e2a]'
                                }`}
                            >
                                {reason}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5">
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#7d6e5e] dark:text-[#aaa39a]">
                            Optional feedback
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={4}
                            placeholder="Anything else we should know?"
                            className="w-full rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] px-4 py-3 text-sm font-semibold text-[#211b16] outline-none transition placeholder:text-[#9d907f] focus:border-[#caa26c] focus:ring-2 focus:ring-[#caa26c]/30 dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:placeholder:text-[#756d63]"
                        />
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center rounded-xl border border-[#d8c6ad] bg-white px-4 py-3 text-sm font-black text-[#211b16] transition hover:bg-[#fffaf1] disabled:opacity-60 dark:border-[#37332d] dark:bg-[#262522] dark:text-[#f4f1e9] dark:hover:bg-[#302e2a]"
                        >
                            Keep paid plan
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!selectedReason || isLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#211b16] px-4 py-3 text-sm font-black text-white transition hover:bg-[#3a2b20] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]"
                        >
                            Continue cancellation
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancellationFeedbackModal;
