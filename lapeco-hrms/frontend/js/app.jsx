import '../css/app.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './bootstrap';

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import components


// Import pages
import Login from './pages/Authentication/Login';
import ForcePasswordChange from './pages/Authentication/ForcePasswordChange';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import ResetPassword from './pages/Authentication/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import EmployeeDataPage from './pages/Employee-Data/EmployeeDataPage';
import PositionsPage from './pages/Positions/PositionsPage';
import AttendancePage from './pages/Attendance-Management/AttendancePage';
import ScheduleManagementPage from './pages/Schedule-Management/ScheduleManagementPage';
import ScheduleBuilderPage from './pages/Schedule-Management/ScheduleBuilderPage';
import LeaveManagementPage from './pages/Leave-Management/LeaveManagementPage';
import PayrollPage from './pages/Payroll-Management/PayrollPage';
import PayrollHistoryPage from './pages/Payroll-Management/PayrollHistoryPage';
import PayrollGenerationPage from './pages/Payroll-Management/PayrollGenerationPage';
import HolidayManagementPage from './pages/Holiday-Management/HolidayManagementPage';
import RecruitmentPage from './pages/Recruitment/RecruitmentPage';
import ReportsPage from './pages/Reports/ReportsPage';
import PerformanceManagementPage from './pages/Performance-Management/PerformanceManagementPage';
import TrainingPage from './pages/Training-And-Development/TrainingPage';
import ProgramDetailPage from './pages/Training-And-Development/ProgramDetailPage';
import ContributionsManagementPage from './pages/Contributions-Management/ContributionsManagementPage';
import CaseManagementPage from './pages/Case-Management/CaseManagementPage';
import MyLeavePage from './pages/My-Leave/MyLeavePage';
import MyAttendancePage from './pages/My-Attendance/MyAttendancePage';
import MyTeamPage from './pages/My-Team/MyTeamPage';
import AccountsPage from './pages/Accounts/AccountsPage';
import MyProfilePage from './pages/My-Profile/MyProfilePage';
import AccountSettingsPage from './pages/Account-Settings/AccountSettingsPage';
import PredictiveAnalyticsPage from './pages/Predictive-Analytics/PredictiveAnalyticsPage';
import LeaderboardsPage from './pages/Leaderboards/LeaderboardsPage';
import ResignationManagementPage from './pages/Resignation-Management/ResignationManagementPage';
import MyResignationPage from './pages/My-Resignation/MyResignationPage';
import EmailVerificationHandler from './pages/Verify-Email/EmailVerificationHandler';
import ErrorBoundary from './components/ErrorBoundary';
import MyCasesPage from './pages/My-Cases/MyCasesPage';
import IncedentReport from './pages/Submit-Report/SubmitReportPage';
import NotFoundPage from './pages/NotFound/NotFoundPage';
import ThirteenthMonthPage from './pages/Payroll-Management/ThirteenthMonthPage';
import MyPayrollProjectionPage from './pages/My-Payroll/MyPayrollProjectionPage';
import MyPayrollHistoryPage from './pages/My-Payroll/MyPayrollHistoryPage';
import MyPayrollLayout from './pages/My-Payroll/MyPayrollLayout';
import EvaluateLeaderPage from './pages/Performance-Management/EvaluateLeaderPage';
import EvaluateTeamPage from './pages/Performance-Management/EvaluateTeamPage';

// Import layout, context, and components
import Layout from './layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/index.css';
// Create the main App component
function App() {
  const [templates, setTemplates] = useState([]);

  // Load initial data only if authenticated
  useEffect(() => {
    const loadData = async () => {
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return; // Don't load data if not authenticated
      }
      
      try {
        const templatesResponse = await templateAPI.getAll();

        setTemplates(templatesResponse.data || []);
      } catch (error) {
        // If API calls fail due to authentication, clear the token
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
      }
    };
    loadData();
  }, []);
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/force-password-change" element={<ForcePasswordChange />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<EmailVerificationHandler />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* HR Personnel Routes */}
            <Route path="dashboard/employee-data" element={<EmployeeDataPage />} />
            <Route path="dashboard/leaderboards" element={<LeaderboardsPage />} />
            <Route path="dashboard/positions" element={<PositionsPage />} />
            <Route path="dashboard/attendance-management" element={<AttendancePage />} />
            <Route path="dashboard/schedule-management" element={<ScheduleManagementPage />} />
            <Route path="dashboard/schedule-management/create" element={<ScheduleBuilderPage />} />
            <Route path="dashboard/leave-management" element={<LeaveManagementPage />} />
            <Route path="dashboard/payroll" element={<PayrollPage />}>
              <Route index element={<Navigate to="history" replace />} />
              <Route path="history" element={<PayrollHistoryPage />} />
              <Route path="generate" element={<PayrollGenerationPage />} />
              <Route path="13th-month" element={<ThirteenthMonthPage />} />
            </Route>
            <Route path="dashboard/holiday-management" element={<HolidayManagementPage />} />
            <Route path="dashboard/contributions-management" element={<ContributionsManagementPage />} />
            <Route path="dashboard/performance" element={<PerformanceManagementPage />} />
            <Route path="dashboard/training" element={<TrainingPage />} />
            <Route path="dashboard/training/:programId" element={<ProgramDetailPage />} />
            <Route path="dashboard/case-management" element={<CaseManagementPage />} />
            <Route path="dashboard/resignation-management" element={<ResignationManagementPage />} />
            <Route path="dashboard/recruitment" element={<RecruitmentPage />} />
            <Route path="dashboard/reports" element={<ReportsPage />} />
            <Route path="dashboard/my-profile" element={<MyProfilePage />} />
            <Route path="dashboard/account-settings" element={<AccountSettingsPage />} />
            <Route path="dashboard/accounts" element={<AccountsPage />} />

            {/* Team Leader & Regular Employee Routes */}
            <Route path="dashboard/team-employees" element={<MyTeamPage />} />
            <Route path="dashboard/evaluate-team" element={<EvaluateTeamPage />} />
            <Route path="dashboard/evaluate-leader" element={<EvaluateLeaderPage />} />
            <Route path="dashboard/my-leave" element={<MyLeavePage />} />
            <Route path="dashboard/my-attendance" element={<MyAttendancePage />} />
            <Route path="dashboard/my-cases" element={<MyCasesPage />} />
            <Route path="dashboard/submit-report" element={<IncedentReport />} />
            <Route path="my-payroll/*" element={<MyPayrollLayout />}>
              <Route index element={<Navigate to="projection" replace />} />
              <Route path="projection" element={<MyPayrollProjectionPage/>} />
              <Route path="history" element={<MyPayrollHistoryPage/>} />
            </Route>            
            <Route path="dashboard/my-resignation" element={<MyResignationPage />} />
          </Route>

          {/* Catch all route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Render the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
