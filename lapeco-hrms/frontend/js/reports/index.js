// src/reports/index.js

import { generateAttendanceSummaryReport } from './attendanceSummaryReport';
import { generateDisciplinaryCasesReport } from './disciplinaryCasesReport';
import { generateEmployeeMasterlistReport } from './employeeMasterlistReport';
import { generateLeaveRequestsReport } from './leaveRequestsReport';
import { generatePayrollRunSummaryReport } from './payrollRunSummaryReport';
import { generatePayslipReport } from './payslipReport';
import { generatePerformanceSummaryReport } from './performanceSummaryReport';
import { generatePositionsReport } from './positionsReport';
import { generateRecruitmentActivityReport } from './recruitmentActivityReport';
import { generateTrainingProgramReport } from './trainingProgramReport';
import { generateContributionsReport } from './contributionsReport';
import { generatePredictiveAnalyticsReport } from './predictiveAnalyticsReport';
import { generateOffboardingSummaryReport } from './offboardingSummaryReport';
import { generateThirteenthMonthReport } from './thirteenthMonthReport';
import { viewAttachment } from './attachmentViewer';

// Map report IDs from your config to their generator functions
const reportGenerators = {
  attendance_summary: generateAttendanceSummaryReport,
  disciplinary_cases: generateDisciplinaryCasesReport,
  employee_masterlist: generateEmployeeMasterlistReport,
  leave_requests_report: generateLeaveRequestsReport,
  payroll_run_summary: generatePayrollRunSummaryReport,
  payslip: generatePayslipReport,
  performance_summary: generatePerformanceSummaryReport,
  positions_report: generatePositionsReport,
  recruitment_activity: generateRecruitmentActivityReport,
  training_program_summary: generateTrainingProgramReport,
  contributions_summary: generateContributionsReport,
  predictive_analytics_summary: generatePredictiveAnalyticsReport,
  offboarding_summary: generateOffboardingSummaryReport,
  thirteenth_month_pay: generateThirteenthMonthReport,
  attachment_viewer: viewAttachment,
};

export default reportGenerators;