import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "pages/HomePage";
import BirdDetailPage from "pages/BirdDetailPage";
import MatchSoundPage from "pages/MatchSoundPage";
import LegalPage from "pages/LegalPage";
import CookieConsent from "staticComponents/CookieConsent";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bird/:eBird" element={<BirdDetailPage />} />
          <Route path="/match" element={<MatchSoundPage />} />
          <Route path="/legal" element={<LegalPage />} />
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
