import '../css/app.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './bootstrap';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import { templateAPI } from './services/api';

// Login route component to handle redirection
const LoginRoute = () => {
  return localStorage.getItem('auth_token') ? <Navigate to="/dashboard" replace /> : <Login />;
};

// Import components
import ErrorBoundary from './components/ErrorBoundary';

// Import layout, context, and components
import Layout from './layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/index.css';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Authentication/Login'));
const ForcePasswordChange = lazy(() => import('./pages/Authentication/ForcePasswordChange'));
const ForgotPassword = lazy(() => import('./pages/Authentication/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Authentication/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const EmployeeDataPage = lazy(() => import('./pages/Employee-Data/EmployeeDataPage'));
const PositionsPage = lazy(() => import('./pages/Positions/PositionsPage'));
const DepartmentsPage = lazy(() => import('./pages/Departments/DepartmentsPage'));
const AttendancePage = lazy(() => import('./pages/Attendance-Management/AttendancePage'));
const ScheduleManagementPage = lazy(() => import('./pages/Schedule-Management/ScheduleManagementPage'));
const ScheduleBuilderPage = lazy(() => import('./pages/Schedule-Management/ScheduleBuilderPage'));
const LeaveManagementPage = lazy(() => import('./pages/Leave-Management/LeaveManagementPage'));
const PayrollPage = lazy(() => import('./pages/Payroll-Management/PayrollPage'));
const PayrollHistoryPage = lazy(() => import('./pages/Payroll-Management/PayrollHistoryPage'));
const PayrollGenerationPage = lazy(() => import('./pages/Payroll-Management/PayrollGenerationPage'));
const ThirteenthMonthPage = lazy(() => import('./pages/Payroll-Management/ThirteenthMonthPage'));
const StatutoryDeductionRulesManager = lazy(() => import('./pages/Payroll-Management/StatutoryDeductionRulesManager'));
const HolidayManagementPage = lazy(() => import('./pages/Holiday-Management/HolidayManagementPage'));
const ContributionsManagementPage = lazy(() => import('./pages/Contributions-Management/ContributionsManagementPage'));
const CaseManagementPage = lazy(() => import('./pages/Case-Management/CaseManagementPage'));
const RecruitmentPage = lazy(() => import('./pages/Recruitment/RecruitmentPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const PerformanceManagementPage = lazy(() => import('./pages/Performance-Management/PerformanceManagementPage'));
const EvaluateLeaderPage = lazy(() => import('./pages/Performance-Management/EvaluateLeaderPage'));
const EvaluateTeamPage = lazy(() => import('./pages/Performance-Management/EvaluateTeamPage'));
const EvaluationFormPage = lazy(() => import('./pages/Performance-Management/EvaluationFormPage'));
const TrainingPage = lazy(() => import('./pages/Training-And-Development/TrainingPage'));
const ProgramDetailPage = lazy(() => import('./pages/Training-And-Development/ProgramDetailPage'));
const MyLeavePage = lazy(() => import('./pages/My-Leave/MyLeavePage'));
const MyAttendancePage = lazy(() => import('./pages/My-Attendance/MyAttendancePage'));
const MyTeamPage = lazy(() => import('./pages/My-Team/MyTeamPage'));
const TeamLeaderCasesPage = lazy(() => import('./pages/Dashboard/TeamLeaderCasesPage'));
const AccountsPage = lazy(() => import('./pages/Accounts/AccountsPage'));
const MyProfilePage = lazy(() => import('./pages/My-Profile/MyProfilePage'));
const AccountSettingsPage = lazy(() => import('./pages/Account-Settings/AccountSettingsPage'));
const PredictiveAnalyticsPage = lazy(() => import('./pages/Predictive-Analytics/PredictiveAnalyticsPage'));
const LeaderboardsPage = lazy(() => import('./pages/Leaderboards/LeaderboardsPage'));
const ResignationManagementPage = lazy(() => import('./pages/Resignation-Management/ResignationManagementPage'));
const MyResignationPage = lazy(() => import('./pages/My-Resignation/MyResignationPage'));
const EmailVerificationHandler = lazy(() => import('./pages/Verify-Email/EmailVerificationHandler'));
const MyCasesPage = lazy(() => import('./pages/My-Cases/MyCasesPage'));
const IncedentReport = lazy(() => import('./pages/Submit-Report/SubmitReportPage'));
const MyPayrollLayout = lazy(() => import('./pages/My-Payroll/MyPayrollLayout'));
const MyPayrollProjectionPage = lazy(() => import('./pages/My-Payroll/MyPayrollProjectionPage'));
const MyPayrollHistoryPage = lazy(() => import('./pages/My-Payroll/MyPayrollHistoryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFound/NotFoundPage'));

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

        setTemplates(Array.isArray(templatesResponse?.data) ? templatesResponse.data : (templatesResponse?.data?.data || []));
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
          <Suspense fallback={<div className="d-flex justify-content-center align-items-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>}>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginRoute />} />
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
            <Route path="dashboard/departments" element={<DepartmentsPage />} />
            <Route path="dashboard/attendance-management" element={<AttendancePage />} />
            <Route path="dashboard/schedule-management" element={<ScheduleManagementPage />} />
            <Route path="dashboard/schedule-management/create" element={<ScheduleBuilderPage />} />
            <Route path="dashboard/leave-management" element={<LeaveManagementPage />} />
            <Route path="dashboard/payroll" element={<PayrollPage />}>
              <Route index element={<Navigate to="history" replace />} />
              <Route path="history" element={<PayrollHistoryPage />} />
              <Route path="generate" element={<PayrollGenerationPage />} />
              <Route path="13th-month" element={<ThirteenthMonthPage />} />
              <Route path="deduction-rules" element={<StatutoryDeductionRulesManager />} />
            </Route>
            <Route path="dashboard/holiday-management" element={<HolidayManagementPage />} />
            <Route path="dashboard/contributions-management" element={<ContributionsManagementPage />} />
            <Route path="dashboard/performance" element={<PerformanceManagementPage />} />
            <Route path="dashboard/training" element={<TrainingPage />} />
            <Route path="dashboard/training/:programId" element={<ProgramDetailPage />} />
            <Route path="dashboard/predictive-analytics" element={<PredictiveAnalyticsPage />} />
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
            <Route path="dashboard/performance/evaluate" element={<EvaluationFormPage/>} />
            <Route path="dashboard/my-leave" element={<MyLeavePage />} />
            <Route path="dashboard/my-attendance" element={<MyAttendancePage />} />
            <Route path="dashboard/my-cases" element={<MyCasesPage />} />
            <Route path="dashboard/team-leader-cases/:caseId" element={<TeamLeaderCasesPage />} />
            <Route path="dashboard/submit-report" element={<IncedentReport />} />
            <Route path="dashboard/my-payroll/*" element={<MyPayrollLayout />}>
              <Route index element={<Navigate to="projection" replace />} />
              <Route path="projection" element={<MyPayrollProjectionPage/>} />
              <Route path="history" element={<MyPayrollHistoryPage/>} />
            </Route>            
            <Route path="dashboard/my-resignation" element={<MyResignationPage />} />
          </Route>

          {/* Catch all route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

// Render the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
