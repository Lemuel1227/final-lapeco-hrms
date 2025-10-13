export const reportCategories = {
  EMPLOYEE_DATA: 'Employee Data',
  POSITION_MANAGEMENT: 'Positions',
  ATTENDANCE: 'Attendance & Schedules',
  LEAVE: 'Leave Management',
  PERFORMANCE: 'Performance Management',
  ANALYTICS: 'Analytics & Insights',
  CASE_MANAGEMENT: 'Case Management',
  TRAINING: 'Training & Development',
  RECRUITMENT: 'Recruitment',
  PAYROLL: 'Payroll & Compensation',
};

export const reportsConfig = [
  // --- Employee Data ---
  {
    id: 'employee_masterlist',
    title: 'Employee Masterlist',
    description: 'Generates a complete list of all active employees with their key details and a distribution chart.',
    icon: 'bi-people-fill',
    category: reportCategories.EMPLOYEE_DATA,
    parameters: null,
  },

  // --- Position Management ---
  {
    id: 'positions_report',
    title: 'Company Positions Report',
    description: 'A list of all defined positions, including salary comparisons and employee counts.',
    icon: 'bi-diagram-3-fill',
    category: reportCategories.POSITION_MANAGEMENT,
    parameters: null,
  },

  // --- Attendance & Schedules ---
  {
    id: 'attendance_summary',
    title: 'Daily Attendance Report',
    description: 'A summary and detailed log of employee attendance for a specific day.',
    icon: 'bi-calendar-check-fill',
    category: reportCategories.ATTENDANCE,
    parameters: [
      { id: 'date_range_1', type: 'date-range', labels: { start: 'Select Date', end: null } },
    ],
  },

  // --- Leave Management ---
  {
    id: 'leave_requests_report',
    title: 'Leave Requests Report',
    description: 'Generates a detailed list of all leave requests within a specified date range, with a type breakdown chart.',
    icon: 'bi-calendar-event-fill',
    category: reportCategories.LEAVE,
    parameters: [
      { id: 'date_range_4', type: 'date-range', labels: { start: 'Start Date', end: 'End Date' } },
    ],
  },
  
  // --- Performance Management ---
  {
    id: 'performance_summary',
    title: 'Performance Summary Report',
    description: 'Summarizes all evaluations completed within a specified period, with performance distribution charts.',
    icon: 'bi-graph-up-arrow',
    category: reportCategories.PERFORMANCE,
    parameters: [
      { id: 'date_range_2', type: 'date-range', labels: { start: 'Start Date', end: 'End Date' } },
    ],
  },

  // --- Offboarding ---
  {
    id: 'offboarding_summary',
    title: 'Offboarding Summary Report',
    description: 'Generates a summary of all resigned and terminated employees within a specified date range.',
    icon: 'bi-person-x-fill',
    category: reportCategories.EMPLOYEE_DATA,
    parameters: [
      { id: 'date_range_offboarding', type: 'date-range', labels: { start: 'Start Date', end: 'End Date' } },
    ],
  },

  // --- Analytics & Insights ---
  {
    id: 'predictive_analytics_summary',
    title: 'Predictive Analytics Summary',
    description: 'Generates a snapshot of the employee risk and potential analysis based on performance and attendance data as of a specific date.',
    icon: 'bi-lightbulb-fill',
    category: reportCategories.ANALYTICS,
    parameters: [
      { 
        id: 'as_of_date_analytics', 
        type: 'as-of-date', 
        label: 'Analysis As-Of Date'
      },
    ],
  },

  // --- Case Management ---
  {
    id: 'disciplinary_cases',
    title: 'Disciplinary Cases Report',
    description: 'Generates a list of all disciplinary cases logged within a specified date range.',
    icon: 'bi-briefcase-fill',
    category: reportCategories.CASE_MANAGEMENT,
    parameters: [
        { id: 'date_range_5', type: 'date-range', labels: { start: 'Start Date', end: 'End Date' } },
    ],
  },
  
  // --- Training & Development ---
  {
    id: 'training_program_summary',
    title: 'Training Program Report',
    description: 'Generates a report on a specific training program and its participants, including a status chart.',
    icon: 'bi-mortarboard-fill',
    category: reportCategories.TRAINING,
    parameters: [
      { id: 'program_selector', type: 'program-selector', label: 'Select Program' }
    ],
  },

  // --- Payroll & Compensation ---
  {
    id: 'payroll_run_summary',
    title: 'Payroll Run Summary',
    description: 'Generates a detailed summary of a previously completed payroll run, including all employee earnings, deductions, and net pay.',
    icon: 'bi-receipt-cutoff',
    category: reportCategories.PAYROLL,
    parameters: [
      { id: 'payroll_run_selector', type: 'payroll-run-selector', label: 'Select Payroll Run' }
    ],
  },

    //13th Month Pay Report
    {
    id: 'thirteenth_month_pay',
    title: '13th Month Pay Report',
    description: 'Generates a detailed summary of the calculated 13th-month pay for all eligible employees for a selected year.',
    icon: 'bi-calendar-heart-fill',
    category: reportCategories.PAYROLL,
    parameters: [
      { id: 'year_selector', type: 'year-selector', label: 'Select Year' }
    ],
  },

  {
    id: 'contributions_summary',
    title: 'Contributions Summary by Pay Period',
    description: 'Generates a consolidated PDF of SSS, PhilHealth, and Pag-IBIG contributions for a selected payroll period.',
    icon: 'bi-file-earmark-ruled-fill',
    category: reportCategories.PAYROLL,
    parameters: [
      { id: 'payroll_run_selector', type: 'payroll-run-selector', label: 'Select Payroll Run' }
    ],
  },

  // --- Recruitment ---
  {
    id: 'recruitment_activity',
    title: 'Recruitment Activity Report',
    description: 'Summarizes new applications, interviews, and hiring outcomes for a given period.',
    icon: 'bi-person-plus-fill',
    category: reportCategories.RECRUITMENT,
    parameters: [
      { 
        id: 'date_range_3', 
        type: 'date-range', 
        labels: { start: 'Start Date', end: 'End Date' },
        optional: true,
      },
    ],
  },
];