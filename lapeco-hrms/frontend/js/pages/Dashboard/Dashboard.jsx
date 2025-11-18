import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { USER_ROLES } from '../../constants/roles';
import './Dashboard.css';

import HRDashboard from './HRDashboard';
import TeamLeaderDashboard from './TeamLeaderDashboard';
import EmployeeDashboard from './EmployeeDashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = (props) => {
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  const rawRole = props?.userRole || storedUser?.role || USER_ROLES.HR_MANAGER;
  const normalizedRole = String(rawRole || '').toUpperCase();
  const roleAliases = { HR_PERSONNEL: USER_ROLES.HR_MANAGER };
  const userRole = roleAliases[normalizedRole] || normalizedRole;

  const renderDashboardByRole = () => {
    switch (userRole) {
      case USER_ROLES.HR_MANAGER:
        return <HRDashboard {...props} userRole={userRole} />;
      case 'TEAM_LEADER':
        return <TeamLeaderDashboard {...props} userRole={userRole} />;
      case 'REGULAR_EMPLOYEE':
        return <EmployeeDashboard {...props} userRole={userRole} />;
      default:
        return <div className="p-5 text-center">Welcome! Your dashboard is being configured.</div>;
    }
  };

  return (
    <div className="dashboard-container">
      {renderDashboardByRole()}
    </div>
  );
};

export default Dashboard;