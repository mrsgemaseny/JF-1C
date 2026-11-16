import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, Clock, AlignLeft, Tag, Edit2 } from 'lucide-react';
import { CalendarEventDto } from '@/entities/calendar/api/calendarApi';
import { useCalendarEventsQuery, useCreateCalendarEventMutation, useDeleteCalendarEventMutation, useUpdateCalendarEventMutation } from '@/entities/calendar/api/calendarQueries';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Spinner } from '@/shared/ui/Spinner';
import { Input } from '@/shared/ui/Input/Input';

import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '@/shared/lib/hooks/useEscapeKey';
import { formatDate } from '@/shared/lib/dateFormat';

// Colors remain hardcoded but can be translated later if needed, they are not primarily shown in the UI here.
const COLORS = [
  { value: 'BLUE', label: 'Синий', bg: 'bg-blue-100', text: 'text-blue-800' },
  { value: 'RED', label: 'Красный (Дедлайн)', bg: 'bg-red-100', text: 'text-red-800' },
  { value: 'GREEN', label: 'Зеленый', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'YELLOW', label: 'Желтый', bg: 'bg-amber-100', text: 'text-amber-800' },
  { value: 'PURPLE', label: 'Фиолетовый', bg: 'bg-purple-100', text: 'text-purple-800' }
];

export function CalendarPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('common');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  const { data: events = [], isLoading } = useCalendarEventsQuery(startDate, endDate);
  const createMutation = useCreateCalendarEventMutation();
  const updateMutation = useUpdateCalendarEventMutation();
  const deleteMutation = useDeleteCalendarEventMutation();
  const navigate = useNavigate();

  // Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [color, setColor] = useState('BLUE');
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState('');

  // Auto-scroll to current month on mobile
  useEffect(() => {
    if (!isLoading && window.innerWidth < 768) {
      const currentMonth = new Date().getMonth();
      const currentYearObj = new Date().getFullYear();
      if (currentYear === currentYearObj) {
        const el = document.getElementById(`month-${currentMonth}`);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
          }, 100);
        }
      }
    }
  }, [isLoading, currentYear]);

  const handlePrevYear = () => setCurrentYear(y => y - 1);
  const handleNextYear = () => setCurrentYear(y => y + 1);

  const handleDayClick = (dateStr: string) => {
    const selectedDateObj = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDateObj < today) return;

    setSelectedDate(dateStr);
    setTitle('');
    setTitleError('');
    setDescription('');
    setTime('09:00');
    setColor('BLUE');
    setEditingEventId(null);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('common:required', { defaultValue: 'Обязательное поле' }));
      return;
    }
    if (!selectedDate) return;
    setIsSaving(true);
    try {
      if (editingEventId) {
        await updateMutation.mutateAsync({
          id: parseInt(editingEventId.replace('event_', '')),
          request: {
            date: selectedDate,
            title,
            description,
            time: time || undefined,
            color
          }
        });
      } else {
        await createMutation.mutateAsync({
          date: selectedDate,
          title,
          description,
          time: time || undefined,
          color
        });
      }
      // Reset form instead of closing modal completely, so user can see it updated or close if they want
      setEditingEventId(null);
      setTitle('');
      setDescription('');
      setTime('09:00');
      setColor('BLUE');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (e: CalendarEventDto) => {
    setTitle(e.title);
    setDescription(e.description || '');
    setTime(e.time || '09:00');
    setColor(e.color || 'BLUE');
    setEditingEventId(e.id);
  };

  const handleOpenTask = (taskId: number) => {
    const rolePath = user?.role === 'ADMIN' ? 'admin' : 'employee';
    navigate(`/dashboard/${rolePath}/tasks?taskId=${taskId}`);
  };

  const handleDeleteEvent = async (eventId: string, isTask: boolean) => {
    if (isTask) return; // Cannot delete tasks from calendar
    try {
      const originalId = parseInt(eventId.replace('event_', ''));
      await deleteMutation.mutateAsync(originalId);
    } catch (e) {
      console.error(e);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay() - 1;
    if (day === -1) day = 6;
    return day;
  };

  const MONTH_NAMES = t('calendarPage.months', { returnObjects: true }) as string[];
  const DAY_NAMES = t('calendarPage.daysShort', { returnObjects: true }) as string[];

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(currentYear, monthIndex);
    const firstDay = getFirstDayOfMonth(currentYear, monthIndex);
    const days = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      let cellBg = isToday ? 'border-2 border-brand-green shadow-sm' : 'hover:bg-gray-100 bg-transparent';
      let textColor = isToday ? 'text-brand-green font-bold' : 'text-gray-700';

      if (dayEvents.length > 0) {
        // Find highest priority color (RED > ORANGE > YELLOW > GREEN > BLUE) or just use the first event's color
        // Assuming first event for now
        const primaryEvent = dayEvents.find(e => e.color === 'RED') || dayEvents[0];
        const colorObj = COLORS.find(c => c.value === primaryEvent.color) || COLORS[0];
        cellBg = `${colorObj.bg} shadow-sm transform hover:scale-105`;
        if (isToday) cellBg += ' border-2 border-brand-green';
        textColor = `${colorObj.text} font-semibold`;
      }

      days.push(
        <div 
          key={d} 
          onClick={() => handleDayClick(dateStr)}
          className={`relative aspect-square w-full min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center rounded-lg cursor-pointer transition-all ${cellBg}`}
        >
          <span className={`text-xs ${textColor}`}>{d}</span>
          
          {/* Event indicators */}
          {dayEvents.length === 1 && (
             <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-current rounded-full" />
          )}
          {dayEvents.length > 1 && (
             <div className={`absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ${
               dayEvents.some(e => e.color === 'RED') ? 'bg-red-500' : 'bg-blue-500'
             }`}>
               {dayEvents.length}
             </div>
          )}
        </div>
      );
    }

    return (
      <div key={monthIndex} id={`month-${monthIndex}`} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col h-full">
          <h3 className="font-bold text-gray-900 mb-4 text-center">
            {Array.isArray(MONTH_NAMES) ? MONTH_NAMES[monthIndex] : ''}
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {Array.isArray(DAY_NAMES) && DAY_NAMES.map(d => (
              <div key={d} className="text-[10px] font-medium text-gray-400">{d}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1 content-start">
          {days}
        </div>
      </div>
    );
  };

  const selectedDayEvents = events.filter(e => e.date === selectedDate);

  return (
    <div className="flex flex-col max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('calendarPage.title')}</h1>
            <p className="text-gray-500 mt-1">{t('calendarPage.subtitle')}</p>
          </div>
        
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <button onClick={handlePrevYear} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg w-16 text-center">{currentYear}</span>
          <button onClick={handleNextYear} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="w-8 h-8 text-brand-green" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pr-2 pb-8">
          {[...Array(12)].map((_, i) => renderMonth(i))}
        </div>
      )}

      {/* Day Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">
                {t('calendarWidget.eventsOn', { defaultValue: 'События на' })} {formatDate(selectedDate, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {/* Existing Events List */}
              <div className="space-y-3 mb-8">
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">
                    {t('calendarWidget.noEvents', { defaultValue: 'На этот день нет запланированных событий' })}
                  </p>
                ) : (
                  selectedDayEvents.map(e => {
                    const colorObj = COLORS.find(c => c.value === e.color) || COLORS[0];
                    return (
                      <div key={e.id} className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${colorObj.bg}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-medium ${e.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {e.title}
                            </p>
                            {e.time && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{e.time.substring(0, 5)}</span>}
                          </div>
                          {e.description && (
                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{e.description}</p>
                          )}
                          {e.type === 'TASK' && (
                            <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded">
                              {t('calendarWidget.systemTask', { defaultValue: 'Задача в системе' })}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {e.type === 'EVENT' && (
                            <>
                              <button 
                                onClick={() => handleEditClick(e)}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                                title={t('common:actions.edit', { defaultValue: 'Редактировать' })}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(e.id, false)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title={t('common:actions.delete', { defaultValue: 'Удалить' })}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {e.type === 'TASK' && (
                            <button 
                              onClick={() => handleOpenTask(e.originalId)}
                              className="p-1.5 text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                              title={t('common:actions.open', { defaultValue: 'Открыть' })}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Event Form */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-green" />
                  {editingEventId 
                    ? t('calendarWidget.editEvent', { defaultValue: 'Редактировать событие' }) 
                    : t('calendarWidget.addEvent', { defaultValue: 'Добавить событие' })}
                </h4>
                <form onSubmit={handleSaveEvent} noValidate className="space-y-4">
                  {editingEventId && (
                    <div className="flex justify-end mb-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingEventId(null);
                          setTitle('');
                          setTitleError('');
                          setDescription('');
                        }}
                        className="text-xs text-brand-green hover:underline"
                      >
                        {t('common:actions.cancel', { defaultValue: 'Отменить редактирование' })}
                      </button>
                    </div>
                  )}
                  <Input
                    label={t('calendarWidget.eventTitle', { defaultValue: 'Название события' })}
                    type="text"
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      if (titleError) setTitleError('');
                    }}
                    placeholder={t('calendarWidget.eventTitlePlaceholder', { defaultValue: 'Напр. Оплата ИПН' })}
                    error={titleError || undefined}
                  />
                  
                  <div className="grid grid-cols-2 gap-6">
                    <Input
                      label={t('calendarWidget.time', { defaultValue: 'Время' })}
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      icon={<Clock className="w-3.5 h-3.5" />}
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {t('calendarWidget.color', { defaultValue: 'Цвет метки' })}</label>
                      <select
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-full text-base font-medium border border-gray-200 bg-gray-50 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all outline-none appearance-none"
                      >
                        {COLORS.map(c => (
                          <option key={c.value} value={c.value}>{t(`calendarWidget.colors.${c.value}`, { defaultValue: c.label })}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1 flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> {t('calendarWidget.description', { defaultValue: 'Описание' })}</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={t('calendarWidget.descriptionPlaceholder', { defaultValue: 'Дополнительное описание (опционально)...' })}
                      className="w-full text-base border border-gray-200 bg-gray-50 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green min-h-[100px] resize-none transition-all outline-none placeholder-gray-400"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving || !title.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-brand-green text-white py-2.5 rounded-xl font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <Spinner className="w-4 h-4" /> : t('calendarWidget.save', { defaultValue: 'Сохранить' })}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
