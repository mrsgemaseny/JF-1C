import type { TaskDto, UserDto } from '../model/types';

export function useTaskActions(task: TaskDto, currentUser: UserDto) {
  const isUnassigned = !task.assignedToId && !task.assignedTo;
  const isAssignedToMe = task.assignedTo?.id === currentUser.id || task.assignedToId === currentUser.id;
  const isAdmin = currentUser.role === 'ADMIN';
  const isEmployee = currentUser.role === 'EMPLOYEE';

  const isClosed = task.stage?.type === 'WON' || task.stage?.type === 'LOST';
  const canAssign = isAdmin && !isClosed; // Only admins can arbitrarily assign tasks to EMPLOYEES
  const canTake = isEmployee && isUnassigned && !isClosed; // Only Employees can take unassigned tasks
  const canDrop = isEmployee && isAssignedToMe && !isClosed; // Only Employees can drop their OWN tasks
  
  return {
    canAssign,
    canTake,
    canDrop,
    isUnassigned,
    isAssignedToMe
  };
}
