import React, { useState, useMemo } from 'react';
import ActionsDropdown from '../../common/ActionsDropdown';
import { calculateFinalPay } from '../../hooks/payrollUtils';
import { payrollAPI } from '../../services/api';

const formatCurrency = (value) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TerminatedEmployeesTab = ({ employees, terminations, positions, positionMap, payrolls, onRehire, onDelete, onViewProfile, onViewFinalPay }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const terminatedEmployeesWithData = useMemo(() => {
        return employees
            .filter(emp => emp.employment_status === 'terminated')
            .map(emp => {
                const positionObject = positions.find(p => p.id === emp.position_id);
                const { finalPay } = calculateFinalPay(emp, positionObject, payrolls);
                
                const canonicalEmpId = String(emp?.employee_id ?? emp?.id ?? '');
                const employeePayrolls = (payrolls || [])
                    .flatMap(run => (run.records || []).filter(rec => String(rec.empId) === canonicalEmpId))
                    .sort((a, b) => new Date(b.payEndDate || 0) - new Date(a.payEndDate || 0));
                
                const latestPayrollRecordId = employeePayrolls[0]?.payrollId;
                let finalPayStatus = employeePayrolls[0]?.status || 'Pending';
                if ((finalPay || 0) <= 0) {
                    finalPayStatus = 'No Final Pay';
                }

                return { ...emp, finalPay, finalPayStatus, latestPayrollRecordId };
            });
    }, [employees, positions, payrolls]);

    const filteredAndSorted = useMemo(() => {
        let filtered = terminatedEmployeesWithData.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(emp.id).toLowerCase().includes(searchTerm.toLowerCase())
        );

        return [...filtered].sort((a, b) => {
            const key = sortConfig.key;
            const direction = sortConfig.direction === 'ascending' ? 1 : -1;
            
            let valA = a[key];
            let valB = b[key];

            if (key === 'terminationDate') {
                const termA = terminations.find(t => t.employee_id === a.id);
                const termB = terminations.find(t => t.employee_id === b.id);
                valA = termA?.termination_date || '';
                valB = termB?.termination_date || '';
            }

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
    }, [terminatedEmployeesWithData, searchTerm, sortConfig, terminations]);

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

    const [statusOverrides, setStatusOverrides] = useState({});
    const [savingStatusMap, setSavingStatusMap] = useState({});

    const handleStatusChange = async (emp, newStatus) => {
        // Optimistic update
        setStatusOverrides(prev => ({ ...prev, [emp.id]: newStatus }));
        setSavingStatusMap(prev => ({ ...prev, [emp.id]: true }));

        try {
            if (!emp.latestPayrollRecordId) {
                throw new Error('No payroll record found for this employee');
            }
            await payrollAPI.update(emp.latestPayrollRecordId, { status: newStatus });
        } catch (error) {
            // Revert on failure
            setStatusOverrides(prev => ({ ...prev, [emp.id]: undefined }));
            alert(error?.response?.data?.message || 'Failed to update final pay status');
        } finally {
            setSavingStatusMap(prev => ({ ...prev, [emp.id]: false }));
        }
    };

    const handleMarkAllAsPaid = async () => {
        const candidates = filteredAndSorted.filter(emp => {
            const current = (statusOverrides[emp.id] ?? emp.finalPayStatus) ?? 'Pending';
            const isNoFinalPay = String(current).toLowerCase() === 'no final pay' || String(current).toLowerCase() === 'no-final-pay';
            return emp.finalPay > 0 && emp.latestPayrollRecordId && String(current).toLowerCase() !== 'paid' && !isNoFinalPay;
        });
        if (candidates.length === 0) {
            alert('No eligible records to mark as Paid.');
            return;
        }
        const confirm = window.confirm(`Mark ${candidates.length} final pay record(s) as Paid?`);
        if (!confirm) return;

        // Optimistic update for all
        const optimisticIds = candidates.map(c => c.id);
        setStatusOverrides(prev => {
            const next = { ...prev };
            optimisticIds.forEach(id => { next[id] = 'Paid'; });
            return next;
        });
        setSavingStatusMap(prev => {
            const next = { ...prev };
            optimisticIds.forEach(id => { next[id] = true; });
            return next;
        });

        try {
            await Promise.all(candidates.map(emp => payrollAPI.update(emp.latestPayrollRecordId, { status: 'Paid' })));
        } catch (error) {
            console.error('Bulk mark as Paid failed:', error);
            alert(error?.response?.data?.message || 'Failed to mark all as Paid');
            // Revert optimistic updates on failure
            setStatusOverrides(prev => {
                const next = { ...prev };
                optimisticIds.forEach(id => { next[id] = undefined; });
                return next;
            });
        } finally {
            setSavingStatusMap(prev => {
                const next = { ...prev };
                optimisticIds.forEach(id => { next[id] = false; });
                return next;
            });
        }
    };

    // Removed manual 'Mark No Final Pay' action; status is auto-set when finalPay is zero

    return (
        <div className="card data-table-card shadow-sm">
            <div className="resignation-controls">
                <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search by name or ID..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                    <button 
                        className="btn btn-sm btn-outline-success text-nowrap"
                        onClick={handleMarkAllAsPaid}
                        disabled={filteredAndSorted.filter(emp => String((statusOverrides[emp.id] ?? emp.finalPayStatus) ?? 'Pending').toLowerCase() !== 'paid' && emp.latestPayrollRecordId).length === 0}
                    >
                        <i className="bi bi-cash-coin me-1"></i> Mark All as Paid
                    </button>
                </div>
            </div>
            <div className="table-responsive">
                <table className="table data-table mb-0 align-middle">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => requestSort('id')}>ID {getSortIcon('id')}</th>
                            <th className="sortable" onClick={() => requestSort('name')}>Employee {getSortIcon('name')}</th>
                            <th>Last Position</th>
                            <th className="sortable" onClick={() => requestSort('terminationDate')}>Termination Date {getSortIcon('terminationDate')}</th>
                            <th>Reason</th>
                            <th className="text-end sortable" onClick={() => requestSort('finalPay')}>Final Pay {getSortIcon('finalPay')}</th>
                            <th className="text-center sortable" onClick={() => requestSort('finalPayStatus')}>Final Pay Status {getSortIcon('finalPayStatus')}</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSorted.length > 0 ? filteredAndSorted.map(emp => {
                            const terminationRecord = terminations.find(t => t.employee_id === emp.id);
                            return (
                                <tr key={emp.id}>
                                    <td>{emp.id}</td>
                                    <td><div className="fw-bold">{emp.name}</div></td>
                                    <td>{positionMap.get(emp.position_id) || 'Unassigned'}</td>
                                    <td>{terminationRecord?.termination_date ? new Date(terminationRecord.termination_date).toLocaleDateString() : 'N/A'}</td>
                                    <td>{terminationRecord?.reason || 'N/A'}</td>
                                    <td className="text-end fw-bold">₱{formatCurrency(emp.finalPay)}</td>
                                    <td className="text-center">
                                        {(() => {
                                            const status = (statusOverrides[emp.id] ?? emp.finalPayStatus) ?? 'Pending';
                                            const statusClass = String(status).toLowerCase().replace(/\s+/g, '-');
                                            const safeClass = ['pending','paid','no-final-pay'].includes(statusClass) ? statusClass : 'unknown';
                                            return (
                                                <span className={`status-badge status-${safeClass}`}>
                                                    {status}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="text-center">
                                        <ActionsDropdown>
                                            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewProfile(emp); }}>
                                                <i className="bi bi-person-lines-fill me-2"></i>View Profile
                                            </a>
                                             <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewFinalPay(emp); }}>
                                                <i className="bi bi-calculator-fill me-2"></i>View Final Pay Breakdown
                                            </a>
                                            <div className="dropdown-divider"></div>
                                            <span className="dropdown-item-text text-muted small">Final Pay Status</span>
                                            <a className={`dropdown-item ${(savingStatusMap[emp.id] || (emp.finalPay || 0) <= 0) ? 'disabled' : ''}`} href="#" onClick={(e) => { e.preventDefault(); if (!savingStatusMap[emp.id] && (emp.finalPay || 0) > 0) handleStatusChange(emp, 'Pending'); }}>
                                                <i className="bi bi-hourglass-split me-2"></i>Mark Pending
                                            </a>
                                            <a className={`dropdown-item ${(savingStatusMap[emp.id] || (emp.finalPay || 0) <= 0) ? 'disabled' : ''}`} href="#" onClick={(e) => { e.preventDefault(); if (!savingStatusMap[emp.id] && (emp.finalPay || 0) > 0) handleStatusChange(emp, 'Paid'); }}>
                                                <i className="bi bi-cash-coin me-2"></i>Mark Paid
                                            </a>
                                            <div className="dropdown-divider"></div>
                                            <a className="dropdown-item text-success" href="#" onClick={(e) => { e.preventDefault(); onRehire(emp); }}>
                                                <i className="bi bi-person-check-fill me-2"></i>Rehire Employee
                                            </a>
                                            <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); onDelete(emp); }}>
                                                <i className="bi bi-trash-fill me-2"></i>Delete Record
                                            </a>
                                        </ActionsDropdown>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan="8" className="text-center p-4 text-muted">No terminated employees found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TerminatedEmployeesTab;