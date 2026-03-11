import "./App.css";
import Dashboard from "./Pages/Dashboard";
import GainLoss from "./Pages/GainLoss";
import {Routes,Route} from "react-router-dom";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard/>} />
      <Route path="/gain-loss" element={<GainLoss />} />
    </Routes>
  );
}

export default App;
