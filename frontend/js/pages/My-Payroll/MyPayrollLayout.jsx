import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './MyPayrollPage.css';

const MyPayrollLayout = ({ employees }) => {
  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">My Payroll</h1>
      </header>
      
      <ul className="nav nav-tabs payroll-nav-tabs">
        <li className="nav-item">
          <NavLink to="/dashboard/my-payroll/projection" className="nav-link">
            <i className="bi bi-graph-up me-2"></i>Live Projection
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/dashboard/my-payroll/history" className="nav-link">
            <i className="bi bi-archive-fill me-2"></i>Official History
          </NavLink>
        </li>
      </ul>
      
      <div className="payroll-tab-content">
        <Outlet context={{ employees }} /> 
      </div>
    </div>
  );
};

export default MyPayrollLayout;