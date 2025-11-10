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
    const targetEmpId = String(employee?.employee_id ?? employee?.id ?? '');
    const employeePayrolls = payrolls
        .flatMap(run => (run.records || []).filter(rec => String(rec.empId) === targetEmpId))
        .sort((a, b) => new Date(b.payEndDate || 0) - new Date(a.payEndDate || 0));

    const lastPayroll = employeePayrolls[0];

    // --- BASE EARNINGS & DEDUCTIONS from last payroll ---
    const baseEarnings = lastPayroll?.earnings || [];
    const baseDeductions = lastPayroll?.deductions || {};
    const baseOtherDeductions = lastPayroll?.otherDeductions || [];

    // Prefer explicit totals when available; gracefully fallback to computed sums
    const earningsFromItems = baseEarnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const grossFromRecord = Number(lastPayroll?.grossEarning ?? 0);
    const totalBaseEarnings = grossFromRecord > 0 ? grossFromRecord : earningsFromItems;

    const deductionsFromItems = Object.values(baseDeductions).reduce((sum, val) => sum + (Number(val) || 0), 0)
        + baseOtherDeductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDeductionsFromRecord = Math.abs(Number(lastPayroll?.totalDeductionsAmount ?? 0));
    const totalBaseDeductions = totalDeductionsFromRecord > 0 ? totalDeductionsFromRecord : deductionsFromItems;

    const netFromRecord = Number(lastPayroll?.netPay ?? (totalBaseEarnings - totalBaseDeductions) ?? 0);

    // --- FINAL PAY ADJUSTMENTS ---
    const monthlySalary = Number(position?.monthly_salary ?? position?.monthlySalary ?? 0);
    const baseRatePerHour = Number(position?.base_rate_per_hour ?? position?.baseRatePerHour ?? 0);
    const inferredDailyRate = monthlySalary > 0 ? monthlySalary / 22 : (baseRatePerHour > 0 ? baseRatePerHour * 8 : 0);
    const dailyRate = Number(position?.dailyRate ?? inferredDailyRate);
    const vacationDays = Number(employee?.leaveCredits?.vacation ?? 0);
    const leaveCreditPayout = vacationDays * (dailyRate || 0);

    // --- FINAL CALCULATION ---
    // Build display breakdowns that align with the computed totals
    const earningsBreakdown = [];
    if (baseEarnings.length > 0) {
        earningsBreakdown.push(...baseEarnings.map(e => ({ label: e.description, amount: Number(e.amount) || 0 })));
    } else if (totalBaseEarnings > 0) {
        earningsBreakdown.push({ label: 'Gross Pay (last payroll)', amount: totalBaseEarnings });
    }
    earningsBreakdown.push({ label: `Unused Vacation Leave (${vacationDays} days)`, amount: leaveCreditPayout });

    const deductionsBreakdown = [];
    const mappedBaseDeductions = Object.entries(baseDeductions).map(([key, value]) => ({ label: key.toUpperCase(), amount: Number(value) || 0 }));
    const mappedOtherDeductions = baseOtherDeductions.map(d => ({ label: d.description, amount: Number(d.amount) || 0 }));
    if (mappedBaseDeductions.length + mappedOtherDeductions.length > 0) {
        deductionsBreakdown.push(...mappedBaseDeductions, ...mappedOtherDeductions);
    } else if (totalBaseDeductions > 0) {
        deductionsBreakdown.push({ label: 'Total Deductions (last payroll)', amount: totalBaseDeductions });
    }

    const totalEarnings = earningsBreakdown.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalDeductions = deductionsBreakdown.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const finalPay = (netFromRecord || (totalBaseEarnings - totalBaseDeductions) || 0) + leaveCreditPayout;
    
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