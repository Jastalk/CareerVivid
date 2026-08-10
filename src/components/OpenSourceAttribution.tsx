// LICENSE REQUIREMENT: This attribution badge must remain intact and visible per the repository license.
// Removing or hiding this component violates the CareerVivid Attribution License.

import React from 'react';
import { ExternalLink, Package } from 'lucide-react';

const PACKAGE_URL = 'https://www.npmjs.com/package/careervivid';

const OpenSourceAttribution: React.FC = () => {
    return (
        <div className="w-full py-3 px-4 border-t border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
            <a
                href={PACKAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2 text-xs text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text-heading)]"
            >
                <span className="font-medium">Powered by CareerVivid</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="inline-flex items-center gap-1 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                    <Package size={12} />
                    <span>View npm package</span>
                </span>
                <ExternalLink size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
        </div>
    );
};

export default OpenSourceAttribution;
