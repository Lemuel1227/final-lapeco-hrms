import autoTable from 'jspdf-autotable';

const getRiskDetails = (value) => {
    if (value >= 60) return { label: 'High', color: [220, 53, 69] }; // danger
    if (value >= 30) return { label: 'Medium', color: [255, 193, 7] }; // warning
    return { label: 'Low', color: [25, 135, 84] }; // success
};

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

export const generatePredictiveAnalyticsReport = async (doc, params, dataSources, addChartAndTitle) => {
    const { employeeData } = dataSources;
    const { asOfDate, margin } = params;
    let finalY = params.startY;

    if (!employeeData || employeeData.length === 0) {
        doc.text("No predictive analytics data available for the selected filters.", margin, finalY);
        return doc;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Analysis As-Of:', margin, finalY);
    doc.setFont(undefined, 'normal');
    const dateText = asOfDate
        ? new Date(asOfDate + 'T00:00:00').toLocaleDateString()
        : new Date().toLocaleDateString();
    doc.text(dateText, margin + 90, finalY);
    finalY += 25;

    const classificationCounts = employeeData.reduce((acc, emp) => {
        if (emp.isHighPotential) acc['High Potential']++;
        else if (emp.isTurnoverRisk) acc['Turnover Risk']++;
        else acc['Meets Expectations']++;
        return acc;
    }, { 'High Potential': 0, 'Turnover Risk': 0, 'Meets Expectations': 0 });

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
    finalY = await addChartAndTitle('Employee Classification Distribution', chartConfig, finalY);

    const tableColumns = ['Employee', 'Position', 'Performance', 'Trend', 'Risk Score'];
    const tableRows = employeeData.map(emp => {
        const riskScoreText = `${emp.riskScore.toFixed(1)} / 100`;
        return [
            { content: `${emp.name}\n${emp.id}`, styles: { fontSize: 9 } },
            emp.positionTitle,
            emp.latestScore ? `${emp.latestScore.toFixed(1)}%` : 'N/A',
            emp.trend,
            { 
              content: riskScoreText,
              didDrawCell: (data) => {
                const textWidth = doc.getTextWidth(riskScoreText);
                generateRiskIndicator(doc, emp.riskScore, data.cell.x + textWidth + 10, data.cell.y + 7);
              }
            }
        ];
    });

    autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: finalY,
        theme: 'striped',
        headStyles: { fillColor: [25, 135, 84] },
        columnStyles: {
            0: { cellWidth: 140 },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { cellWidth: 120 },
        }
    });

    return doc;
};