import React from 'react';
import StatDonutChart from '../../common/StatDonutChart';

const HistoryAttendanceView = ({
  activeView,
  setActiveView,
  attendanceHistoryDisplay,
  handleViewHistoryDetail,
  handleOpenDeleteConfirm,
  currentDate,
  setCurrentDate,
  statusFilter,
  handleStatusFilterClick,
  positionFilter,
  setPositionFilter,
  uniquePositions,
  dailyAttendanceList,
  sortedAndFilteredList,
  handleRequestSort,
  getSortIcon,
  handleOpenEditModal,
  historySearchTerm,
  setHistorySearchTerm,
  historyMonthFilter,
  setHistoryMonthFilter,
  historyYearFilter,
  setHistoryYearFilter,
  availableHistoryYears
}) => {
  if (activeView === 'historyList') {
    return (
      <>
        <h4 className="mb-3">Attendance History</h4>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <input
              type="text"
              className="form-control"
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              placeholder="Search date (e.g., Friday or 11-07-2025)"
              style={{ maxWidth: '300px' }}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select"
              value={historyMonthFilter}
              onChange={(e) => setHistoryMonthFilter(e.target.value)}
            >
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select
              className="form-select"
              value={historyYearFilter}
              onChange={(e) => setHistoryYearFilter(e.target.value)}
            >
              <option value="">All Years</option>
              {Array.isArray(availableHistoryYears) && availableHistoryYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        {attendanceHistoryDisplay.length > 0 ? (
          <div className="attendance-history-grid">
            {attendanceHistoryDisplay.map(day => (
              <div key={day.date} className="attendance-history-card" onClick={() => handleViewHistoryDetail(day.date)}>
                <div className="card-header">
                  <h5 className="card-title">
                    {day.date ? 
                      new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 
                      'Invalid Date'
                    }
                  </h5>
                  <button 
                    className="btn btn-sm btn-outline-danger delete-history-btn" 
                    onClick={(e) => handleOpenDeleteConfirm && handleOpenDeleteConfirm(e, day.date)} 
                    title="Delete this day's records"
                  >
                    <i className="bi bi-trash-fill"></i>
                  </button>
                </div>
                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item scheduled">
                      <span className="value">{day.total}</span>
                      <span className="label">Scheduled</span>
                    </div>
                    <div className="history-card-charts">
                      <StatDonutChart 
                        size={60} 
                        strokeWidth={6} 
                        label={`Present (${day.present}/${day.total})`} 
                        percentage={day.total > 0 ? Math.round((day.present / day.total) * 100) : 0} 
                        color="var(--app-success-color)" 
                      />
                      <StatDonutChart 
                        size={60} 
                        strokeWidth={6} 
                        label={`Late (${day.late}/${day.total})`} 
                        percentage={day.total > 0 ? Math.round((day.late / day.total) * 100) : 0} 
                        color="var(--warning-color)" 
                      />
                      <StatDonutChart 
                        size={60} 
                        strokeWidth={6} 
                        label={`Absent (${day.absent}/${day.total})`} 
                        percentage={day.total > 0 ? Math.round((day.absent / day.total) * 100) : 0} 
                        color="var(--danger-color)" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No historical attendance data found.</p>
        )}
      </>
    );
  }

  if (activeView === 'historyDetail') {
    return (
      <>
        <div className="d-flex align-items-center mb-3">
          <i className="bi bi-calendar-date me-2"></i>
          <strong>
            {currentDate ? new Date(currentDate).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }) : 'Select a date'}
          </strong>
        </div>
        <div className="daily-view-header-bar">
          <div className="date-picker-group">
            <button className="btn btn-outline-secondary" onClick={() => setActiveView('historyList')}>
              <i className="bi bi-arrow-left"></i> Back to History
            </button>
          </div>
          <div className="stat-cards-group">
            <div className={`stat-card scheduled ${!statusFilter ? 'active' : ''}`} onClick={() => handleStatusFilterClick('')}>
              <span className="stat-value">{dailyAttendanceList.length}</span>
              <span className="stat-label">Scheduled</span>
            </div>
            <div className="history-card-charts">
              <StatDonutChart 
                size={80} 
                strokeWidth={8} 
                label={`Present (${dailyAttendanceList.filter(e => e.status === 'Present' || e.status === 'Late').length}/${dailyAttendanceList.length})`} 
                percentage={dailyAttendanceList.length > 0 ? Math.round((dailyAttendanceList.filter(e => e.status === 'Present' || e.status === 'Late').length / dailyAttendanceList.length) * 100) : 0} 
                color="var(--app-success-color)" 
                isClickable={true}
                isActive={statusFilter === 'Present'}
                onClick={() => handleStatusFilterClick('Present')}
              />
              <StatDonutChart 
                size={80} 
                strokeWidth={9} 
                label={`Late (${dailyAttendanceList.filter(e => e.status === 'Late').length}/${dailyAttendanceList.length})`} 
                percentage={dailyAttendanceList.length > 0 ? Math.round((dailyAttendanceList.filter(e => e.status === 'Late').length / dailyAttendanceList.length) * 100) : 0} 
                color="var(--warning-color)" 
                isClickable={true}
                isActive={statusFilter === 'Late'}
                onClick={() => handleStatusFilterClick('Late')}
              />
              <StatDonutChart 
                size={80} 
                strokeWidth={9} 
                label={`Absent (${dailyAttendanceList.filter(e => e.status === 'Absent').length}/${dailyAttendanceList.length})`} 
                percentage={dailyAttendanceList.length > 0 ? Math.round((dailyAttendanceList.filter(e => e.status === 'Absent').length / dailyAttendanceList.length) * 100) : 0} 
                color="var(--danger-color)" 
                isClickable={true}
                isActive={statusFilter === 'Absent'}
                onClick={() => handleStatusFilterClick('Absent')}
              />
            </div>
          </div>
          <div className="filters-group">
            <select className="form-select" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
              {uniquePositions.map(pos => 
                <option key={pos} value={pos === 'All Positions' ? '' : pos}>{pos}</option>
              )}
            </select>
          </div>
        </div>
        {sortedAndFilteredList.length > 0 ? (
          <div className="card data-table-card shadow-sm">
            <div className="table-responsive">
              <table className="table data-table mb-0">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleRequestSort('id')}>ID {getSortIcon('id')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('name')}>Employee Name {getSortIcon('name')}</th>
                    <th>Position</th>
                    <th className="sortable" onClick={() => handleRequestSort('shift')}>Shift {getSortIcon('shift')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('signIn')}>Sign In {getSortIcon('signIn')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('breakOut')}>Break Out {getSortIcon('breakOut')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('breakIn')}>Break In {getSortIcon('breakIn')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('signOut')}>Sign Out {getSortIcon('signOut')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('workingHours')}>Hours {getSortIcon('workingHours')}</th>
                    <th className="sortable" onClick={() => handleRequestSort('otHours')}>OT (hrs) {getSortIcon('otHours')}</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredList.map((emp, index) => (
                    <tr key={`${emp.empId}-${emp.scheduleId}-${index}`}>
                      <td>{emp.id}</td>
                      <td>{emp.name}</td>
                      <td>{emp.position}</td>
                      <td>{emp.shift}</td>
                      <td>{emp.signIn || '---'}</td>
                      <td>{emp.breakOut || '---'}</td>
                      <td>{emp.breakIn || '---'}</td>
                      <td>{emp.signOut || '---'}</td>
                      <td>{emp.workingHours}</td>
                      <td>{emp.otHours || '0'}</td>
                      <td><span className={`status-badge status-${emp.status.toLowerCase()}`}>{emp.status}</span></td>
                      <td>
                        <div className="dropdown">
                          <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <a 
                                className="dropdown-item" 
                                href="#" 
                                onClick={(e) => {e.preventDefault(); handleOpenEditModal(emp)}}
                              >
                                <i className="bi bi-pencil-fill me-2"></i>Edit / Log Times
                              </a>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center p-5 bg-light rounded d-flex flex-column justify-content-center" style={{minHeight: '300px'}}>
            <i className="bi bi-calendar-check fs-1 text-muted mb-3 d-block"></i>
            <h4 className="text-muted">{dailyAttendanceList.length > 0 && (positionFilter || statusFilter) ? 'No employees match filters.' : 'No Employees Scheduled'}</h4>
            <p className="text-muted">{dailyAttendanceList.length > 0 && (positionFilter || statusFilter) ? 'Try adjusting your filters.' : 'There is no schedule created for this day.'}</p>
          </div>
        )}
      </>
    );
  }

  return null;
};

export default HistoryAttendanceView;
