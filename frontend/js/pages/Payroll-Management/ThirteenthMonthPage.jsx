import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import placeholderAvatar from '../../../assets/placeholder-profile.jpg';
import useReportGenerator from '../../../hooks/useReportGenerator';
import ReportPreviewModal from '../../modals/ReportPreviewModal';

const formatCurrency = (value) => {
    if (typeof value !== 'number') return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ThirteenthMonthPage = ({ employees = [], payrolls = [] }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [statuses, setStatuses] = useState({});

    const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
    const [showReportPreview, setShowReportPreview] = useState(false);

    const uniqueYears = useMemo(() => {
        const years = new Set(payrolls.map(run => run.cutOff.split(' to ')[0].substring(0, 4)));
        const currentYear = new Date().getFullYear();
        years.add(currentYear.toString());
        return Array.from(years).sort((a, b) => b - a);
    }, [payrolls]);

    const calculationResults = useMemo(() => {
        const selectedYear = year.toString();
        
        const eligibleEmployees = employees.filter(emp => {
            const joiningYear = new Date(emp.joiningDate).getFullYear();
            return joiningYear <= selectedYear;
        });

        const details = eligibleEmployees.map(emp => {
            let totalBasicSalary = 0;

            payrolls.forEach(run => {
                if (!run.cutOff.includes(selectedYear)) {
                    return;
                }
                const record = run.records.find(r => r.empId === emp.id);
                if (record && record.earnings) {
                    record.earnings.forEach(earning => {
                        if (earning.description?.toLowerCase().includes('regular pay')) {
                            totalBasicSalary += Number(earning.amount) || 0;
                        }
                    });
                }
            });

            const thirteenthMonthPay = totalBasicSalary > 0 ? totalBasicSalary / 12 : 0;

            return {
                ...emp,
                totalBasicSalary,
                thirteenthMonthPay,
            };
        }).filter(empData => empData.totalBasicSalary > 0);

        const totalPayout = details.reduce((sum, emp) => sum + emp.thirteenthMonthPay, 0);
        
        return {
            details,
            totalPayout,
            eligibleCount: details.length,
        };
    }, [year, employees, payrolls]);

    useEffect(() => {
        const initialStatuses = {};
        calculationResults.details.forEach(emp => {
            initialStatuses[emp.id] = 'Pending';
        });
        setStatuses(initialStatuses);
    }, [calculationResults.details, year]);

    const handleStatusChange = (employeeId, newStatus) => {
        setStatuses(prev => ({
            ...prev,
            [employeeId]: newStatus,
        }));
    };

    const filteredAndSortedDetails = useMemo(() => {
        let filtered = calculationResults.details.filter(d => 
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.id.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return [...filtered].sort((a, b) => {
            const key = sortConfig.key;
            const direction = sortConfig.direction === 'ascending' ? 1 : -1;
            
            const valA = a[key];
            const valB = b[key];

            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * direction;
            }
            return (valA - valB) * direction;
        });
    }, [searchTerm, calculationResults.details, sortConfig]);

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

    const handleExport = () => {
        const dataForExport = filteredAndSortedDetails.map(item => ({
            'Employee ID': item.id,
            'Employee Name': item.name,
            'Total Basic Salary': item.totalBasicSalary.toFixed(2),
            '13th Month Pay': item.thirteenthMonthPay.toFixed(2),
            'Status': statuses[item.id] || 'Pending',
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `13th_Month_Pay_${year}`);
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `13th_Month_Pay_Report_${year}.xlsx`);
    };

    const handleGenerateReport = () => {
        const reportData = {
            year,
            totalPayout: calculationResults.totalPayout,
            eligibleCount: calculationResults.eligibleCount,
            records: filteredAndSortedDetails.map(emp => ({ ...emp, status: statuses[emp.id] || 'Pending' })),
        };
        generateReport('thirteenth_month_pay', { year }, { thirteenthMonthPayData: reportData });
        setShowReportPreview(true);
    };

    const handleClosePreview = () => {
        setShowReportPreview(false);
        if (pdfDataUri) {
            URL.revokeObjectURL(pdfDataUri);
        }
        setPdfDataUri('');
    };

    return (
        <div className="thirteenth-month-container">
            <div className="thirteenth-month-summary-grid">
                <div className="summary-card-13th">
                    <div className="summary-label"><i className="bi bi-cash-coin me-2"></i>Total Payout</div>
                    <div className="summary-value text-success">₱{formatCurrency(calculationResults.totalPayout)}</div>
                </div>
                <div className="summary-card-13th">
                    <div className="summary-label"><i className="bi bi-people-fill me-2"></i>Eligible Employees</div>
                    <div className="summary-value">{calculationResults.eligibleCount}</div>
                </div>
            </div>
            
            <div className="card data-table-card shadow-sm">
                <div className="card-header thirteenth-month-controls">
                    <div className="controls-left">
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-search"></i></span>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="year-selector-group">
                             <label htmlFor="year-select" className="form-label">Year:</label>
                             <select id="year-select" className="form-select form-select-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="controls-right d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleExport} disabled={filteredAndSortedDetails.length === 0}>
                            <i className="bi bi-download me-2"></i>Export Excel
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleGenerateReport} disabled={isLoading || filteredAndSortedDetails.length === 0}>
                            <i className="bi bi-file-earmark-text-fill me-2"></i>Generate Report
                        </button>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table data-table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th className="sortable" style={{width: '15%'}} onClick={() => requestSort('id')}>Employee ID {getSortIcon('id')}</th>
                                <th className="sortable" style={{width: '30%'}} onClick={() => requestSort('name')}>Employee Name {getSortIcon('name')}</th>
                                <th className="text-end sortable" style={{width: '20%'}} onClick={() => requestSort('totalBasicSalary')}>Total Basic Salary ({year}) {getSortIcon('totalBasicSalary')}</th>
                                <th className="text-end sortable" style={{width: '20%'}} onClick={() => requestSort('thirteenthMonthPay')}>13th Month Pay {getSortIcon('thirteenthMonthPay')}</th>
                                <th className="text-center" style={{width: '15%'}}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedDetails.length > 0 ? filteredAndSortedDetails.map(item => {
                                const status = statuses[item.id] || 'Pending';
                                return (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <img src={item.imageUrl || placeholderAvatar} alt={item.name} className="avatar-table me-3" />
                                            <div>
                                                <div className="fw-bold">{item.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-end">₱{formatCurrency(item.totalBasicSalary)}</td>
                                    <td className="text-end fw-bold text-success">₱{formatCurrency(item.thirteenthMonthPay)}</td>
                                    <td className="text-center">
                                        <select 
                                            className={`form-select form-select-sm status-select status-select-${status.toLowerCase()}`}
                                            value={status}
                                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                            style={{ minWidth: '120px' }}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Paid">Paid</option>
                                        </select>
                                    </td>
                                </tr>
                            )}) : (
                                <tr>
                                    <td colSpan="5">
                                        <div className="text-center p-5">
                                            <i className="bi bi-info-circle fs-1 text-muted mb-3 d-block"></i>
                                            <h5 className="text-muted">
                                                {calculationResults.details.length === 0 ? `No payroll data found for ${year}.` : 'No employees match your search.'}
                                            </h5>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {(isLoading || pdfDataUri) && (
                <ReportPreviewModal
                    show={showReportPreview}
                    onClose={handleClosePreview}
                    pdfDataUri={pdfDataUri}
                    reportTitle={`13th Month Pay Report for ${year}`}
                />
            )}
        </div>
    );
};

export default ThirteenthMonthPage;