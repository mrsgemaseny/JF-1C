import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent, CalendarEventDto, CalendarEventCreateRequest } from './calendarApi';

export const calendarKeys = {
  all: ['calendar'] as const,
  lists: () => [...calendarKeys.all, 'list'] as const,
  list: (filters: { startDate: string; endDate: string }) => [...calendarKeys.lists(), filters] as const,
};

export const useCalendarEventsQuery = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: calendarKeys.list({ startDate, endDate }),
    queryFn: () => getCalendarEvents(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCalendarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CalendarEventCreateRequest) => createCalendarEvent(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.lists() });
    },
  });
};

export const useUpdateCalendarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: CalendarEventCreateRequest }) => updateCalendarEvent(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.lists() });
    },
  });
};

export const useDeleteCalendarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCalendarEvent(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: calendarKeys.lists() });

      // Optimistically update caches
      const queries = queryClient.getQueriesData<CalendarEventDto[]>({ queryKey: calendarKeys.lists() });
      
      queries.forEach(([queryKey, old]) => {
        if (old) {
          queryClient.setQueryData(
            queryKey,
            old.filter((e) => e.originalId !== deletedId)
          );
        }
      });

      return { queries };
    },
    onError: (_err, _deletedId, context) => {
      // Rollback on error
      if (context?.queries) {
        context.queries.forEach(([queryKey, old]) => {
          queryClient.setQueryData(queryKey, old);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.lists() });
    },
  });
};
