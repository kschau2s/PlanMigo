import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppBackdrop } from "./components/AppBackdrop";
import { AppSidebar } from "./components/AppSidebar";
import { AccountPage } from "./pages/AccountPage";
import { FlightsPage } from "./pages/FlightsPage";
import { InspirationPage } from "./pages/InspirationPage";
import { MyTripsPage } from "./pages/MyTripsPage";
import { PlannerPage } from "./pages/PlannerPage";
import { TripResultPage } from "./pages/TripResultPage";

function App() {
  return (
    <BrowserRouter>
      <AppBackdrop />
      <AppSidebar />
      <main className="min-h-screen pt-[56px] md:ml-72 md:pt-0">
        <Routes>
          <Route path="/" element={<PlannerPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/trips" element={<MyTripsPage />} />
          <Route path="/trip/:tripId" element={<TripResultPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
