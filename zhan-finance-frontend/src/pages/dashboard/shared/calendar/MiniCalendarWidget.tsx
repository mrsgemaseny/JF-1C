import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, AlignLeft, Tag, Edit2 } from 'lucide-react';
import { CalendarEventDto } from '@/entities/calendar/api/calendarApi';
import { useCalendarEventsQuery, useCreateCalendarEventMutation, useDeleteCalendarEventMutation, useUpdateCalendarEventMutation } from '@/entities/calendar/api/calendarQueries';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { useAuth } from '@/features/auth/AuthContext';
import { Spinner } from '@/shared/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { formatDate, getIntlLocale } from '@/shared/lib/dateFormat';
const COLORS = [
  { value: 'BLUE', bg: 'bg-blue-100', text: 'text-blue-800' },
  { value: 'RED', bg: 'bg-red-100', text: 'text-red-800' },
  { value: 'GREEN', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'YELLOW', bg: 'bg-amber-100', text: 'text-amber-800' },
  { value: 'PURPLE', bg: 'bg-purple-100', text: 'text-purple-800' }
];

export function MiniCalendarWidget() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('common');
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${new Date(year, currentDate.getMonth() + 1, 0).getDate()}`;
  
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

  // loadEvents is no longer needed manually

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setTitle('');
    setDescription('');
    setTime('');
    setColor('BLUE');
    setEditingEventId(null);
    setIsModalOpen(true);
  };

  const currentMonthName = useMemo(() => {
    const months = t('calendarPage.months', { returnObjects: true });
    if (Array.isArray(months) && months.length === 12) {
      return months[currentDate.getMonth()];
    }
    const name = new Intl.DateTimeFormat(getIntlLocale(i18n.language), { month: 'long' }).format(currentDate);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [currentDate, i18n.language, t]);

  const dayNames = useMemo(() => {
    const days = t('calendarPage.daysShort', { returnObjects: true });
    if (Array.isArray(days) && days.length === 7) return days;
    return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  }, [t]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !title.trim()) return;
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
      setEditingEventId(null);
      setTitle('');
      setDescription('');
      setTime('');
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
    setTime(e.time || '');
    setColor(e.color || 'BLUE');
    setEditingEventId(e.id);
  };

  const handleOpenTask = (taskId: number) => {
    const rolePath = user?.role === 'ADMIN' ? 'admin' : 'employee';
    navigate(`/dashboard/${rolePath}/tasks?taskId=${taskId}`);
  };

  const handleDeleteEvent = async (eventId: string, isTask: boolean) => {
    if (isTask) return;
    try {
      const originalId = parseInt(eventId.replace('event_', ''));
      await deleteMutation.mutateAsync(originalId);
    } catch (e) {
      console.error(e);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8"></div>);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    const isToday = dateStr === todayStr;

    let cellBg = isToday ? 'border-2 border-brand-green shadow-sm' : 'hover:bg-gray-100 bg-transparent';
    let textColor = isToday ? 'text-brand-green font-bold' : 'text-gray-700';

    if (dayEvents.length > 0) {
      const primaryEvent = dayEvents.find(e => e.color === 'RED') || dayEvents[0];
      const colorObj = COLORS.find(c => c.value === primaryEvent.color) || COLORS[0];
      cellBg = `${colorObj.bg} shadow-sm`;
      if (isToday) cellBg += ' border-2 border-brand-green';
      textColor = `${colorObj.text} font-semibold`;
    }

    days.push(
      <div 
        key={d} 
        onClick={() => handleDayClick(dateStr)}
        className={`relative h-8 flex items-center justify-center rounded-md cursor-pointer transition-all ${cellBg}`}
      >
        <span className={`text-xs ${textColor}`}>{d}</span>
        {dayEvents.length === 1 && (
          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-current rounded-full" />
        )}
        {dayEvents.length > 1 && (
          <div className={`absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm z-10 ${
            dayEvents.some(e => e.color === 'RED') ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {dayEvents.length}
          </div>
        )}
      </div>
    );
  }

  const calendarLink = user?.role === 'EMPLOYEE' ? ROUTES.EMPLOYEE_CALENDAR : ROUTES.CLIENT_CALENDAR;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-green" />
            {t('calendarWidget.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('calendarWidget.currentMonth')}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-sm w-24 text-center">
            {currentMonthName} {currentDate.getFullYear()}
          </span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <Spinner className="w-6 h-6 text-brand-green" />
        </div>
      ) : (
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-[10px] font-medium text-gray-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
        <Link 
          to={calendarLink}
          className="text-sm font-medium text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1"
        >
          {t('calendarWidget.openFull')} <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Day Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">
                {t('calendarWidget.eventsOn')} {formatDate(selectedDate, i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {/* Existing Events List */}
              <div className="space-y-3 mb-8">
                {events.filter(e => e.date === selectedDate).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">
                    {t('calendarWidget.noEvents')}
                  </p>
                ) : (
                  events.filter(e => e.date === selectedDate).map(e => {
                    const colorObj = COLORS.find(c => c.value === e.color) || COLORS[0];
                    return (
                      <div key={e.id} className="group bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${colorObj.bg}`} />
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
                                className="p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors"
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
                          setDescription('');
                        }}
                        className="text-xs text-brand-green hover:underline"
                      >
                        {t('common:actions.cancel', { defaultValue: 'Отменить редактирование' })}
                      </button>
                    </div>
                  )}
                  <div>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={t('calendarWidget.eventTitlePlaceholder', { defaultValue: 'Название события (напр. Оплата ИПН)' })}
                      className="w-full text-sm font-medium border-0 border-b-2 border-gray-100 focus:border-brand-green focus:ring-0 px-0 py-2 transition-colors bg-transparent placeholder-gray-400"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        className="flex-1 text-sm border-gray-200 rounded-lg focus:ring-brand-green focus:border-brand-green"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <select
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="flex-1 text-sm border-gray-200 rounded-lg focus:ring-brand-green focus:border-brand-green"
                      >
                        {COLORS.map(c => (
                          <option key={c.value} value={c.value}>{t(`calendarWidget.colors.${c.value}`, { defaultValue: c.value })}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description Input (Optional) */}
                  <div className="flex items-start gap-3 mt-4">
                    <AlignLeft className="w-4 h-4 text-gray-400 mt-2" />
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={t('calendarWidget.descriptionPlaceholder', { defaultValue: 'Описание (необязательно)' })}
                      rows={2}
                      className="flex-1 text-sm border-gray-200 rounded-lg focus:ring-brand-green focus:border-brand-green resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || !title.trim()}
                    className="w-full mt-4 bg-brand-green hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? t('calendarWidget.saving', { defaultValue: 'Сохранение...' }) : t('calendarWidget.save', { defaultValue: 'Сохранить' })}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
