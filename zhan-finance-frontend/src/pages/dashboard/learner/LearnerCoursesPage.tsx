import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { CourseDto, getPublishedCourses } from '@/entities/course/api/courseApi';
import { ROUTES } from '@/shared/config/routes';
import { Spinner } from '@/shared/ui/Spinner';
import { useTranslation } from 'react-i18next';

export function LearnerCoursesPage() {
  const { t } = useTranslation(['common']);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPublishedCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('learnerCourses.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('learnerCourses.subtitle')}</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="md" className="text-brand-green" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && courses.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <BookOpen size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">{t('learnerCourses.noCourses')}</p>
          <p className="text-xs text-gray-400">{t('learnerCourses.noCoursesSubtext')}</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() =>
                navigate(ROUTES.LEARNER_COURSE_DETAILS.replace(':id', String(course.id)))
              }
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left flex flex-col overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="h-36 bg-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen size={32} className="text-gray-200" />
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-brand-green transition-colors">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-sm font-medium text-brand-green mt-auto">
                  {t('learnerCourses.startCourse')}
                  <ChevronRight size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}