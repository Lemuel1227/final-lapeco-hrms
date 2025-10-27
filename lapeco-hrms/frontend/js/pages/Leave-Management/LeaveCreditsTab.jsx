import React, { useState, useMemo, useEffect } from 'react';
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

  // Show all employees regardless of status
  const allEmployees = useMemo(() => employees, [employees]);

  // Fetch leave credits for all employees
  useEffect(() => {
    const fetchLeaveCredits = async () => {
      setLoading(true);
      try {
        // Use bulk API endpoint to fetch all users' leave credits in one request
        const response = await leaveAPI.getAllLeaveCredits();
        const creditsMap = {};
        
        // Transform the bulk response to match the expected format
        response.data.forEach(({ user, leave_credits }) => {
          creditsMap[user.id] = leave_credits;
        });
        
        setLeaveCreditsData(creditsMap);
      } catch (error) {
        console.error('Failed to fetch leave credits:', error);
      } finally {
        setLoading(false);
      }
    };

    if (allEmployees.length > 0) {
      fetchLeaveCredits();
    }
  }, [allEmployees]);

  const employeeLeaveData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    const calculatedData = allEmployees.map(emp => {
        // Get leave credits from API data
        const empCredits = leaveCreditsData[emp.id] || {};
        
        // Transform API data to match expected format
        const totalCredits = Object.values(empCredits).reduce((acc, credit) => {
          const type = credit.leave_type.toLowerCase().replace(' leave', '');
          acc[type] = credit.total_credits;
          return acc;
        }, { vacation: 0, sick: 0, emergency: 0 });
        
        const usedCredits = Object.values(empCredits).reduce((acc, credit) => {
          const type = credit.leave_type.toLowerCase().replace(' leave', '');
          acc[type] = credit.used_credits;
          return acc;
        }, { vacation: 0, sick: 0, emergency: 0, unpaid: 0 });
        
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

        return {
          ...emp,
          leaveCredits: {
            vacation: totalCredits.vacation || 0,
            sick: totalCredits.sick || 0,
            emergency: totalCredits.emergency || 0,
          },
          totalCredits,
          usedCredits,
          leaveHistory: individualHistory,
          remainingBalance: {
            vacation: (totalCredits.vacation || 0) - (usedCredits.vacation || 0),
            sick: (totalCredits.sick || 0) - (usedCredits.sick || 0),
            emergency: (totalCredits.emergency || 0) - (usedCredits.emergency || 0),
          }
        };
      });

    const filteredData = calculatedData.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return [...filteredData].sort((a, b) => {
      let valA, valB;
      if (['vacation', 'sick', 'emergency', 'unpaid'].includes(sortConfig.key)) {
        valA = sortConfig.key === 'unpaid' ? a.usedCredits.unpaid : a.remainingBalance[sortConfig.key];
        valB = sortConfig.key === 'unpaid' ? b.usedCredits.unpaid : b.remainingBalance[sortConfig.key];
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
        { leave_type: 'Emergency Leave', total_credits: Number(newCredits.emergency ?? 0) },
      ];

      for (const payload of creditPayloads) {
        await leaveAPI.updateLeaveCredits(employeeId, payload);
      }
      // Refresh leave credits data
      const response = await leaveAPI.getLeaveCredits(employeeId);
      setLeaveCreditsData(prev => ({
        ...prev,
        [employeeId]: response.data
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
      
      const creditsResponse = await leaveAPI.getAllLeaveCredits();
      const creditsMap = {};
      creditsResponse.data.forEach(({ user, leave_credits }) => {
        creditsMap[user.id] = leave_credits;
      });
      setLeaveCreditsData(creditsMap);
      
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
      const response = await leaveAPI.getAllLeaveCredits();
      const creditsMap = {};
      
      // Transform the bulk response to match the expected format
      response.data.forEach(({ user, leave_credits }) => {
        creditsMap[user.id] = leave_credits;
      });
      
      setLeaveCreditsData(creditsMap);
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
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };
  
  const getProgressBarVariant = (percentage) => {
    if (percentage > 50) return 'bg-success';
    if (percentage > 20) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="input-group" style={{ maxWidth: '400px' }}>
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search by employee name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <div className="d-flex gap-2">
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
          <table className="table data-table mb-0 align-middle">
            <thead>
              <tr>
                <th className="sortable" onClick={() => requestSort('name')}>Employee Name {getSortIcon('name')}</th>
                <th className="sortable" onClick={() => requestSort('vacation')}>Vacation {getSortIcon('vacation')}</th>
                <th className="sortable" onClick={() => requestSort('sick')}>Sick {getSortIcon('sick')}</th>
                <th className="sortable" onClick={() => requestSort('emergency')}>Emergency {getSortIcon('emergency')}</th>
                <th className="sortable text-center" onClick={() => requestSort('unpaid')}>Unpaid {getSortIcon('unpaid')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center p-4">Loading leave credits...</td></tr>
              ) : employeeLeaveData.map(emp => {
                const vacationRemaining = emp.remainingBalance.vacation;
                const vacationTotal = emp.totalCredits.vacation;
                const vacationPercentage = vacationTotal > 0 ? (vacationRemaining / vacationTotal) * 100 : 0;
                
                return (
                  <tr key={emp.id}>
                    <td><div>{emp.name}</div><small className="text-muted">{emp.id}</small></td>
                    <td style={{minWidth: '200px'}}>
                      <div className="balance-summary">{emp.usedCredits.vacation} of {vacationTotal} used</div>
                      <div className="progress" style={{height: '8px'}}><div className={`progress-bar ${getProgressBarVariant(vacationPercentage)}`} style={{width: `${vacationPercentage}%`}}></div></div>
                    </td>
                    <td className="text-center">{emp.usedCredits.sick} / {emp.totalCredits.sick}</td>
                    <td className="text-center">{emp.usedCredits.emergency} / {emp.totalCredits.emergency}</td>
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
                <tr><td colSpan="6" className="text-center p-4">No employees found.</td></tr>
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