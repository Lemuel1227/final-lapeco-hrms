import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'bootstrap';
import './SideBar.css';
import logo from '../assets/logo.png';
import { USER_ROLES, MODULE_ROUTES } from '../constants/roles';

const navItemsForModules = (modules = []) => {
  const base = [];
  const items = [...base];
  const labelsAdded = new Set();
  const add = (path, icon, label, exact = false) => {
    if (labelsAdded.has(label)) return;
    labelsAdded.add(label);
    items.push({ path, icon, label, exact });
  };
  const routes = {};
  const aliases = {
    employee: 'employee_data',
    leave: 'leave_management',
    schedule: 'schedules',
    attendance: 'attendance_management',
    positions: 'department_management',
    departments: 'department_management',
    payroll: 'payroll_management',
    training: 'training_and_development',
    disciplinary: 'case_management',
    resignation: 'resignation_management',
    performance: 'performance_management',
  };
  modules.forEach((m) => {
    const normalized = aliases[m] || m;
    const r = MODULE_ROUTES[normalized];
    if (Array.isArray(r)) r.forEach((p) => { routes[p] = true; });
  });
  Object.keys(routes).forEach((p) => {
    let path = p;
    if (p.startsWith('/dashboard/schedule-management')) path = '/dashboard/schedule-management';
    if (p.startsWith('/dashboard/payroll')) path = '/dashboard/payroll';
    if (path === '/dashboard') add(path, 'bi-grid-1x2-fill', 'Dashboard', true);
    else if (path.includes('leaderboards')) add(path, 'bi-bar-chart-line-fill', 'Leaderboards');
    else if (path.includes('employee-data')) add(path, 'bi-people-fill', 'Employee Data');
    else if (path.includes('departments')) add(path, 'bi-diagram-3-fill', 'Department Management');
    else if (path.includes('positions')) add(path, 'bi-diagram-3', 'Positions');
    else if (path.includes('attendance')) add(path, 'bi-calendar-check-fill', 'Attendance Management');
    else if (path.includes('schedule-management')) add(path, 'bi-calendar-range', 'Schedules');
    else if (path.includes('leave-management')) add(path, 'bi-calendar-event', 'Leave Management');
    else if (path.startsWith('/dashboard/payroll')) add(path, 'bi-cash-coin', 'Payroll');
    else if (path.includes('holiday-management')) add(path, 'bi-flag-fill', 'Holidays');
    else if (path.includes('contributions-management')) add(path, 'bi-file-earmark-ruled-fill', 'Contributions');
    else if (path === '/dashboard/performance') add(path, 'bi-graph-up-arrow', 'Performance');
    else if (path.includes('training')) add(path, 'bi-mortarboard-fill', 'Training');
    else if (path.includes('predictive-analytics')) add(path, 'bi-robot', 'Predictive Analytics');
    else if (path.includes('case-management')) add(path, 'bi-briefcase-fill', 'Case Management');
    else if (path.includes('resignation-management')) add(path, 'bi-box-arrow-left', 'Resignation Management');
    else if (path.includes('recruitment')) add(path, 'bi-person-plus-fill', 'Recruitment');
    else if (path.includes('reports')) add(path, 'bi-file-earmark-bar-graph-fill', 'Reports');
    else if (path.includes('accounts')) add(path, 'bi-shield-lock-fill', 'Accounts Management');
    else if (path.includes('team-employees')) add(path, 'bi-people-fill', 'My Team');
    else if (path.includes('/evaluate')) {
      const preferred = routes['/dashboard/evaluate-team'] ? '/dashboard/evaluate-team'
        : (routes['/dashboard/evaluate-leader'] ? '/dashboard/evaluate-leader' : path);
      add(preferred, 'bi-clipboard-check-fill', 'Submit Evaluation');
    }
    else if (path.includes('my-leave')) add(path, 'bi-calendar-plus-fill', 'My Leave');
    else if (path.includes('my-cases')) add(path, 'bi-folder-fill', 'My Cases');
    else if (path.includes('submit-report')) add(path, 'bi-flag-fill', 'Submit Incident Report');
    else if (path.includes('my-attendance')) add(path, 'bi-person-check-fill', 'My Attendance');
    else if (path.includes('my-payroll')) add(path, 'bi-wallet2', 'My Payroll');
    else if (path.includes('my-resignation')) add(path, 'bi-box-arrow-left', 'My Resignation');
    else if (path.includes('my-profile')) add(path, 'bi-person-badge', 'My Profile');
    else if (path.includes('account-settings')) add(path, 'bi-gear', 'Account Settings');
  });
  return items;
};

const navItemsConfig = {
  [USER_ROLES.SUPER_ADMIN]: [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', exact: true },
    { path: '/dashboard/leaderboards', icon: 'bi-bar-chart-line-fill', label: 'Leaderboards' }, 
    { path: '/dashboard/employee-data', icon: 'bi-people-fill', label: 'Employee Data' },
    { path: '/dashboard/departments', icon: 'bi-diagram-3-fill', label: 'Department Management' },
    { path: '/dashboard/attendance-management', icon: 'bi-calendar-check-fill', label: 'Attendance Management' },
    { path: '/dashboard/schedule-management', icon: 'bi-calendar-range', label: 'Schedules' },
    { path: '/dashboard/leave-management', icon: 'bi-calendar-event', label: 'Leave Management' },
    { path: '/dashboard/payroll/history', icon: 'bi-cash-coin', label: 'Payroll Management' },
    { path: '/dashboard/holiday-management', icon: 'bi-flag-fill', label: 'Holidays' },
    { path: '/dashboard/contributions-management', icon: 'bi-file-earmark-ruled-fill', label: 'Contributions Management' },
    { path: '/dashboard/performance', icon: 'bi-graph-up-arrow', label: 'Performance Management' },
    { path: '/dashboard/training', icon: 'bi-mortarboard-fill', label: 'Training and Development' },
    { path: '/dashboard/case-management', icon: 'bi-briefcase-fill', label: 'Case Management' },
    { path: '/dashboard/predictive-analytics', icon: 'bi-robot', label: 'Predictive Analytics' },
    { path: '/dashboard/resignation-management', icon: 'bi-box-arrow-left', label: 'Resignation Management' },
    { path: '/dashboard/recruitment', icon: 'bi-person-plus-fill', label: 'Recruitment' },
    { path: '/dashboard/accounts', icon: 'bi-shield-lock-fill', label: 'Accounts Management' },
    { path: '/dashboard/reports', icon: 'bi-file-earmark-bar-graph-fill', label: 'Reports' },
  ],
  [USER_ROLES.TEAM_LEADER]: [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', exact: true },
    { path: '/dashboard/team-employees', icon: 'bi-people-fill', label: 'My Team' },
    { path: '/dashboard/evaluate-team', icon: 'bi-clipboard-check-fill', label: 'Evaluate Team' },
    { path: '/dashboard/my-leave', icon: 'bi-calendar-plus-fill', label: 'My Leave' },
    { path: '/dashboard/my-cases', icon: 'bi-folder-fill', label: 'My Cases' },
    { path: '/dashboard/submit-report', icon: 'bi-flag-fill', label: 'Submit Incident Report' },
    { path: '/dashboard/my-attendance', icon: 'bi-person-check-fill', label: 'My Attendance' },
    { path: '/dashboard/my-payroll/projection', icon: 'bi-wallet2', label: 'My Payroll' },
    { path: '/dashboard/my-resignation', icon: 'bi-box-arrow-left', label: 'My Resignation' },
  ],
  [USER_ROLES.REGULAR_EMPLOYEE]: [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', exact: true },
    { path: '/dashboard/team-employees', icon: 'bi-people-fill', label: 'My Team' },
    { path: '/dashboard/my-leave', icon: 'bi-calendar-plus-fill', label: 'My Leave' },
    { path: '/dashboard/my-cases', icon: 'bi-folder-fill', label: 'My Cases' },
    { path: '/dashboard/submit-report', icon: 'bi-flag-fill', label: 'Submit Incident Report' },
    { path: '/dashboard/my-attendance', icon: 'bi-person-check-fill', label: 'My Attendance' },
    { path: '/dashboard/my-payroll/projection', icon: 'bi-wallet2', label: 'My Payroll' },
    { path: '/dashboard/evaluate-leader', icon: 'bi-person-video2', label: 'Evaluate Leader' },
    { path: '/dashboard/my-resignation', icon: 'bi-box-arrow-left', label: 'My Resignation' },
  ],
};

const SideBar = ({ userRole, currentUser, isCollapsed, isMobileVisible, onMobileNavItemClick }) => {
  const navItems = userRole === USER_ROLES.SUPER_ADMIN
    ? navItemsConfig[userRole] || []
    : navItemsForModules(currentUser?.position_allowed_modules || []);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!sidebarRef.current) return;

    const tooltipTriggerList = [].slice.call(sidebarRef.current.querySelectorAll('[data-bs-toggle="tooltip"]'));
    let tooltipList = [];

    if (isCollapsed) {
      tooltipList = tooltipTriggerList.map(el => new Tooltip(el, {
        placement: 'right',
        container: 'body',
        trigger: 'hover',
      }));
    }

    return () => {
      tooltipList.forEach(tooltip => tooltip.dispose());
    };
  }, [isCollapsed, navItems]);

  const navLinkClasses = 'nav-link d-flex align-items-center sidebar-link';
  const finalSidebarClass = `sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileVisible ? 'mobile-visible' : ''}`;

  return (
    <div ref={sidebarRef} className={finalSidebarClass}>
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="sidebar-logo-link">
          <img src={logo} alt="Lapeco Logo" className="sidebar-logo" />
        </NavLink>
        {isMobileVisible && (
          <button className="btn btn-link sidebar-close-btn" onClick={onMobileNavItemClick}>
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      
      </div>
      <nav className="nav flex-column sidebar-nav-scroll">
        {navItems.map((item) => (
          <div key={item.label} onClick={isMobileVisible ? onMobileNavItemClick : undefined}>
            <NavLink
              to={item.path}
              end={!!item.exact}
              className={navLinkClasses}
              title={isCollapsed ? item.label : ''}
              data-bs-toggle={isCollapsed ? 'tooltip' : ''}
            >
              <i className={`bi ${item.icon} sidebar-link-icon`}></i>
              <span className="sidebar-link-text">{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default SideBar;
