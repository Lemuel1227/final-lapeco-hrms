// src/hooks/payrollUtils.js

export const calculateLatenessDeductions = ({ employee, position, periodSchedules, periodLogs, isHr }) => {
    if (!employee || !position || !position.hourlyRate) {
        return 0;
    }

    const hourlyRate = position.hourlyRate;
    let totalDeduction = 0;

    const employeeSchedules = periodSchedules.filter(s => s.empId === employee.id);
    const employeeLogs = new Map(periodLogs.filter(l => l.empId === employee.id).map(l => [l.date, l]));

    employeeSchedules.forEach(schedule => {
        const log = employeeLogs.get(schedule.date);
        
        if (log && log.signIn && schedule.start_time) {
            const scheduledTime = new Date(`1970-01-01T${schedule.start_time}`);
            const signInTime = new Date(`1970-01-01T${log.signIn}`);
            
            if (signInTime > scheduledTime) {
                const minutesLate = (signInTime - scheduledTime) / 60000;

                if (isHr) {
                    // HR Rule: 1-30 minutes late
                    if (minutesLate >= 1 && minutesLate <= 30) {
                        totalDeduction += hourlyRate * 0.5;
                    }
                } else {
                    // Regular Employee Rule: 1-15 minutes late
                    if (minutesLate >= 1 && minutesLate <= 15) {
                        totalDeduction += hourlyRate * 0.25;
                    }
                }
            }
        }
    });

    return totalDeduction;
};

export const calculateFinalPay = (employee, position, payrolls = []) => {
    if (!employee || !position) {
        return { finalPay: 0, breakdown: {} };
    }

    // --- Find the last official payroll record for this employee ---
    const employeePayrolls = payrolls
        .flatMap(run => run.records.filter(rec => rec.empId === employee.id))
        .sort((a, b) => new Date(b.payEndDate) - new Date(a.payEndDate));

    const lastPayroll = employeePayrolls[0];

    // --- BASE EARNINGS & DEDUCTIONS from last payroll ---
    const baseEarnings = lastPayroll?.earnings || [];
    const baseDeductions = lastPayroll?.deductions || {};
    const baseOtherDeductions = lastPayroll?.otherDeductions || [];

    const totalBaseEarnings = baseEarnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalBaseDeductions = Object.values(baseDeductions).reduce((sum, val) => sum + val, 0) 
                              + baseOtherDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // --- FINAL PAY ADJUSTMENTS ---
    const dailyRate = position.monthlySalary / 22; // Assumption: 22 work days
    const leaveCreditPayout = (employee.leaveCredits?.vacation || 0) * dailyRate;

    // --- FINAL CALCULATION ---
    const totalEarnings = totalBaseEarnings + leaveCreditPayout;
    const totalDeductions = totalBaseDeductions;
    const finalPay = totalEarnings - totalDeductions;
    
    const earningsBreakdown = [
        ...baseEarnings.map(e => ({ label: e.description, amount: e.amount })),
        { label: `Unused Vacation Leave (${employee.leaveCredits?.vacation || 0} days)`, amount: leaveCreditPayout },
    ];
    
    const deductionsBreakdown = [
        ...Object.entries(baseDeductions).map(([key, value]) => ({ label: key.toUpperCase(), amount: value })),
        ...baseOtherDeductions.map(d => ({ label: d.description, amount: d.amount })),
    ];

    return {
        finalPay,
        breakdown: {
            earnings: earningsBreakdown,
            deductions: deductionsBreakdown,
            totalEarnings,
            totalDeductions,
            finalPay,
        },
    };
};