// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from "react-router-dom";

// Layout con Header/Footer condivisi
import Layout from "./components/Layout";
// ❌ RIMOSSO ScrollUX - ora integrato direttamente in MobileHeaderMini
// Sistema notifiche e UX improvements
import { NotificationProvider } from "./components/NotificationSystem";
import CookieConsent from "./components/CookieConsent";
import StripeProvider from "./components/StripeProvider";
import "./styles/transitions.css";

// Pagine
import Discover from "./pages/Discover";
import Explore from "./pages/Explore";
import ExplorePost from "./pages/ExplorePost";
import SearchResults from "./pages/SearchResults";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import LiveNew from "./pages/LiveNew";
import LiveDashboard from "./pages/LiveDashboard";
import SmartLiveRouter from "./components/SmartLiveRouter";
import Sell from "./pages/Sell";
import AuthCallback from "./pages/AuthCallback";
import Seller from "./pages/Seller";
import SellerDashboard from "./pages/SellerDashboard";
import Dashboard from "./pages/Dashboard";
import SmartDashboardRouter from "./components/SmartDashboardRouter";
import UpgradeToSeller from "./components/UpgradeToSeller";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Help from "./pages/Help";
import Faq from "./pages/Faq";

// Live Studio / Schedule (protette)
import { supabase, initializeStorage } from "./lib/supabaseClient";
import "./lib/globalRole"; // ✅ Inizializza sistema ruoli globale
import DashboardSchedule from "./pages/DashboardSchedule";
import DashboardPosts from "./pages/DashboardPosts";
import DashboardStories from "./pages/DashboardStories";
import OrderCenter from "./pages/OrderCenter";
import MyOrders from "./pages/MyOrders";
import BuyerProfile from "./pages/BuyerProfile";
import AddressManager from "./pages/AddressManager";
import BuyerAccount from "./pages/BuyerAccount";
import SellerSettings from "./pages/SellerSettings";
import SellerReviews from "./pages/SellerReviews";
import AccountSettings from "./pages/AccountSettings";
import AccountCompleteProfile from "./pages/AccountCompleteProfile";
import SellerAds from "./pages/SellerAds";
import PersonalInfo from "./pages/PersonalInfo";
import NotificationSettings from "./pages/NotificationSettings";
import SellerAnalytics from "./pages/SellerAnalytics";
import SecuritySettings from "./pages/SecuritySettings";
import BoostContent from "./pages/BoostContent";
import HowBoostWorks from "./pages/HowBoostWorks";
import PaymentSettings from "./pages/PaymentSettings";
import PayoutSettings from "./pages/PayoutSettings";
import SellerShipping from "./pages/SellerShipping";
import CompleteSellerProfile from "./pages/CompleteSellerProfile";
import CompleteBuyerProfile from "./pages/CompleteBuyerProfile";
import Setup2FA from "./pages/Setup2FA";
import BecomeSellerForm from "./pages/BecomeSellerForm";
import CreatePost from "./pages/CreatePost";
import CreateStory from "./pages/CreateStory";
import LiveDemo from "./pages/LiveDemo";
import Community from "./pages/Community";

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Global Event Handler Component
function GlobalEventHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ EVENT LISTENERS for create-post and create-story
    const handleCreatePost = () => {
      console.log('🎨 Navigating to create post...');
      navigate('/create-post');
    };

    const handleCreateStory = () => {
      console.log('📖 Navigating to create story...');
      navigate('/create-story');
    };

    // ✅ LISTEN for dispatched events from MobileBottomBar
    window.addEventListener('seller:create-post', handleCreatePost);
    window.addEventListener('seller:create-story', handleCreateStory);

    return () => {
      window.removeEventListener('seller:create-post', handleCreatePost);
      window.removeEventListener('seller:create-story', handleCreateStory);
    };
  }, [navigate]);

  return null;
}

// Protected route wrapper
function ProtectedRoute({ 
  children, 
  requireAuth = false, 
  requireSeller = false, 
  requireBuyer = false 
}) {
  const [ready, setReady] = useState(!requireAuth);
  const [authed, setAuthed] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (!requireAuth) return;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthed(!!session);
        
        if (session && (requireSeller || requireBuyer)) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          
          setUserRole(profile?.role || "buyer");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthed(false);
      } finally {
        setReady(true);
      }
    };

    checkAuth();
  }, [requireAuth, requireSeller, requireBuyer]);

  if (!ready) return null;
  
  if (!authed) return null;
  
  if (requireSeller && userRole !== "seller") return null;
  
  return children;
}

export default function App() {
  // ✅ AUTO-INIZIALIZZAZIONE STORAGE BUCKETS
  useEffect(() => {
    initializeStorage();
  }, []);

  return (
    <NotificationProvider>
      <StripeProvider>
        <BrowserRouter>
          {/* ✅ GLOBAL EVENT HANDLER per create-post/story */}
          <GlobalEventHandler />
          
          {/* UI helpers globali */}
          <ScrollToTop />

          <Routes>
            {/* Live /new route - SENZA Layout per modalità fullscreen */}
            <Route path="/live" element={<LiveNew />} />
            <Route path="/live/new" element={<LiveNew />} />
            
            {/* Tutto passa dal Layout -> Header una volta sola */}
            <Route element={<Layout />}>
              {/* Home / Discover */}
              <Route index element={<Discover />} />
              <Route path="/discover" element={<Discover />} />
              {/* Alias storici */}
              <Route path="/home" element={<Navigate to="/discover" replace />} />

              {/* Feed verticale "Scorri le live" */}
              <Route path="/explore" element={<Explore />} />
              <Route path="/livefeed" element={<Explore />} /> {/* retrocompatibilità */}
              
              {/* Community Posts Explorer */}
              <Route path="/explore-posts" element={<ExplorePost />} />
              
              {/* Search Results */}
              <Route path="/search" element={<SearchResults />} />
              
              {/* Categories */}
              <Route path="/categories" element={<Categories />} />
              
              {/* Category Pages - Dynamic route for individual categories */}
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              
              {/* Community - Instagram style grid */}
              <Route path="/community" element={<Community />} />
              
              {/* ✅ CREATE POST/STORY ROUTES */}
              <Route 
                path="/create-post" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <CreatePost />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create-story" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <CreateStory />
                  </ProtectedRoute>
                } 
              />
              
              {/* Posts - Dashboard Posts per seller */}
              <Route path="/posts" element={<DashboardPosts />} />
              
              {/* Profile - Buyer Profile */}
              <Route path="/profile" element={<BuyerProfile />} />

              {/* Live room (automatic seller/buyer routing) */}
              <Route path="/live/:id" element={<SmartLiveRouter />} />
              <Route path="/live-demo/:liveId" element={<LiveDemo />} />
              <Route path="/stream/:id" element={<SmartLiveRouter />} />
              
              {/* Live Studio - Pagina principale seller */}
              <Route 
                path="/live-studio" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <Sell />
                  </ProtectedRoute>
                } 
              />
              
              {/* Live Dashboard completa per desktop */}
              <Route path="/live-dashboard/:liveId" element={<LiveDashboard />} />

              {/* Profili venditore */}
              <Route path="/seller/:handle" element={<Seller />} />
              <Route path="/seller/:handle/reviews" element={<SellerReviews />} />

              {/* Diventa Venditore */}
              <Route path="/sell" element={<BecomeSellerForm />} />
              
              {/* Dashboard generale - redirect intelligente */}
              <Route path="/dashboard" element={<SmartDashboardRouter />} />
              
              {/* Dashboard specifico per ACQUIRENTI */}
              <Route 
                path="/buyer-dashboard" 
                element={<Dashboard />} 
              />
              
              {/* Dashboard specifico per VENDITORI */}
              <Route 
                path="/seller-dashboard" 
                element={<SellerDashboard />} 
              />

              {/* Seller Dashboard Sub-Routes */}
              <Route 
                path="/seller-dashboard/schedule" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <DashboardSchedule />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller-dashboard/posts" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <DashboardPosts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller-dashboard/stories" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <DashboardStories />
                  </ProtectedRoute>
                } 
              />

              {/* Order Management */}
              <Route 
                path="/orders" 
                element={
                  <ProtectedRoute requireAuth>
                    <OrderCenter />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-orders" 
                element={
                  <ProtectedRoute requireAuth>
                    <MyOrders />
                  </ProtectedRoute>
                } 
              />

              {/* Account Management */}
              <Route 
                path="/account" 
                element={
                  <ProtectedRoute requireAuth>
                    <BuyerAccount />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/addresses" 
                element={
                  <ProtectedRoute requireAuth>
                    <AddressManager />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/settings" 
                element={
                  <ProtectedRoute requireAuth>
                    <AccountSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/complete-profile" 
                element={
                  <ProtectedRoute requireAuth>
                    <AccountCompleteProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/personal-info" 
                element={
                  <ProtectedRoute requireAuth>
                    <PersonalInfo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/notifications" 
                element={
                  <ProtectedRoute requireAuth>
                    <NotificationSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/security" 
                element={
                  <ProtectedRoute requireAuth>
                    <SecuritySettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/payments" 
                element={
                  <ProtectedRoute requireAuth>
                    <PaymentSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/2fa" 
                element={
                  <ProtectedRoute requireAuth>
                    <Setup2FA />
                  </ProtectedRoute>
                } 
              />

              {/* Seller Settings */}
              <Route 
                path="/seller/settings" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <SellerSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller/analytics" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <SellerAnalytics />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller/ads" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <SellerAds />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller/boost" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <BoostContent />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/boost/how-it-works" 
                element={<HowBoostWorks />} 
              />
              <Route 
                path="/seller/payouts" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <PayoutSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seller/shipping" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <SellerShipping />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/complete-seller-profile" 
                element={
                  <ProtectedRoute requireAuth requireSeller>
                    <CompleteSellerProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/complete-buyer-profile" 
                element={
                  <ProtectedRoute requireAuth>
                    <CompleteBuyerProfile />
                  </ProtectedRoute>
                } 
              />

              {/* Legal Pages */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/help" element={<Help />} />
              <Route path="/faq" element={<Faq />} />

              {/* Auth Callback */}
              <Route path="/auth" element={<AuthCallback />} />

              {/* Upgrade to Seller Modal */}
              <Route 
                path="/upgrade-to-seller" 
                element={
                  <ProtectedRoute requireAuth>
                    <UpgradeToSeller />
                  </ProtectedRoute>
                } 
              />

              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/discover" replace />} />
            </Route>
          </Routes>

          {/* Cookie Consent */}
          <CookieConsent />
        </BrowserRouter>
      </StripeProvider>
    </NotificationProvider>
  );
}