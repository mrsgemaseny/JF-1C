import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchGlobal, GlobalSearchResponse } from '@/shared/api/searchApi';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from 'react-i18next';

export function GlobalSearch() {
  const { t } = useTranslation(['common']);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);
  const { user } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let ignore = false;
    if (debouncedQuery.length >= 2) {
      setIsLoading(true);
      searchGlobal(debouncedQuery)
        .then(data => {
          if (!ignore) setResults(data);
        })
        .finally(() => {
          if (!ignore) setIsLoading(false);
        });
    } else {
      setResults(null);
    }
    return () => {
      ignore = true;
    };
  }, [debouncedQuery]);

  const handleSelectTask = (id: number) => {
    setIsOpen(false);
    if (user?.role === 'ADMIN' || user?.role === 'ADVISOR') navigate(`/admin/tasks?taskId=${id}`);
    else if (user?.role === 'EMPLOYEE') navigate(`/employee/tasks?taskId=${id}`);
  };

  const handleSelectCourse = (id: number) => {
    setIsOpen(false);
    if (user?.role === 'ADMIN' || user?.role === 'CURATOR') navigate(`/admin/courses/${id}/edit`);
    else if (user?.role === 'LEARNER') navigate(`/courses/${id}`);
  };

  const handleSelectLesson = (courseId: number | undefined, lessonId: number) => {
    setIsOpen(false);
    if (!courseId) return;
    if (user?.role === 'ADMIN' || user?.role === 'CURATOR') navigate(`/admin/courses/${courseId}/lessons/${lessonId}/edit`);
    else if (user?.role === 'LEARNER') navigate(`/courses/${courseId}/lessons/${lessonId}`);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder={t('search.placeholder')}
          className="w-full pl-10 pr-4 pt-2 pb-2.5 leading-relaxed bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 outline-none transition-all"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 w-5 h-5 text-gray-900 animate-spin" />
        )}
      </div>

      {isOpen && query.length >= 2 && results && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-96 overflow-y-auto z-50">
          {results.tasks.length === 0 && results.users.length === 0 && results.courses.length === 0 && results.lessons.length === 0 ? (
            <div className="p-4 text-center text-gray-500">{t('search.noResults', { defaultValue: 'Ничего не найдено' })}</div>
          ) : (
            <div className="py-2">
              {results.tasks.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('search.categories.tasks', { defaultValue: 'Задачи' })}
                  </div>
                  {results.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleSelectTask(task.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col"
                    >
                      <span className="font-medium text-gray-900 truncate leading-relaxed pb-0.5">{task.title}</span>
                      <span className="text-xs text-gray-500">
                        {task.client?.fullName} • {task.stage?.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.courses.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('search.categories.courses', { defaultValue: 'Курсы' })}
                  </div>
                  {results.courses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col"
                    >
                      <span className="font-medium text-gray-900 truncate leading-relaxed pb-0.5">{course.title}</span>
                      <span className="text-xs text-gray-500">
                        {course.isPublished ? t('search.status.published', { defaultValue: 'Опубликован' }) : t('search.status.draft', { defaultValue: 'Черновик' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.lessons.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('search.categories.lessons', { defaultValue: 'Уроки' })}
                  </div>
                  {results.lessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => handleSelectLesson(lesson.courseId || lesson.sectionId, lesson.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col"
                    >
                      <span className="font-medium text-gray-900 truncate leading-relaxed pb-0.5">{lesson.title}</span>
                      <span className="text-xs text-gray-500">
                        {t('search.lessonType', { defaultValue: 'Тип:' })} {lesson.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('search.categories.users', { defaultValue: 'Пользователи' })}
                  </div>
                  {results.users.map(user => (
                    <div key={user.id} className="px-4 py-2 hover:bg-gray-50 flex flex-col">
                      <span className="font-medium text-gray-900 truncate leading-relaxed pb-0.5">{user.fullName}</span>
                      <span className="text-xs text-gray-500">{user.email} • {user.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
