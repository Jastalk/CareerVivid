import React, { useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { ChevronDown, FileText, Activity, AlertTriangle, CreditCard, Shield, Sparkles } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<string | null>(null);

    const toggleItem = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    const sections = [
        {
            icon: <FileText size={24} />,
            title: 'Account Terms',
            items: [
                {
                    title: 'Registration & Security',
                    content: 'By registering for CareerVivid, you agree to provide accurate and complete information. You are responsible for maintaining the security of your account credentials. You must immediately notify us of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to comply with this security obligation.'
                },
                {
                    title: 'Eligibility',
                    content: 'You must be at least 16 years old to use this Service. By creating an account, you warrant that you meet this age requirement and have the legal capacity to enter into a binding contract.'
                }
            ]
        },
        {
            icon: <Activity size={24} />,
            title: 'Acceptable Use Policy',
            items: [
                {
                    title: 'Prohibited Content',
                    content: 'You strictly agree NOT to use CareerVivid (including Bio-Link pages) to post: illegal content, hate speech, malware, phishing links, sexually explicit material, or content that infringes on intellectual property rights. We reserve the right to remove such content and suspend accounts without notice.'
                },
                {
                    title: 'Bio-Link Commerce',
                    content: 'If you use the "Store" feature, YOU are the Merchant of Record. CareerVivid is not a party to your transactions. You are solely responsible for product fulfillment, customer support, refunds, and tax obligations. You indemnify CareerVivid against any claims arising from your sales.'
                }
            ]
        },
        {
            icon: <CreditCard size={24} />,
            title: 'Payment & Subscriptions',
            items: [
                {
                    title: 'Subscription Terms',
                    content: 'Subscriptions renew automatically at the end of each billing period unless canceled. You authorize us to charge your payment method for the renewal term.'
                },
                {
                    title: 'Cancellation & Refunds',
                    content: 'You may cancel your "Bio-Link Pro" or other subscriptions at ANY TIME via your dashboard. You will retain access until the end of your complete billing cycle. We offer a 7-day money-back guarantee for initial purchases only. Refunds are not available for renewal charges or one-time digital downloads once used.'
                }
            ]
        },
        {
            icon: <Shield size={24} />,
            title: 'Intellectual Property',
            items: [
                {
                    title: 'Your Content',
                    content: 'You retain full ownership of the resumes, portfolios, and data you upload. You grant CareerVivid a limited license to host and display this content solely for providing the Service to you.'
                },
                {
                    title: 'Platform Rights',
                    content: 'CareerVivid owns all rights to the platform code, design, logos, and trademarks. You may not copy, modify, or reverse engineer any part of the Service.'
                }
            ]
        },
        {
            icon: <Sparkles size={24} />,
            title: 'AI Services',
            items: [
                {
                    title: 'AI-Generated Feedback',
                    content: 'CareerVivid uses a third-party AI provider (Google’s Gemini API) to analyze the content you submit — such as resume text, practice answers, and interview transcripts — and generate coaching feedback. This feedback is provided for guidance only, may contain errors or omissions, and is not professional career, legal, or hiring advice. You are responsible for reviewing and verifying any AI-generated output before relying on it.'
                },
                {
                    title: 'Content You Submit for Analysis',
                    content: 'When you request an analysis, the relevant content you provide is sent to the AI provider solely to produce your results. We do not sell this content or use it for advertising, and your account credentials (email, username, and password) are never shared with the AI provider. You retain ownership of the content you submit.'
                }
            ]
        },
        {
            icon: <AlertTriangle size={24} />,
            title: 'Liability & Disclaimers',
            items: [
                {
                    title: 'Disclaimer of Warranties',
                    content: 'The Service is provided "AS IS" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or completely secure.'
                },
                {
                    title: 'Limitation of Liability',
                    content: 'To the maximum extent permitted by law, CareerVivid shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the Service.'
                }
            ]
        },
        {
            icon: <AlertTriangle size={24} />,
            title: 'Legal Contact',
            items: [
                {
                    title: 'Formal Notices',
                    content: 'For any formal legal notices, subpoenas, or intellectual property disputes, please contact our legal department directly at: legal@careervivid.app. General support inquiries sent to this address will not receive a response.'
                }
            ]
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col font-sans text-gray-900 dark:text-white">
            <PublicHeader />
            <main className="flex-grow pt-24 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Terms of Service</h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Effective Date: July 20, 2026
                        </p>
                    </div>

                    <div className="space-y-12">
                        {sections.map((section, idx) => (
                            <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl">
                                        {section.icon}
                                    </div>
                                    <h2 className="text-2xl font-bold">{section.title}</h2>
                                </div>
                                <div className="space-y-6">
                                    {section.items.map((item, itemIdx) => (
                                        <div key={itemIdx} className="border-b border-gray-200 dark:border-gray-800 last:border-0 pb-6 last:pb-0">
                                            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                                {item.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default TermsOfServicePage;
