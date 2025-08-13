import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './bootstrap';
import '../css/app.css';
import '../css/index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import pages
import Login from './pages/Authentication/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import EmployeeDataPage from './pages/Employee-Data/EmployeeDataPage';
import PositionsPage from './pages/Positions/PositionsPage';
import AttendancePage from './pages/Attendance-Management/AttendancePage';
import ScheduleManagementPage from './pages/Schedule-Management/ScheduleManagementPage';
import ScheduleBuilderPage from './pages/Schedule-Management/ScheduleBuilderPage';
import LeaveManagementPage from './pages/Leave-Management/LeaveManagementPage';
import PayrollPage from './pages/Payroll-Management/PayrollPage';
import HolidayManagementPage from './pages/Holiday-Management/HolidayManagementPage';
import RecruitmentPage from './pages/Recruitment/RecruitmentPage';
import ReportsPage from './pages/Reports/ReportsPage';
import PerformanceManagementPage from './pages/Performance-Management/PerformanceManagementPage';
import TrainingPage from './pages/Training-And-Development/TrainingPage';
import ContributionsManagementPage from './pages/ContributionsManagement/ContributionsManagementPage';
import CaseManagementPage from './pages/CaseManagement/CaseManagementPage';
import MyLeavePage from './pages/My-Leave/MyLeavePage';
import MyAttendancePage from './pages/My-Attendance/MyAttendancePage';
import MyTeamPage from './pages/My-Team/MyTeamPage';
import AccountsPage from './pages/Accounts/AccountsPage';
import MyProfilePage from './pages/My-Profile/MyProfilePage';
import AccountSettingsPage from './pages/Account-Settings/AccountSettingsPage';

// Import layout components
import Layout from './layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';

// Create the main App component
function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* HR Personnel Routes */}
          <Route path="dashboard/employee-data" element={<EmployeeDataPage />} />
          <Route path="dashboard/positions" element={<PositionsPage />} />
          <Route path="dashboard/attendance-management" element={<AttendancePage />} />
          <Route path="dashboard/schedule-management" element={<ScheduleManagementPage />} />
          <Route path="dashboard/schedule-management/create" element={<ScheduleBuilderPage />} />
          <Route path="dashboard/leave-management" element={<LeaveManagementPage />} />
          <Route path="dashboard/payroll" element={<PayrollPage />} />
          <Route path="dashboard/holiday-management" element={<HolidayManagementPage />} />
          <Route path="dashboard/contributions-management" element={<ContributionsManagementPage />} />
          <Route path="dashboard/performance" element={<PerformanceManagementPage />} />
          <Route path="dashboard/training" element={<TrainingPage />} />
          <Route path="dashboard/case-management" element={<CaseManagementPage />} />
          <Route path="dashboard/recruitment" element={<RecruitmentPage />} />
          <Route path="dashboard/reports" element={<ReportsPage />} />
          <Route path="dashboard/my-profile" element={<MyProfilePage />} />
          <Route path="dashboard/account-settings" element={<AccountSettingsPage />} />
          <Route path="dashboard/accounts" element={<AccountsPage />} />

          {/* Team Leader Routes */}
          <Route path="dashboard/team-employees" element={<MyTeamPage />} />
          <Route path="dashboard/evaluate-team" element={<div className="p-5 text-center"><h1>Evaluate Team</h1><p>This page is under construction.</p></div>} />
          <Route path="dashboard/my-leave" element={<MyLeavePage />} />
          <Route path="dashboard/my-attendance" element={<MyAttendancePage />} />
          
          {/* Regular Employee Routes */}
          <Route path="dashboard/my-payroll" element={<div className="p-5 text-center"><h1>My Payroll</h1><p>This page is under construction.</p></div>} />
          <Route path="dashboard/evaluate-self" element={<div className="p-5 text-center"><h1>My Evaluations</h1><p>This page is under construction.</p></div>} />
        </Route>
        
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

// Render the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
