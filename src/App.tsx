import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'

import Layout from './components/Layout'
import { AuthLayout } from './components/layouts/AuthLayout'
import { AppLayout } from './components/layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

import Index from './pages/Index'
import SellerDashboard from './pages/seller/SellerDashboard'
import SellerPerformance from './pages/admin/SellerPerformance'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Products from './pages/Products'
import Settings from './pages/Settings'
import Team from './pages/Team'
import Customers from './pages/Customers'
import Campaigns from './pages/Campaigns'
import Unsubscribe from './pages/Unsubscribe'
import Calculator from './pages/Calculator'
import Catalog from './pages/Catalog'
import Finance from './pages/Finance'
import Commissions from './pages/Commissions'
import Suppliers from './pages/Suppliers'
import Purchases from './pages/Purchases'
import PreOrders from './pages/PreOrders'
import Sellers from './pages/Sellers'
import GroupBuying from './pages/GroupBuying'
import Consignments from './pages/Consignments'
import DeliveriesMap from './pages/DeliveriesMap'
import RouteHistory from './pages/RouteHistory'
import Returns from './pages/Returns'
import Automations from './pages/Automations'
import { MasterLayout } from './components/layouts/MasterLayout'
import MasterDashboard from './pages/master/MasterDashboard'
import MasterOrganizations from './pages/master/MasterOrganizations'
import MasterUsers from './pages/master/MasterUsers'
import MasterSellerPerformance from './pages/master/MasterSellerPerformance'
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
          <Route path="/unsubscribe/:customerId" element={<Unsubscribe />} />
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

            {/* Master Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route element={<MasterLayout />}>
                <Route path="/master/dashboard" element={<MasterDashboard />} />
                <Route path="/master/organizations" element={<MasterOrganizations />} />
                <Route path="/master/users" element={<MasterUsers />} />
                <Route path="/master/sellers/performance" element={<MasterSellerPerformance />} />
              </Route>
            </Route>

            {/* Authenticated App Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'member', 'seller']} />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/admin/sellers/performance" element={<SellerPerformance />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/products" element={<Products />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/team" element={<Team />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/pre-orders" element={<PreOrders />} />
              <Route path="/sellers" element={<Sellers />} />
              <Route path="/commissions" element={<Commissions />} />
              <Route path="/group-buying" element={<GroupBuying />} />
              <Route path="/consignments" element={<Consignments />} />
              <Route path="/deliveries-map" element={<DeliveriesMap />} />
              <Route path="/route-history" element={<RouteHistory />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/automations" element={<Automations />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
