import React from 'react';
import { Filter, Search } from 'lucide-react';
import { ApplicationStatus, APPLICATION_STATUSES, JOB_PRIORITIES, JobPriority } from '../../types';

type ViewMode = 'kanban' | 'strategy';
type SortMode = 'updated' | 'due' | 'priority';

interface PipelineControlsProps {
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    priorityFilter: JobPriority | 'All';
    setPriorityFilter: React.Dispatch<React.SetStateAction<JobPriority | 'All'>>;
    sortMode: SortMode;
    setSortMode: React.Dispatch<React.SetStateAction<SortMode>>;
    viewMode: ViewMode;
    setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
    statusFilter: ApplicationStatus | 'All';
    setStatusFilter: React.Dispatch<React.SetStateAction<ApplicationStatus | 'All'>>;
    statusCounts: Record<ApplicationStatus, number>;
    filteredCount: number;
    totalCount: number;
}

const statusDotClass = (status: ApplicationStatus) => {
    switch (status) {
        case 'Applied':
            return 'bg-blue-500';
        case 'Interviewing':
            return 'bg-yellow-500';
        case 'Offered':
            return 'bg-green-500';
        case 'Rejected':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
};

const PipelineControls: React.FC<PipelineControlsProps> = ({
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    sortMode,
    setSortMode,
    viewMode,
    setViewMode,
    statusFilter,
    setStatusFilter,
    statusCounts,
    filteredCount,
    totalCount,
}) => (
    <section className="mt-4 rounded-xl border border-[#ececf4] bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-label="Pipeline controls">
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <label className="relative min-w-[220px] flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <span className="sr-only">Search jobs</span>
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search title, company, stage, action"
                        className="h-9 w-full rounded-lg border border-[#e6e2dc] bg-[#fbfbfe] pl-9 pr-3 text-sm font-medium text-gray-900 outline-none transition focus:border-[#8d88e6] focus:bg-white focus:ring-2 focus:ring-[#f3f2ff] dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-[#8d88e6]"
                    />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:flex-none">
                    <div className="flex items-center gap-2">
                        <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e6e2dc] bg-[#fbfbfe] px-2.5 dark:border-gray-800 dark:bg-gray-950">
                            <Filter size={13} className="text-gray-400" />
                            <span className="sr-only">Filter by priority</span>
                            <select
                                value={priorityFilter}
                                onChange={(event) => setPriorityFilter(event.target.value as JobPriority | 'All')}
                                className="h-8 border-0 bg-transparent p-0 text-xs font-semibold text-gray-700 focus:ring-0 dark:text-gray-200"
                            >
                                <option value="All">All priorities</option>
                                {JOB_PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                            </select>
                        </label>
                        <label className="inline-flex h-9 items-center rounded-lg border border-[#e6e2dc] bg-[#fbfbfe] px-2.5 dark:border-gray-800 dark:bg-gray-950">
                            <span className="sr-only">Sort jobs</span>
                            <select
                                value={sortMode}
                                onChange={(event) => setSortMode(event.target.value as SortMode)}
                                className="h-8 border-0 bg-transparent p-0 text-xs font-semibold text-gray-700 focus:ring-0 dark:text-gray-200"
                            >
                                <option value="updated">Recently updated</option>
                                <option value="due">Next action due</option>
                                <option value="priority">Priority</option>
                            </select>
                        </label>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <p className="whitespace-nowrap text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Showing {filteredCount} of {totalCount}
                        </p>
                        <div className="inline-flex rounded-lg border border-[#e6e2dc] bg-[#fbfbfe] p-1 dark:border-gray-800 dark:bg-gray-950">
                            {(['kanban', 'strategy'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === mode
                                        ? 'bg-white text-[#4a4392] shadow-sm dark:bg-gray-800 dark:text-[#c8c5ff]'
                                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                    }`}
                                >
                                    {mode === 'kanban' ? 'Kanban' : 'Strategy'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/*
              * Stage chips only in Strategy view.
              *
              * In Kanban the five stages are already the five columns, each with
              * its own count and each clickable — a second row of the same five
              * names, the same five counts, and a different selection model on
              * top of the board taught the user there were two ways to do one
              * thing. Strategy view has no columns, so there they earn their place.
              */}
            <div className={`items-center gap-2 overflow-x-auto pb-1 ${viewMode === 'kanban' ? 'hidden' : 'flex'}`} aria-label="Pipeline stage focus">
                <button
                    type="button"
                    onClick={() => setStatusFilter('All')}
                    className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${statusFilter === 'All'
                        ? 'border-[#c8c7f4] bg-[#f3f2ff] text-[#4a4392]'
                        : 'border-[#e6e2dc] bg-[#fbfbfe] text-gray-600 hover:border-[#d9d7fb] hover:text-[#4a4392] dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300'
                    }`}
                >
                    <span>All</span>
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-300">{totalCount}</span>
                </button>
                {APPLICATION_STATUSES.map(status => {
                    const isActive = statusFilter === status;
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setStatusFilter(status)}
                            className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${isActive
                                ? 'border-[#c8c7f4] bg-[#f3f2ff] text-[#4a4392]'
                                : 'border-[#e6e2dc] bg-[#fbfbfe] text-gray-600 hover:border-[#d9d7fb] hover:text-[#4a4392] dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300'
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
                            <span>{status}</span>
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-300">{statusCounts[status] || 0}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    </section>
);

export default PipelineControls;
