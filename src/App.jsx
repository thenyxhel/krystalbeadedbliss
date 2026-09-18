import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import Icon from './components/Icon'

import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CustomBuilderPage from './pages/CustomBuilderPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import TrackOrderPage from './pages/TrackOrderPage'
import ComplaintPage from './pages/ComplaintPage'
import NotFoundPage from './pages/NotFoundPage'

// The admin panel is a separate application that happens to share a bundle.
// No shopper should ever download it, so it is split out.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints'))
const AdminCustomConfig = lazy(() => import('./pages/admin/AdminCustomConfig'))

function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center gap-2 text-ink-3">
      <Icon name="spinner" size={18} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )
}

function Storefront({ children }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  )
}

const shop = (element) => <Storefront>{element}</Storefront>

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={shop(<HomePage />)} />
          <Route path="/shop" element={shop(<ShopPage />)} />
          <Route path="/product/:handle" element={shop(<ProductPage />)} />
          <Route path="/custom" element={shop(<CustomBuilderPage />)} />
          <Route path="/cart" element={shop(<CartPage />)} />
          <Route path="/checkout" element={shop(<CheckoutPage />)} />
          <Route path="/order-confirmation" element={shop(<OrderConfirmationPage />)} />
          <Route path="/track" element={shop(<TrackOrderPage />)} />
          <Route path="/complaint" element={shop(<ComplaintPage />)} />

          {/* A plain, bookmarkable path. The protection is real authorization,
              not an unguessable URL that shipped in the bundle anyway. */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="custom" element={<AdminCustomConfig />} />
          </Route>

          {/* A real 404. Silently redirecting every typo to the home page told
              search engines the URL existed and told customers nothing. */}
          <Route path="*" element={shop(<NotFoundPage />)} />
        </Routes>
      </Suspense>
    </>
  )
}
