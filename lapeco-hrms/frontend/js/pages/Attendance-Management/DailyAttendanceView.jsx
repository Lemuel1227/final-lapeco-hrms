import React from 'react';
import StatDonutChart from '../../common/StatDonutChart';

const DailyAttendanceView = ({
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
  handleOpenEditModal
}) => {
  return (
    <>
      <div className="daily-view-header-bar">
        <div className="date-picker-group">
          <div>
          <label htmlFor="daily-date-picker" className="date-label">VIEWING DATE</label>
          <input 
            id="daily-date-picker" 
            type="date" 
            className="form-control" 
            value={currentDate} 
            onChange={(e) => setCurrentDate(e.target.value)} 
            placeholder="mm-dd-yyyy"
          />
          </div>
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
              label={`Present (${dailyAttendanceList.filter(e => e.status === 'Present').length}/${dailyAttendanceList.length})`} 
              percentage={dailyAttendanceList.length > 0 ? Math.round((dailyAttendanceList.filter(e => e.status === 'Present').length / dailyAttendanceList.length) * 100) : 0} 
              color="var(--app-success-color)" 
              isClickable={true}
              isActive={statusFilter === 'Present'}
              onClick={() => handleStatusFilterClick('Present')}
            />
            <StatDonutChart 
              size={80} 
              strokeWidth={8} 
              label={`Late (${dailyAttendanceList.filter(e => e.status === 'Late').length}/${dailyAttendanceList.length})`} 
              percentage={dailyAttendanceList.length > 0 ? Math.round((dailyAttendanceList.filter(e => e.status === 'Late').length / dailyAttendanceList.length) * 100) : 0} 
              color="var(--warning-color)" 
              isClickable={true}
              isActive={statusFilter === 'Late'}
              onClick={() => handleStatusFilterClick('Late')}
            />
            <StatDonutChart 
              size={80} 
              strokeWidth={8} 
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
};

export default DailyAttendanceView;
