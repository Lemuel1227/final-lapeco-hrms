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
};

export default reportGenerators;