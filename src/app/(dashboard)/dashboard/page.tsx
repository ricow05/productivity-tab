import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold text-gray-900 mb-10">Good day 👋</h1>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/dashboard/notes"
          className="group block border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition-colors"
        >
          <div className="text-2xl mb-3">✎</div>
          <h2 className="font-medium text-gray-900">Notes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Write and organise your thoughts</p>
        </Link>

        <Link
          href="/dashboard/tasks"
          className="group block border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition-colors"
        >
          <div className="text-2xl mb-3">✓</div>
          <h2 className="font-medium text-gray-900">Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track what needs to get done</p>
        </Link>

        <Link
          href="/dashboard/food"
          className="group block border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition-colors"
        >
          <div className="text-2xl mb-3">◎</div>
          <h2 className="font-medium text-gray-900">Food</h2>
          <p className="text-sm text-gray-500 mt-0.5">Log calories and protein</p>
        </Link>
      </div>
    </div>
  )
}
