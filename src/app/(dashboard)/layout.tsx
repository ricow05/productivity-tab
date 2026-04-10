import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="flex justify-start mb-6">
          <span className="font-bold text-gray-900 text-4xl">Home</span>
        </div>
        {children}
      </main>
    </div>
  )
}
