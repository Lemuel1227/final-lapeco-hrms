import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';
import Illustration from '../assets/images/undraw_page-not-found_6wni.svg';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <img src={Illustration} alt="Page not found" className="not-found-illustration" />
        <h1 className="not-found-title">Oops! Page not found.</h1>
        <p className="not-found-message">
          The page you are looking for might have been moved, renamed, or is temporarily unavailable.
        </p>

        <div className="not-found-actions">
          <button className="btn btn-success" onClick={() => navigate('/')}> 
            <i className="bi bi-house-door-fill me-2"></i>Go to Home
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-2"></i>Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
