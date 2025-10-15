const getRiskDetails = (value) => {
    if (value >= 60) return { label: 'High', color: [220, 53, 69] }; // danger
    if (value >= 30) return { label: 'Medium', color: [255, 193, 7] }; // warning
    return { label: 'Low', color: [25, 135, 84] }; // success
};

// MODIFIED: Now accepts the 'doc' instance as the first argument
const generateRiskIndicator = (doc, score, x, y) => {
    const { label, color } = getRiskDetails(score);
    const barWidth = 40;
    const barHeight = 8;

    doc.setFillColor(233, 236, 239);
    doc.rect(x, y, barWidth, barHeight, 'F');

    doc.setFillColor(color[0], color[1], color[2]);
    const scoreWidth = (score / 100) * barWidth;
    doc.rect(x, y, scoreWidth, barHeight, 'F');

    doc.setFontSize(8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont(undefined, 'bold');
    doc.text(label, x + barWidth + 5, y + barHeight / 2, { verticalAlign: 'middle' });
};

export const generatePredictiveAnalyticsReport = async (layoutManager, dataSources, params) => {
    const { employeeData } = dataSources;
    const { asOfDate } = params;
    const { doc, margin } = layoutManager;

    if (!employeeData || employeeData.length === 0) {
        doc.text("No predictive analytics data available for the selected filters.", margin, layoutManager.y);
        return;
    }

    // --- 1. DATA PREPARATION ---
    const classificationCounts = employeeData.reduce((acc, emp) => {
        if (emp.isHighPotential) acc['High Potential']++;
        else if (emp.isTurnoverRisk) acc['Turnover Risk']++;
        else acc['Meets Expectations']++;
        return acc;
    }, { 'High Potential': 0, 'Turnover Risk': 0, 'Meets Expectations': 0 });

    const dateText = asOfDate
        ? new Date(asOfDate + 'T00:00:00').toLocaleDateString()
        : new Date().toLocaleDateString();

    // --- 2. CHART CONFIGURATION ---
    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: Object.keys(classificationCounts),
            datasets: [{
                data: Object.values(classificationCounts),
                backgroundColor: ['#198754', '#dc3545', '#6c757d']
            }]
        },
        options: { plugins: { legend: { position: 'right' } } }
    };

    // --- 3. SUMMARY TEXT ---
    const summaryText = `This analysis, conducted as of ${dateText}, covers ${employeeData.length} employees with sufficient performance data. Within this group, ${classificationCounts['Turnover Risk']} employee(s) are flagged as potential turnover risks, while ${classificationCounts['High Potential']} are identified as high-potential talent.`;

    // --- 4. TABLE DATA ---
    const tableHead = ['Employee', 'Position', 'Performance', 'Trend', 'Risk Score'];
    const tableBody = employeeData.map(emp => {
        const riskScoreText = `${emp.riskScore.toFixed(1)} / 100`;
        return [
            { content: `${emp.name}\n${emp.id}`, styles: { fontSize: 9 } },
            emp.positionTitle,
            emp.latestScore ? `${emp.latestScore.toFixed(1)}%` : 'N/A',
            emp.trend,
            { 
              content: riskScoreText,
              // MODIFIED: Access the 'doc' instance from the hook data
              didDrawCell: (data) => {
                const textWidth = data.doc.getTextWidth(riskScoreText);
                generateRiskIndicator(data.doc, emp.riskScore, data.cell.x + textWidth + 10, data.cell.y + 7);
              }
            }
        ];
    });
    
    // --- 5. PDF ASSEMBLY ---
    await layoutManager.addChartWithTitle('Employee Classification Distribution', chartConfig);
    layoutManager.addSummaryText(summaryText);
    layoutManager.addSectionTitle("Detailed Employee Matrix");
    layoutManager.addTable([tableHead], tableBody, {
        columnStyles: {
            0: { cellWidth: 140 },
            2: { halign: 'left' },
            3: { halign: 'left' },
            4: { cellWidth: 120 },
        }
    });
};