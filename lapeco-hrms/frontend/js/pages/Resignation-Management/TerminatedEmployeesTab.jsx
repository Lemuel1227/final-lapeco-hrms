import React, { useState, useMemo } from 'react';
import ActionsDropdown from '../../common/ActionsDropdown';
import { calculateFinalPay } from '../../hooks/payrollUtils';

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
                
                const employeePayrolls = (payrolls || [])
                    .flatMap(run => run.records.filter(rec => rec.empId === emp.id))
                    .sort((a, b) => new Date(b.payEndDate || 0) - new Date(a.payEndDate || 0));
                
                const finalPayStatus = employeePayrolls[0]?.status || 'Pending';

                return { ...emp, finalPay, finalPayStatus };
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
                                        <span className={`status-badge status-${emp.finalPayStatus.toLowerCase()}`}>{emp.finalPayStatus}</span>
                                    </td>
                                    <td className="text-center">
                                        <ActionsDropdown>
                                            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewProfile(emp); }}>
                                                <i className="bi bi-person-lines-fill me-2"></i>View Profile
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
                            <tr><td colSpan="8" className="text-center p-4 text-muted">No terminated employees found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TerminatedEmployeesTab;