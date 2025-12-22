import React from 'react';

const ScheduleDetailsView = ({ 
  previewData, 
  schedulesByDate, 
  formatTimeToAMPM, 
  onBack, 
  onStartCreationFlow 
}) => {
  if (!previewData) return null;
  
  const isTemplate = previewData.type === 'template';
  const title = isTemplate ? previewData.name : previewData.info.name;
  const subtitle = isTemplate 
    ? previewData.description 
    : `Schedule for ${new Date(previewData.info.date + 'T00:00:00').toLocaleDateString()}`;
  
  // Fix data mapping for schedules
  let dataForTable;
  if (isTemplate) {
    // For templates, use the template data directly
    const templateData = previewData.fullData || previewData;
    console.log('Template data for table:', templateData);
    
    if (templateData) {
      // Try different possible property names for template assignments
      dataForTable = templateData.assignments || 
                    templateData.template_assignments || 
                    templateData.employees || 
                    templateData.template_employees ||
                    templateData.employee_assignments ||
                    [];
    } else {
      dataForTable = [];
    }
  } else {
    // Try different possible data structures from getById API
    const scheduleData = schedulesByDate[previewData.info.date] || previewData.fullData;
    console.log('Schedule data for table:', scheduleData);
    
    if (scheduleData) {
      // Try different possible property names for employee assignments
      dataForTable = scheduleData.assignments || 
                    scheduleData.schedule_assignments || 
                    scheduleData.employees || 
                    scheduleData.schedule_employees ||
                    scheduleData.employee_assignments ||
                    [];
    } else {
      dataForTable = [];
    }
  }
  
  console.log('Data for table:', dataForTable);
  console.log('Data for table length:', dataForTable.length);
  
  const columnsForTable = isTemplate ? previewData.columns : previewData.info.columns;

  return (
    <div className="schedule-preview-container">
      <div className="schedule-preview-header">
        <div>
          <button className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
            <i className="bi bi-arrow-left me-2"></i>Back
          </button>
          <h2 className="preview-title">{title}</h2>
          <p className="preview-subtitle">{subtitle}</p>
        </div>
        <div className="preview-actions">
          <button 
            className="btn btn-success" 
            onClick={() => {
              console.log('Use this Structure button clicked');
              console.log('isTemplate:', isTemplate);
              console.log('previewData:', previewData);
              console.log('dataForTable:', dataForTable);
              console.log('previewData.name:', previewData.name);
              console.log('previewData.description:', previewData.description);
              console.log('previewData.columns:', previewData.columns);
              console.log('dataForTable length:', dataForTable?.length);
              console.log('First assignment in dataForTable:', dataForTable?.[0]);
              console.log('Assignment fields:', Object.keys(dataForTable?.[0] || {}));
              console.log('Assignment user_id:', dataForTable?.[0]?.user_id);
              console.log('Assignment empId:', dataForTable?.[0]?.empId);
              console.log('Assignment employee:', dataForTable?.[0]?.employee);
              console.log('Assignment user:', dataForTable?.[0]?.user);
              
              const creationData = {
                type: isTemplate ? 'template' : 'copy', 
                data: isTemplate ? {
                  name: previewData.fullData?.name || previewData.info?.name,
                  description: previewData.fullData?.description || previewData.info?.description,
                  columns: previewData.fullData?.columns || previewData.info?.columns || [],
                  assignments: dataForTable?.map(assignment => ({
                    ...assignment,
                    user_id: assignment.user?.id,
                    empId: assignment.user?.id,
                    employee_name: assignment.user?.name,
                    position_name: assignment.user?.position?.name
                  })) || []
                } : (dataForTable || []),
                sourceScheduleInfo: isTemplate ? null : previewData.info
              };
              
              console.log('creationData:', creationData);
              console.log('onStartCreationFlow function:', onStartCreationFlow);
              
              if (typeof onStartCreationFlow === 'function') {
                onStartCreationFlow(creationData);
              } else {
                console.error('onStartCreationFlow is not a function');
              }
            }}
          >
            <i className="bi bi-calendar-plus-fill me-2"></i>Use this Structure
          </button>
        </div>
      </div>
      
      {isTemplate ? (
        <>
          <h5 className="mb-3">Template Structure</h5>
          {dataForTable.length > 0 ? (
            <div className="table-responsive schedule-preview-table">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Position</th>
                    <th>Start Time</th>
                    <th>Break Start</th>
                    <th>Break End</th>
                    <th>End Time</th>
                    <th>OT (hrs)</th>
                    {(columnsForTable || []).map(key => (
                      <th key={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataForTable.map(assignment => (
                    <tr key={assignment.id}>
                      <td>
                        {assignment.user
                          ? ([assignment.user.first_name, assignment.user.middle_name, assignment.user.last_name]
                              .filter(Boolean)
                              .join(' ') || assignment.user.name || assignment.user.username || 'Unknown')
                          : 'Unknown'}
                      </td>
                      <td>{assignment.user?.id || 'N/A'}</td>
                      <td>{assignment.user?.position?.name || 'Unassigned'}</td>
                      <td>{assignment.start_time || '---'}</td>
                      <td>{assignment.break_start || '---'}</td>
                      <td>{assignment.break_end || '---'}</td>
                      <td>{assignment.end_time || '---'}</td>
                      <td>{assignment.ot_hours && parseFloat(assignment.ot_hours) > 0 ? assignment.ot_hours : '---'}</td>
                      {(columnsForTable || []).map(key => {
                        const value = assignment[key];
                        if (['start_time', 'break_start', 'break_end', 'end_time', 'ot_hours'].includes(key)) {
                          return null;
                        }
                        return <td key={key}>{value || '---'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table template-preview-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Position</th>
                    <th>Start Time</th>
                    <th>Break Start</th>
                    <th>Break End</th>
                    <th>End Time</th>
                    <th>OT (hrs)</th>
                    {(columnsForTable || []).map(key => (
                      <th key={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8 + (columnsForTable || []).length} className="text-center">
                      This template has no assigned employees yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="fw-bold">This schedule includes the following employees:</p>
          <div className="table-responsive schedule-preview-table">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Position</th>
                  <th>Start Time</th>
                  <th>Break Start</th>
                  <th>Break End</th>
                  <th>End Time</th>
                  <th>OT Hours</th>
                  {(columnsForTable || []).map(key => (
                    <th key={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataForTable.map(emp => (
                  <tr key={emp.employee_id}>
                    <td>{emp.employee_id}</td>
                    <td>{emp.user_name}</td>
                    <td>{emp.position_name || 'Unassigned'}</td>
                    <td>{formatTimeToAMPM(emp.start_time)}</td>
                    <td>{formatTimeToAMPM(emp.break_start)}</td>
                    <td>{formatTimeToAMPM(emp.break_end)}</td>
                    <td>{formatTimeToAMPM(emp.end_time)}</td>
                    <td>{emp.ot_hours && parseFloat(emp.ot_hours) > 0 ? emp.ot_hours : '---'}</td>
                    {(columnsForTable || []).map(key => {
                      if (['start_time', 'break_start', 'break_end', 'end_time', 'ot_hours'].includes(key)) {
                        return null;
                      }
                      const value = emp[key];
                      return <td key={key}>{value || '---'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ScheduleDetailsView;
