import React from 'react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { Lock, Eye, CheckCircle, Sparkles } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col font-sans text-gray-900 dark:text-white">
            <PublicHeader />
            <main className="flex-grow pt-24 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Privacy Policy</h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Your privacy is our priority. Effective Date: July 20, 2026
                        </p>
                    </div>

                    <div className="space-y-12">
                        {/* Information Collection */}
                        <section className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-xl">
                                    <Eye size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">Information We Collect</h2>
                            </div>
                            <div className="space-y-4 text-gray-600 dark:text-gray-300">
                                <p><strong>Account Information:</strong> When you register, we collect your name, username, email address, and password. This account data is stored securely within CareerVivid; passwords are always encrypted and are never stored in plain text.</p>
                                <p><strong>Resume &amp; Interview Content:</strong> When you use our coaching tools, we process the content you provide — such as resume text, practice answers, and interview transcripts — so we can generate your feedback and reports.</p>
                                <p><strong>Usage Data:</strong> We automatically collect log data such as your IP address, browser type, and pages visited to improve platform performance and security.</p>
                                <p><strong>Google Sign-In (Optional):</strong> If you choose to sign in with Google, we receive basic profile information (your name and email) to create and secure your account. We never receive your Google password.</p>
                                <p><strong>Cookies:</strong> We use cookies to maintain your session and preference settings.</p>
                            </div>
                        </section>

                        {/* AI Analysis (Google Gemini) */}
                        <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-3xl p-8 md:p-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">AI Analysis with Google Gemini</h2>
                            </div>
                            <div className="space-y-4 text-gray-600 dark:text-gray-300">
                                <p>
                                    CareerVivid uses Google's <strong>Gemini API</strong> to power its resume and interview coaching. When you request feedback, the relevant content you provide — such as resume text, practice answers, and interview transcripts — is sent to the Gemini API solely to generate your analysis and results.
                                </p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>We send <strong>only</strong> the content needed for the analysis you request.</li>
                                    <li>We do <strong>NOT</strong> send your password or payment details to the AI provider.</li>
                                    <li>Your account credentials and profile stay within CareerVivid and are <strong>not</strong> shared with the AI provider.</li>
                                    <li>We do <strong>NOT</strong> sell your data or use it for third-party advertising.</li>
                                </ul>
                                <p>
                                    Content sent for analysis is processed only to provide the Service and is handled in accordance with Google's API data policies.
                                </p>
                            </div>
                        </section>

                        {/* Data Usage & Sharing */}
                        <section className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl">
                                    <Lock size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">How We Use & Share Information</h2>
                            </div>
                            <div className="space-y-4 text-gray-600 dark:text-gray-300">
                                <p>We use your data to:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Provide and maintain the Service.</li>
                                    <li>Generate AI-powered resume and interview feedback via Google's Gemini API.</li>
                                    <li>Process payments (via Stripe - we do not store credit card numbers).</li>
                                    <li>Send service notifications (e.g., billing, security alerts).</li>
                                </ul>
                                <p className="mt-4"><strong>Data Sharing:</strong> We do NOT sell your personal data. We only share data with trusted processors necessary to operate the Service — Firebase for secure hosting and account storage, Google's Gemini API for AI analysis, and Stripe for payments.</p>
                            </div>
                        </section>

                        {/* User Rights */}
                        <section className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-3 rounded-xl">
                                    <CheckCircle size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">Your Rights</h2>
                            </div>
                            <div className="space-y-4 text-gray-600 dark:text-gray-300">
                                <p>Depending on your location (e.g., EU under GDPR, California under CCPA), you have rights to:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Access:</strong> Request a copy of your personal data.</li>
                                    <li><strong>Correction:</strong> Update inaccurate information via your account settings.</li>
                                    <li><strong>Deletion:</strong> Request permanent deletion of your account and data.</li>
                                </ul>
                                <p className="mt-4">
                                    To exercise these rights, please contact us at <a href="mailto:privacy@careervivid.app" className="text-indigo-600 hover:underline">privacy@careervivid.app</a>.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PrivacyPolicyPage;
