import React from 'react';
import { Briefcase } from 'lucide-react';
import { getAppUrl } from '../../utils/extensionUtils';

const ExtensionTracker: React.FC = () => (
    <div className="p-5 flex flex-col items-center justify-center h-[500px] text-center bg-[#f8f8fb] text-gray-500">
        <div className="h-14 w-14 rounded-2xl bg-[#eef0ff] text-[#4a4392] flex items-center justify-center border border-[#e4e7ff] mb-4">
            <Briefcase size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-950">Career pipeline</h3>
        <p className="text-sm mt-2 max-w-[240px]">Track saved roles, status, next steps, and interview prep.</p>
        <button
            onClick={() => window.open(getAppUrl('/job-tracker'), '_blank')}
            className="mt-5 px-4 py-2 rounded-xl bg-white text-[#4a4392] border border-[#ececf4] font-semibold text-sm shadow-sm hover:border-[#d9d7fb] hover:bg-[#fbfbfd] transition-colors"
        >
            Open pipeline
        </button>
    </div>
);

export default ExtensionTracker;
