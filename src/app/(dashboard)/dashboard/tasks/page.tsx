import { createClient } from '@/lib/supabase/server'

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <a
          href="/dashboard/tasks/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New task
        </a>
      </div>

      {!tasks || tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm">No tasks yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {tasks.map((task: { id: string; title: string; completed: boolean; created_at: string }) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl"
            >
              <span
                className={`text-base ${task.completed ? 'text-green-500' : 'text-gray-300'}`}
              >
                {task.completed ? '✓' : '○'}
              </span>
              <span
                className={`flex-1 text-sm ${
                  task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                }`}
              >
                {task.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
