
import React from 'react';
import Logo from './Logo';
import { navigate } from '../utils/navigation';

interface FooterProps {
    variant?: 'default' | 'brutalist';
    policyPath?: string;
}

const Footer: React.FC<FooterProps> = ({ variant = 'default', policyPath = '/policy' }) => {
    const isBrutalist = variant === 'brutalist';

    return (
        <footer className={`border-t ${isBrutalist
            ? 'bg-black border-white'
            : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800'
            }`}>
            {/*
              * Extra bottom padding clears the floating Career Agent launcher,
              * which is fixed to a bottom corner and was sitting on top of the
              * copyright line.
              */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center">
                        <Logo className={`h-8 w-auto ${isBrutalist ? 'text-white' : ''}`} />
                    </div>
                    <div className={`flex flex-wrap justify-center gap-6 ${isBrutalist ? 'text-white font-mono text-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                        <button onClick={() => navigate('/')} className={`transition-colors ${isBrutalist ? 'hover:text-green-400 hover:underline uppercase' : 'hover:text-primary-500'}`}>Features</button>
                        <button onClick={() => navigate('/pricing')} className={`transition-colors ${isBrutalist ? 'hover:text-green-400 hover:underline uppercase' : 'hover:text-primary-500'}`}>Pricing</button>
                        <button onClick={() => navigate('/contact')} className={`transition-colors ${isBrutalist ? 'hover:text-green-400 hover:underline uppercase' : 'hover:text-primary-500'}`}>Support</button>
                        <button onClick={() => navigate('/terms')} className={`transition-colors ${isBrutalist ? 'hover:text-green-400 hover:underline uppercase' : 'hover:text-primary-500'}`}>Terms</button>
                        <button onClick={() => navigate('/privacy')} className={`transition-colors ${isBrutalist ? 'hover:text-green-400 hover:underline uppercase' : 'hover:text-primary-500'}`}>Privacy</button>
                        <button onClick={() => navigate('/policy#bio-link')} className={`transition-colors ${isBrutalist ? 'hover:text-green-400 hover:underline uppercase' : 'hover:text-primary-500'}`}>Policy</button>
                    </div>
                    <p className={`text-sm ${isBrutalist ? 'text-white font-mono' : 'text-gray-500 dark:text-gray-400'}`}>
                        © {new Date().getFullYear()} CareerVivid. All rights reserved.
                    </p>
                </div>
                {isBrutalist && <div className="mt-8 border-t-2 border-white w-full"></div>}
            </div>
        </footer>
    );
};
export default Footer;
