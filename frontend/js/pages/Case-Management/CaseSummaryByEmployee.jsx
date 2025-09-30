import React, { useState, useMemo } from 'react';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const CaseSummaryByEmployee = ({ employees, cases, onViewEmployeeCases }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'totalCases', direction: 'descending' });

  const processedData = useMemo(() => {
    return employees.map(emp => {
      const employeeCases = cases.filter(c => c.employeeId === emp.id);
      if (employeeCases.length === 0) return null;

      const lastIncidentDate = employeeCases.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))[0].issueDate;
      
      return {
        ...emp,
        totalCases: employeeCases.length,
        ongoingCases: employeeCases.filter(c => c.status === 'Ongoing').length,
        closedCases: employeeCases.filter(c => c.status === 'Closed').length,
        lastIncidentDate,
      };
    }).filter(Boolean);
  }, [employees, cases]);

  const sortedData = useMemo(() => {
    return [...processedData].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [processedData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  return (
    <div className="card data-table-card shadow-sm">
      <div className="table-responsive">
        <table className="table data-table mb-0 align-middle">
          <thead>
            <tr>
              <th className="sortable" onClick={() => requestSort('name')}>Employee {getSortIcon('name')}</th>
              <th className="sortable text-center" onClick={() => requestSort('totalCases')}>Total Cases {getSortIcon('totalCases')}</th>
              <th className="sortable text-center" onClick={() => requestSort('ongoingCases')}>Ongoing {getSortIcon('ongoingCases')}</th>
              <th className="sortable text-center" onClick={() => requestSort('closedCases')}>Closed {getSortIcon('closedCases')}</th>
              <th className="sortable" onClick={() => requestSort('lastIncidentDate')}>Last Incident {getSortIcon('lastIncidentDate')}</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div className="d-flex align-items-center">
                    <img src={emp.imageUrl || placeholderAvatar} alt={emp.name} className="avatar-table me-2" />
                    <div>
                      <div className="fw-bold">{emp.name}</div>
                      <small className="text-muted">{emp.id}</small>
                    </div>
                  </div>
                </td>
                <td className="text-center fw-bold">{emp.totalCases}</td>
                <td className="text-center fw-bold text-warning">{emp.ongoingCases}</td>
                <td className="text-center text-secondary">{emp.closedCases}</td>
                <td>{emp.lastIncidentDate}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onViewEmployeeCases(emp)}
                  >
                    View Cases
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CaseSummaryByEmployee;