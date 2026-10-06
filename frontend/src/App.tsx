import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppBackdrop } from "./components/AppBackdrop";
import { MyTripsPage } from "./pages/MyTripsPage";
import { PlannerPage } from "./pages/PlannerPage";
import { TripResultPage } from "./pages/TripResultPage";

function App() {
  return (
    <BrowserRouter>
      <AppBackdrop />
      <Routes>
        <Route path="/" element={<PlannerPage />} />
        <Route path="/trips" element={<MyTripsPage />} />
        <Route path="/trip/:tripId" element={<TripResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
