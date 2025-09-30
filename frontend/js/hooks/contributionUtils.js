import { format } from 'date-fns';

const MOCK_COMPANY_INFO = {
    employerIdSss: '03-9-1234567-8',
    employerName: 'Lapeco Group of Companies',
    address: '123 Innovation Drive, Tech City',
};

// Simplified calculation for SSS based on a mock salary bracket
const calculateSss = (salary) => {
    if (salary > 29750) return 1350;
    if (salary > 20250) return 900;
    return 581.30;
};

// Simplified calculation for PhilHealth
const calculatePhilhealth = (salary) => {
    const rate = 0.04; // Example rate
    let premium = salary * rate;
    if (premium > 3200) premium = 3200;
    if (premium < 400) premium = 400;
    return premium;
};

// --- REFACTORED LOGIC: All functions now use the payroll run records as the source of truth ---

export const generateSssData = (employees, positions, selectedPayrollRun) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const positionMap = new Map(positions.map(p => [p.id, p]));

    const rows = selectedPayrollRun.records.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null; // Skip if employee record not found

        const position = positionMap.get(emp.positionId);
        const salary = position?.monthlySalary || 0;
        const totalContribution = calculateSss(salary);
        return {
            no: index + 1,
            sssNo: emp.sssNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            employeeContribution: totalContribution / 2,
            employerContribution: totalContribution / 2,
            totalContribution: totalContribution,
        };
    }).filter(Boolean); // Filter out any null entries

    return {
        title: 'SSS Contribution Report',
        headerData: {
            'Employer ID Number': MOCK_COMPANY_INFO.employerIdSss,
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'Contribution Month': format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'sssNo', label: 'SSS Number', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
            { key: 'employeeContribution', label: 'EE Share', editable: true, isPermanent: false },
            { key: 'employerContribution', label: 'ER Share', editable: true, isPermanent: false },
            { key: 'totalContribution', label: 'Total', editable: true, isPermanent: false },
        ],
        rows,
    };
};

export const generatePhilhealthData = (employees, positions, selectedPayrollRun) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    const rows = selectedPayrollRun.records.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const position = positionMap.get(emp.positionId);
        const salary = position?.monthlySalary || 0;
        const totalContribution = calculatePhilhealth(salary);
        return {
            no: index + 1,
            philhealthNo: emp.philhealthNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            employeeContribution: totalContribution / 2,
            employerContribution: totalContribution / 2,
            totalContribution: totalContribution,
        };
    }).filter(Boolean);

    return {
        title: 'PhilHealth Contribution Report',
        headerData: {
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'Contribution Month': format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'philhealthNo', label: 'PhilHealth Number', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
            { key: 'employeeContribution', label: 'EE Share', editable: true, isPermanent: false },
            { key: 'employerContribution', label: 'ER Share', editable: true, isPermanent: false },
            { key: 'totalContribution', label: 'Total', editable: true, isPermanent: false },
        ],
        rows,
    };
};

export const generatePagibigData = (employees, positions, selectedPayrollRun) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    const rows = selectedPayrollRun.records.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const position = positionMap.get(emp.positionId);
        const salary = position?.monthlySalary || 0;
        const contribution = salary > 1500 ? 100 : salary * 0.02;
        const totalContribution = contribution * 2;

        return {
            no: index + 1,
            pagibigNo: emp.pagIbigNo || '',
            lastName: emp.lastName || '',
            firstName: emp.firstName || '',
            middleName: emp.middleName || '',
            employeeContribution: contribution,
            employerContribution: contribution,
            totalContribution: totalContribution,
        };
    }).filter(Boolean);
    
    return {
        title: 'Pag-IBIG Contribution Report',
        headerData: {
            'Employer Name': MOCK_COMPANY_INFO.employerName,
            'Contribution Month': format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'MMMM yyyy'),
        },
        columns: [
            { key: 'no', label: 'No.', editable: false, isPermanent: true },
            { key: 'pagibigNo', label: 'Pag-IBIG MID No.', editable: false, isPermanent: true },
            { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
            { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
            { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
            { key: 'employeeContribution', label: 'EE Share', editable: true, isPermanent: false },
            { key: 'employerContribution', label: 'ER Share', editable: true, isPermanent: false },
            { key: 'totalContribution', label: 'Total', editable: true, isPermanent: false },
        ],
        rows,
    };
};