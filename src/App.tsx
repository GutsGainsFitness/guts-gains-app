import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { captureRefFromUrl } from "@/lib/referral";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import BrandSplash from "@/components/app/BrandSplash";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index.tsx";
import BlogPage from "./pages/BlogPage.tsx";
import BlogPostPage from "./pages/BlogPostPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import AdminBlog from "./pages/AdminBlog.tsx";
import AdminTimeSlots from "./pages/AdminTimeSlots.tsx";
import AdminClients from "./pages/admin/AdminClients.tsx";
import AdminExerciseImages from "./pages/admin/AdminExerciseImages.tsx";
import AdminExerciseMedia from "./pages/admin/AdminExerciseMedia.tsx";
import AdminInvites from "./pages/admin/AdminInvites.tsx";
import AdminCtaStats from "./pages/admin/AdminCtaStats.tsx";
import BookingPage from "./pages/BookingPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";
import AlgemeneVoorwaarden from "./pages/AlgemeneVoorwaarden.tsx";
import AccountVerwijderenPage from "./pages/AccountVerwijderenPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import UnsubscribePage from "./pages/UnsubscribePage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLogin from "./pages/app/AppLogin.tsx";
import AppResetPassword from "./pages/app/AppResetPassword.tsx";
import AppDashboard from "./pages/app/AppDashboard.tsx";
import AppSessions from "./pages/app/AppSessions.tsx";
import AppMeasurements from "./pages/app/AppMeasurements.tsx";
import AppPhotos from "./pages/app/AppPhotos.tsx";
import AppProfile from "./pages/app/AppProfile.tsx";
import AppWorkouts from "./pages/app/AppWorkouts.tsx";
import AppWorkoutDetail from "./pages/app/AppWorkoutDetail.tsx";
import AppWorkoutBuilder from "./pages/app/AppWorkoutBuilder.tsx";
import AppWorkoutSession from "./pages/app/AppWorkoutSession.tsx";
import AppIntervalTimer from "./pages/app/AppIntervalTimer.tsx";
import AppHistory from "./pages/app/AppHistory.tsx";
import AppRecords from "./pages/app/AppRecords.tsx";
import AppRank from "./pages/app/AppRank.tsx";
import AppLeaderboard from "./pages/app/AppLeaderboard.tsx";
import AppInvite from "./pages/app/AppInvite.tsx";
import AppRuns from "./pages/app/AppRuns.tsx";
import AppNativeReadiness from "./pages/app/AppNativeReadiness.tsx";

const queryClient = new QueryClient();

const App = () => {
  // Decide once per app load whether to show the launch splash. We only
  // show it when the app is launched as an installed PWA (standalone
  // display mode) AND only once per browser session, so a normal in-tab
  // refresh doesn't keep flashing the logo.
  const [showSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const seen = window.sessionStorage.getItem("gg_splash_shown");
      if (seen) return false;
      window.sessionStorage.setItem("gg_splash_shown", "1");
      return true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    captureRefFromUrl();
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        {showSplash && <BrandSplash />}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <CookieConsentBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminBlog />} />
            <Route path="/admin/tijdsloten" element={<AdminTimeSlots />} />
            <Route path="/admin/klanten" element={<ProtectedRoute requireAdmin><AdminClients /></ProtectedRoute>} />
            <Route path="/admin/oefening-illustraties" element={<ProtectedRoute requireAdmin><AdminExerciseImages /></ProtectedRoute>} />
            <Route path="/admin/oefeningen" element={<ProtectedRoute requireAdmin><AdminExerciseMedia /></ProtectedRoute>} />
            <Route path="/admin/invites" element={<ProtectedRoute requireAdmin><AdminInvites /></ProtectedRoute>} />
            <Route path="/admin/cta" element={<ProtectedRoute requireAdmin><AdminCtaStats /></ProtectedRoute>} />
            <Route path="/boeken" element={<BookingPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/algemene-voorwaarden" element={<AlgemeneVoorwaarden />} />
            <Route path="/account-verwijderen" element={<AccountVerwijderenPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />

            {/* Klant app */}
            <Route path="/app/login" element={<AppLogin />} />
            <Route path="/app/reset-password" element={<AppResetPassword />} />
            <Route path="/app" element={<ProtectedRoute><AppDashboard /></ProtectedRoute>} />
            <Route path="/app/sessies" element={<ProtectedRoute><AppSessions /></ProtectedRoute>} />
            <Route path="/app/metingen" element={<ProtectedRoute><AppMeasurements /></ProtectedRoute>} />
            <Route path="/app/fotos" element={<ProtectedRoute><AppPhotos /></ProtectedRoute>} />
            <Route path="/app/profiel" element={<ProtectedRoute><AppProfile /></ProtectedRoute>} />
            <Route path="/app/workouts" element={<ProtectedRoute><AppWorkouts /></ProtectedRoute>} />
            <Route path="/app/workouts/nieuw" element={<ProtectedRoute><AppWorkoutBuilder /></ProtectedRoute>} />
            <Route path="/app/workouts/:id" element={<ProtectedRoute><AppWorkoutDetail /></ProtectedRoute>} />
            <Route path="/app/workouts/:id/start" element={<ProtectedRoute><AppWorkoutSession /></ProtectedRoute>} />
            <Route path="/app/interval" element={<ProtectedRoute><AppIntervalTimer /></ProtectedRoute>} />
            <Route path="/app/hardlopen" element={<ProtectedRoute><AppRuns /></ProtectedRoute>} />
            <Route path="/app/historie" element={<ProtectedRoute><AppHistory /></ProtectedRoute>} />
            <Route path="/app/records" element={<ProtectedRoute><AppRecords /></ProtectedRoute>} />
            <Route path="/app/rank" element={<ProtectedRoute><AppRank /></ProtectedRoute>} />
            <Route path="/app/leaderboard" element={<ProtectedRoute><AppLeaderboard /></ProtectedRoute>} />
            <Route path="/app/invite" element={<ProtectedRoute><AppInvite /></ProtectedRoute>} />
            <Route path="/app/native-readiness" element={<ProtectedRoute><AppNativeReadiness /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  );
};

export default App;
