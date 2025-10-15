import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'bootstrap';
import './SideBar.css';
import logo from '../assets/logo.png';
import { USER_ROLES } from '../constants/roles';

const navItemsConfig = {
  [USER_ROLES.HR_PERSONNEL]: [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', exact: true },
    { path: '/dashboard/leaderboards', icon: 'bi-bar-chart-line-fill', label: 'Leaderboards' }, 
    { path: '/dashboard/employee-data', icon: 'bi-people-fill', label: 'Employee Data' },
    { path: '/dashboard/positions', icon: 'bi-diagram-3-fill', label: 'Positions' },
    { path: '/dashboard/attendance-management', icon: 'bi-calendar-check-fill', label: 'Attendance' },
    { path: '/dashboard/schedule-management', icon: 'bi-calendar-range', label: 'Schedules' },
    { path: '/dashboard/leave-management', icon: 'bi-calendar-event', label: 'Leave' },
    { path: '/dashboard/payroll/history', icon: 'bi-cash-coin', label: 'Payroll' },
    { path: '/dashboard/holiday-management', icon: 'bi-flag-fill', label: 'Holidays' },
    { path: '/dashboard/contributions-management', icon: 'bi-file-earmark-ruled-fill', label: 'Contributions' },
    { path: '/dashboard/performance', icon: 'bi-graph-up-arrow', label: 'Performance' },
    { path: '/dashboard/training', icon: 'bi-mortarboard-fill', label: 'Training' },
    { path: '/dashboard/case-management', icon: 'bi-briefcase-fill', label: 'Cases' },
    { path: '/dashboard/resignation-management', icon: 'bi-box-arrow-left', label: 'Resignation Management' },
    { path: '/dashboard/recruitment', icon: 'bi-person-plus-fill', label: 'Recruitment' },
    { path: '/dashboard/accounts', icon: 'bi-shield-lock-fill', label: 'Accounts' },
    { path: '/dashboard/reports', icon: 'bi-file-earmark-bar-graph-fill', label: 'Reports' },
  ],
  [USER_ROLES.TEAM_LEADER]: [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', exact: true },
    { path: '/dashboard/team-employees', icon: 'bi-people-fill', label: 'My Team' },
    { path: '/dashboard/evaluate-team', icon: 'bi-clipboard-check-fill', label: 'Evaluate Team' },
    { path: '/dashboard/my-leave', icon: 'bi-calendar-plus-fill', label: 'My Leave' },
    { path: '/dashboard/my-attendance', icon: 'bi-person-check-fill', label: 'My Attendance' },
    { path: '/dashboard/my-payroll/projection', icon: 'bi-wallet2', label: 'My Payroll' },
    { path: '/dashboard/my-resignation', icon: 'bi-box-arrow-left', label: 'My Resignation' },
  ],
  [USER_ROLES.REGULAR_EMPLOYEE]: [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', exact: true },
    { path: '/dashboard/team-employees', icon: 'bi-people-fill', label: 'My Team' },
    { path: '/dashboard/my-leave', icon: 'bi-calendar-plus-fill', label: 'My Leave' },
    { path: '/dashboard/my-attendance', icon: 'bi-person-check-fill', label: 'My Attendance' },
    { path: '/dashboard/my-payroll/projection', icon: 'bi-wallet2', label: 'My Payroll' },
    { path: '/dashboard/evaluate-leader', icon: 'bi-person-video2', label: 'Evaluate Leader' },
    { path: '/dashboard/my-resignation', icon: 'bi-box-arrow-left', label: 'My Resignation' },
  ],
};

const SideBar = ({ userRole, isCollapsed, isMobileVisible, onMobileNavItemClick }) => {
  const navItems = navItemsConfig[userRole] || [];
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