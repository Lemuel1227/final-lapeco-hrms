import React, { useState, useMemo, useEffect, useCallback } from 'react';
import EditLeaveCreditsModal from '../../modals/EditLeaveCreditsModal';
import LeaveHistoryModal from '../../modals/LeaveHistoryModal';
import BulkAddLeaveCreditsModal from '../../modals/BulkAddLeaveCreditsModal';
import ResetCreditsModal from '../../modals/ResetCreditsModal';
import { leaveAPI } from '../../services/api';

const LeaveCreditsTab = ({ employees, leaveRequests, handlers, onShowToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [leaveCreditsData, setLeaveCreditsData] = useState({});
  const [isSavingIndividual, setIsSavingIndividual] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, index) => current - index);
  }, []);

  const fetchLeaveCreditsForYear = useCallback(async (year) => {
    setLoading(true);
    try {
      const response = await leaveAPI.getAllLeaveCredits({ year });
      const payload = response?.data;
      const records = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const creditsMap = {};

      records.forEach(({ user, leave_credits }) => {
        creditsMap[user.id] = leave_credits;
      });

      setLeaveCreditsData(creditsMap);
    } catch (error) {
      console.error('Failed to fetch leave credits:', error);
      setLeaveCreditsData({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Show all employees regardless of status
  const allEmployees = useMemo(() => employees, [employees]);

  // Fetch leave credits for all employees
  useEffect(() => {
    if (allEmployees.length > 0) {
      fetchLeaveCreditsForYear(selectedYear);
    }
  }, [allEmployees, selectedYear, fetchLeaveCreditsForYear]);

  const employeeLeaveData = useMemo(() => {
    const currentYear = selectedYear;
    
    const calculatedData = allEmployees.map(emp => {
        // Get leave credits from API data
        const empCredits = leaveCreditsData[emp.id] || {};
        
        // Transform API data to match expected format
        const totalCredits = Object.values(empCredits).reduce((acc, credit) => {
          const type = credit.leave_type.toLowerCase().replace(' leave', '');
          acc[type] = credit.total_credits;
          return acc;
        }, { vacation: 0, sick: 0 });
        
        const usedCredits = Object.values(empCredits).reduce((acc, credit) => {
          const type = credit.leave_type.toLowerCase().replace(' leave', '');
          acc[type] = credit.used_credits;
          return acc;
        }, { vacation: 0, sick: 0, unpaid: 0 });
        
        // Add unpaid leave usage from leave requests (not tracked in credits)
        const unpaidUsage = leaveRequests
          .filter(req => 
            req.empId === emp.id && 
            req.status === 'Approved' &&
            req.leaveType === 'Unpaid Leave' &&
            new Date(req.dateFrom).getFullYear() === currentYear
          )
          .reduce((sum, req) => sum + req.days, 0);
        
        usedCredits.unpaid = unpaidUsage;
        
        const individualHistory = leaveRequests.filter(req => req.empId === emp.id);

        // Compute paternity entitlement and usage
        const isMale = String(emp.gender || '').toLowerCase() === 'male';
        const PATERNITY_DAYS = 7;
        const paternityEntitlement = isMale ? PATERNITY_DAYS : null;
        const paternityUsed = leaveRequests
          .filter(req =>
            req.empId === emp.id &&
            req.status === 'Approved' &&
            req.leaveType === 'Paternity Leave' &&
            new Date(req.dateFrom).getFullYear() === currentYear
          )
          .reduce((sum, req) => sum + (req.days || 0), 0);

          return {
            ...emp,
            leaveCredits: {
              vacation: totalCredits.vacation || 0,
              sick: totalCredits.sick || 0,
            },
            totalCredits,
            usedCredits,
            leaveHistory: individualHistory,
            remainingBalance: {
              vacation: (totalCredits.vacation || 0) - (usedCredits.vacation || 0),
              sick: (totalCredits.sick || 0) - (usedCredits.sick || 0),
            },
            paternityEntitlement,
            paternityUsed,
          };
        });

    const filteredData = calculatedData.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return [...filteredData].sort((a, b) => {
      let valA, valB;
      if (['vacation', 'sick', 'unpaid', 'paternity'].includes(sortConfig.key)) {
        valA = sortConfig.key === 'unpaid' ? a.usedCredits.unpaid : a.remainingBalance[sortConfig.key];
        valB = sortConfig.key === 'unpaid' ? b.usedCredits.unpaid : b.remainingBalance[sortConfig.key];
        // Special case for paternity: sort by entitlement (male=7, female=N/A as -1)
        if (sortConfig.key === 'paternity') {
          valA = typeof a.paternityEntitlement === 'number' ? a.paternityEntitlement : -1;
          valB = typeof b.paternityEntitlement === 'number' ? b.paternityEntitlement : -1;
        }
      } else {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      }
      
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

  }, [allEmployees, leaveRequests, searchTerm, sortConfig, leaveCreditsData]);
  
  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };
  
  const handleHistoryClick = (employee) => {
    setSelectedEmployee(employee);
    setShowHistoryModal(true);
  };
  
  const handleSave = async (employeeId, newCredits) => {
    if (isSavingIndividual) return;
    setIsSavingIndividual(true);
    try {
      const creditPayloads = [
        { leave_type: 'Vacation Leave', total_credits: Number(newCredits.vacation ?? 0) },
        { leave_type: 'Sick Leave', total_credits: Number(newCredits.sick ?? 0) },
      ];

      for (const payload of creditPayloads) {
        await leaveAPI.updateLeaveCredits(employeeId, payload, { year: selectedYear });
      }
      // Refresh leave credits data
      const response = await leaveAPI.getLeaveCredits(employeeId, { year: selectedYear });
      const refreshed = response?.data?.data ?? response?.data ?? {};
      setLeaveCreditsData(prev => ({
        ...prev,
        [employeeId]: refreshed
      }));
      setShowEditModal(false);
      if (onShowToast) {
        onShowToast({ message: 'Leave credits updated successfully.', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to update leave credits:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to update leave credits.';
      if (onShowToast) {
        onShowToast({ message: errorMessage, type: 'error' });
      }
    } finally {
      setIsSavingIndividual(false);
    }
  };

  const handleBulkAdd = async (creditsToAdd) => {
    if (isBulkAdding) return;
    setIsBulkAdding(true);
    try {
      
      // Use the new bulk API endpoint - much faster!
      const response = await leaveAPI.bulkAddCredits(creditsToAdd);
      
      await fetchLeaveCreditsForYear(selectedYear);
      
      setShowBulkAddModal(false);
      
      if (onShowToast) {
        onShowToast({
          message: `Successfully added credits to ${response.data.users_updated} employees!`,
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to bulk add leave credits:', error);
      if (onShowToast) {
        onShowToast({ message: 'Failed to add leave credits. Please try again.', type: 'error' });
      }
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleResetCredits = async (resetData) => {
    try {
      await leaveAPI.resetUsedCredits(resetData);
      // Refresh all leave credits data using bulk endpoint for better performance
      await fetchLeaveCreditsForYear(selectedYear);
      setShowResetModal(false);
      if (onShowToast) {
        onShowToast({ message: 'Leave credits reset successfully.', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to reset leave credits:', error);
      if (onShowToast) {
        onShowToast({ message: 'Failed to reset leave credits.', type: 'error' });
      }
    }
  };
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-2"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-2"></i> : <i className="bi bi-sort-down sort-icon active ms-2"></i>;
  };
  
  // Progress bars removed per request; keeping simple remaining badges

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="input-group" style={{ maxWidth: '400px' }}>
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search by employee name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 text-muted" style={{ fontSize: '0.85rem' }}>Year:</label>
            <select
              className="form-select form-select-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-warning" onClick={() => setShowResetModal(true)}>
            <i className="bi bi-arrow-clockwise me-2"></i>Reset Credits
          </button>
          <button className="btn btn-success" onClick={() => setShowBulkAddModal(true)}>
            <i className="bi bi-plus-circle-dotted me-2"></i>Add Credits to All
          </button>
        </div>
      </div>
      <div className="card data-table-card shadow-sm">
        <div className="table-responsive">
          <table className="table data-table leave-credits-table mb-0 align-middle">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="sortable" onClick={() => requestSort('name')}>Employee Name {getSortIcon('name')}</th>
                <th className="sortable" onClick={() => requestSort('vacation')}>Vacation {getSortIcon('vacation')}</th>
                <th className="sortable" onClick={() => requestSort('sick')}>Sick {getSortIcon('sick')}</th>
                
                <th className="sortable text-center" onClick={() => requestSort('paternity')}>Paternity {getSortIcon('paternity')}</th>
                <th className="sortable text-center" onClick={() => requestSort('unpaid')}>Unpaid {getSortIcon('unpaid')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center p-4">Loading leave credits...</td></tr>
              ) : employeeLeaveData.map(emp => {
                const vacationRemaining = emp.remainingBalance.vacation;
                const vacationTotal = emp.totalCredits.vacation;
                // Progress bars removed; show remaining as a badge
                
                return (
                  <tr key={emp.id}>
                    <td><div>{emp.name}</div></td>
                    <td>
                      <div className="balance-summary">{emp.usedCredits.vacation} of {vacationTotal} used</div>
                      <span className="remaining-badge">{Math.max(0, vacationRemaining)} left</span>
                    </td>
                    <td>
                      <div className="balance-summary">{emp.usedCredits.sick} of {emp.totalCredits.sick} used</div>
                      {(() => {
                        const total = emp.totalCredits.sick || 0;
                        const remaining = Math.max(0, total - (emp.usedCredits.sick || 0));
                        return (
                          <span className="remaining-badge">{remaining} left</span>
                        );
                      })()}
                    </td>
                    
                    <td className="text-center">
                      {typeof emp.paternityEntitlement === 'number' ? (
                        <>
                          <div className="balance-summary">{(emp.paternityUsed || 0)} of {emp.paternityEntitlement} used</div>
                          <span className="remaining-badge">{Math.max(0, (emp.paternityEntitlement || 0) - (emp.paternityUsed || 0))} left</span>
                        </>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="text-center fw-bold">{emp.usedCredits.unpaid || 0}</td>
                    <td>
                        <div className="dropdown">
                            <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleHistoryClick(emp); }}>View History</a></li>
                                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleEditClick(emp); }}>Edit Credits</a></li>
                            </ul>
                        </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && employeeLeaveData.length === 0 && (
                <tr><td colSpan="7" className="text-center p-4">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {showEditModal && selectedEmployee && (
        <EditLeaveCreditsModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
          employeeData={selectedEmployee}
        />
      )}
      
      {showHistoryModal && selectedEmployee && (
        <LeaveHistoryModal
          show={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          employeeName={selectedEmployee.name}
          leaveHistory={selectedEmployee.leaveHistory}
        />
      )}

      <BulkAddLeaveCreditsModal
        show={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onConfirm={handleBulkAdd}
        activeEmployeeCount={allEmployees.length}
      />

      <ResetCreditsModal
        show={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetCredits}
        employees={allEmployees}
      />
    </>
  );
};

export default LeaveCreditsTab;
