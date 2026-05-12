'use client';

import { useState } from 'react';
import { Check, Trash2, Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  is_done: boolean;
  is_critical: boolean;
  created_at?: string;
}

interface TaskListProps {
  initialTasks?: Task[];
  onTaskToggle?: (id: string, done: boolean) => void;
  onTaskDelete?: (id: string) => void;
  onTaskAdd?: (title: string) => void;
}

export function TaskList({ initialTasks = [], onTaskToggle, onTaskDelete, onTaskAdd }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState('');

  const handleToggle = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setTasks(tasks.map(t => t.id === id ? { ...t, is_done: !t.is_done } : t));
      onTaskToggle?.(id, !task.is_done);
    }
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    onTaskDelete?.(id);
  };

  const handleAdd = () => {
    if (newTask.trim()) {
      const id = Date.now().toString();
      const task: Task = {
        id,
        title: newTask,
        is_done: false,
        is_critical: false,
      };
      setTasks([task, ...tasks]);
      onTaskAdd?.(newTask);
      setNewTask('');
    }
  };

  const completed = tasks.filter(t => t.is_done).length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#F1F5F9]">Today's Tasks</h3>
        <div className="text-sm text-[#94A3B8]">
          {completed}/{total} ({percentage}%)
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-[#1E293B] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[#D4A043] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Task List */}
      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-[#64748B] text-sm text-center py-4">No tasks yet. Add one below!</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded transition-colors ${
                task.is_done
                  ? 'bg-[#0D1117] opacity-60'
                  : task.is_critical
                  ? 'bg-red/10 border-l-2 border-red'
                  : 'hover:bg-[#161D2A]'
              }`}
            >
              <button
                onClick={() => handleToggle(task.id)}
                className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  task.is_done
                    ? 'bg-[#10B981] border-[#10B981]'
                    : task.is_critical
                    ? 'border-red hover:bg-red/10'
                    : 'border-[#374151] hover:border-[#D4A043]'
                }`}
              >
                {task.is_done && <Check size={16} className="text-[#07090F]" />}
              </button>
              <span className={`flex-1 text-sm ${task.is_done ? 'line-through text-[#64748B]' : 'text-[#F1F5F9]'}`}>
                {task.title}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="flex-shrink-0 text-[#64748B] hover:text-red transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Task */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a new task..."
          className="flex-1 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add
        </button>
      </div>
    </div>
  );
}
