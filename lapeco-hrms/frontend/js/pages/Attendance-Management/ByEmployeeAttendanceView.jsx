import React from 'react';
import { formatDate as formatMDY } from '../../utils/dateUtils';
import StatDonutChart from '../../common/StatDonutChart';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const ByEmployeeAttendanceView = ({
  selectedEmployee,
  setSelectedEmployee,
  employeeDateFilter,
  setEmployeeDateFilter,
  selectedEmployeeRecords,
  employeeSearchTerm,
  setEmployeeSearchTerm,
  filteredEmployeesForSelection,
  onEmployeeSelect,
  employeeStatusFilter,
  handleEmployeeStatusFilterClick
}) => {
  if (selectedEmployee) {
    return (
      <div>
        <button className="btn btn-light me-3 back-button mb-3" onClick={setSelectedEmployee}>
          <i className="bi bi-arrow-left"></i> Back to Employee List
        </button>
        <div className="employee-detail-header">
          <img src={selectedEmployee.imageUrl || placeholderAvatar} alt={selectedEmployee.name} className="employee-detail-avatar" />
          <div>
            <h2 className="employee-detail-name">{selectedEmployee.name}</h2>
            <p className="employee-detail-meta">{selectedEmployee.id} • {selectedEmployee.position || 'Unassigned'}</p>
          </div>
        </div>  
        <div className="card my-4">
          <div className="card-body employee-date-filter-bar">
            <div className="filter-group">
              <label htmlFor="employeeStartDate" className="form-label">Start Date</label>
              <input
                type="date"
                id="employeeStartDate"
                className="form-control"
                value={employeeDateFilter.start}
                onChange={(e) => setEmployeeDateFilter(prev => ({ ...prev, start: e.target.value }))}
                placeholder="mm-dd-yyyy"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="employeeEndDate" className="form-label">End Date</label>
              <input
                type="date"
                id="employeeEndDate"
                className="form-control"
                value={employeeDateFilter.end}
                onChange={(e) => setEmployeeDateFilter(prev => ({ ...prev, end: e.target.value }))}
                min={employeeDateFilter.start}
                placeholder="mm-dd-yyyy"
              />
            </div>
            <button 
              className="btn btn-outline-secondary align-self-end" 
              onClick={() => setEmployeeDateFilter({ start: '', end: '' })}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="employee-attendance-stats my-4">
          <StatDonutChart 
            label={`Present (${selectedEmployeeRecords.stats.totalPresent}/${selectedEmployeeRecords.stats.totalScheduled})`} 
            percentage={selectedEmployeeRecords.stats.presentPercentage} 
            color="var(--app-success-color)"
            isClickable={true}
            isActive={employeeStatusFilter === 'Present'}
            onClick={() => handleEmployeeStatusFilterClick('Present')}
          />
          <StatDonutChart 
            label={`Late (${selectedEmployeeRecords.stats.totalLate}/${selectedEmployeeRecords.stats.totalScheduled})`} 
            percentage={selectedEmployeeRecords.stats.latePercentage}
            color="var(--warning-color)"
            isClickable={true}
            isActive={employeeStatusFilter === 'Late'}
            onClick={() => handleEmployeeStatusFilterClick('Late')}
          />
          <StatDonutChart 
            label={`Absent (${selectedEmployeeRecords.stats.totalAbsent}/${selectedEmployeeRecords.stats.totalScheduled})`} 
            percentage={selectedEmployeeRecords.stats.absentPercentage}
            color="var(--danger-color)"
            isClickable={true}
            isActive={employeeStatusFilter === 'Absent'}
            onClick={() => handleEmployeeStatusFilterClick('Absent')}
          />
          <div className={`stat-card scheduled ${!employeeStatusFilter ? 'active' : ''}`} onClick={() => handleEmployeeStatusFilterClick('')}> 
            <span className="stat-value">{selectedEmployeeRecords.stats.totalScheduled}</span> 
            <span className="stat-label">Total Scheduled</span> 
          </div>
        </div>
        <div className="card data-table-card shadow-sm">
          <div className="table-responsive">
            <table className="table data-table mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Schedule</th>
                  <th>Sign In</th>
                  <th>Sign Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedEmployeeRecords.records.map(rec => (
                  <tr key={rec.scheduleId || rec.date}>
                    <td>{(() => {
                      try {
                        // Handle ISO timestamp format by extracting date part
                        let dateStr = rec.date;
                        if (dateStr && dateStr.includes('T')) {
                          dateStr = dateStr.split('T')[0];
                        }
                        const date = new Date(dateStr);
                        return isNaN(date.getTime()) ? rec.date : formatMDY(date, 'long');
                      } catch (error) {
                        return rec.date;
                      }
                    })()}</td>
                    <td>{(() => {
                      // Extract time from shift datetime strings and format to HH:MM
                      let shiftDisplay = rec.shift;
                      if (typeof rec.shift === 'string' && rec.shift.includes(' - ')) {
                        const [startDateTime, endDateTime] = rec.shift.split(' - ');
                        
                        // Extract time from datetime string (handles ISO format, space-separated format, and time-only format)
                        const extractTime = (dateTimeStr) => {
                          try {
                            // If it's an ISO datetime string, parse it and extract time
                            if (dateTimeStr.includes('T')) {
                              const date = new Date(dateTimeStr);
                              return date.toTimeString().split(' ')[0].split(':').slice(0, 2).join(':');
                            }
                            // If it's space-separated datetime format (YYYY-MM-DD HH:MM), extract time part
                            else if (dateTimeStr.includes(' ') && dateTimeStr.includes('-')) {
                              const timePart = dateTimeStr.split(' ')[1];
                              return timePart ? timePart.split(':').slice(0, 2).join(':') : dateTimeStr;
                            }
                            // If it already looks like time, just format it
                            else if (dateTimeStr.includes(':')) {
                              return dateTimeStr.split(':').slice(0, 2).join(':');
                            }
                            // Fallback
                            return dateTimeStr;
                          } catch (error) {
                            return dateTimeStr;
                          }
                        };
                        
                        const startTime = extractTime(startDateTime.trim());
                        const endTime = extractTime(endDateTime.trim());
                        shiftDisplay = `${startTime} - ${endTime}`;
                      }
                      return shiftDisplay;
                    })()}</td>
                    <td>{rec.signIn || '---'}</td>
                    <td>{rec.signOut || '---'}</td>
                    <td><span className={`status-badge status-${rec.status.toLowerCase()}`}>{rec.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="input-group mb-4" style={{maxWidth: '500px'}}>
        <span className="input-group-text"><i className="bi bi-search"></i></span>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Search by employee name or ID..." 
          value={employeeSearchTerm} 
          onChange={e => setEmployeeSearchTerm(e.target.value)} 
        />
      </div>
      <div className="employee-selection-grid">
        {Array.isArray(filteredEmployeesForSelection) && filteredEmployeesForSelection.map(emp => (
          <div key={emp.id} className="employee-selection-card" onClick={() => onEmployeeSelect ? onEmployeeSelect(emp) : setSelectedEmployee(emp)}>
            <img src={emp.imageUrl || placeholderAvatar} alt={emp.name} className="employee-selection-avatar" />
            <div className="employee-selection-info">
              <div className="employee-selection-name">{emp.name}</div>
              <div className="employee-selection-id text-muted">{emp.id}</div>
            </div>
          </div>
        ))}
        {!Array.isArray(filteredEmployeesForSelection) && (
          <div className="text-center p-4">
            <p>Loading employees...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ByEmployeeAttendanceView;
