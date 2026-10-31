import { Navigate, Route, Routes } from 'react-router-dom';
import { SearchProvider } from './components/search/SearchProvider.jsx';
import SiteLayout from './layouts/SiteLayout.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Overview from './pages/Overview.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeDetail from './pages/EmployeeDetail.jsx';
import Insights from './pages/Insights.jsx';
import Trends from './pages/Trends.jsx';
import Forecast from './pages/Forecast.jsx';
import SimulationLab from './pages/SimulationLab.jsx';
import Reports from './pages/Reports.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <SearchProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Overview />} />
          <Route path="overview" element={<Navigate to="/dashboard" replace />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="insights" element={<Insights />} />
          <Route path="trends" element={<Trends />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="simulation" element={<SimulationLab />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SearchProvider>
  );
}
