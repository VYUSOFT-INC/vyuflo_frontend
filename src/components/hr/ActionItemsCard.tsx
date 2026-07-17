// src/components/hr/ActionItemsCard.tsx
//
// Drop-in replacement for the mock ActionItemsCard in HRCaseDetail.tsx.
// Wires to GET/PATCH /hr/cases/:id/tasks via useHRTasks hook.
//
// Usage in HRCaseDetail.tsx:
//   import ActionItemsCard from '../../components/hr/ActionItemsCard';
//   ...
//   {activeTab === 'overview' && (
//     ...
//     <ActionItemsCard applicationId={applicationId ?? ''} />
//   )}

import { useState } from 'react';
import { CheckSquare, Check, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { useHRTasks } from '../../hooks/hr/useHRTasks';
import type { HRTaskResponse, HRTaskPriority } from '../../types/hr/task.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const P_COLOR: Record<HRTaskPriority, string> = {
  critical: '#dc2626', high: '#c2410c', medium: '#a16207', low: '#15803d',
};
const P_BG: Record<HRTaskPriority, string> = {
  critical: '#fee2e2', high: '#ffedd5', medium: '#fef9c3', low: '#dcfce7',
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD TASK DRAWER (inline, no modal)
// ─────────────────────────────────────────────────────────────────────────────

function AddTaskForm({ onAdd, onCancel }: {
  onAdd: (name: string, priority: HRTaskPriority, description?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name,     setName]    = useState('');
  const [priority, setPriority]= useState<HRTaskPriority>('medium');
  const [desc,     setDesc]    = useState('');
  const [busy,     setBusy]    = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await onAdd(name.trim(), priority, desc.trim() || undefined); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-[10px] p-[14px] mt-[8px]">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Task name..."
        className="w-full h-[38px] border border-[#d1d5db] rounded-[7px] px-[10px] text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-[8px]"
      />
      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)..."
        className="w-full h-[36px] border border-[#d1d5db] rounded-[7px] px-[10px] text-[12px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-[8px]"
      />
      <div className="flex items-center gap-[6px] mb-[10px]">
        {(['critical','high','medium','low'] as HRTaskPriority[]).map(p => (
          <button key={p} onClick={() => setPriority(p)}
            className={`px-[8px] py-[3px] rounded-full text-[11px] font-semibold border transition ${
              priority === p ? 'border-transparent' : 'border-[#e5e7eb] bg-white text-[#64748b]'
            }`}
            style={priority === p ? { backgroundColor: P_BG[p], color: P_COLOR[p] } : {}}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-[8px]">
        <button onClick={() => void submit()} disabled={!name.trim() || busy}
          className="h-[32px] px-[14px] rounded-[7px] text-white text-[12px] font-semibold disabled:opacity-50"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          {busy ? 'Adding...' : 'Add Task'}
        </button>
        <button onClick={onCancel} className="size-[32px] rounded-[7px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-white">
          <X size={13}/>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK ROW
// ─────────────────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, isLast }: {
  task: HRTaskResponse;
  onToggle: () => void;
  onDelete?: () => void;
  isLast: boolean;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(); } finally { setToggling(false); }
  };

  return (
    <div className={`flex items-start gap-[12px] py-[14px] ${!isLast ? 'border-b border-[#f8fafc]' : ''} ${task.is_completed ? 'opacity-60' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={() => void handleToggle()}
        disabled={toggling}
        className={`size-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[2px] transition ${
          task.is_completed
            ? 'bg-indigo-600 border-indigo-600'
            : 'border-[#d1d5db] hover:border-indigo-400'
        } ${toggling ? 'opacity-60' : ''}`}>
        {task.is_completed && <Check size={12} className="text-white"/>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-[8px] mb-[2px]">
          <p className={`text-[14px] font-semibold ${task.is_completed ? 'line-through text-[#9ca3af]' : 'text-[#111827]'}`}>
            {task.task_name}
          </p>
          {task.is_completed ? (
            <span className="px-[8px] py-[2px] rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-semibold shrink-0">
              Completed
            </span>
          ) : (
            <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold shrink-0"
                  style={{ backgroundColor: P_BG[task.priority as HRTaskPriority] ?? '#f1f5f9',
                           color: P_COLOR[task.priority as HRTaskPriority] ?? '#475569' }}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-[12px] text-[#64748b]">{task.description}</p>
        )}
        {task.is_completed && task.completed_at && (
          <p className="text-[11px] text-[#94a3b8] mt-[2px]">
            Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {task.is_required && (
          <span className="inline-block mt-[3px] text-[10px] text-[#94a3b8]">Required</span>
        )}
      </div>

      {/* Delete (custom tasks only) */}
      {!task.is_required && onDelete && (
        <button onClick={onDelete}
          className="size-[24px] rounded-[6px] flex items-center justify-center text-[#94a3b8] hover:bg-[#fee2e2] hover:text-[#dc2626] shrink-0 mt-[1px] transition">
          <Trash2 size={12}/>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface ActionItemsCardProps {
  applicationId: string;
  onError?: (msg: string) => void;
}

export default function ActionItemsCard({ applicationId, onError }: ActionItemsCardProps) {
  const { tasks, loading, error, toggle, addTask, deleteTask, completedCount, totalCount } = useHRTasks(applicationId);
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = async (name: string, priority: HRTaskPriority, description?: string) => {
    try {
      await addTask({ task_name: name, description, is_required: false, sort_order: 99, priority });
      setShowAdd(false);
    } catch {
      onError?.('Failed to add task. Please try again.');
    }
  };

  const handleToggle = async (task: HRTaskResponse) => {
    try {
      await toggle(task.id, !task.is_completed);
    } catch {
      onError?.('Failed to update task.');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch {
      onError?.('Failed to delete task.');
    }
  };

  const incomplete = tasks.filter(t => !t.is_completed);
  const complete   = tasks.filter(t => t.is_completed);
  const allTasks   = [...incomplete, ...complete];

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="px-[22px] py-[16px] border-b border-[#f8fafc] flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#0f172a] flex items-center gap-[8px]">
          <CheckSquare size={15}/>
          Action Items
          {!loading && totalCount > 0 && (
            <span className="text-[13px] font-normal text-[#64748b]">
              {completedCount}/{totalCount} done
            </span>
          )}
          {!loading && incomplete.length > 0 && (
            <span className="px-[8px] py-[1px] rounded-full bg-[#fee2e2] text-[#dc2626] text-[11px] font-semibold">
              {incomplete.length} pending
            </span>
          )}
        </h2>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-[5px] h-[30px] px-[10px] rounded-[7px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] transition">
          <Plus size={12}/> Add Task
        </button>
      </div>

      {/* Body */}
      <div className="px-[22px] py-[4px]">
        {loading ? (
          <div className="py-[24px] flex flex-col gap-[10px]">
            {[0,1,2].map(i => <div key={i} className="h-[60px] bg-[#f8fafc] rounded-[8px] animate-pulse"/>)}
          </div>
        ) : error ? (
          <div className="py-[16px] flex items-center gap-[8px] text-[#dc2626]">
            <AlertCircle size={14}/> <span className="text-[13px]">{error}</span>
          </div>
        ) : allTasks.length === 0 ? (
          <div className="py-[24px] text-center text-[13px] text-[#94a3b8]">
            No tasks yet — click "Add Task" to create a custom checklist item.
          </div>
        ) : (
          allTasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => void handleToggle(task)}
              onDelete={!task.is_required ? () => void handleDelete(task.id) : undefined}
              isLast={i === allTasks.length - 1}
            />
          ))
        )}

        {showAdd && (
          <AddTaskForm onAdd={handleAdd} onCancel={() => setShowAdd(false)}/>
        )}
      </div>

      {/* Progress footer */}
      {!loading && totalCount > 0 && (
        <div className="px-[22px] pb-[14px] pt-[8px] border-t border-[#f8fafc]">
          <div className="flex items-center justify-between mb-[5px]">
            <span className="text-[11px] text-[#64748b]">Checklist progress</span>
            <span className="text-[11px] font-semibold text-[#374151]">{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-[4px] bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 bg-indigo-600"
                 style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}/>
          </div>
        </div>
      )}
    </div>
  );
}