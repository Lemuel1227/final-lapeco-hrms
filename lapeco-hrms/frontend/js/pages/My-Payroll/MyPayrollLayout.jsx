import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import './MyPayrollPage.css';

const MyPayrollLayout = () => {
  const context = useOutletContext();

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
        {/* Render Outlet to display child routes, passing down the context it received */}
        <Outlet context={context} /> 
      </div>
    </div>
  );
};

export default MyPayrollLayout;