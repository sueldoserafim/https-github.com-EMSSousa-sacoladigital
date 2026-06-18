import { Outlet } from 'react-router-dom'

export default function Layout() {
  // Global layout wrapper - AuthProvider handles state, this just provides the structure
  return (
    <div className="min-h-screen font-sans text-foreground">
      <Outlet />
    </div>
  )
}
