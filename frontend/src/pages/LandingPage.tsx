import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { CTABanner } from "@/components/landing/CTABanner";
import { PartnersSection } from "@/components/landing/PartnersSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <LandingNavbar />
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <BenefitsSection />
      <HowItWorks />
      
      <CTABanner />
      <PartnersSection />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
