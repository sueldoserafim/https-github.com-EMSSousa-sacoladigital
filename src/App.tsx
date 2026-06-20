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
import Orders from './pages/Orders'
import Products from './pages/Products'
import Settings from './pages/Settings'
import Team from './pages/Team'
import Customers from './pages/Customers'
import Calculator from './pages/Calculator'
import Catalog from './pages/Catalog'
import Finance from './pages/Finance'
import Suppliers from './pages/Suppliers'
import Purchases from './pages/Purchases'
import PreOrders from './pages/PreOrders'
import StorefrontLayout from './pages/storefront/StorefrontLayout'
import StorefrontIndex from './pages/storefront/StorefrontIndex'
import StorefrontProduct from './pages/storefront/StorefrontProduct'
import StorefrontSuccess from './pages/storefront/StorefrontSuccess'
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
            <Route path="/vitrine/:slug" element={<StorefrontLayout />}>
              <Route index element={<StorefrontIndex />} />
              <Route path="p/:productId" element={<StorefrontProduct />} />
              <Route path="success" element={<StorefrontSuccess />} />
            </Route>

            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            {/* Authenticated App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/products" element={<Products />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/team" element={<Team />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/pre-orders" element={<PreOrders />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
