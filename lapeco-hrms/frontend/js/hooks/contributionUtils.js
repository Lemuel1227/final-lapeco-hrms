import { format } from 'date-fns';

const MOCK_COMPANY_INFO = {
    employerIdSss: '03-9-1234567-8',
    employerName: 'Lapeco Group of Companies',
    address: '123 Innovation Drive, Tech City',
};

export const calculateSssContribution = (salary) => {
    let msc = Math.min(salary, 30000); // Apply MSC ceiling
    if (msc < 4000) msc = 4000; // Apply MSC floor as per legislation

    // Round MSC to the nearest 500 for calculation if not at ceiling
    if (msc < 30000) {
        const remainder = msc % 500;
        if (remainder < 250) {
            msc = msc - remainder;
        } else {
            msc = msc - remainder + 500;
        }
    }
    
    const employeeShare = msc * 0.045;
    const employerShare = msc * 0.095;

    return {
        employeeShare: employeeShare,
        employerShare: employerShare,
        total: employeeShare + employerShare,
    };
};

export const calculatePhilhealthContribution = (salary) => {
    const rate = 0.05;
    const incomeFloor = 10000;
    const incomeCeiling = 100000;

    let baseSalary = Math.max(salary, incomeFloor);
    baseSalary = Math.min(baseSalary, incomeCeiling);

    const totalPremium = baseSalary * rate;

    return {
        employeeShare: totalPremium / 2,
        employerShare: totalPremium / 2,
        total: totalPremium,
    };
};

export const calculatePagibigContribution = (salary) => {
    let employeeShare;
    if (salary <= 1500) {
        employeeShare = salary * 0.01;
    } else {
        employeeShare = salary * 0.02;
    }
    
    // Employee share is capped at 100
    employeeShare = Math.min(employeeShare, 100);

    // Employer share is always 2%, capped at 100
    const employerShare = Math.min(salary * 0.02, 100);

    return {
        employeeShare,
        employerShare,
        total: employeeShare + employerShare,
    };
};


export const generateSssData = (employees, positions, selectedPayrollRun) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const positionMap = new Map(positions.map(p => [p.id, p]));

    const rows = selectedPayrollRun.records.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const position = positionMap.get(emp.positionId);
        const salary = position?.monthlySalary || 0;
        const contribution = calculateSssContribution(salary);

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
            'Contribution Month': format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'MMMM yyyy'),
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

export const generatePhilhealthData = (employees, positions, selectedPayrollRun) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    const rows = selectedPayrollRun.records.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const position = positionMap.get(emp.positionId);
        const salary = position?.monthlySalary || 0;
        const contribution = calculatePhilhealthContribution(salary);
        
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
            'Contribution Month': format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'MMMM yyyy'),
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

export const generatePagibigData = (employees, positions, selectedPayrollRun) => {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const positionMap = new Map(positions.map(p => [p.id, p]));
    
    const rows = selectedPayrollRun.records.map((record, index) => {
        const emp = employeeMap.get(record.empId);
        if (!emp) return null;

        const position = positionMap.get(emp.positionId);
        const salary = position?.monthlySalary || 0;
        const contribution = calculatePagibigContribution(salary);

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
            'Contribution Month': format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'MMMM yyyy'),
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