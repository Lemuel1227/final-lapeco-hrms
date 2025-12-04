import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import IncomeBreakdownModal from '../../modals/IncomeBreakdownModal';
import { calculateSssContribution, calculatePhilhealthContribution, calculatePagibigContribution, calculateTin } from '../../hooks/contributionUtils';
import { calculateLatenessDeductions } from '../../hooks/payrollUtils';
import { payrollAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

const formatCurrency = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1];
};

const MONTHS = [
    { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
    { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
    { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
    { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' },
];

const PayrollGenerationPage = ({ employees=[], positions=[], schedules=[], attendanceLogs=[], holidays=[], onGenerate, payrolls=[] }) => {
  const [inputStartDate, setInputStartDate] = useState('');
  const [inputEndDate, setInputEndDate] = useState('');

  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
  const navigate = useNavigate();

  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);
  const holidayMap = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const lastRequestKeyRef = useRef(null);
  const activeFetchRef = useRef(null);

  const { startDate, endDate, cutOffString } = useMemo(() => {
    if (inputStartDate && inputEndDate) {
      return { 
        startDate: inputStartDate, 
        endDate: inputEndDate, 
        cutOffString: `${inputStartDate} to ${inputEndDate}` 
      };
    }
    return { startDate: '', endDate: '', cutOffString: '' };
  }, [inputStartDate, inputEndDate]);

  // Keep a local cache of existing runs to ensure up-to-date checks
  const [existingRuns, setExistingRuns] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const checkExisting = async () => {
      try {
        const { data } = await payrollAPI.getAll();
        const runs = Array.isArray(data?.payroll_runs) ? data.payroll_runs : [];
        if (!cancelled) setExistingRuns(runs);
      } catch (e) {
        // If the check fails, fall back to the passed-in payrolls prop
        if (!cancelled) setExistingRuns([]);
      }
    };
    checkExisting();
    return () => { cancelled = true; };
  }, [cutOffString]);

  const isPeriodGenerated = useMemo(() => {
    const sourceRuns = (existingRuns && existingRuns.length > 0) ? existingRuns : (payrolls || []);
    return sourceRuns.some(p => p.cutOff === cutOffString);
  }, [existingRuns, payrolls, cutOffString]);

  const [calculatedData, setCalculatedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // When a period is already generated, clear any previous calculations once
  useEffect(() => {
    if (isPeriodGenerated) {
      if (calculatedData.length !== 0) setCalculatedData([]);
      if (isLoading) setIsLoading(false);
      if (error) setError('');
      lastRequestKeyRef.current = null;
      activeFetchRef.current = null;
    }
  }, [isPeriodGenerated]);

  useEffect(() => {
    // Do not calculate if the period is already generated
    if (isPeriodGenerated) {
      return;
    }

    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
      setCalculatedData([]);
      setError('');
      setIsLoading(false);
      lastRequestKeyRef.current = null;
      return;
    }

    const requestKey = `${startDate}|${endDate}|${schedules.length}|${attendanceLogs.length}|${employees.length}|${positions.length}`;
    if (lastRequestKeyRef.current === requestKey && !isLoading) {
      return;
    }
    lastRequestKeyRef.current = requestKey;

    const fetchId = Symbol('payroll-fetch');
    activeFetchRef.current = fetchId;

    const periodSchedulesForRange = schedules.filter(s => s.date >= startDate && s.date <= endDate);
    const periodLogsForRange = attendanceLogs.filter(a => a.date >= startDate && a.date <= endDate);

    const fetchPayroll = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await payrollAPI.compute({ start_date: startDate, end_date: endDate });
        if (activeFetchRef.current !== fetchId) {
          return;
        }

        const responseEmployees = Array.isArray(data?.employees) ? data.employees : [];

        const transformed = responseEmployees.map(empData => {
          const employee = employeeMap.get(empData.employee_id) || {
            id: empData.employee_id,
            name: empData.employee_name,
            positionId: null,
          };

          const position = positionMap.get(employee.positionId);

          const breakdown = (empData.daily_breakdown || []).map(day => ({
            date: day.date,
            status: day.status,
            pay: Number(day.pay) || 0,
            scheduledHours: Number(day.scheduled_hours ?? 0),
            attendedHours: Number(day.attended_hours ?? 0),
            overtimeHours: Number(day.overtime_hours ?? 0),
          }));

          const totalGross = Number(empData.gross_pay) || 0;
          const workdays = breakdown.filter(day => day.pay > 0).length;
          const totalHours = breakdown.reduce((sum, day) => sum + (day.attendedHours || 0), 0);
          const absences = breakdown
            .filter(day => day.status === 'Absent')
            .map(day => ({ description: 'Unexcused', startDate: day.date, endDate: day.date, totalDays: 1 }));

          const earnings = totalGross > 0
            ? [{ description: 'Gross Pay', hours: parseFloat(totalHours.toFixed(2)), amount: parseFloat(totalGross.toFixed(2)) }]
            : [];

          const latenessDeduction = calculateLatenessDeductions({
            employee,
            position,
            periodSchedules: periodSchedulesForRange,
            periodLogs: periodLogsForRange,
            isHr: position?.id === 1,
          });

          const otherDeductions = latenessDeduction > 0
            ? [{ description: 'Late Deduction', amount: parseFloat(latenessDeduction.toFixed(2)), isSystemGenerated: true }]
            : [];

          const enrichedEmployee = {
            ...employee,
            name: employee.name || empData.employee_name,
          };

          return {
            emp: enrichedEmployee,
            position,
            totalGross,
            breakdown,
            workdays,
            earnings,
            absences,
            otherDeductions,
          };
        }).filter(item => item.emp && item.emp.id);

        setCalculatedData(transformed);
        setSelectedEmployeeData(prev => {
          if (!prev) return null;
          return transformed.find(item => item.emp.id === prev.emp.id) || null;
        });
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to compute payroll.';
        setError(message);
        setCalculatedData([]);
        setSelectedEmployeeData(null);
        setToast({ show: true, message, type: 'error' });
      } finally {
        if (activeFetchRef.current === fetchId) {
          setIsLoading(false);
          activeFetchRef.current = null;
        }
      }
    };

    fetchPayroll();
  }, [startDate, endDate, schedules, attendanceLogs, employees.length, positions.length, isPeriodGenerated]);

  const summary = useMemo(() => ({
    totalGross: calculatedData.reduce((acc, curr) => acc + curr.totalGross, 0),
    employeeCount: calculatedData.length
  }), [calculatedData]);

  const handleGeneratePayroll = async () => {
    if (!startDate || !endDate) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = {
        start_date: startDate,
        end_date: endDate,
      };

      await payrollAPI.generate(payload);
      navigate('/dashboard/payroll/history');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to generate payroll.';
      setError(message);
      setToast({ show: true, message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewBreakdown = (data) => { setSelectedEmployeeData(data); setShowBreakdownModal(true); };

  return (
    <div className="payroll-generation-container">
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="card-title payroll-projection-title">Step 1: Select Pay Period</h5>
          <p className="card-text text-muted">Enter the start and end dates for the payroll period.</p>
          
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label htmlFor="startDate" className="form-label fw-bold">Start Date</label>
              <input 
                type="date" 
                id="startDate" 
                className="form-control" 
                value={inputStartDate} 
                onChange={e => setInputStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="endDate" className="form-label fw-bold">End Date</label>
              <input 
                type="date" 
                id="endDate" 
                className="form-control" 
                value={inputEndDate} 
                onChange={e => setInputEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {isPeriodGenerated && (
            <div className="alert alert-warning mt-3">
              A payroll run for this period (<strong>{cutOffString}</strong>) already exists. Delete the period to generate again.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {cutOffString && !isPeriodGenerated && !error && (
        <>
            <h5 className="mb-3 payroll-projection-title">Step 2: Review and Generate</h5>
            <div className="payroll-generation-summary mb-4">
                <div className="row">
                    <div className="col-md-6 summary-item border-end"><div className="summary-label">Employees Included</div><div className="summary-value">{summary.employeeCount}</div></div>
                    <div className="col-md-6 summary-item"><div className="summary-label">Total Projected Gross Pay</div><div className="summary-value text-success">₱{formatCurrency(summary.totalGross)}</div></div>
                </div>
            </div>
            <div className="card shadow-sm">
            <div className="table-responsive">
                {isLoading ? (
                  <div className="text-center py-4">Calculating payroll...</div>
                ) : (
                  <table className="table data-table mb-0">
                    <thead><tr><th>Emp ID</th><th>Employee</th><th>Workdays</th><th>Calculated Gross</th><th>Action</th></tr></thead>
                    <tbody>
                      {calculatedData.map(item => (
                        <tr key={item.emp.id}>
                          <td>{item.emp.id}</td><td>{item.emp.name}</td><td>{item.workdays}</td>
                          <td className="fw-bold">₱{formatCurrency(item.totalGross)}</td>
                          <td><button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewBreakdown(item)}>View Breakdown</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
            <div className="card-footer text-end p-3">
                <button className="btn btn-success" onClick={handleGeneratePayroll} disabled={isLoading || calculatedData.length === 0}>
                    <i className="bi bi-check2-circle me-2"></i>Generate Payroll Run
                </button>
            </div>
            </div>
        </>
      )}
      {selectedEmployeeData && <IncomeBreakdownModal show={showBreakdownModal} onClose={() => setShowBreakdownModal(false)} data={selectedEmployeeData}/>}
    </div>
  );
};

export default PayrollGenerationPage;