import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import IncomeBreakdownModal from '../../modals/IncomeBreakdownModal';
import { calculateSssContribution, calculatePhilhealthContribution, calculatePagibigContribution } from '../../hooks/contributionUtils';
import { calculateLatenessDeductions } from '../../hooks/payrollUtils';

const formatCurrency = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollGenerationPage = ({ employees, positions, schedules, attendanceLogs, holidays, onGenerate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
  const navigate = useNavigate();

  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);
  const holidayMap = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);
  
  const calculatedData = useMemo(() => {
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
      return [];
    }
    
    const periodSchedules = schedules.filter(s => s.date >= startDate && s.date <= endDate);
    const periodLogs = attendanceLogs.filter(a => a.date >= startDate && a.date <= endDate);

    return employees.map(emp => {
      const position = positionMap.get(emp.positionId);
      if (!position) return null;

      const dailyRate = position.monthlySalary / 22;
      let totalGross = 0;
      let totalHolidayPay = 0;
      const breakdown = [];
      const absences = [];
      let workdays = 0;
      let totalHours = 0;

      const empSchedulesInPeriod = periodSchedules.filter(s => s.empId === emp.id);
      const empLogsMap = new Map(periodLogs.filter(l => l.empId === emp.id).map(l => [l.date, l]));

      for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const schedule = empSchedulesInPeriod.find(s => s.date === dateStr);
        if (!schedule) continue;

        const attendance = empLogsMap.get(dateStr);
        const holiday = holidayMap.get(dateStr);
        
        let dailyPay = 0;
        let dayStatus = 'Absent';

        if (attendance && attendance.signIn) {
            workdays++;
            totalHours += 8;
            dailyPay = dailyRate;
            dayStatus = 'Present';

            if (holiday) {
                if (holiday.type === 'Regular Holiday') {
                    dailyPay *= 2;
                    totalHolidayPay += dailyRate;
                }
                if (holiday.type === 'Special Non-Working Day') {
                    dailyPay *= 1.3;
                    totalHolidayPay += dailyRate * 0.3;
                }
                dayStatus = `Worked Holiday (${holiday.name})`;
            }
        } else {
            dayStatus = 'Absent';
            absences.push({
                description: 'Unexcused',
                startDate: dateStr,
                endDate: dateStr,
                totalDays: 1
            });
        }
        
        totalGross += dailyPay;
        breakdown.push({ date: dateStr, status: dayStatus, pay: dailyPay });
      }
      
      const basePay = totalGross - totalHolidayPay;
      
      const earnings = [];
      if (basePay > 0) earnings.push({ description: 'Regular Pay', hours: totalHours, amount: parseFloat(basePay.toFixed(2)) });
      if (totalHolidayPay > 0) earnings.push({ description: 'Holiday Pay', hours: 0, amount: parseFloat(totalHolidayPay.toFixed(2)) });

      const isHr = position.id === 1;
      const latenessDeduction = calculateLatenessDeductions({
          employee: emp,
          position,
          periodSchedules,
          periodLogs,
          isHr,
      });

      const otherDeductions = [];
      if (latenessDeduction > 0) {
          otherDeductions.push({
              description: 'Late Deduction',
              amount: parseFloat(latenessDeduction.toFixed(2)),
              isSystemGenerated: true,
          });
      }

      return { emp, totalGross, breakdown, workdays, earnings, absences, otherDeductions };
    }).filter(Boolean);
  }, [startDate, endDate, employees, positions, schedules, attendanceLogs, holidays, positionMap, holidayMap]);

  const summary = useMemo(() => {
    return calculatedData.reduce((acc, curr) => {
        acc.totalGross += curr.totalGross;
        acc.employeeCount += 1;
        return acc;
    }, { totalGross: 0, employeeCount: 0 });
  }, [calculatedData]);

  const handleGeneratePayroll = () => {
    const payrollRun = {
      cutOff: `${startDate} to ${endDate}`,
      records: calculatedData.map(item => {
        const position = positionMap.get(item.emp.positionId);
        const monthlySalary = position?.monthlySalary || 0;

        const sss = calculateSssContribution(monthlySalary);
        const philhealth = calculatePhilhealthContribution(monthlySalary);
        const pagibig = calculatePagibigContribution(monthlySalary);

        const deductions = {
            tax: parseFloat((item.totalGross * 0.1).toFixed(2)),
            sss: parseFloat((sss.employeeShare / 2).toFixed(2)),
            philhealth: parseFloat((philhealth.employeeShare / 2).toFixed(2)),
            hdmf: parseFloat((pagibig.employeeShare / 2).toFixed(2)),
        };

        return {
            empId: item.emp.id,
            employeeName: item.emp.name,
            period: `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', {day: 'numeric'})}`,
            paymentDate: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 5)).toISOString().split('T')[0],
            cutOffStart: startDate,
            cutOffEnd: endDate,
            earnings: item.earnings,
            deductions: deductions,
            otherDeductions: item.otherDeductions,
            absences: item.absences,
            leaveBalances: { vacation: 12, sick: 8 },
            status: 'Pending',
        };
      })
    };
    onGenerate(payrollRun);
    navigate('/dashboard/payroll/history');
  };
  
  const handleViewBreakdown = (data) => {
    setSelectedEmployeeData(data);
    setShowBreakdownModal(true);
  };
  
  const hasValidDateRange = startDate && endDate && new Date(endDate) >= new Date(startDate);

  return (
    <div className="payroll-generation-container">
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="card-title payroll-projection-title">Step 1: Select Pay Period</h5>
          <p className="card-text text-muted">Select a date range to automatically calculate the gross income for all scheduled employees based on their attendance records.</p>
          <div className="row g-3">
            <div className="col-md-5">
              <label htmlFor="startDate" className="form-label fw-bold">Start Date</label>
              <input type="date" id="startDate" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="col-md-5">
              <label htmlFor="endDate" className="form-label fw-bold">End Date</label>
              <input type="date" id="endDate" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {hasValidDateRange && (
        <>
            <h5 className="mb-3 payroll-projection-title">Step 2: Review and Generate</h5>
            <div className="payroll-generation-summary mb-4">
                <div className="row">
                    <div className="col-md-6 summary-item border-end">
                        <div className="summary-label">Employees Included</div>
                        <div className="summary-value">{summary.employeeCount}</div>
                    </div>
                    <div className="col-md-6 summary-item">
                        <div className="summary-label">Total Projected Gross Pay</div>
                        <div className="summary-value text-success">₱{formatCurrency(summary.totalGross)}</div>
                    </div>
                </div>
            </div>
            <div className="card shadow-sm">
            <div className="table-responsive">
                <table className="table data-table mb-0">
                  <thead>
                    <tr>
                      <th className="col-id">Emp ID</th>
                      <th className="col-name">Employee</th>
                      <th className="col-workdays">Workdays</th>
                      <th className="col-amount">Calculated Gross</th>
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedData.map(item => (
                      <tr key={item.emp.id}>
                        <td className="col-id">{item.emp.id}</td>
                        <td className="col-name">{item.emp.name}</td>
                        <td className="col-workdays">{item.workdays}</td>
                        <td className="col-amount fw-bold">₱{formatCurrency(item.totalGross)}</td>
                        <td className="col-action">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewBreakdown(item)}>View Breakdown</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            <div className="card-footer text-end p-3">
                <button className="btn btn-success" onClick={handleGeneratePayroll} disabled={calculatedData.length === 0}>
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