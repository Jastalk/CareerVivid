import React from 'react';
import { ArrowRight, Clock3, GraduationCap, Layers } from 'lucide-react';
import { getInteractiveCourses, getCourseExerciseCount } from '../../lib/interactiveCourses';

/**
 * Dynamic course showcase — renders the REAL course catalog (same JSON the
 * app uses), so the landing page always reflects what learners actually get.
 */

const DIFFICULTY_TONE: Record<string, string> = {
    Beginner: 'bg-[#eef7ee] text-[#137245] border-[#cfe8d5]',
    Intermediate: 'bg-[#fdf3e3] text-[#a97935] border-[#eeddc0]',
    Advanced: 'bg-[#f3f2ff] text-[#4a4392] border-[#dfe2ff]',
};

const CourseShowcaseSection: React.FC = () => {
    const courses = getInteractiveCourses();
    const featured = courses.slice(0, 6);
    const totalLessons = courses.reduce((n, c) => n + getCourseExerciseCount(c), 0);

    return (
        <section className="bg-[#fffaf1] py-16 dark:bg-[#262522] sm:py-20" aria-labelledby="courses-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#f7f1e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#a97935]">
                            <GraduationCap size={13} /> The AI-agent curriculum
                        </p>
                        <h2 id="courses-heading" className="mt-4 text-3xl font-semibold tracking-tight text-[#211b16] dark:text-[#f4f1e9] sm:text-4xl">
                            {courses.length} courses. {totalLessons} hands-on lessons.
                        </h2>
                        <p className="mt-2 max-w-2xl text-base font-medium text-[#665a4a] dark:text-[#aaa39a]">
                            From LLM foundations to a portfolio project recruiters can poke at — every lesson is a playground, quiz, or code lab. Never just a video.
                        </p>
                    </div>
                    <a
                        href="/learning"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#211b16] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8b5a16]/10 transition hover:-translate-y-0.5 hover:bg-[#3a2b20]"
                    >
                        View all courses <ArrowRight size={16} />
                    </a>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((course) => (
                        <a
                            key={course.id}
                            href="/learning"
                            className="group flex flex-col rounded-2xl border border-[#e4d3bc] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8b5a16]/10 dark:border-[#37332d] dark:bg-[#1f1f1d]"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${DIFFICULTY_TONE[course.difficulty] ?? DIFFICULTY_TONE.Beginner}`}>
                                    {course.difficulty}
                                </span>
                                <span className="text-2xl font-black tracking-tight text-[#e4d3bc] dark:text-[#37332d]">
                                    {course.title.slice(0, 2)}
                                </span>
                            </div>
                            <h3 className="mt-3 text-lg font-bold leading-snug text-[#211b16] dark:text-[#f4f1e9]">
                                {course.title.replace(/^\d+\.\s*/, '')}
                            </h3>
                            <p className="mt-1.5 flex-1 text-sm font-medium leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                                {course.tagline}
                            </p>
                            <div className="mt-4 flex items-center gap-4 border-t border-[#f0e6d4] pt-3 text-xs font-bold text-[#8b6a3f] dark:border-[#37332d] dark:text-[#caa26c]">
                                <span className="inline-flex items-center gap-1.5">
                                    <Layers size={13} /> {getCourseExerciseCount(course)} lessons
                                </span>
                                {course.estimatedMinutes && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock3 size={13} /> ~{course.estimatedMinutes} min
                                    </span>
                                )}
                                <span className="ml-auto inline-flex items-center gap-1 text-[#8b5a16] transition group-hover:gap-2 dark:text-[#caa26c]">
                                    Start <ArrowRight size={13} />
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CourseShowcaseSection;
