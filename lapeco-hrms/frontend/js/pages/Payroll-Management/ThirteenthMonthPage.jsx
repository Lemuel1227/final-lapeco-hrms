import React, { useState, useMemo, useEffect } from 'react';
import { employeeAPI, payrollAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import useReportGenerator from '../../hooks/useReportGenerator';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import ConfirmationModal from '../../modals/ConfirmationModal';

const formatCurrency = (value) => {
    if (typeof value !== 'number') return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ThirteenthMonthPage = ({ employees = [], payrolls = [] }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [statuses, setStatuses] = useState({});
    const [showConfirmMarkAll, setShowConfirmMarkAll] = useState(false);

    const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
    const [showReportPreview, setShowReportPreview] = useState(false);

    // Local data state: fetch when props are not provided
    const [localEmployees, setLocalEmployees] = useState(Array.isArray(employees) ? employees : []);
    const [localPayrolls, setLocalPayrolls] = useState(Array.isArray(payrolls) ? payrolls : []);
    // Detailed records per payroll period (populated for selected year)
    const [runRecordsByPeriod, setRunRecordsByPeriod] = useState({});
    const [isFetchingYearDetails, setIsFetchingYearDetails] = useState(false);
    const [isFetchingBaseData, setIsFetchingBaseData] = useState(false);

    useEffect(() => {
        // If no employees or payrolls passed in, fetch them
        const needsEmployees = !Array.isArray(localEmployees) || localEmployees.length === 0;
        const needsPayrolls = !Array.isArray(localPayrolls) || localPayrolls.length === 0;
        if (!needsEmployees && !needsPayrolls) return;

        const fetchData = async () => {
            try {
                setIsFetchingBaseData(true);
                const promises = [];
                if (needsEmployees) promises.push(employeeAPI.getAll());
                if (needsPayrolls) promises.push(payrollAPI.getAll());
                const results = await Promise.all(promises);

                let idx = 0;
                if (needsEmployees) {
                    const empRes = results[idx++];
                    const empData = Array.isArray(empRes?.data) ? empRes.data : (empRes?.data?.data || []);
                    const normalizedEmployees = empData.map(e => ({
                        id: e.id,
                        name: e.name || [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' '),
                        joiningDate: e.joining_date ?? e.joiningDate ?? null,
                        positionId: e.position_id ?? e.positionId,
                        position: e.position ?? e.position?.name ?? '',
                        imageUrl: e.image_url ? (typeof e.image_url === 'string' ? e.image_url : null) : null,
                        status: e.account_status ?? e.status,
                    }));
                    setLocalEmployees(normalizedEmployees);
                }
                if (needsPayrolls) {
                    const prRes = results[idx++];
                    const runs = Array.isArray(prRes?.data?.payroll_runs) ? prRes.data.payroll_runs : [];
                    setLocalPayrolls(runs);
                }
            } catch (err) {
                // If fetch fails, keep existing state (may be empty)
                console.error('Failed to load employees/payrolls for 13th month page:', err);
            } finally {
                setIsFetchingBaseData(false);
            }
        };
        fetchData();
    }, [localEmployees, localPayrolls]);

    // Robust year parsing for varying date formats
    const parseYear = (dateLike) => {
        if (!dateLike) return NaN;
        const str = String(dateLike);
        // Try ISO
        const iso = new Date(str);
        if (!isNaN(iso.getTime())) return iso.getFullYear();
        // Try DD/MM/YYYY
        const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return Number(m[3]);
        return NaN;
    };

    const uniqueYears = useMemo(() => {
        const years = new Set((localPayrolls || []).map(run => {
            const left = String(run.cutOff || '').split(' to ')[0];
            const d = new Date(left);
            return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
        }));
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [localPayrolls]);

    // Fetch detailed payroll run records for the selected year
    useEffect(() => {
        const selectedYearStr = year.toString();
        const runsForYear = (localPayrolls || []).filter(r => String(r.cutOff || '').includes(selectedYearStr));
        const missingPeriodIds = runsForYear
            .map(r => r.periodId)
            .filter(pid => pid && !runRecordsByPeriod[pid]);

        if (missingPeriodIds.length === 0) return;

        let cancelled = false;
        const fetchDetails = async () => {
            try {
                setIsFetchingYearDetails(true);
                const responses = await Promise.all(missingPeriodIds.map(pid => payrollAPI.getPeriodDetails(pid).catch(() => null)));
                const nextMap = { ...runRecordsByPeriod };
                responses.forEach((res, idx) => {
                    const pid = missingPeriodIds[idx];
                    const records = Array.isArray(res?.data?.records) ? res.data.records : [];
                    nextMap[pid] = records;
                });
                if (!cancelled) setRunRecordsByPeriod(nextMap);
            } catch (e) {
                console.error('Failed to fetch payroll period details for 13th month:', e);
            } finally {
                if (!cancelled) setIsFetchingYearDetails(false);
            }
        };
        fetchDetails();
        return () => { cancelled = true; };
    }, [year, localPayrolls, runRecordsByPeriod]);

    const calculationResults = useMemo(() => {
        const selectedYearStr = year.toString();
        const selectedYearNum = Number(year);
        const employeeList = Array.isArray(localEmployees) ? localEmployees : [];

        // Flatten records from fetched period details for the selected year
        const recordsForYear = (localPayrolls || [])
            .filter(run => String(run.cutOff || '').includes(selectedYearStr))
            .flatMap(run => {
                const recs = runRecordsByPeriod[run.periodId];
                return Array.isArray(recs) ? recs : [];
            });

        // Eligibility: joined on or before selected year; if unknown join date, include
        const eligibleEmployees = employeeList.filter(emp => {
            const jy = parseYear(emp.joiningDate);
            return isNaN(jy) ? true : (jy <= selectedYearNum);
        });

        const details = eligibleEmployees.map(emp => {
            let totalBasicSalary = 0;
            const canonicalEmpId = String(emp?.employee_id ?? emp?.employeeId ?? emp?.id ?? '');

            recordsForYear.forEach(record => {
                const recEmpId = String(record?.empId ?? record?.employeeId ?? '');
                if (recEmpId && recEmpId === canonicalEmpId) {
                    if (Array.isArray(record.earnings) && record.earnings.length > 0) {
                        const baseFromItems = record.earnings.reduce((sum, earning) => {
                            const desc = (earning.description || '').toLowerCase();
                            const isBase = desc.includes('regular') || desc.includes('basic') || desc.includes('salary');
                            return sum + (isBase ? (Number(earning.amount) || 0) : 0);
                        }, 0);
                        // If we couldn't detect base from descriptions, fallback to gross or sum of earnings
                        if (baseFromItems > 0) {
                            totalBasicSalary += baseFromItems;
                        } else {
                            const sumAllEarnings = record.earnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                            const gross = Number(record.grossEarning) || 0;
                            totalBasicSalary += (gross > 0 ? gross : sumAllEarnings);
                        }
                    } else {
                        // Fallback: if detailed earnings are unavailable, use grossEarning as proxy
                        totalBasicSalary += Number(record.grossEarning) || 0;
                    }
                }
            });

            const thirteenthMonthPay = totalBasicSalary > 0 ? totalBasicSalary / 12 : 0;

            return {
                ...emp,
                totalBasicSalary,
                thirteenthMonthPay,
            };
        });

        // Exclude employees who have no computed 13th month pay yet
        const filteredDetails = details.filter(emp => (emp.thirteenthMonthPay || 0) > 0);
        const totalPayout = filteredDetails.reduce((sum, emp) => sum + (emp.thirteenthMonthPay || 0), 0);

        return {
            details: filteredDetails,
            totalPayout,
            eligibleCount: filteredDetails.length,
        };
    }, [year, localEmployees, localPayrolls, runRecordsByPeriod]);

    useEffect(() => {
        setStatuses(prev => {
            const nextStatuses = { ...prev };
            let hasChanges = false;

            const detailIds = new Set();
            calculationResults.details.forEach(emp => {
                detailIds.add(emp.id);
                if (!(emp.id in nextStatuses)) {
                    nextStatuses[emp.id] = 'Pending';
                    hasChanges = true;
                }
            });

            Object.keys(nextStatuses).forEach(id => {
                if (!detailIds.has(id)) {
                    delete nextStatuses[id];
                    hasChanges = true;
                }
            });

            return hasChanges ? nextStatuses : prev;
        });
    }, [calculationResults.details]);

    const handleStatusChange = (employeeId, newStatus) => {
        setStatuses(prev => ({
            ...prev,
            [employeeId]: newStatus,
        }));
    };

    const filteredAndSortedDetails = useMemo(() => {
        let filtered = calculationResults.details.filter(d => 
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(d.id).toLowerCase().includes(searchTerm.toLowerCase())
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

    const handleConfirmMarkAll = () => {
        setStatuses(prev => {
            const updated = { ...prev };
            filteredAndSortedDetails.forEach(item => {
                updated[item.id] = 'Paid';
            });
            return updated;
        });
        setShowConfirmMarkAll(false);
    };

    const handleClosePreview = () => {
        setShowReportPreview(false);
        if (pdfDataUri) {
            URL.revokeObjectURL(pdfDataUri);
        }
        setPdfDataUri('');
    };

    const isCalculating = isFetchingBaseData || isFetchingYearDetails;

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
                                disabled={isCalculating}
                            />
                        </div>
                        <div className="year-selector-group">
                             <label htmlFor="year-select" className="form-label">Year:</label>
                             <select id="year-select" className="form-select form-select-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={isCalculating}>
                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="controls-right d-flex gap-2">
                        <button className="btn btn-sm btn-success" onClick={() => setShowConfirmMarkAll(true)} disabled={isCalculating || filteredAndSortedDetails.length === 0}>
                            <i className="bi bi-check2-all me-2"></i>Mark All as Paid
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleExport} disabled={isCalculating || filteredAndSortedDetails.length === 0}>
                            <i className="bi bi-download me-2"></i>Export Excel
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleGenerateReport} disabled={isCalculating || isLoading || filteredAndSortedDetails.length === 0}>
                            <i className="bi bi-file-earmark-text-fill me-2"></i>Generate Report
                        </button>
                    </div>
                </div>
                <div className="table-responsive position-relative" style={{ minHeight: '220px' }}>
                    {isCalculating && (
                        <div className="d-flex flex-column align-items-center justify-content-center position-absolute top-0 start-0 w-100 h-100" style={{ background: 'rgba(0,0,0,0.03)' }}>
                            <div className="spinner-border text-success" role="status"></div>
                            <div className="mt-3 text-muted fw-medium">Calculating 13th month pay</div>
                        </div>
                    )}
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
                                            {/* Avatar removed per request */}
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
                                            disabled={isCalculating}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Paid">Paid</option>
                                        </select>
                                    </td>
                                </tr>
                            )}) : (!isCalculating ? (
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
                            ) : null)}
                        </tbody>
                    </table>
                </div>
            </div>
            <ConfirmationModal
                show={showConfirmMarkAll}
                onClose={() => setShowConfirmMarkAll(false)}
                onConfirm={handleConfirmMarkAll}
                title="Mark All as Paid"
                confirmText="Yes, Mark All"
                confirmVariant="success"
            >
                <p>Mark all <strong>{filteredAndSortedDetails.length}</strong> displayed employees as <strong>Paid</strong> for {year}?</p>
                <p className="text-muted">This updates only the statuses in this view.</p>
            </ConfirmationModal>
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
