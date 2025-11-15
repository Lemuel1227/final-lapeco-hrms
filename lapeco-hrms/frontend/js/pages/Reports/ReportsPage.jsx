import React, { useState, useMemo, useEffect } from 'react';
import ReportCard from './ReportCard';
import ReportConfigurationModal from '../../modals/ReportConfigurationModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { reportsConfig, reportCategories } from '../../config/reports.config';
import { employeeAPI, positionAPI, resignationAPI, terminationAPI, trainingAPI, performanceAPI, payrollAPI, leaveAPI } from '../../services/api';
import attendanceAPI from '../../services/attendanceAPI';
import './ReportsPage.css';

const ReportsPage = (props) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [configModalState, setConfigModalState] = useState({ show: false, config: null });
  const [showPreview, setShowPreview] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]); // Include all employees for offboarding reports
  const [positions, setPositions] = useState([]);
  const [resignations, setResignations] = useState([]);
  const [terminations, setTerminations] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [trainingEnrollments, setTrainingEnrollments] = useState([]);
  const [evaluationPeriods, setEvaluationPeriods] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  const normalizeTrainingStatus = (status = '') => {
    const cleaned = status.toString().trim().toLowerCase();
    switch (cleaned) {
      case 'not started':
      case 'not_started':
        return 'Not Started';
      case 'in progress':
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'dropped':
        // No dropped status; map to a safe alternative
        return 'Not Started';
      default:
        return status || 'Not Started';
    }
  };

  const normalizeAccountStatus = (status = '') => {
    const s = status?.toString().trim().toLowerCase();
    switch (s) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'deactivated':
        return 'Deactivated';
      case 'terminated':
        return 'Terminated';
      case 'resigned':
        return 'Resigned';
      default:
        return status || 'Active';
    }
  };

  const buildEmployeeName = (user = {}) => {
    if (user.name) return user.name;
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    return parts.join(' ') || null;
  };

  // Fetch all required data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsInitialLoading(true);
        const [employeesRes, positionsRes, resignationsRes, terminationsRes, programsRes, enrollmentsRes, periodsRes, leavesRes, attendanceEmployeesRes] = await Promise.all([
          employeeAPI.getAll(),
          positionAPI.getAll(),
          resignationAPI.getAll(),
          terminationAPI.getAll(),
          trainingAPI.getPrograms(),
          trainingAPI.getEnrollments(),
          performanceAPI.getEvaluationPeriods(),
          leaveAPI.getAll(),
          attendanceAPI.getEmployeeNameID(),
        ]);
        
        // Normalize the data similar to EmployeeDataPage
        const empData = Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data?.data || []);
        const posData = Array.isArray(positionsRes.data) ? positionsRes.data : (positionsRes.data?.data || []);
        const attendanceData = Array.isArray(attendanceEmployeesRes?.data) ? attendanceEmployeesRes.data : (attendanceEmployeesRes?.data?.data || []);
        
        // Normalize positions to include all necessary fields
        const normalizedPositions = posData.map(p => ({ 
          id: p.id, 
          title: p.title ?? p.name,
          monthlySalary: p.monthly_salary ?? p.monthlySalary ?? 0,
          description: p.description ?? ''
        }));
        
        // Create position lookup map
        const positionMap = {};
        normalizedPositions.forEach(p => {
          positionMap[p.id] = p.title;
        });
        
        // Normalize employees with proper field mapping
        const normalizedEmployees = empData.map(e => ({
          id: e.id,
          name: e.name || [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' '),
          email: e.email,
          positionId: e.position_id ?? e.positionId,
          position: e.position ?? positionMap[e.position_id ?? e.positionId],
          joiningDate: e.joining_date ?? e.joiningDate,
          role: e.role,
          status: normalizeAccountStatus(e.account_status ?? e.status ?? e.employment_status)
        }));

        // Enrich employees with attendance feed (includes inactive and position string)
        const attMap = new Map(attendanceData.map(a => [String(a.id), { id: a.id, name: a.name, position: a.position || null }]));
        const enrichedEmployees = normalizedEmployees.map(emp => {
          const att = attMap.get(String(emp.id));
          if (!att) return emp;
          const needsPosition = !emp.position || emp.position === 'Unassigned' || emp.position === '';
          return {
            ...emp,
            position: needsPosition ? (att.position || emp.position || null) : emp.position,
          };
        });
        // Add attendance-only employees missing from main list
        attMap.forEach((att, idStr) => {
          const exists = enrichedEmployees.some(e => String(e.id) === idStr);
          if (!exists) {
            enrichedEmployees.push({
              id: att.id,
              name: att.name || 'Employee',
              email: null,
              positionId: null,
              position: att.position || null,
              joiningDate: null,
              role: null,
              status: 'Active'
            });
          }
        });

        // Keep enriched list for offboarding and name/position resolution
        setAllEmployees(enrichedEmployees);
        
        // Filter only non-offboarded employees for most reports
        const activeEmployees = enrichedEmployees.filter(emp => {
          const s = (emp.status || '').toString().trim().toLowerCase();
          return s !== 'terminated' && s !== 'resigned';
        });
        
        // Normalize resignations data
        const resData = Array.isArray(resignationsRes.data) ? resignationsRes.data : (resignationsRes.data?.data || []);
        const normalizedResignations = resData.map(r => ({
          id: r.id,
          employeeId: r.employee_id ?? r.employeeId,
          employeeName: r.employee_name ?? r.employeeName,
          position: r.position,
          effectiveDate: r.effective_date ?? r.effectiveDate,
          reason: r.reason,
          status: r.status
        }));
        
        // Normalize terminations data
        const termData = Array.isArray(terminationsRes.data) ? terminationsRes.data : (terminationsRes.data?.data || []);
        const normalizedTerminations = termData.map(t => ({
          id: t.id,
          employeeId: t.employee_id ?? t.employeeId,
          date: t.termination_date ?? t.date,
          reason: t.reason,
          comments: t.comments ?? t.notes ?? ''
        }));

        // Normalize training programs data
        const programData = Array.isArray(programsRes.data) ? programsRes.data : (programsRes.data?.data || []);
        const normalizedPrograms = programData.map(program => ({
          id: program.id,
          title: program.title,
          description: program.description ?? '',
          provider: program.provider ?? '',
          status: program.status ?? 'Draft',
          startDate: program.start_date ?? program.startDate ?? null,
          endDate: program.end_date ?? program.endDate ?? null,
          duration: program.duration ?? '',
          location: program.location ?? '',
          type: program.type ?? '',
          maxParticipants: program.max_participants ?? program.maxParticipants ?? null,
        }));

        // Normalize training enrollments data
        const enrollmentData = Array.isArray(enrollmentsRes.data) ? enrollmentsRes.data : (enrollmentsRes.data?.data || []);
        const normalizedEnrollments = enrollmentData.map(enrollment => {
          const employeeId = enrollment.user_id ?? enrollment.employee_id ?? enrollment.employeeId ?? enrollment.user?.id ?? null;
          return {
            id: enrollment.id,
            programId: enrollment.program_id ?? enrollment.programId ?? enrollment.program?.id ?? null,
            employeeId,
            status: normalizeTrainingStatus(enrollment.status),
            progress: typeof enrollment.progress === 'number' ? enrollment.progress : Number(enrollment.progress ?? 0) || 0,
            employeeName: enrollment.employee_name ?? enrollment.employeeName ?? buildEmployeeName(enrollment.user) ?? null,
          };
        }).filter(enrollment => enrollment.programId !== null && enrollment.employeeId !== null);

        // Merge employees from training enrollments with active employees
        const employeesMap = new Map(activeEmployees.map(emp => [emp.id, emp]));
        normalizedEnrollments.forEach(enrollment => {
          if (enrollment.employeeId && !employeesMap.has(enrollment.employeeId)) {
            employeesMap.set(enrollment.employeeId, {
              id: enrollment.employeeId,
              name: enrollment.employeeName || 'Employee',
              email: null,
              positionId: null,
              position: 'Unassigned',
              joiningDate: null,
              role: null,
              status: 'Active'
            });
          }
        });

        setEmployees(Array.from(employeesMap.values()));
        setPositions(normalizedPositions);
        setResignations(normalizedResignations);
        setTerminations(normalizedTerminations);
        setTrainingPrograms(normalizedPrograms);
        setTrainingEnrollments(normalizedEnrollments);
        
        // Normalize evaluation periods data
        const periodsData = periodsRes.data?.evaluationPeriods || [];
        const normalizedPeriods = periodsData.map(period => ({
          id: period.id,
          name: period.name || '',
          evaluationStart: period.evaluationStart || period.evaluation_start || '',
          evaluationEnd: period.evaluationEnd || period.evaluation_end || '',
          status: period.status || 'Draft'
        }));
        setEvaluationPeriods(normalizedPeriods);

        // Normalize leave requests data
        const leaveData = Array.isArray(leavesRes?.data) ? leavesRes.data : (leavesRes?.data?.data || []);
        const normalizedLeaves = (leaveData || []).map(l => ({
          leaveId: l.id,
          empId: l.user?.id ?? l.user_id,
          name: l.user?.name ?? [l.user?.first_name, l.user?.middle_name, l.user?.last_name].filter(Boolean).join(' '),
          position: l.user?.position?.name ?? l.user?.position?.title ?? '',
          leaveType: l.type ?? l.leaveType,
          dateFrom: l.date_from ?? l.dateFrom,
          dateTo: l.date_to ?? l.dateTo,
          days: l.days,
          status: l.status,
          reason: l.reason,
        }));
        setLeaveRequests(normalizedLeaves);
      } catch (error) {
        console.error('Error fetching data for reports:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  const reportCounts = useMemo(() => {
    const counts = reportsConfig.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});
    counts.All = reportsConfig.length;
    return counts;
  }, []);

  const filteredReports = useMemo(() => {
    let reports = [...reportsConfig];
    if (activeCategory !== 'All') {
      reports = reports.filter(r => r.category === activeCategory);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      reports = reports.filter(
        r => r.title.toLowerCase().includes(lowerSearch) || r.description.toLowerCase().includes(lowerSearch)
      );
    }
    return reports;
  }, [activeCategory, searchTerm]);

  // Gate masterlist generation until employees and positions are ready, so first click always works
  const masterlistReady = useMemo(() => {
    const hasEmployees = Boolean(employees && employees.length); // Only active employees
    const hasPositions = Boolean(positions && positions.length);
    return Boolean(hasEmployees && hasPositions && !isInitialLoading);
  }, [employees, positions, isInitialLoading]);

  const handleOpenConfig = (reportConfig) => {
    if (reportConfig.parameters) {
      setConfigModalState({ show: true, config: reportConfig });
    } else {
      handleRunReport(reportConfig.id, {});
    }
  };

  const handleRunReport = async (reportId, params) => {
    // Special handling for Payroll Run Summary: we need a single run with records
    if (reportId === 'payroll_run_summary') {
      const { payrolls = [] } = props;
      const selectedRunId = params?.runId || null;

      if (!selectedRunId) {
        alert('Please select a payroll run before generating the report.');
        return;
      }

      const selectedRun = (payrolls || []).find(r => r.runId === selectedRunId);

      try {
        let runDetails = null;

        // If the selected run already contains records, use it directly
        if (selectedRun && Array.isArray(selectedRun.records)) {
          runDetails = selectedRun;
        } else if (selectedRun?.periodId) {
          // Otherwise fetch full details by periodId
          const response = await payrollAPI.getPeriodDetails(selectedRun.periodId);
          runDetails = response?.data || null;
        }

        if (!runDetails || !Array.isArray(runDetails.records) || runDetails.records.length === 0) {
          alert('The selected payroll run could not be loaded or contains no records.');
          return;
        }

        // Generate report using the single run as data source
        await generateReport(reportId, { runId: selectedRunId }, runDetails);
        setConfigModalState({ show: false, config: null });
        setShowPreview(true);
        return; // Do not continue to generic flow
      } catch (error) {
        console.error('Error loading payroll run details:', error);
        alert('Failed to load the selected payroll run. Please try again.');
        return;
      }
    }

    // Ensure employees and positions are loaded before generating employee-related reports
    if (reportId === 'employee_masterlist') {
      const sourceEmployees = employees; // Use active employees only
      const sourcePositions = positions;

      if (!sourceEmployees.length) {
        alert('Active employee data is not ready yet. Please wait a moment and try again.');
        return;
      }
      if (!sourcePositions.length) {
        alert('No position data available to generate this report.');
        return;
      }
    }

    // Validation for offboarding report
    if (reportId === 'offboarding_summary') {
      if (resignations.length === 0 && terminations.length === 0) {
        alert('No resignation or termination data available to generate this report.');
        return;
      }
    }

    // Use allEmployees for offboarding report, otherwise use employees with fallback
    const employeesForReport =
      reportId === 'offboarding_summary'
        ? allEmployees
        : reportId === 'employee_masterlist'
          ? employees // strictly active employees
          : (employees.length ? employees : allEmployees);
    
    const { payrolls = [] } = props;

    let dataSources = {
      employees: employeesForReport,
      allEmployees,
      positions,
      resignations,
      terminations,
      trainingPrograms,
      trainingEnrollments,
      evaluationPeriods,
      payrolls,
      leaveRequests,
    };
    let finalParams = { ...params };
    if (reportId === 'attendance_summary') {
      const today = new Date().toISOString().split('T')[0];
      const selectedDate = finalParams.startDate || today;

      try {
        setIsFetchingData(true);
        const response = await attendanceAPI.getDaily({ date: selectedDate });
        const rawDailyData = Array.isArray(response.data) ? response.data : (response.data?.data || []);

        const schedules = rawDailyData.map(record => {
          let startTime = null;
          let endTime = null;
          if (record.shift && record.shift.includes(' - ')) {
            const [start, end] = record.shift.split(' - ');
            startTime = start || null;
            endTime = end || null;
          }
          return {
            empId: record.empId,
            date: record.date,
            start_time: startTime,
            end_time: endTime,
          };
        });

        const attendanceLogs = rawDailyData.map(record => ({
          empId: record.empId,
          date: record.date,
          signIn: record.signIn,
          breakOut: record.breakOut,
          breakIn: record.breakIn,
          signOut: record.signOut,
          overtime_hours: record.otHours,
        }));

        const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
        rawDailyData.forEach(record => {
          if (!employeeMap.has(record.empId)) {
            employeeMap.set(record.empId, {
              id: record.empId,
              name: record.employeeName,
              email: null,
              positionId: null,
              position: record.position || 'Unassigned',
              joiningDate: null,
              role: null,
              status: record.status || 'Active',
            });
          }
        });

        finalParams.startDate = selectedDate;
        dataSources = {
          ...dataSources,
          schedules,
          attendanceLogs,
          employees: Array.from(employeeMap.values()),
        };
      } catch (error) {
        console.error('Error fetching daily attendance data:', error);
        alert('Unable to load daily attendance data for the selected date. Please try again.');
        setIsFetchingData(false);
        return;
      } finally {
        setIsFetchingData(false);
      }
    }
    
    if (reportId === 'training_program_summary') {
      if (!trainingPrograms.length) {
        alert('No training programs found. Please add at least one program before generating this report.');
        return;
      }
      if (!trainingEnrollments.length) {
        alert('No enrollments found for any training program.');
        return;
      }
      if (!finalParams.programId) {
        alert('Please select a training program before generating the report.');
        return;
      }

      const employeesForTrainingReport = new Map((employees || []).map(emp => [emp.id, emp]));
      trainingEnrollments.forEach(enrollment => {
        if (enrollment.employeeId && !employeesForTrainingReport.has(enrollment.employeeId)) {
          employeesForTrainingReport.set(enrollment.employeeId, {
            id: enrollment.employeeId,
            name: enrollment.employeeName || 'Employee',
            position: 'Unassigned',
            email: null,
            positionId: null,
            joiningDate: null,
            role: null,
            status: 'Active'
          });
        }
      });

      dataSources = {
        ...dataSources,
        trainingPrograms,
        enrollments: trainingEnrollments,
        employees: Array.from(employeesForTrainingReport.values())
      };
    }
    
    if (reportId === 'performance_summary') {
      if (!evaluationPeriods.length) {
        alert('No evaluation periods found. Please create at least one evaluation period before generating this report.');
        return;
      }
      if (!finalParams.periodId) {
        alert('Please select an evaluation period before generating the report.');
        return;
      }
      
      // Add evaluation periods to dataSources
      dataSources = {
        ...dataSources,
        evaluationPeriods
      };

      try {
        setIsFetchingData(true);
        if (String(finalParams.periodId) === 'all') {
          // Use performance overview when "All Time" is selected so we have scores
          const resp = await performanceAPI.getOverview();
          const overviewEmployees = resp?.data?.employees || [];
          if (overviewEmployees.length) {
            dataSources = { ...dataSources, employees: overviewEmployees };
          }
          // Also fetch a comprehensive employee list (includes inactive) for evaluator name resolution
          const allEmpRes = await attendanceAPI.getEmployeeNameID();
          const allEmployees = Array.isArray(allEmpRes?.data?.data) ? allEmpRes.data.data : (Array.isArray(allEmpRes?.data) ? allEmpRes.data : []);
          if (allEmployees.length) {
            dataSources = { ...dataSources, allEmployees };
          }
        } else {
          // Fetch evaluations for the selected period
          const resp = await performanceAPI.getPeriodicEvaluations(finalParams.periodId);
          const payload = resp?.data || {};
          const fetchedPeriod = payload.period || {};
          const evals = Array.isArray(fetchedPeriod.evaluations) ? fetchedPeriod.evaluations : [];
          dataSources = { ...dataSources, evaluations: evals };
          // Also fetch a comprehensive employee list (includes inactive) for evaluator name resolution
          const allEmpRes = await attendanceAPI.getEmployeeNameID();
          const allEmployees = Array.isArray(allEmpRes?.data?.data) ? allEmpRes.data.data : (Array.isArray(allEmpRes?.data) ? allEmpRes.data : []);
          if (allEmployees.length) {
            dataSources = { ...dataSources, allEmployees };
          }
        }
      } catch (error) {
        console.error('Failed to load performance data for report:', error);
      } finally {
        setIsFetchingData(false);
      }
    }
    
    if (reportId === 'thirteenth_month_pay') {
      const selectedYear = params.year;
      try {
        setIsFetchingData(true);

        let runs = Array.isArray(props.payrolls) && props.payrolls.length
          ? props.payrolls
          : [];

        if (runs.length === 0) {
          const res = await payrollAPI.getAll();
          runs = Array.isArray(res?.data?.payroll_runs) ? res.data.payroll_runs : [];
        }

        const yearStr = String(selectedYear);
        const runsForYear = (runs || []).filter(r => String(r.cutOff || '').includes(yearStr));

        const runsWithRecords = await Promise.all((runsForYear || []).map(async (run) => {
          if (Array.isArray(run.records) && run.records.length) return run;
          if (run.periodId) {
            const detailsRes = await payrollAPI.getPeriodDetails(run.periodId).catch(() => null);
            const records = Array.isArray(detailsRes?.data?.records) ? detailsRes.data.records : [];
            return { ...run, records };
          }
          return { ...run, records: [] };
        }));

        const sourceEmployees = (employees && employees.length) ? employees : allEmployees;
        const employeeTotals = new Map();
        (sourceEmployees || []).forEach(e => {
          const key = String(e?.id ?? e?.employee_id ?? '');
          if (!key) return;
          employeeTotals.set(key, { id: key, name: e?.name || 'Employee', totalBasicSalary: 0 });
        });

        runsWithRecords.forEach(run => {
          (run.records || []).forEach(record => {
            const empKey = String(record?.empId ?? record?.employeeId ?? '');
            if (!empKey) return;
            if (!employeeTotals.has(empKey)) {
              employeeTotals.set(empKey, { id: empKey, name: record?.employeeName || 'Employee', totalBasicSalary: 0 });
            }

            let baseFromItems = 0;
            if (Array.isArray(record.earnings)) {
              baseFromItems = record.earnings.reduce((sum, earning) => {
                const desc = (earning.description || '').toLowerCase();
                const isBase = desc.includes('regular') || desc.includes('basic') || desc.includes('salary');
                return sum + (isBase ? (Number(earning.amount) || 0) : 0);
              }, 0);
            }

            const current = employeeTotals.get(empKey);
            if (baseFromItems > 0) {
              current.totalBasicSalary += baseFromItems;
            } else {
              const sumAll = (record.earnings || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
              const gross = Number(record.grossEarning) || 0;
              current.totalBasicSalary += (gross > 0 ? gross : sumAll);
            }
            employeeTotals.set(empKey, current);
          });
        });

        const details = Array.from(employeeTotals.values())
          .map(emp => ({
            id: emp.id,
            name: emp.name,
            totalBasicSalary: emp.totalBasicSalary,
            thirteenthMonthPay: emp.totalBasicSalary > 0 ? (emp.totalBasicSalary / 12) : 0,
          }))
          .filter(emp => (emp.thirteenthMonthPay || 0) > 0);

        const totalPayout = details.reduce((sum, emp) => sum + (emp.thirteenthMonthPay || 0), 0);

        dataSources.thirteenthMonthPayData = {
          year: selectedYear,
          totalPayout,
          eligibleCount: details.length,
          records: details.map(emp => ({ ...emp, status: 'Pending' })),
        };
      } catch (error) {
        console.error('Failed to load payroll data for 13th month report:', error);
        alert('Unable to load payroll data for the selected year. Please try again.');
        setIsFetchingData(false);
        return;
      } finally {
        setIsFetchingData(false);
      }
    }
    
    generateReport(reportId, finalParams, dataSources);
    setConfigModalState({ show: false, config: null });
    setShowPreview(true);
  };
  
  const handleClosePreview = () => {
    setShowPreview(false);
    if (pdfDataUri) {
        URL.revokeObjectURL(pdfDataUri);
    }
    setPdfDataUri('');
  };

  const categories = ['All', ...Object.values(reportCategories)];

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">Reports Center</h1>
        <p className="text-muted">Select a category and generate a report.</p>
      </header>
      
      <div className="reports-category-filter">
        {categories.map(category => (
          (reportCounts[category] > 0 || category === 'All') && (
            <button
              key={category}
              className={`category-filter-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              <span>{category}</span>
              <span className="badge rounded-pill">{reportCounts[category]}</span>
            </button>
          )
        ))}
      </div>

      <div className="reports-content-area">
        {isInitialLoading ? (
          <div className="text-center p-5 bg-light rounded">
            <h5>Preparing reports…</h5>
            <p className="text-muted">Loading required data.</p>
          </div>
        ) : (
          <>
            <div className="input-group search-bar">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder={`Search all reports...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="reports-grid-v2">
              {filteredReports.map(config => {
                const isMasterlist = config.id === 'employee_masterlist';
                const disabled = isMasterlist ? !masterlistReady : false;
                const disabledTitle = isMasterlist && disabled ? 'Preparing data… please wait a moment' : '';
                return (
                  <ReportCard
                    key={config.id}
                    title={config.title}
                    description={config.description}
                    icon={config.icon}
                    onGenerate={() => handleOpenConfig(config)}
                    disabled={disabled}
                    disabledTitle={disabledTitle}
                  />
                );
              })}
            </div>

            {filteredReports.length === 0 && (
              <div className="text-center p-5 bg-light rounded">
                  <h5>No Reports Found</h5>
                  <p className="text-muted">Try adjusting your category selection or search term.</p>
              </div>
            )}
          </>
        )}
      </div>

      <ReportConfigurationModal
        show={configModalState.show}
        reportConfig={configModalState.config}
        onClose={() => setConfigModalState({ show: false, config: null })}
        onRunReport={handleRunReport}
        trainingPrograms={trainingPrograms}
        payrolls={props.payrolls}
        evaluationPeriods={evaluationPeriods}
      />

      <ReportPreviewModal 
        show={showPreview} 
        onClose={handleClosePreview}
        pdfDataUri={pdfDataUri}
        reportTitle={configModalState.config?.title || 'Report Preview'}
      />
    </div>
  );
};

export default ReportsPage;