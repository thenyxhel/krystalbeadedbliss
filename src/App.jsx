import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage             from './pages/HomePage'
import ShopPage             from './pages/ShopPage'
import ProductPage          from './pages/ProductPage'
import CustomBuilderPage    from './pages/CustomBuilderPage'
import CartPage             from './pages/CartPage'
import CheckoutPage         from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import TrackOrderPage       from './pages/TrackOrderPage'
import ComplaintPage        from './pages/ComplaintPage'

import AdminLogin     from './pages/admin/AdminLogin'
import AdminLayout    from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts  from './pages/admin/AdminProducts'
import AdminOrders    from './pages/admin/AdminOrders'
import AdminComplaints from './pages/admin/AdminComplaints'
import AdminCustomConfig from './pages/admin/AdminCustomConfig'

// Pages that show the main navbar + footer
function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
      <Route path="/product/:id" element={<MainLayout><ProductPage /></MainLayout>} />
      <Route path="/custom" element={<MainLayout><CustomBuilderPage /></MainLayout>} />
      <Route path="/cart" element={<MainLayout><CartPage /></MainLayout>} />
      <Route path="/checkout" element={<MainLayout><CheckoutPage /></MainLayout>} />
      <Route path="/order-confirmation" element={<MainLayout><OrderConfirmationPage /></MainLayout>} />
      <Route path="/track" element={<MainLayout><TrackOrderPage /></MainLayout>} />
      <Route path="/complaint" element={<MainLayout><ComplaintPage /></MainLayout>} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products"  element={<AdminProducts />} />
        <Route path="orders"    element={<AdminOrders />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="custom"    element={<AdminCustomConfig />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
