import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'

import Layout from './components/Layout'
import { AuthLayout } from './components/layouts/AuthLayout'
import { AppLayout } from './components/layouts/AppLayout'

import Index from './pages/Index'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Team from './pages/Team'
import NotFound from './pages/NotFound'

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />

            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            {/* Authenticated App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/team" element={<Team />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
