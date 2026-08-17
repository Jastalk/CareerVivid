import React from 'react';
import { Zap, X, Check } from 'lucide-react';
import { navigate } from '../utils/navigation';

interface AICreditLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    usage: number;
    limit: number;
}

const AICreditLimitModal: React.FC<AICreditLimitModalProps> = ({
    isOpen,
    onClose,
    usage,
    limit
}) => {

    if (!isOpen) return null;

    const handleUpgrade = () => {
        onClose();
        navigate('/subscription');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-w-[320px]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Header Section */}
                <div className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-purple-500"></div>

                    <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/10 rotate-3 transform transition-transform hover:rotate-6">
                        <Zap className="w-8 h-8 text-primary-500 fill-current" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        You've reached your AI limit
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                        You've used <span className="font-bold text-primary-600 dark:text-primary-400">{usage}/{limit}</span> free AI credits this month.
                    </p>
                </div>

                {/* Content Section */}
                <div className="p-6 pt-2">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wide">
                            Unlock Unlimited Potential
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1 mt-0.5">
                                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                </div>
                                <span>Generate unlimited professional resumes</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1 mt-0.5">
                                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                </div>
                                <span>Get 300+ AI credits every month</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1 mt-0.5">
                                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                </div>
                                <span>Access advanced Career Agent interview rounds</span>
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={handleUpgrade}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Upgrade to Pro
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AICreditLimitModal;
