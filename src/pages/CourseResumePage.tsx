import React, { useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { getCourseExerciseCount, getInteractiveCourse, firstIncompleteExerciseId } from '../lib/interactiveCourses';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { getGuestCoursePreviewStartExerciseId, isCourseFreeForGuests } from '../config/accessPolicy';

interface CourseResumePageProps {
  courseId: string;
}

/**
 * Resolves a bare course link to the learner's next incomplete lesson.
 * This keeps refreshes, bookmarks, and catalog actions on the same saved path.
 */
const CourseResumePage: React.FC<CourseResumePageProps> = ({ courseId }) => {
  const course = useMemo(() => getInteractiveCourse(courseId), [courseId]);
  const totalCount = course ? getCourseExerciseCount(course) : 0;
  const { progress, isLoading } = useCourseProgress(courseId, totalCount);
  const { currentUser, loading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!course || isLoading || isAuthLoading) return;
    const exerciseId = !currentUser && !isCourseFreeForGuests(courseId)
      ? getGuestCoursePreviewStartExerciseId(courseId)
      : firstIncompleteExerciseId(course, progress?.completedModuleIds ?? []);
    if (!exerciseId) return;
    navigate(`/learn/${courseId}/${exerciseId}`);
  }, [course, courseId, currentUser, isAuthLoading, isLoading, progress?.completedModuleIds]);

  return (
    <div className="cv-design-page flex min-h-screen items-center justify-center p-6" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--cv-action-primary)]" aria-hidden="true" />
      <span className="sr-only">Opening your next lesson</span>
    </div>
  );
};

export default CourseResumePage;
