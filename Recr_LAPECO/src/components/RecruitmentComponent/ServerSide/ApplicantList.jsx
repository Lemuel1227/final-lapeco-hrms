// src/components/RecruitmentComponent/ServerSide/ApplicantList.jsx
import React from 'react';
import './ApplicantList.css';

const ApplicantList = () => {
  const applicants = [
    { name: 'Kala Pati', email: 'atulsd@gmail.com', gender: 'Male', age: '8897562425', date: '2023/7/26', status: 'interview', interview: 'dd-mm-yyyy' },
    { name: 'Lorem', email: 'lorem123@gmail.com', gender: 'Male', age: '8897562425', date: '2023/7/26', status: 'pending', interview: 'dd-mm-yyyy' },
    { name: 'Lorem', email: 'lorem123@gmail.com', gender: 'Female', age: '8897562425', date: '2023/7/26', status: 'interview', interview: 'dd-mm-yyyy' },
    { name: 'Lorem', email: 'lorem123@gmail.com', gender: 'UI/UX', age: '8897562425', date: '2023/7/26', status: 'interview', interview: 'dd-mm-yyyy' },
    { name: 'Lorem', email: 'lorem123@gmail.com', gender: 'UI/UX', age: '8897562425', date: '2023/7/26', status: 'pending', interview: 'dd-mm-yyyy' },
    { name: 'Lorem', email: 'lorem123@gmail.com', gender: 'UI/UX', age: '8897562425', date: '2023/7/26', status: 'pending', interview: 'dd-mm-yyyy' },
  ];

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <nav className="features">
          <button className="feature-item">Dashboard</button>
          <button className="feature-item">Attendance</button>
          <button className="feature-item">Employee Data</button>
          <button className="feature-item">Positions</button>
          <button className="feature-item">Payroll</button>
          <button className="feature-item">Leave Management</button>
          <button className="feature-item active">Recruitment</button>
          <button className="feature-item">Settings</button>
          <button className="logout-button">Logout</button>
        </nav>
      </aside>
      <main className="main-content">
        <h1>Applicant List</h1>
        <div className="controls">
          <button className="application-form-button">Application Form</button>
          <select className="sort-select">
            <option value="date">Sort By</option>
            <option value="name">Name</option>
            <option value="date">Date</option>
          </select>
          <input type="text" placeholder="Search" className="search-input" />
          <button className="filter-button">Filter</button>
        </div>
        <table className="applicant-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Contact</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>Interview</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((applicant, index) => (
              <tr key={index}>
                <td>{applicant.name}</td>
                <td>{applicant.gender}</td>
                <td>{applicant.age}</td>
                <td>{applicant.email}</td>
                <td>{applicant.date}</td>
                <td>
                  <span className={`status ${applicant.status === 'interview' ? 'interview' : 'pending'}`}>
                    {applicant.status}
                  </span>
                </td>
                <td>{applicant.interview}</td>
                <td><button className="view-button">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default ApplicantList;