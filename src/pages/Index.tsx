import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import PricingSection from "@/components/PricingSection";
import WhySection from "@/components/WhySection";
import ReviewsSection from "@/components/ReviewsSection";
import IntakeSection from "@/components/IntakeSection";
import FaqSection from "@/components/FaqSection";
import ContactSection from "@/components/ContactSection";
import BlogPreview from "@/components/BlogPreview";
import AppFeaturesSection from "@/components/AppFeaturesSection";
import { Navigate } from "react-router-dom";
import { isNative } from "@/lib/native";
import { useAuth } from "@/hooks/useAuth";
import AppLoading from "@/components/app/AppLoading";

const Index = () => {
  const { user, loading } = useAuth();

  // Inside the installed native app, the marketing landing page is
  // not the right entry point — send users straight into the app.
  // (Public web visitors see the regular marketing site below.)
  if (isNative()) {
    if (loading) return <AppLoading />;
    return <Navigate to={user ? "/app" : "/app/login"} replace />;
  }

  return (
    <>
    <Navbar />
    <main>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <AppFeaturesSection />
      <ReviewsSection />
      <PricingSection />
      <WhySection />
      <IntakeSection />
      <BlogPreview />
      <FaqSection />
      <ContactSection />
    </main>
    <Footer />
    </>
  );
};

export default Index;
