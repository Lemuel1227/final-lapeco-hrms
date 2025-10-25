import React, { useState, useEffect } from 'react';
import './ApplicationForm.css';
import logo from '../../../assets/logo.png';
import { applicantApi } from '../../../api/api';

const ApplicationForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthday: '',
    gender: 'Male', // Default to first option
    job_opening_id: '',
    resume: null,
    profile_picture: null
  });
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ success: null, message: '' });

  // Fetch positions on component mount
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await applicantApi.getPositions();
        setPositions(response.data || []);
      } catch (error) {
        console.error('Error fetching positions:', error);
        setSubmitStatus({
          success: false,
          message: 'Failed to load positions. Please refresh the page.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositions();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ success: null, message: '' }); // Clear previous messages
    
    try {
      const formDataToSend = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== '') {
          formDataToSend.append(key, value);
        }
      });
      
      await applicantApi.submitApplication(formDataToSend);
      setSubmitStatus({ 
        success: true, 
        message: 'Application submitted successfully! We will review your application and get back to you soon.' 
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      let errorMessage = 'Failed to submit application. Please try again.';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.response) {
        if (error.response.status === 422 && error.response.data?.errors) {
          const validationErrors = Object.values(error.response.data.errors).flat();
          errorMessage = validationErrors.length === 1 
            ? validationErrors[0] 
            : `Please fix the following issues: ${validationErrors.join(', ')}`;
        } else {
          errorMessage = error.response.data?.message || `Server error (${error.response.status}). Please try again later.`;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection and try again.';
      }
      
      setSubmitStatus({ 
        success: false, 
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="form-header">
          <div className="logo-container">
            <img src={logo} alt="LAPECO Logo" className="form-logo" />
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <p className="form-description">
          Thank you for your interest in joining our team! Please complete the application form
          below with accurate and up-to-date information. This will help us assess your
          qualifications and match you with the right opportunity. We look forward to learning more
          about you.
        </p>

        {submitStatus.message && (
          <div className={`submit-status ${submitStatus.success ? 'success' : 'error'}`}>
            <div className="status-content">
              <span className="status-icon">
                {submitStatus.success ? '✓' : '⚠'}
              </span>
              <span className="status-message">{submitStatus.message}</span>
            </div>
            {!submitStatus.success && (
              <button 
                type="button" 
                className="status-dismiss" 
                onClick={() => setSubmitStatus({ success: null, message: '' })}
                aria-label="Dismiss message"
              >
                ×
              </button>
            )}
          </div>
        )}
        
        <form className="application-form" onSubmit={handleSubmit}>
          {/* Name Row */}
          <div className="form-row form-name">
            <div className="form-group">
              <label>First Name *</label>
              <input 
                type="text" 
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>Middle Name</label>
              <input 
                type="text" 
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input 
                type="text" 
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required 
              />
            </div>
          </div>
          
          {/* Email */}
          <div className="form-group">
            <label>Email *</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          
          {/* Contact Number and Position Row */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Contact Number *</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="e.g. +63 912 345 6789"
              />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Position *</label>
              <select
                name="job_opening_id"
                value={formData.job_opening_id}
                onChange={handleChange}
                required
                className="form-select"
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                <option value="">Select a position</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
              {isLoading && <div className="loading-text">Loading positions...</div>}
            </div>
          </div>
          
          {/* Birthdate, Gender */}
          <div className="form-row">
            <div className="form-group">
              <label>Birthday *</label>
              <input 
                type="date" 
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>Gender *</label>
              <div className="gender-options">
                <label>
                  <input 
                    type="radio" 
                    name="gender" 
                    value="Male" 
                    checked={formData.gender === 'Male'}
                    onChange={handleChange}
                    required 
                  /> Male
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="gender" 
                    value="Female"
                    checked={formData.gender === 'Female'}
                    onChange={handleChange}
                  /> Female
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="gender" 
                    value="Other"
                    checked={formData.gender === 'Other'}
                    onChange={handleChange}
                  /> Other
                </label>
              </div>
            </div>
          </div>
          
          {/* File Uploads */}
          <div className="form-row">
            <div className="form-group">
              <label>Upload your resume *</label>
              <label className="file-upload">
                {formData.resume ? formData.resume.name : 'choose file'}
                <input 
                  type="file" 
                  name="resume"
                  accept=".pdf,.doc,.docx" 
                  onChange={handleChange}
                  required 
                />
              </label>
            </div>
            <div className="form-group">
              <label>Upload your profile picture *</label>
              <label className="file-upload">
                {formData.profile_picture ? formData.profile_picture.name : 'choose file'}
                <input 
                  type="file" 
                  name="profile_picture"
                  accept="image/*" 
                  onChange={handleChange}
                  required 
                />
              </label>
            </div>
          </div>
          
          <button 
            type="submit" 
            className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting || submitStatus.success}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : submitStatus.success ? (
              <>
                <span className="success-icon">✓</span>
                Application Sent
              </>
            ) : (
              'Send Application'
            )}
          </button>
          
          <p className="form-agreement">
            By clicking Send application, you agree to our User Agreement, Privacy Policy, and Cookie Policy.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm; 