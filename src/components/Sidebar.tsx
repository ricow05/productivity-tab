'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '⊞' },
  { href: '/dashboard/food', label: 'Food', icon: '◎' },
  { href: '/dashboard/habits', label: 'Habits', icon: '◈' },
  { href: '/dashboard/study', label: 'Study', icon: '◷' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: '▦' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-gray-200">
        <span className="text-base font-semibold text-gray-900">My Workspace</span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-gray-200 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
