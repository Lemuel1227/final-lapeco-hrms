export const generatePerformanceSummaryReport = async (layoutManager, dataSources, params) => {
  const { evaluations = [], employees = [], positions = [], evaluationPeriods = [] } = dataSources;
  const { periodId } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const toPercent = (score) => {
    if (score == null || Number.isNaN(Number(score))) return null;
    const num = Number(score);
    // If score looks like a 0–5 scale, convert to percent
    if (num <= 5) return num * 20;
    return num; // assume already a percent
  };

  const normalizeEval = (ev) => ({
    employeeId: ev.employeeId ?? ev.employee_id ?? ev.userId ?? ev.user_id ?? ev.employee?.id ?? ev.employee?.user_id ?? null,
    employeeName: ev.employeeName ?? ev.employee?.name ?? ([ev.employee?.firstName, ev.employee?.middleName, ev.employee?.lastName].filter(Boolean).join(' ') || [ev.employee?.first_name, ev.employee?.middle_name, ev.employee?.last_name].filter(Boolean).join(' ')) ?? null,
    positionId: ev.positionId ?? ev.employee?.positionId ?? ev.employee?.position_id ?? ev.employee?.position?.id ?? null,
    evaluatorId: ev.evaluatorId ?? ev.evaluator_id ?? ev.evaluator?.id ?? ev.evaluator?.user_id ?? null,
    evaluatorName: ev.evaluatorName ?? ev.evaluator?.name ?? ([ev.evaluator?.firstName, ev.evaluator?.middleName, ev.evaluator?.lastName].filter(Boolean).join(' ') || [ev.evaluator?.first_name, ev.evaluator?.middle_name, ev.evaluator?.last_name].filter(Boolean).join(' ')) ?? null,
    periodId: ev.periodId ?? ev.period_id,
    periodStart: ev.periodStart ?? ev.period_start,
    periodEnd: ev.periodEnd ?? ev.period_end,
    evaluationDate: ev.evaluationDate ?? ev.evaluatedOn ?? ev.evaluated_on ?? ev.completedAt ?? ev.created_at ?? ev.updated_at ?? null,
    overallScore: toPercent(ev.overallScore ?? ev.averageScore ?? ev.overall_score ?? ev.average_score),
  });

  const formatDateSimple = (value) => {
    if (!value) return 'N/A';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        const s = String(value);
        // Try to grab date part from common formats
        const datePart = s.includes('T') ? s.split('T')[0] : s.split(' ')[0];
        // Fallback: return as-is if unparsable
        return datePart || s;
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}-${dd}-${yyyy}`; // Month-Day-Year
    } catch {
      return 'N/A';
    }
  };

  let normalizedEvals = [];
  if (Array.isArray(evaluations) && evaluations.length) {
    evaluations.forEach(ev => {
      const hasResponses = Array.isArray(ev.responses) && ev.responses.length > 0;
      if (hasResponses) {
        ev.responses.forEach(resp => {
          normalizedEvals.push(normalizeEval({
            employeeId: ev.employeeId ?? ev.employee_id ?? ev.employee?.id ?? ev.user_id,
            evaluatorId: resp.evaluatorId ?? resp.evaluator_id ?? resp.evaluator?.id ?? resp.evaluator?.user_id,
            evaluatorName: resp.evaluatorName ?? resp.evaluator?.name ?? ([resp.evaluator?.firstName, resp.evaluator?.middleName, resp.evaluator?.lastName].filter(Boolean).join(' ') || [resp.evaluator?.first_name, resp.evaluator?.middle_name, resp.evaluator?.last_name].filter(Boolean).join(' ')),
            periodId: ev.periodId ?? ev.period_id,
            evaluationDate: resp.evaluatedOn ?? resp.evaluated_on,
            overallScore: resp.overallScore ?? resp.overall_score,
          }));
        });
      } else {
        normalizedEvals.push(normalizeEval(ev));
      }
    });
    normalizedEvals = normalizedEvals.filter(e => e.overallScore != null);
  }
  let periodName = 'All Time';

  // Filter evaluations by selected period (prefer exact periodStart/periodEnd matching)
  if (periodId && periodId !== 'all') {
    const selectedPeriod = evaluationPeriods?.find(p => String(p.id) === String(periodId));
    if (selectedPeriod) {
      periodName = selectedPeriod.name || periodName;
      const start = selectedPeriod.evaluationStart;
      const end = selectedPeriod.evaluationEnd;

      // Prefer filtering by exact periodId first
      const filteredById = normalizedEvals.filter(ev => String(ev.periodId) === String(periodId));
      if (filteredById.length) {
        normalizedEvals = filteredById;
      } else {
      const matchByExact = (ev) => ev.periodStart === start && ev.periodEnd === end;
      const matchByDateRange = (ev) => {
        try {
          const s = new Date(start);
          const e = new Date(end);
          const d = ev.evaluationDate ? new Date(ev.evaluationDate) : (ev.periodEnd ? new Date(ev.periodEnd) : null);
          if (!d || Number.isNaN(d.getTime())) return false;
          return d >= s && d <= e;
        } catch { return false; }
      };

      const filteredExact = normalizedEvals.filter(matchByExact);
      normalizedEvals = filteredExact.length ? filteredExact : normalizedEvals.filter(matchByDateRange);
      }
    }
  }

  // Fallback: if still no evaluations, use overview employee data
  let usingOverviewFallback = false;
  // When 'All Time', try to flatten all period evaluations/responses first
  if ((periodId === 'all') && normalizedEvals.length === 0 && Array.isArray(evaluationPeriods) && evaluationPeriods.length) {
    const allResponses = [];
    evaluationPeriods.forEach(p => {
      const evals = Array.isArray(p.evaluations) ? p.evaluations : [];
      evals.forEach(ev => {
        const hasResponses = Array.isArray(ev.responses) && ev.responses.length > 0;
        if (hasResponses) {
          ev.responses.forEach(resp => {
            allResponses.push(normalizeEval({
              employeeId: ev.employeeId ?? ev.employee_id ?? ev.employee?.id ?? ev.user_id,
              evaluatorId: resp.evaluatorId ?? resp.evaluator_id ?? resp.evaluator?.id ?? resp.evaluator?.user_id,
              evaluatorName: resp.evaluatorName ?? resp.evaluator?.name ?? ([resp.evaluator?.firstName, resp.evaluator?.middleName, resp.evaluator?.lastName].filter(Boolean).join(' ') || [resp.evaluator?.first_name, resp.evaluator?.middle_name, resp.evaluator?.last_name].filter(Boolean).join(' ')),
              periodId: ev.periodId ?? ev.period_id,
              evaluationDate: resp.evaluatedOn ?? resp.evaluated_on,
              overallScore: resp.overallScore ?? resp.overall_score,
            }));
          });
        } else {
          allResponses.push(normalizeEval(ev));
        }
      });
    });
    normalizedEvals = allResponses.filter(e => e.overallScore != null);
  }

  if (normalizedEvals.length === 0) {
    usingOverviewFallback = true;
    normalizedEvals = (employees || [])
      .map(emp => ({
        employeeId: emp.id,
        evaluatorId: null,
        evaluatorName: null,
        periodStart: null,
        periodEnd: null,
        evaluationDate: null,
        overallScore: toPercent(emp.combinedAverageScore),
      }))
      .filter(e => e.overallScore != null);
  }

  if (normalizedEvals.length === 0) {
    doc.text("No performance evaluations were found for the selected period.", margin, layoutManager.y);
    return;
  }

  // --- 2. DISTRIBUTION & SUMMARY ---
  const brackets = { 'Needs Improvement (<70%)': 0, 'Meets Expectations (70-90%)': 0, 'Outstanding (>90%)': 0 };
  let totalScore = 0;
  normalizedEvals.forEach(ev => {
    totalScore += ev.overallScore;
    if (ev.overallScore < 70) brackets['Needs Improvement (<70%)']++;
    else if (ev.overallScore < 90) brackets['Meets Expectations (70-90%)']++;
    else brackets['Outstanding (>90%)']++;
  });
  const avgScore = totalScore / normalizedEvals.length;

  // --- 3. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'bar',
    data: {
      labels: Object.keys(brackets),
      datasets: [{
        label: 'Number of Employees',
        data: Object.values(brackets),
        backgroundColor: ['#dc3545', '#ffc107', '#198754']
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  };

  // --- 4. SUMMARY TEXT ---
  const periodText = periodId === 'all' ? 'all time' : `the "${periodName}" evaluation period`;
  const sourceText = usingOverviewFallback ? 'overview scores' : 'submitted evaluations';
  const summaryText = `During ${periodText}, a total of ${normalizedEvals.length} ${sourceText} were included. The average score was ${avgScore.toFixed(2)}%. Of these, ${brackets['Outstanding (>90%)']} employee(s) were rated as 'Outstanding', while ${brackets['Needs Improvement (<70%)']} were identified as needing improvement.`;

  // --- 5. TABLE DATA ---
  // Build a comprehensive employee map, including people referenced in periods/evaluations/responses
  const collectedEmployees = [];
  (employees || []).forEach(e => collectedEmployees.push(e));
  (evaluationPeriods || []).forEach(p => {
    (p.employees || []).forEach(e => collectedEmployees.push(e));
    (p.evaluations || []).forEach(ev => {
      if (ev.employee) collectedEmployees.push(ev.employee);
      if (Array.isArray(ev.responses)) ev.responses.forEach(resp => {
        if (resp.evaluator) collectedEmployees.push(resp.evaluator);
      });
    });
  });
  (evaluations || []).forEach(ev => {
    if (ev.employee) collectedEmployees.push(ev.employee);
    if (Array.isArray(ev.responses)) ev.responses.forEach(resp => {
      if (resp.evaluator) collectedEmployees.push(resp.evaluator);
    });
  });
  // Include comprehensive employees from attendance (including inactive) when available
  (dataSources?.allEmployees || []).forEach(e => collectedEmployees.push(e));
  // Build position lookup early for enriching employee records
  const positionMap = new Map((positions || []).map(p => [String(p.id), p.title]));
  const employeeMap = new Map();
  const enrichPosition = (rec) => {
    const empPosStr = typeof rec?.position === 'string' ? rec.position : rec?.position?.name;
    const posIdRaw = rec?.positionId ?? rec?.position_id ?? rec?.position?.id;
    const posId = posIdRaw != null ? String(posIdRaw) : null;
    const resolvedPos = empPosStr || (posId ? positionMap.get(posId) : null);
    return {
      position: resolvedPos ?? (typeof rec?.position === 'string' ? rec.position : rec?.position?.name) ?? null,
      positionId: posIdRaw ?? null,
    };
  };
  collectedEmployees.forEach(e => {
    const rawId = e?.id ?? e?.employeeId ?? e?.employee_id ?? e?.userId ?? e?.user_id;
    if (rawId == null) return;
    const id = String(rawId);
    const derivedName = e?.name || [e?.firstName, e?.middleName, e?.lastName].filter(Boolean).join(' ') || [e?.first_name, e?.middle_name, e?.last_name].filter(Boolean).join(' ');
    const base = employeeMap.get(id);
    if (!base) {
      const posInfo = enrichPosition(e);
      employeeMap.set(id, {
        ...e,
        id: rawId,
        name: derivedName || e?.email || 'Employee',
        position: posInfo.position,
        positionId: posInfo.positionId,
      });
    } else {
      // Merge new info into existing, prefer to fill missing position/name
      const posInfo = enrichPosition(e);
      if (!base.name && derivedName) base.name = derivedName;
      if ((!base.position || base.position === 'Unassigned') && posInfo.position) base.position = posInfo.position;
      if (!base.positionId && posInfo.positionId) base.positionId = posInfo.positionId;
      employeeMap.set(id, base);
    }
  });
  // Build a name lookup to aid position resolution when IDs differ across feeds
  const nameMap = new Map();
  employeeMap.forEach((val) => {
    const key = (val?.name || '').toString().trim().toLowerCase();
    if (key) nameMap.set(key, val);
  });
  // positionMap already built above
  const resolvePosition = (emp, ev, employeeLabel) => {
    // Accept string or object position on employee
    const empPosStr = typeof emp?.position === 'string' ? emp.position : emp?.position?.name;
    const evPosStr = typeof ev?.position === 'string' ? ev.position : ev?.position?.name;
    const posIdRaw = emp?.positionId ?? emp?.position_id ?? emp?.position?.id ?? ev?.positionId ?? ev?.position_id;
    const posId = posIdRaw != null ? String(posIdRaw) : null;
    const byId = empPosStr || evPosStr || (posId ? positionMap.get(posId) : null);
    if (byId) return byId;
    // Fallback: try name-based mapping (handles cases where evaluation used user_id but attendance/main used employee id)
    const nameKey = (employeeLabel || emp?.name || ev?.employeeName || '').toString().trim().toLowerCase();
    const byNameEmp = nameKey ? nameMap.get(nameKey) : null;
    if (byNameEmp) {
      const byNamePosStr = typeof byNameEmp?.position === 'string' ? byNameEmp.position : byNameEmp?.position?.name;
      const byNamePosIdRaw = byNameEmp?.positionId ?? byNameEmp?.position_id ?? byNameEmp?.position?.id;
      const byNamePosId = byNamePosIdRaw != null ? String(byNamePosIdRaw) : null;
      return byNamePosStr || (byNamePosId ? positionMap.get(byNamePosId) : null) || 'Unassigned';
    }
    return 'Unassigned';
  };
  const tableHead = ['Employee', 'Position', 'Evaluator', 'Evaluation Date', 'Score'];
  const tableBody = normalizedEvals.map(ev => {
    const emp = employeeMap.get(String(ev.employeeId));
    const evaluator = ev.evaluatorId ? employeeMap.get(String(ev.evaluatorId)) : null;
    const evaluatorLabel = ev.evaluatorName || evaluator?.name || 'N/A';
    const employeeLabel = emp?.name || ev.employeeName || ev.employeeId || 'N/A';
    const positionLabel = resolvePosition(emp, ev, employeeLabel);
    return [
      employeeLabel,
      positionLabel,
      evaluatorLabel,
      formatDateSimple(ev.evaluationDate),
      `${ev.overallScore.toFixed(2)}%`
    ];
  });

  // --- 6. PDF ASSEMBLY ---
  const reportTitle = periodId === 'all' ? 'Overall Performance Distribution' : `Performance Distribution - ${periodName}`;
  await layoutManager.addChartWithTitle(reportTitle, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Evaluation Results");
  layoutManager.addTable([tableHead], tableBody, { columnStyles: { 4: { halign: 'left' } } });
};