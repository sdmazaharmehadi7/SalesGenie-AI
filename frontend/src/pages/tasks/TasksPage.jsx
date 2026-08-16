import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ListTodo,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  Calendar,
  Trash2,
  Clock,
  Filter,
} from '@/components/ui/icons'
import {
  getTasks,
  createTask,
  toggleTaskComplete,
  deleteTask,
} from '@/services/api/tasks'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | pending | completed
  const [priorityFilter, setPriorityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  })

  const loadTasks = async () => {
    setLoading(true)
    try {
      const isCompleted =
        statusFilter === 'completed'
          ? true
          : statusFilter === 'pending'
          ? false
          : undefined

      const data = await getTasks({
        page,
        page_size: 30,
        is_completed: isCompleted,
        priority: priorityFilter || undefined,
        search,
      })
      setTasks(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [page, search, statusFilter, priorityFilter])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createTask({
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
      })
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
      })
      await loadTasks()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleToggle = async (taskId) => {
    try {
      await toggleTaskComplete(taskId)
      await loadTasks()
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId)
      await loadTasks()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <ListTodo className="size-3.5" />
              Tasks & Follow-ups
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
            Action Items & Task List
          </h1>
          <p className="text-xs text-ink-secondary">
            Keep track of follow-ups, calls, demos, and tactical CRM action items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <Plus className="size-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line-default bg-surface-default p-3 shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          <Search className="size-4 text-ink-muted ml-2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-transparent text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line-default bg-surface-subtle p-0.5">
            {['all', 'pending', 'completed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st)
                  setPage(1)
                }}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-surface-default text-brand-600 shadow-2xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-line-default bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-primary focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="size-6 animate-spin text-brand-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-line-default bg-surface-default py-16 text-center text-xs text-ink-muted shadow-xs">
            No tasks found matching current filter. Click "New Task" to create one.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start justify-between rounded-xl border p-4 shadow-2xs transition-all ${
                task.is_completed
                  ? 'border-line-default bg-surface-subtle/50 opacity-75'
                  : 'border-line-default bg-surface-default hover:border-brand-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={() => handleToggle(task.id)}
                  className={`mt-0.5 transition-colors ${
                    task.is_completed ? 'text-emerald-600' : 'text-ink-muted hover:text-brand-600'
                  }`}
                  title={task.is_completed ? 'Mark pending' : 'Mark completed'}
                >
                  <CheckCircle2 className="size-5" />
                </button>
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      task.is_completed ? 'text-ink-muted line-through' : 'text-ink-primary'
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                      {task.description}
                    </p>
                  )}
                  {task.due_date && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
                      <Clock className="size-3" />
                      <span>Due: {new Date(task.due_date).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    task.priority === 'urgent'
                      ? 'bg-rose-100 text-rose-700'
                      : task.priority === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : task.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {task.priority}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  className="rounded-lg p-1 text-ink-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-primary">Create New Task</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-muted hover:text-ink-primary"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on custom security questionnaire"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Additional context or checklist for this task..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-line-default px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
