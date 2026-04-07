import { createClient } from '@/lib/supabase/server'

export default async function NotesPage() {
  const supabase = await createClient()

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
        <a
          href="/dashboard/notes/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New note
        </a>
      </div>

      {!notes || notes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✎</p>
          <p className="text-sm">No notes yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note: { id: string; title: string; content: string; updated_at: string }) => (
            <a
              key={note.id}
              href={`/dashboard/notes/${note.id}`}
              className="block border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
            >
              <h2 className="font-medium text-gray-900 truncate">{note.title || 'Untitled'}</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{note.content || 'No content'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(note.updated_at).toLocaleDateString()}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
