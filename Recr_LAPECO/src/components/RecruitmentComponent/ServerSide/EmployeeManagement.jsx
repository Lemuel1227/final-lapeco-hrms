import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../../api/api';
import './EmployeeManagement.css';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getEmployees();
      setEmployees(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch employees');
      console.error('Error fetching employees:', err);      
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e) => {
    // Fallback to a default avatar if image fails to load
    e.target.src = '/src/assets/default-avatar.svg';
    e.target.onerror = null; // Prevent infinite loop
  };

  const getImageSrc = (employee) => {
    // Try profile_picture_url first, then construct from image_url
    if (employee.profile_picture_url) {
      return employee.profile_picture_url;
    } else if (employee.image_url) {
      // Construct full URL if only relative path is provided
      return `http://localhost:8000/storage/${employee.image_url}`;
    }
    return '/src/assets/default-avatar.svg';
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-container">
        <aside className="sidebar">
          <nav className="features">
            <button className="feature-item">Dashboard</button>
            <button className="feature-item">Attendance</button>
            <button className="feature-item active">Employee Data</button>
            <button className="feature-item">Positions</button>
            <button className="feature-item">Payroll</button>
            <button className="feature-item">Leave Management</button>
            <button className="feature-item">Recruitment</button>
            <button className="feature-item">Settings</button>
            <button className="logout-button">Logout</button>
          </nav>
        </aside>
        <main className="main-content">
          <div className="loading">Loading employees...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <nav className="features">
          <button className="feature-item">Dashboard</button>
          <button className="feature-item">Attendance</button>
          <button className="feature-item active">Employee Data</button>
          <button className="feature-item">Positions</button>
          <button className="feature-item">Payroll</button>
          <button className="feature-item">Leave Management</button>
          <button className="feature-item">Recruitment</button>
          <button className="feature-item">Settings</button>
          <button className="logout-button">Logout</button>
        </nav>
      </aside>
      <main className="main-content">
        <h1>Employee Management</h1>
        {error && <div className="error-message">{error}</div>}
        <div className="controls">
          <input 
            type="text" 
            placeholder="Search employees..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="filter-button">Filter</button>
          <button className="add-employee-button">Add Employee</button>
        </div>
        <div className="employee-grid">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="employee-card">
              <div className="employee-image-container">
                <img 
                  src={getImageSrc(employee)}
                  alt={`${employee.name}'s profile`}
                  className="employee-image"
                  onError={handleImageError}
                />
              </div>
              <div className="employee-info">
                <h3 className="employee-name">{employee.name}</h3>
                <p className="employee-position">{employee.position}</p>
                <p className="employee-email">{employee.email}</p>
                <p className="employee-joining">Joined: {new Date(employee.joining_date).toLocaleDateString()}</p>
                <div className="employee-status">
                  <span className={`status-badge ${employee.status.toLowerCase()}`}>
                    {employee.status}
                  </span>
                  <span className={`attendance-badge ${employee.attendance_status.toLowerCase()}`}>
                    {employee.attendance_status}
                  </span>
                </div>
                <div className="employee-actions">
                  <button className="view-button">View</button>
                  <button className="edit-button">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredEmployees.length === 0 && !loading && (
          <div className="no-employees">No employees found.</div>
        )}
      </main>
    </div>
  );
};

export default EmployeeManagement;
