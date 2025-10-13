import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './PayrollPage.css';

const PayrollPage = () => {
  return (
    <div className="payroll-page-container">
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header d-flex justify-content-between align-items-center mb-4">
          <h1 className="page-main-title">Payroll Management</h1>
        </header>
        
        <ul className="nav nav-tabs payroll-nav-tabs">
          <li className="nav-item">
            <NavLink to="/dashboard/payroll/history" className="nav-link">
              <i className="bi bi-archive-fill me-2"></i>Generated Payrolls
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/dashboard/payroll/generate" className="nav-link">
              <i className="bi bi-calculator-fill me-2"></i>Payroll Generation
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/dashboard/payroll/13th-month" className="nav-link">
              <i className="bi bi-calendar-heart me-2"></i>13th Month Pay
            </NavLink>
          </li>
        </ul>
        
        <div className="payroll-tab-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;