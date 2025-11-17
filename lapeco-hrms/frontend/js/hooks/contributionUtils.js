import { format } from 'date-fns';

const MOCK_COMPANY_INFO = {
    employerIdSss: '03-9-1234567-8',
    employerName: 'Lapeco Group of Companies',
    address: '123 Innovation Drive, Tech City',
};

/**
 * SSS (Social Security System) Contribution Calculator
 * Rate: 14% of Monthly Salary Credit (MSC)
 * Split: Employer 9.5% | Employee 4.5%
 * MSC Range: ₱3,000 to ₱30,000
 * Maximum Employee Share: ₱1,350/month (4.5% of ₱30,000)
 */
export const calculateSssContribution = (salary, isProvisional = false) => {
    const monthlyEquivalent = isProvisional ? salary * 2 : salary;
    if (monthlyEquivalent < 5000) {
        return { employeeShare: 0, employerShare: 0, total: 0 };
    }
    let msc = Math.min(monthlyEquivalent, 30000);
    if (msc < 30000) {
        const remainder = msc % 500;
        msc = remainder < 250 ? msc - remainder : msc - remainder + 500;
    }
    const monthlyEmployeeShare = msc * 0.045;
    const monthlyEmployerShare = msc * 0.095;
    const divisor = isProvisional ? 2 : 1;
    return {
        employeeShare: monthlyEmployeeShare / divisor,
        employerShare: monthlyEmployerShare / divisor,
        total: (monthlyEmployeeShare + monthlyEmployerShare) / divisor,
    };
};

/**
 * PhilHealth Contribution Calculator (2024)
 * Rate: 5.0% of monthly salary
 * Split: 50% employer, 50% employee (2.5% each)
 * Income Floor: ₱10,000 (Minimum salary considered)
 * Income Ceiling: ₱100,000 (Maximum salary considered)
 * Employee Share Range: ₱250/month (min) to ₱2,500/month (max)
 */
export const calculatePhilhealthContribution = (salary, isProvisional = false) => {
    const monthlyEquivalent = isProvisional ? salary * 2 : salary;
    if (monthlyEquivalent < 10000) {
        return { employeeShare: 0, employerShare: 0, total: 0 };
    }
    const rate = 0.05;
    const incomeCeiling = 100000;
    const baseSalary = Math.min(monthlyEquivalent, incomeCeiling);
    const totalPremium = baseSalary * rate;
    const divisor = isProvisional ? 2 : 1;
    return {
        employeeShare: (totalPremium / 2) / divisor,
        employerShare: (totalPremium / 2) / divisor,
        total: totalPremium / divisor,
    };
};

/**
 * Pag-IBIG Fund Contribution Calculator
 * Employee Contribution: 1% (if earning ≤₱1,500) or 2% (if earning >₱1,500)
 * Employer Contribution: 2%
 * Maximum monthly compensation considered: ₱5,000
 * Max Employee Share: ₱100/month
 * Max Employer Share: ₱100/month
 */
export const calculatePagibigContribution = (salary, isProvisional = false) => {
    const monthlyEquivalent = isProvisional ? salary * 2 : salary;
    if (monthlyEquivalent < 1500) {
        return { employeeShare: 0, employerShare: 0, total: 0 };
    }
    const monthlyEmployeeShare = 100;
    const monthlyEmployerShare = 200;
    const divisor = isProvisional ? 2 : 1;
    return {
        employeeShare: monthlyEmployeeShare / divisor,
        employerShare: monthlyEmployerShare / divisor,
        total: (monthlyEmployeeShare + monthlyEmployerShare) / divisor,
    };
};

/**
 * Withholding Tax Calculator (TRAIN Law)
 * 
 * Annual Tax Brackets:
 * ₱250,000 and below: 0%
 * Over ₱250,000 up to ₱400,000: 15% of excess over ₱250,000
 * Over ₱400,000 up to ₱800,000: ₱22,500 + 20% of excess over ₱400,000
 * Over ₱800,000 up to ₱2,000,000: ₱102,500 + 25% of excess over ₱800,000
 * Over ₱2,000,000 up to ₱8,000,000: ₱402,500 + 30% of excess over ₱2,000,000
 * Over ₱8,000,000: ₱2,202,500 + 35% of excess over ₱8,000,000
 * 
 * Note: Taxable income = Gross - SSS - PhilHealth - Pag-IBIG - Other non-taxable benefits
 * Semi-monthly brackets (Annual ÷ 24):
 */
export const calculateTin = (taxableSemiMonthlySalary) => {
    let tax = 0;
    
    // ₱250,000/year ÷ 24 = ₱10,417 (0% tax)
    if (taxableSemiMonthlySalary <= 10417) {
        tax = 0;
    }
    // Over ₱10,417 up to ₱16,666 (15%)
    else if (taxableSemiMonthlySalary <= 16666) {
        tax = (taxableSemiMonthlySalary - 10417) * 0.15;
    }
    // Over ₱16,667 up to ₱33,332 (20%)
    else if (taxableSemiMonthlySalary <= 33332) {
        tax = 937.50 + (taxableSemiMonthlySalary - 16667) * 0.20;
    }
    // Over ₱33,333 up to ₱83,332 (25%)
    else if (taxableSemiMonthlySalary <= 83332) {
        tax = 4270.70 + (taxableSemiMonthlySalary - 33333) * 0.25;
    }
    // Over ₱83,333 up to ₱333,332 (30%)
    else if (taxableSemiMonthlySalary <= 333332) {
        tax = 16770.70 + (taxableSemiMonthlySalary - 83333) * 0.30;
    }
    // Over ₱333,333 (35%)
    else {
        tax = 91770.70 + (taxableSemiMonthlySalary - 333333) * 0.35;
    }
    
    return { taxWithheld: tax > 0 ? tax : 0 };
};

export const generateSssData = (employees, aggregatedRecords, month, isProvisional) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const rows = aggregatedRecords.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;
        
        const contribution = calculateSssContribution(record.totalGross, isProvisional);

        return {
            no: index + 1,
            sssNo: emp.sssNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            employeeContribution: contribution.employeeShare,
            employerContribution: contribution.employerShare,
            totalContribution: contribution.total,
        };
    }).filter(Boolean);

    return {
        title: 'SSS Contribution Report',
        headerData: {
            'Employer ID Number': MOCK_COMPANY_INFO.employerIdSss,
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'Contribution Month': format(new Date(month), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'sssNo', label: 'SSS Number', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
            { key: 'employeeContribution', label: 'EE Share', editable: false, isPermanent: true },
            { key: 'employerContribution', label: 'ER Share', editable: false, isPermanent: true },
            { key: 'totalContribution', label: 'Total', editable: false, isPermanent: true },
        ],
        rows,
    };
};

export const generatePhilhealthData = (employees, aggregatedRecords, month, isProvisional) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    
    const rows = aggregatedRecords.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const contribution = calculatePhilhealthContribution(record.totalGross, isProvisional);
        
        return {
            no: index + 1,
            philhealthNo: emp.philhealthNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            employeeContribution: contribution.employeeShare,
            employerContribution: contribution.employerShare,
            totalContribution: contribution.total,
        };
    }).filter(Boolean);

    return {
        title: 'PhilHealth Contribution Report',
        headerData: {
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'Contribution Month': format(new Date(month), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'philhealthNo', label: 'PhilHealth Number', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
            { key: 'employeeContribution', label: 'EE Share', editable: false, isPermanent: true },
            { key: 'employerContribution', label: 'ER Share', editable: false, isPermanent: true },
            { key: 'totalContribution', label: 'Total', editable: false, isPermanent: true },
        ],
        rows,
    };
};

export const generatePagibigData = (employees, aggregatedRecords, month, isProvisional) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    
    const rows = aggregatedRecords.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const contribution = calculatePagibigContribution(record.totalGross, isProvisional);

        return {
            no: index + 1,
            pagibigNo: emp.pagIbigNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            employeeContribution: contribution.employeeShare,
            employerContribution: contribution.employerShare,
            totalContribution: contribution.total,
        };
    }).filter(Boolean);
    
    return {
        title: 'Pag-IBIG Contribution Report',
        headerData: {
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'Contribution Month': format(new Date(month), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'pagibigNo', label: 'Pag-IBIG MID No.', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
            { key: 'employeeContribution', label: 'EE Share', editable: false, isPermanent: true },
            { key: 'employerContribution', label: 'ER Share', editable: false, isPermanent: true },
            { key: 'totalContribution', label: 'Total', editable: false, isPermanent: true },
        ],
        rows,
    };
};

export const generateTinData = (employees, aggregatedRecords, month) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    
    const rows = aggregatedRecords.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        return {
            no: index + 1,
            tinNo: emp.tinNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            grossCompensation: record.totalGross,
            taxWithheld: record.totalTaxWithheld,
        };
    }).filter(Boolean);
    
    return {
        title: 'Withholding Tax (TIN) Report',
        headerData: {
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'For the Month of': format(new Date(month), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'tinNo', label: 'TIN', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'MI', editable: false, isPermanent: true },
            { key: 'grossCompensation', label: 'Gross Compensation', editable: false, isPermanent: true },
            { key: 'taxWithheld', label: 'Tax Withheld', editable: false, isPermanent: true },
        ],
        rows,
    };
};