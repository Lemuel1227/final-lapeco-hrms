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