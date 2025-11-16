import React, { useState, useEffect, useMemo } from 'react';
import { addDays } from 'date-fns';
import { formatDate as formatMDY } from '../utils/dateUtils';
import './PayrollAdjustmentModal.css';
import ReportPreviewModal from './ReportPreviewModal';
import useReportGenerator from '../hooks/useReportGenerator';
import { calculateSssContribution, calculatePhilhealthContribution, calculatePagibigContribution, calculateTin } from '../hooks/contributionUtils';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultEarnings = [
    { description: 'Regular Hours', hours: 0, amount: 0, isDefault: true },
    { description: 'Overtime Pay', hours: 0, amount: 0, isDefault: true },
    { description: 'Night Differential', hours: 0, amount: 0, isDefault: true },
    { description: 'Regular Holiday Pay', hours: 0, amount: 0, isDefault: true },
    { description: 'Regular Holiday Pay OT', hours: 0, amount: 0, isDefault: true },
    { description: 'Special Holiday Pay', hours: 0, amount: 0, isDefault: true },
    { description: 'Special Holiday Pay OT', hours: 0, amount: 0, isDefault: true },
    { description: 'Allowance', hours: '--', amount: 0, isDefault: true },
    { description: 'Leave Pay', hours: '--', amount: 0, isDefault: true },
    { description: 'Pay Adjustment', hours: '--', amount: 0, isDefault: true },
];

const OTHER_DEDUCTION_TYPES = [
    'Cash Advance', 'Company Loan Repayment', 'Tardiness / Undertime',
    'Damaged Equipment', 'Uniform', 'Other',
];

const ADDITIONAL_EARNING_TYPES = [
    'Incentive', 'Commission', 'Bonus', 'Other Adjustment',
];

const InfoField = ({ label, children }) => (
    <div className="form-group">
        <label className="info-label">{label}</label>
        {children}
    </div>
);

const StatutoryField = ({ label, fieldKey, value, originalValue, onChange, onFocus, onBlur, activeField, readOnly = false, helperText }) => (
    <div className="form-group">
        <label htmlFor={fieldKey}>{label}</label>
        <div className="input-group">
            <span className="input-group-text">₱</span>
            <input 
                type="number" id={fieldKey} name={fieldKey}
                className={`form-control text-end ${readOnly ? 'fw-bold' : ''}`}
                value={readOnly ? Number(value).toFixed(2) : (activeField === fieldKey ? value : Number(value).toFixed(2))}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                step="0.01"
                readOnly={readOnly}
            />
        </div>
        <small className="form-text text-muted">
          {readOnly ? 'System Calculated' : (helperText ? helperText : `Original: ₱${formatCurrency(originalValue)}`)}
        </small>
    </div>
);


const PayrollAdjustmentModal = ({ show, onClose, onSave, onSaveEmployeeInfo, payrollData, employeeDetails, positions, allLeaveRequests, employees, theme }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [status, setStatus] = useState('');
  const [earnings, setEarnings] = useState([]);
  const [otherDeductions, setOtherDeductions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [editableEmployeeData, setEditableEmployeeData] = useState(null);
  const [statutoryDeductions, setStatutoryDeductions] = useState({});
  const [activeField, setActiveField] = useState(null);
  
  const [showPayslipPreview, setShowPayslipPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator(theme);

  const position = useMemo(() => {
    if (!employeeDetails || !positions) return null;
    return positions.find(p => p.id === employeeDetails.positionId);
  }, [employeeDetails, positions]);

  const semiGrossFromPayroll = useMemo(() => {
    const source = (payrollData?.earnings || []);
    return source.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [payrollData]);

  const systemCalculatedDeductions = useMemo(() => {
    const semi = semiGrossFromPayroll || 0;
    const sss = calculateSssContribution(semi, true);
    const philhealth = calculatePhilhealthContribution(semi, true);
    const pagibig = calculatePagibigContribution(semi, true);
    return {
      sss: parseFloat((sss.employeeShare || 0).toFixed(2)),
      philhealth: parseFloat((philhealth.employeeShare || 0).toFixed(2)),
      hdmf: parseFloat((pagibig.employeeShare || 0).toFixed(2)),
    };
  }, [semiGrossFromPayroll]);

  const eligibilityHelperTexts = useMemo(() => {
    const monthlyEquivalent = (earnings && earnings.length
      ? earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 2
      : (semiGrossFromPayroll || 0) * 2);
    const sssEligible = monthlyEquivalent >= 5000;
    const philEligible = monthlyEquivalent >= 10000;
    const pagEligible = monthlyEquivalent >= 1500;
    return {
      sss: sssEligible ? `Original: ₱${formatCurrency(systemCalculatedDeductions.sss)}` : 'Not eligible (below threshold)',
      philhealth: philEligible ? `Original: ₱${formatCurrency(systemCalculatedDeductions.philhealth)}` : 'Not eligible (below threshold)',
      hdmf: pagEligible ? `Original: ₱${formatCurrency(systemCalculatedDeductions.hdmf)}` : 'Not eligible (below threshold)'
    };
  }, [earnings, semiGrossFromPayroll, systemCalculatedDeductions]);

  useEffect(() => {
    if (payrollData && show) {
        setStatus(payrollData.status || 'Pending');
        setActiveTab('summary');
        // Ensure positionId is set from payrollData or employeeDetails
        const positionId = payrollData?.positionId || employeeDetails?.positionId;
        setEditableEmployeeData({ 
          ...employeeDetails,
          positionId: positionId
        });
        setAbsences(payrollData.absences || []);
        setOtherDeductions(payrollData.otherDeductions || []);

        const defaultEarningsCopy = JSON.parse(JSON.stringify(defaultEarnings));
        const normalizedMap = {
            'night differential pay': 'Night Differential',
            'special rate pay reg': 'Special Holiday Pay Reg',
            'special rate pay ot': 'Special Holiday Pay OT',
        };

        const combinedEarnings = defaultEarningsCopy.map(defaultItem => {
            const normalizedDefault = defaultItem.description.toLowerCase();
            const match = (payrollData.earnings || []).find(pde => {
                const normalizedDescription = pde.description.toLowerCase();
                const mapped = normalizedMap[normalizedDescription] || pde.description;
                return mapped.toLowerCase() === defaultItem.description.toLowerCase();
            });

            if (match) {
                return { ...defaultItem, ...match, description: defaultItem.description };
            }

            return { ...defaultItem };
        });

        (payrollData.earnings || []).forEach(earning => {
            const normalizedDescription = earning.description.toLowerCase();
            const mapped = (normalizedMap[normalizedDescription] || earning.description).toLowerCase();
            const hasDefault = defaultEarningsCopy.some(de => de.description.toLowerCase() === mapped);
            if (!hasDefault) {
                combinedEarnings.push({ ...earning, isNew: true });
            }
        });
        setEarnings(combinedEarnings);
        
        const initialGrossPay = combinedEarnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        const initialSss = parseFloat((payrollData.deductions?.sss || systemCalculatedDeductions.sss).toFixed(2));
        const initialPhilhealth = parseFloat((payrollData.deductions?.philhealth || systemCalculatedDeductions.philhealth).toFixed(2));
        const initialHdmf = parseFloat((payrollData.deductions?.pagibig || systemCalculatedDeductions.hdmf).toFixed(2));
        
        const initialTaxableIncome = initialGrossPay - (initialSss + initialPhilhealth + initialHdmf);
        const { taxWithheld } = calculateTin(initialTaxableIncome);
        const initialTax = parseFloat(taxWithheld.toFixed(2));

        setStatutoryDeductions({
            tax: initialTax,
            sss: initialSss,
            philhealth: initialPhilhealth,
            hdmf: initialHdmf,
        });
    }
  }, [payrollData, employeeDetails, show, systemCalculatedDeductions]);
  
  useEffect(() => {
    if (!show || !earnings.length) return; 

    const totalGrossPay = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const otherContributions = (Number(statutoryDeductions.sss) || 0) + (Number(statutoryDeductions.philhealth) || 0) + (Number(statutoryDeductions.hdmf) || 0);
    const taxableIncome = totalGrossPay - otherContributions;
    
    const { taxWithheld } = calculateTin(taxableIncome);
    const newTax = parseFloat(taxWithheld.toFixed(2));
    
    if (Math.abs((statutoryDeductions.tax || 0) - newTax) > 0.001) {
      setStatutoryDeductions(prev => ({ ...prev, tax: newTax }));
    }
  }, [earnings, statutoryDeductions.sss, statutoryDeductions.philhealth, statutoryDeductions.hdmf]);

  useEffect(() => {
    if (!show || !earnings.length) return;
    const totalGrossPay = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const sssCalc = calculateSssContribution(totalGrossPay, true);
    const philCalc = calculatePhilhealthContribution(totalGrossPay, true);
    const pagCalc = calculatePagibigContribution(totalGrossPay, true);
    const nextSss = parseFloat(((sssCalc.employeeShare || 0)).toFixed(2));
    const nextPhil = parseFloat(((philCalc.employeeShare || 0)).toFixed(2));
    const nextPag = parseFloat(((pagCalc.employeeShare || 0)).toFixed(2));
    setStatutoryDeductions(prev => ({
      ...prev,
      sss: activeField === 'sss' ? prev.sss : nextSss,
      philhealth: activeField === 'philhealth' ? prev.philhealth : nextPhil,
      hdmf: activeField === 'hdmf' ? prev.hdmf : nextPag,
    }));
  }, [earnings, activeField, show]);

  const totals = useMemo(() => {
    const totalGrossPay = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const statutoryDeductionsTotal = Object.values(statutoryDeductions).reduce((sum, val) => sum + Number(val), 0);
    const otherDeductionsTotal = otherDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDeductions = statutoryDeductionsTotal + otherDeductionsTotal;
    const netPay = totalGrossPay - totalDeductions;
    return { totalGrossPay, totalDeductions, netPay };
  }, [earnings, otherDeductions, statutoryDeductions]);
  
  const leaveBalances = useMemo(() => {
    // Use backend-provided leave balances if available
    if (payrollData?.leaveBalances) {
      const backendBalances = payrollData.leaveBalances;
      return {
        vacation: backendBalances['Vacation Leave'] || { total: 0, used: 0, remaining: 0 },
        sick: backendBalances['Sick Leave'] || { total: 0, used: 0, remaining: 0 },
      };
    }

    // Fallback to client-side calculation if backend data not available
    if (!employeeDetails) return { vacation: {}, sick: {} };
    const currentYear = new Date().getFullYear();
    const totalCredits = employeeDetails.leaveCredits || { 'Vacation Leave': 0, 'Sick Leave': 0 };
    const usedCredits = (allLeaveRequests || [])
      .filter(req => 
        req.empId === employeeDetails.id && 
        req.status === 'Approved' &&
        new Date(req.dateFrom).getFullYear() === currentYear
      )
      .reduce((acc, req) => {
        const type = req.leaveType;
        if (type === 'Vacation Leave') acc.vacation += req.days;
        if (type === 'Sick Leave') acc.sick += req.days;
        return acc;
      }, { vacation: 0, sick: 0 });
    return {
      vacation: { total: totalCredits['Vacation Leave'] || 0, used: usedCredits.vacation, remaining: (totalCredits['Vacation Leave'] || 0) - usedCredits.vacation },
      sick: { total: totalCredits['Sick Leave'] || 0, used: usedCredits.sick, remaining: (totalCredits['Sick Leave'] || 0) - usedCredits.sick },
    };
  }, [payrollData, employeeDetails, allLeaveRequests]);

  const leaveEarningsBreakdown = useMemo(() => {
      if (!absences.length || !position) return { breakdown: [], total: 0 };
      const dailyRate = position.hourlyRate * 8;
      const excusedAbsences = absences.filter(a => a.description === 'Excused').length;
      if (excusedAbsences === 0) return { breakdown: [], total: 0 };
      
      let tempVacation = leaveBalances.vacation.remaining;
      let tempSick = leaveBalances.sick.remaining;
      
      let breakdown = [];
      let daysToPay = excusedAbsences;
      
      const consumeLeave = (type, available) => {
          if (daysToPay > 0 && available > 0) {
              const daysConsumed = Math.min(daysToPay, available);
              breakdown.push({
                  type: `${type.charAt(0).toUpperCase() + type.slice(1)} Leave`,
                  days: daysConsumed,
                  amount: daysConsumed * dailyRate
              });
              daysToPay -= daysConsumed;
          }
      };
      
      consumeLeave('vacation', tempVacation);
      consumeLeave('sick', tempSick);

      const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
      return { breakdown, total };
  }, [absences, leaveBalances, position]);

  const handleItemChange = (index, field, value, type) => {
    let list, setter;
    switch(type) {
        case 'earnings': list = [...earnings]; setter = setEarnings; break;
        case 'otherDeductions': list = [...otherDeductions]; setter = setOtherDeductions; break;
        case 'absences': list = [...absences]; setter = setAbsences; break;
        default: return;
    }
    list[index][field] = value;
    setter(list);
  };

  const addItem = (type) => {
    if (type === 'earnings') {
      setEarnings(prev => [...prev, { tempId: Date.now(), description: ADDITIONAL_EARNING_TYPES[0], hours: '--', amount: 0, isNew: true }]);
    }
    if (type === 'otherDeductions') {
        setOtherDeductions(prev => [...prev, { description: OTHER_DEDUCTION_TYPES[0], amount: 0 }]);
    }
  };
  
  const removeItem = (index, type) => {
    const setter = type === 'otherDeductions' ? setOtherDeductions : setEarnings;
    setter(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleEmployeeInfoChange = (e) => {
    const { name, value } = e.target;
    setEditableEmployeeData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStatutoryChange = (e) => {
      const { name, value } = e.target;
      setStatutoryDeductions(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = () => {
    if (activeTab === 'info') {
      onSaveEmployeeInfo(editableEmployeeData.id, editableEmployeeData);
    } else {
      const leavePayTotal = leaveEarningsBreakdown.total;
      const leavePayHours = leaveEarningsBreakdown.breakdown.reduce((sum, item) => sum + (item.days * 8), 0);

      const updatedEarningsWithLeave = earnings.map(e => {
        if (e.description === 'Leave Pay') {
          return { ...e, amount: leavePayTotal, hours: leavePayHours > 0 ? leavePayHours : '--' };
        }
        return e;
      });

      const finalEarnings = updatedEarningsWithLeave.filter(e => e.amount !== 0 || e.isDefault);
      const finalDeductions = otherDeductions.filter(d => d.description.trim() !== '' || Number(d.amount) !== 0);
      
      onSave(payrollData.payrollId, { 
          status, 
          earnings: finalEarnings.map(({isDefault, isNew, tempId, ...rest}) => ({ ...rest, amount: parseFloat(Number(rest.amount).toFixed(2)) })), 
          otherDeductions: finalDeductions.map(d => ({...d, amount: parseFloat(Number(d.amount).toFixed(2)) })),
          absences: absences, 
          deductions: Object.fromEntries(Object.entries(statutoryDeductions).map(([key, value]) => [key === 'hdmf' ? 'pagibig' : key, parseFloat(Number(value).toFixed(2))])),
          netPay: totals.netPay 
      });
    }
    onClose();
  };
  
  const handleGeneratePayslip = async () => {
    try {
      const fullEmployeeDetails = {
        ...(employees.find(e => e.id === payrollData.empId) || {}),
        ...employeeDetails,
        id: String(employeeDetails?.id || payrollData?.empId || ''),
        name: String(employeeDetails?.name || ''),
        email: String(employeeDetails?.email || ''),
        tinNo: String(employeeDetails?.tinNo || ''),
        sssNo: String(employeeDetails?.sssNo || ''),
        philhealthNo: String(employeeDetails?.philhealthNo || ''),
        pagIbigNo: String(employeeDetails?.pagIbigNo || ''),
        positionTitle: position ? (position.title || position.name) : 'Unassigned'
      };
      
      const [start, end] = payrollData.cutOff.split(' to ');
      const calculatedPaymentDate = addDays(new Date(end), 5).toISOString().split('T')[0];

      const currentPayslipData = { 
        ...payrollData,
        payrollId: String(payrollData.payrollId || ''),
        empId: String(payrollData.empId || ''),
        earnings: earnings,
        otherDeductions: otherDeductions,
        absences: absences,
        deductions: statutoryDeductions,
        payStartDate: payrollData.payStartDate ?? start,
        payEndDate: payrollData.payEndDate ?? end,
        paymentDate: payrollData.paymentDate ?? calculatedPaymentDate,
        period: payrollData.period ?? payrollData.cutOff,
        leaveBalances: {
            vacation: leaveBalances.vacation?.total || 0,
            sick: leaveBalances.sick?.total || 0,
        },
      };
      
      await generateReport('payslip', {}, { payslipData: currentPayslipData, employeeDetails: fullEmployeeDetails });
      setShowPayslipPreview(true);
    } catch (error) {
      console.error('Error generating payslip:', error);
      alert('Failed to generate payslip. Please check the console for details.');
    }
  };

  const handleClosePreview = () => {
    setShowPayslipPreview(false);
    if (pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
    onClose();
  };

  if (!show || !editableEmployeeData) return null;
  
  const LeaveBalanceDisplay = ({ label, balanceData }) => {
    const percentage = balanceData.total > 0 ? (balanceData.remaining / balanceData.total) * 100 : 0;
    const getProgressBarVariant = (p) => p > 50 ? 'bg-success' : p > 20 ? 'bg-warning' : 'bg-danger';

    return (
        <div className="leave-balance-item">
            <div className="d-flex justify-content-between">
                <span className="balance-label">{label}</span>
                <span className="balance-summary-text">{balanceData.remaining} / {balanceData.total} Days Left</span>
            </div>
            <div className="progress" style={{height: '8px'}}>
                <div 
                    className={`progress-bar ${getProgressBarVariant(percentage)}`} 
                    style={{width: `${percentage}%`}}
                ></div>
            </div>
        </div>
    );
  };

  return (
    <>
      <div className={`modal fade show d-block ${showPayslipPreview ? 'modal-behind' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="modal-dialog modal-dialog-centered modal-xl payroll-adjustment-modal-dialog">
          <div className="modal-content payroll-adjustment-modal-content">
            <div className="modal-header">
              <h5 className="modal-title"><span className="employee-name">{payrollData.employeeName}</span><span className="period-text">({payrollData.cutOff})</span></h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>Earnings</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'deductions' ? 'active' : ''}`} onClick={() => setActiveTab('deductions')}>Deductions</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'absences' ? 'active' : ''}`} onClick={() => setActiveTab('absences')}>Absences</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'leave' ? 'active' : ''}`} onClick={() => setActiveTab('leave')}>Leave Balances</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Employee Info</button></li>
              </ul>
<div className="tab-content">
  {activeTab === 'summary' && <div className="summary-section">
    <div className="summary-row"><span className="label">Total Gross Earnings</span><span className="value value-positive">₱{formatCurrency(totals.totalGrossPay)}</span></div>
    <div className="summary-row"><span className="label">Total Deductions</span><span className="value value-negative">- ₱{formatCurrency(totals.totalDeductions)}</span></div>
    <div className="summary-row net-pay"><span className="label">Net Pay</span><span className="value">₱{formatCurrency(totals.netPay)}</span></div>
  </div>}

  {activeTab === 'earnings' && (
    <div>
      <div role="grid" className="earnings-grid">
        <div role="row" className="grid-header">
          <div role="columnheader">Description</div>
          <div role="columnheader" className="text-center">Hours</div>
          <div role="columnheader" className="text-end">Amount (₱)</div>
          <div role="columnheader" className="action-col-header"></div>
        </div>
        {earnings.map((item, index) => (
            <div role="row" className="grid-row" key={item.tempId || index}>
                <div role="gridcell">
                  {item.isNew ? (
                      <select className="form-select form-select-sm" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value, 'earnings')}>
                          {ADDITIONAL_EARNING_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                  ) : (
                      <input type="text" className="form-control form-control-inline" value={item.description} readOnly disabled />
                  )}
                </div>
                <div role="gridcell">
                  <input 
                    type={typeof item.hours === 'number' ? 'number' : 'text'} 
                    className="form-control form-control-inline text-center" 
                    value={item.hours} 
                    onChange={(e) => handleItemChange(index, 'hours', e.target.value, 'earnings')} 
                    readOnly={typeof item.hours !== 'number'} 
                  />
                </div>
                <div role="gridcell">
                  <input 
                    type="number" step="0.01" className="form-control form-control-inline text-end" 
                    value={activeField === `earning-${index}` ? item.amount : Number(item.amount).toFixed(2)} 
                    onChange={(e) => handleItemChange(index, 'amount', e.target.value, 'earnings')}
                    onFocus={() => setActiveField(`earning-${index}`)}
                    onBlur={() => setActiveField(null)}
                  />
                </div>
                <div role="gridcell" className="text-center">
                  {item.isNew && (
                      <button type="button" className="btn btn-sm btn-remove-row" onClick={() => removeItem(index, 'earnings')} title="Remove Earning"><i className="bi bi-x"></i></button>
                  )}
                </div>
            </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => addItem('earnings')}><i className="bi bi-plus-lg me-1"></i> Add Earning</button>
    </div>
  )}

  {activeTab === 'deductions' && (
    <div className="deductions-tab-grid">
      <div className="deductions-column">
        <h6 className="form-grid-title"><i className="bi bi-shield-check me-2"></i>Statutory Deductions</h6>
        <p className="text-muted small">Tax is calculated automatically. Other contributions can be overridden if necessary.</p>
        <div className="form-grid">
          <StatutoryField label="Withholding Tax" fieldKey="tax" value={statutoryDeductions.tax} readOnly={true} />
          <StatutoryField label="SSS Contribution" fieldKey="sss" value={statutoryDeductions.sss} originalValue={systemCalculatedDeductions.sss} onChange={handleStatutoryChange} onFocus={(e) => setActiveField(e.target.name)} onBlur={() => setActiveField(null)} activeField={activeField} helperText={eligibilityHelperTexts.sss} />
          <StatutoryField label="PhilHealth Contribution" fieldKey="philhealth" value={statutoryDeductions.philhealth} originalValue={systemCalculatedDeductions.philhealth} onChange={handleStatutoryChange} onFocus={(e) => setActiveField(e.target.name)} onBlur={() => setActiveField(null)} activeField={activeField} helperText={eligibilityHelperTexts.philhealth} />
          <StatutoryField label="Pag-IBIG Contribution" fieldKey="hdmf" value={statutoryDeductions.hdmf} originalValue={systemCalculatedDeductions.hdmf} onChange={handleStatutoryChange} onFocus={(e) => setActiveField(e.target.name)} onBlur={() => setActiveField(null)} activeField={activeField} helperText={eligibilityHelperTexts.hdmf} />
        </div>
      </div>
      <div className="deductions-column">
         <h6 className="form-grid-title"><i className="bi bi-wallet2 me-2"></i>Other Deductions / Repayments</h6>
         <div className="deduction-list">
           {otherDeductions.map((item, index) => {
              const isPredefined = OTHER_DEDUCTION_TYPES.includes(item.description);
              const isSystemGenerated = item.isSystemGenerated;
              return (
                  <div key={index} className="deduction-item-row">
                      {isSystemGenerated ? (
                          <input type="text" className="form-control form-control-sm" value={item.description} readOnly disabled />
                      ) : (
                        <select 
                            className="form-select form-select-sm" 
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value, 'otherDeductions')}
                        >
                            {OTHER_DEDUCTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            {!isPredefined && item.description && (
                                <option value={item.description} disabled>{item.description} (custom)</option>
                            )}
                        </select>
                      )}
                      <div className="input-group input-group-sm">
                          <span className="input-group-text">₱</span>
                          <input 
                            type="number" 
                            className="form-control text-end" 
                            placeholder="0.00" 
                            value={activeField === `deduction-${index}` ? item.amount : Number(item.amount).toFixed(2)} 
                            onChange={(e) => handleItemChange(index, 'amount', e.target.value, 'otherDeductions')}
                            onFocus={() => setActiveField(`deduction-${index}`)}
                            onBlur={() => setActiveField(null)}
                            step="0.01"
                          />
                      </div>
                      {!isSystemGenerated && (
                        <button type="button" className="btn btn-sm btn-remove-row" onClick={() => removeItem(index, 'otherDeductions')} title="Remove Deduction">
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                  </div>
              )
           })}
         </div>
         <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => addItem('otherDeductions')}><i className="bi bi-plus-lg me-1"></i> Add Deduction</button>
      </div>
    </div>
  )}
  
  {activeTab === 'absences' && (
    <div className="p-2">
      <p className="text-muted small">The following absences were automatically detected. You may change the description if an absence was excused (e.g., due to an approved leave).</p>
      {absences.length > 0 ? (
          <table className="table table-sm table-striped mt-3">
              <thead><tr><th>Description</th><th>Date</th></tr></thead>
              <tbody>
                  {absences.map((item, index) => (
                  <tr key={index}>
                      <td>
                        <select className="form-select form-select-sm" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value, 'absences')}>
                          <option value="Unexcused">Unexcused</option><option value="Excused">Excused</option>
                        </select>
                      </td>
                      <td>{formatMDY(new Date(item.startDate + 'T00:00:00'), 'long')}</td>
                  </tr>
                  ))}
              </tbody>
              <tfoot>
                  <tr className="table-light"><th className="text-end fw-bold">Total Absences:</th><th className="fw-bold">{absences.reduce((acc, curr) => acc + (curr.totalDays || 0), 0)} Day(s)</th></tr>
              </tfoot>
          </table>
      ) : (
          <div className="text-center p-5 bg-light rounded mt-3">
              <i className="bi bi-check-circle-fill fs-1 text-success mb-3 d-block"></i>
              <h5 className="text-muted">No Absences Recorded</h5>
              <p className="text-muted">The employee had perfect attendance for all scheduled workdays in this period.</p>
          </div>
      )}
    </div>
  )}

  {activeTab === 'leave' && (
    <div className="p-3">
      <div className="leave-balances-grid">
          <div>
              <h6 className="form-grid-title">Current Leave Balances (Year-to-Date)</h6>
              <p className="text-muted small">This is the employee's total remaining leave for the year.</p>
              <LeaveBalanceDisplay label="Vacation Leave" balanceData={leaveBalances.vacation} />
              <LeaveBalanceDisplay label="Sick Leave" balanceData={leaveBalances.sick} />
              <LeaveBalanceDisplay label="Emergency Leave" balanceData={leaveBalances.emergency} />
          </div>
          <div className="leave-earnings-breakdown">
              <h6 className="form-grid-title">Leave Earnings Breakdown (This Pay Period)</h6>
              <p className="text-muted small">Calculated pay for any excused absences in this period, based on available leave credits.</p>
              {leaveEarningsBreakdown.breakdown.length > 0 ? (
                  <table className="table table-sm">
                      <tbody>
                          {leaveEarningsBreakdown.breakdown.map(item => (
                              <tr key={item.type}>
                                  <td>{item.type} ({item.days} Day/s)</td>
                                  <td className="text-end">₱{formatCurrency(item.amount)}</td>
                              </tr>
                          ))}
                      </tbody>
                      <tfoot>
                          <tr className="table-light">
                              <th className="text-end">Total Leave Earnings</th>
                              <th className="text-end">₱{formatCurrency(leaveEarningsBreakdown.total)}</th>
                          </tr>
                      </tfoot>
                  </table>
              ) : (
                  <div className="text-center text-muted p-4 bg-light rounded">
                      No leave earnings recorded for this period.
                  </div>
              )}
          </div>
      </div>
    </div>
  )}

  {activeTab === 'info' && (
    <div className="p-3">
      <p className="text-muted small mb-3">Changes made here will update the employee's master record permanently upon saving.</p>
      <div className="form-grid">
          <InfoField label="Employee Full Name"><input type="text" name="name" className="form-control" value={editableEmployeeData.name} onChange={handleEmployeeInfoChange} /></InfoField>
          <InfoField label="Employee Number"><input type="text" className="form-control" value={editableEmployeeData.id} readOnly disabled /></InfoField>
          <InfoField label="Tax Identification Number"><input type="text" name="tinNo" className="form-control" value={editableEmployeeData.tinNo} onChange={handleEmployeeInfoChange} /></InfoField>
          <InfoField label="SSS Number"><input type="text" name="sssNo" className="form-control" value={editableEmployeeData.sssNo} onChange={handleEmployeeInfoChange} /></InfoField>
          <InfoField label="PhilHealth Number"><input type="text" name="philhealthNo" className="form-control" value={editableEmployeeData.philhealthNo} onChange={handleEmployeeInfoChange} /></InfoField>
          <InfoField label="HDMF (Pag-IBIG) Number"><input type="text" name="pagIbigNo" className="form-control" value={editableEmployeeData.pagIbigNo} onChange={handleEmployeeInfoChange} /></InfoField>
          <InfoField label="Position">
            <select name="positionId" className="form-control" value={editableEmployeeData?.positionId || ''} onChange={handleEmployeeInfoChange}>
              <option value="">Select Position</option>
              {(positions || []).map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
            </select>
          </InfoField>
          <InfoField label="Status"><select name="status" className="form-select" value={editableEmployeeData.status} onChange={handleEmployeeInfoChange}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></InfoField>
      </div>
    </div>
  )}
</div>
            </div>
            <div className="modal-footer">
              <div className="footer-actions-left">
                <button type="button" className="btn btn-outline-primary" onClick={handleGeneratePayslip} disabled={isLoading}>
                  {isLoading ? 'Generating...' : <><i className="bi bi-file-earmark-text-fill me-2"></i>Preview Payslip</>}
                </button>
              </div>
              <div className="footer-actions-right">
                {activeTab !== 'info' && <div className="status-selector"><label htmlFor="payrollStatus" className="form-label mb-0">Status:</label><select id="payrollStatus" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="Pending">Pending</option><option value="Paid">Paid</option></select></div>}
                <button type="button" className="btn btn-success" onClick={handleSaveClick}><i className="bi bi-save-fill me-2"></i>{activeTab === 'info' ? 'Save Employee Info' : 'Save Payroll Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal 
          show={showPayslipPreview} 
          onClose={handleClosePreview} 
          pdfDataUri={pdfDataUri} 
          reportTitle={`Payslip Preview - ${payrollData.employeeName}`} 
        />
      )}
    </>
  );
};

export default PayrollAdjustmentModal;
