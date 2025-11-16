// src/reports/index.js

// Deferred loaders for report generators to keep the main bundle lean
const generatorLoaders = {
  attendance_summary: () => import('./attendanceSummaryReport').then(m => m.generateAttendanceSummaryReport),
  disciplinary_cases: () => import('./disciplinaryCasesReport').then(m => m.generateDisciplinaryCasesReport),
  employee_masterlist: () => import('./employeeMasterlistReport').then(m => m.generateEmployeeMasterlistReport),
  leave_requests_report: () => import('./leaveRequestsReport').then(m => m.generateLeaveRequestsReport),
  payroll_run_summary: () => import('./payrollRunSummaryReport').then(m => m.generatePayrollRunSummaryReport),
  payslip: () => import('./payslipReport').then(m => m.generatePayslipReport),
  performance_summary: () => import('./performanceSummaryReport').then(m => m.generatePerformanceSummaryReport),
  positions_report: () => import('./positionsReport').then(m => m.generatePositionsReport),
  recruitment_activity: () => import('./recruitmentActivityReport').then(m => m.generateRecruitmentActivityReport),
  training_program_summary: () => import('./trainingProgramReport').then(m => m.generateTrainingProgramReport),
  contributions_summary: () => import('./contributionsReport').then(m => m.generateContributionsReport),
  contributions_monthly: () => import('./contributionsMonthlyReport').then(m => m.generateContributionsMonthlyReport),
  predictive_analytics_summary: () => import('./predictiveAnalyticsReport').then(m => m.generatePredictiveAnalyticsReport),
  offboarding_summary: () => import('./offboardingSummaryReport').then(m => m.generateOffboardingSummaryReport),
  thirteenth_month_pay: () => import('./thirteenthMonthReport').then(m => m.generateThirteenthMonthReport),
  attachment_viewer: () => import('./attachmentViewer').then(m => m.viewAttachment),
};

export const loadReportGenerator = async (reportId) => {
  const loader = generatorLoaders[reportId];
  if (!loader) {
    return null;
  }

  return loader();
};