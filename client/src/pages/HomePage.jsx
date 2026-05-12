import HeroSection from "../components/HeroSection";
import ArchitectureSection from "../components/ArchitectureSection";
import LandingStorySections from "../components/LandingStorySections";
import ClinicalIntelligenceFeatures from "../components/ClinicalIntelligenceFeatures";
import FinalCTASection from "../components/FinalCTASection";

const HomePage = () => {
  return (
    <div>
      <HeroSection />
      <div className="mt-20 lg:mt-24">
        <ArchitectureSection />
      </div>
      <ClinicalIntelligenceFeatures />
      <LandingStorySections />
      <FinalCTASection />
    </div>
  );
};

export default HomePage;