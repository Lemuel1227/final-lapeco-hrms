import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './NotFoundPage.css';
import Illustration from '../../assets/undraw_page-not-found_6wni.svg';

const NotFoundPageContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const inDashboard = location.pathname.startsWith('/dashboard');
  const base = inDashboard ? '/dashboard' : '/';

  return (
    <div className="not-found-container-modern">
      <div className="not-found-content">
        <img src={Illustration} alt="Page not found" className="not-found-illustration" />
        <h1 className="not-found-title">Oops! Page not found.</h1>
        <p className="not-found-message">
          The page you are looking for might have been moved, renamed, or is temporarily unavailable.
        </p>
        
        <div className="not-found-actions">
          <button className="btn btn-success" onClick={() => navigate(base)}>
            <i className="bi bi-house-door-fill me-2"></i>Go to Dashboard
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-2"></i>Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

const NotFoundPage = ({ currentUser }) => {
    const location = useLocation();
    if (currentUser && location.pathname.startsWith('/dashboard')) {
        return <NotFoundPageContent />;
    }

    return <NotFoundPageContent />;
};

export default NotFoundPage;