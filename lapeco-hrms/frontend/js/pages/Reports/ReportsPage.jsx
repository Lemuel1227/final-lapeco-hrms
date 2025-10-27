import React, { useState, useMemo, useEffect } from 'react';
import ReportCard from './ReportCard';
import ReportConfigurationModal from '../../modals/ReportConfigurationModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { reportsConfig, reportCategories } from '../../config/reports.config';
import { employeeAPI, positionAPI, trainingAPI } from '../../services/api';
import attendanceAPI from '../../services/attendanceAPI';
import './ReportsPage.css';

const ReportsPage = (props) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [configModalState, setConfigModalState] = useState({ show: false, config: null });
  const [showPreview, setShowPreview] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [trainingEnrollments, setTrainingEnrollments] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  
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
        return 'Dropped';
      default:
        return status || 'Not Started';
    }
  };

  const buildEmployeeName = (user = {}) => {
    if (user.name) return user.name;
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    return parts.join(' ') || null;
  };

  // Fetch employees, positions, and training data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesRes, positionsRes, programsRes, enrollmentsRes] = await Promise.all([
          employeeAPI.getAll(),
          positionAPI.getAll(),
          trainingAPI.getPrograms(),
          trainingAPI.getEnrollments(),
        ]);
        
        // Normalize the data similar to EmployeeDataPage
        const empData = Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data?.data || []);
        const posData = Array.isArray(positionsRes.data) ? positionsRes.data : (positionsRes.data?.data || []);
        
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
          status: e.account_status ?? e.status
        }));
        
        // Filter only active employees for reports
        const activeEmployees = normalizedEmployees.filter(emp => 
          emp.status === 'Active' || emp.status === 'Inactive'
        );

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
        setTrainingPrograms(normalizedPrograms);
        setTrainingEnrollments(normalizedEnrollments);
      } catch (error) {
        console.error('Error fetching data for reports:', error);
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

  const handleOpenConfig = (reportConfig) => {
    if (reportConfig.parameters) {
      setConfigModalState({ show: true, config: reportConfig });
    } else {
      handleRunReport(reportConfig.id, {});
    }
  };

  const handleRunReport = async (reportId, params) => {
    // Ensure employees and positions are loaded before generating employee-related reports
    if (reportId === 'employee_masterlist') {
      if (employees.length === 0) {
        alert('No employee data available to generate this report.');
        return;
      }
      if (positions.length === 0) {
        alert('No position data available to generate this report.');
        return;
      }
    }

    let dataSources = { ...props, employees, positions };
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
    
    // ... existing logic for predictive_analytics_summary
    
    if (reportId === 'thirteenth_month_pay') {
        const { payrolls = [] } = props;
        const year = params.year;

        const eligibleEmployees = employees.filter(emp => new Date(emp.joiningDate).getFullYear() <= year);

        const details = eligibleEmployees.map(emp => {
            let totalBasicSalary = 0;
            payrolls.forEach(run => {
                if (!run.cutOff.includes(year.toString())) return;
                const record = run.records.find(r => r.empId === emp.id);
                if (record && record.earnings) {
                    record.earnings.forEach(earning => {
                        if (earning.description?.toLowerCase().includes('regular pay')) {
                            totalBasicSalary += Number(earning.amount) || 0;
                        }
                    });
                }
            });
            const thirteenthMonthPay = totalBasicSalary > 0 ? totalBasicSalary / 12 : 0;
            return { ...emp, totalBasicSalary, thirteenthMonthPay };
        }).filter(empData => empData.totalBasicSalary > 0);

        const totalPayout = details.reduce((sum, emp) => sum + emp.thirteenthMonthPay, 0);

        dataSources.thirteenthMonthPayData = {
            year,
            totalPayout,
            eligibleCount: details.length,
            records: details.map(emp => ({ ...emp, status: 'Pending' })),
        };
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
          {filteredReports.map(config => (
            <ReportCard
              key={config.id}
              title={config.title}
              description={config.description}
              icon={config.icon}
              onGenerate={() => handleOpenConfig(config)}
            />
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center p-5 bg-light rounded">
              <h5>No Reports Found</h5>
              <p className="text-muted">Try adjusting your category selection or search term.</p>
          </div>
        )}
      </div>

      <ReportConfigurationModal
        show={configModalState.show}
        onClose={() => setConfigModalState({ show: false, config: null })}
        reportConfig={configModalState.config}
        onRunReport={handleRunReport}
        trainingPrograms={trainingPrograms}
        payrolls={props.payrolls} 
      />

      {(isLoading || isFetchingData) && (
         <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content"><div className="modal-body text-center p-4">
                    <div className="spinner-border text-success mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
                    <h4>{isFetchingData ? 'Preparing Attendance Data...' : 'Generating Report...'}</h4>
                </div></div>
            </div>
        </div>
      )}

      {pdfDataUri && (
         <ReportPreviewModal
            show={showPreview}
            onClose={handleClosePreview}
            pdfDataUri={pdfDataUri}
            reportTitle={configModalState.config?.title || 'Report Preview'}
        />
      )}
    </div>
  );
};

export default ReportsPage;