import React, { useState, useMemo } from 'react';
import ActionsDropdown from '../../common/ActionsDropdown';
import { calculateFinalPay } from '../../hooks/payrollUtils';
import { formatDate } from '../../utils/dateUtils';

const formatCurrency = (value) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OffboardedEmployeesTab = ({ employees, resignations, positions, payrolls, onRehire, onDelete, onDeleteAll, onViewProfile, onViewFinalPay, onViewReason }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const resignedEmployeesWithData = useMemo(() => {
        const allPositions = positions || [];
        return employees
            .filter(emp => emp.employment_status === 'resigned')
            .map(emp => {
                const resignationRecord = resignations.find(r => r.employeeId === emp.id);
                const lastPositionTitle = resignationRecord?.position;
                const positionObject = allPositions.find(p => p.title === lastPositionTitle);
                
                const { finalPay } = calculateFinalPay(emp, positionObject, payrolls);
                
                const employeePayrolls = payrolls
                    .flatMap(run => run.records.filter(rec => rec.empId === emp.id))
                    .sort((a, b) => new Date(b.payEndDate || 0) - new Date(a.payEndDate || 0));
                
                const finalPayStatus = employeePayrolls[0]?.status || 'Pending';

                return { ...emp, finalPay, finalPayStatus };
            });
    }, [employees, positions, payrolls, resignations]);

    const uniquePositions = useMemo(() => {
        const pos = new Set(resignedEmployeesWithData.map(emp => {
            const resignationRecord = resignations.find(r => r.employeeId === emp.id);
            return resignationRecord?.position || 'Unassigned';
        }));
        return ['All', ...Array.from(pos).sort()];
    }, [resignedEmployeesWithData, resignations]);

    const filteredAndSorted = useMemo(() => {
        let filtered = resignedEmployeesWithData.filter(emp => {
            const resignationRecord = resignations.find(r => r.employeeId === emp.id);
            const lastPositionTitle = resignationRecord?.position || 'Unassigned';

            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(emp.id).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPosition = positionFilter === 'All' || lastPositionTitle === positionFilter;
            return matchesSearch && matchesPosition;
        });

        return [...filtered].sort((a, b) => {
            const key = sortConfig.key;
            const direction = sortConfig.direction === 'ascending' ? 1 : -1;
            
            let valA, valB;

            if (key === 'effectiveDate') {
                const resA = resignations.find(r => r.employeeId === a.id && r.status === 'Approved');
                const resB = resignations.find(r => r.employeeId === b.id && r.status === 'Approved');
                valA = resA?.effectiveDate || '';
                valB = resB?.effectiveDate || '';
            } else if (key === 'positionTitle') {
                const resA = resignations.find(r => r.employeeId === a.id);
                const resB = resignations.find(r => r.employeeId === b.id);
                valA = resA?.position || '';
                valB = resB?.position || '';
            } else {
                valA = a[key] || '';
                valB = b[key] || '';
            }

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
    }, [resignedEmployeesWithData, searchTerm, positionFilter, sortConfig, resignations]);

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
                <div className="d-flex align-items-center gap-2">
                    <button 
                        className="btn btn-sm btn-outline-danger text-nowrap" 
                        onClick={onDeleteAll}
                        disabled={resignedEmployeesWithData.length === 0}
                    >
                        <i className="bi bi-trash-fill me-1"></i> Delete All
                    </button>
                    <label htmlFor="positionFilter" className="form-label mb-0 small text-muted flex-shrink-0">Position:</label>
                    <select id="positionFilter" className="form-select form-select-sm" value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>
                        {uniquePositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                </div>
            </div>
            <div className="table-responsive">
                <table className="table data-table mb-0 align-middle">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => requestSort('id')}>ID {getSortIcon('id')}</th>
                            <th className="sortable" onClick={() => requestSort('name')}>Employee {getSortIcon('name')}</th>
                            <th className="sortable" onClick={() => requestSort('positionTitle')}>Last Position {getSortIcon('positionTitle')}</th>
                            <th className="sortable" onClick={() => requestSort('effectiveDate')}>Last Day of Work {getSortIcon('effectiveDate')}</th>
                            <th className="text-end sortable" onClick={() => requestSort('finalPay')}>Final Pay {getSortIcon('finalPay')}</th>
                            <th className="text-center sortable" onClick={() => requestSort('finalPayStatus')}>Final Pay Status {getSortIcon('finalPayStatus')}</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSorted.length > 0 ? filteredAndSorted.map(emp => {
                            const lastResignation = resignations.find(r => r.employeeId === emp.id && r.status === 'Approved');
                            return (
                                <tr key={emp.id}>
                                    <td>{emp.id}</td>
                                    <td>
                                        <div className="fw-bold">{emp.name}</div>
                                    </td>
                                    <td>{lastResignation?.position || 'N/A'}</td>
                                    <td>{formatDate(lastResignation?.effectiveDate) || 'N/A'}</td>
                                    <td className="text-end fw-bold">₱{formatCurrency(emp.finalPay)}</td>
                                    <td className="text-center">
                                        <span className={`status-badge status-${emp.finalPayStatus.toLowerCase()}`}>
                                            {emp.finalPayStatus}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <ActionsDropdown>
                                            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewProfile(emp); }}>
                                                <i className="bi bi-person-lines-fill me-2"></i>View Profile
                                            </a>
                                            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewReason(emp); }}>
                                                <i className="bi bi-info-circle me-2"></i>View Reason
                                            </a>
                                            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewFinalPay(emp); }}>
                                                <i className="bi bi-calculator-fill me-2"></i>View Final Pay Details
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
                            <tr><td colSpan="7" className="text-center p-4 text-muted">No resigned employees found matching your filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OffboardedEmployeesTab;