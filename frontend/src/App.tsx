import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CrisisProvider } from "@/contexts/CrisisContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage";
import AuthPage from "./pages/AuthPage";
import RecommendPage from "./pages/RecommendPage";
import CropDetailPage from "./pages/CropDetailPage";
import CalendarPage from "./pages/CalendarPage";
import MyCropsPage from "./pages/MyCropsPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import LeafyPage from "./pages/LeafyPage";
import LandingPage from "./pages/LandingPage";
import CropLogDetailPage from "./pages/CropLogDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProfileProvider>
      <CrisisProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/recommend" element={<ProtectedRoute><RecommendPage /></ProtectedRoute>} />
              <Route path="/recommend/:cropId" element={<ProtectedRoute><CropDetailPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/my-crops" element={<ProtectedRoute><MyCropsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
              <Route path="/crops/:logId" element={<ProtectedRoute><CropLogDetailPage /></ProtectedRoute>} />
              <Route path="/leafy" element={<ProtectedRoute><LeafyPage /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CrisisProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
