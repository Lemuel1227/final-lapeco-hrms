import React, { useEffect, useRef } from 'react';
import { Tooltip } from 'bootstrap';

const EditableContributionTable = ({ columns, rows, onCellChange, onHeaderChange, onHeaderClick, editingHeaderKey, onDeleteRow, onAddColumn, onDeleteColumn }) => {
  
  const tableRef = useRef(null);

  useEffect(() => {
    if (!tableRef.current) return;
    
    const tooltipTriggerList = [].slice.call(tableRef.current.querySelectorAll('[data-bs-toggle="tooltip"]'));
    
    const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
      return new Tooltip(tooltipTriggerEl);
    });

    return () => {
      tooltipList.forEach(tooltip => tooltip.dispose());
    };
  }, [columns, rows]);


  return (
    <>
      <div ref={tableRef} className="table-responsive contribution-table-container">
        <table className="table data-table editable-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className={editingHeaderKey === col.key ? 'is-editing' : ''}>
                  <div className="d-flex align-items-center justify-content-between">
                    {editingHeaderKey === col.key ? (
                      <input
                        type="text" className="form-control form-control-sm header-input" value={col.label}
                        onChange={(e) => onHeaderChange(col.key, e.target.value)}
                        onBlur={() => onHeaderClick(null)} autoFocus
                      />
                    ) : (
                      <>
                        <span className="header-label" onClick={() => !col.isPermanent && onHeaderClick(col.key)}>{col.label}</span>
                        
                        {col.isPermanent ? (
                          <span 
                            className="th-actions"
                            data-bs-toggle="tooltip" 
                            data-bs-placement="top"
                            title="Cannot modify permanent column"
                          >
                            <button className="btn btn-sm btn-light py-0 px-1" type="button" disabled>
                              <i className="bi bi-three-dots-vertical"></i>
                            </button>
                          </span>
                        ) : (
                          <div className="dropdown th-actions">
                            <button className="btn btn-sm btn-light py-0 px-1" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                              <i className="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onHeaderClick(col.key); }}>Rename</a></li>
                                <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); onDeleteColumn(col.key); }}>Delete Column</a></li>
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
              <th className="add-column-header text-center align-middle">
                <button className="btn btn-sm btn-light w-100" onClick={onAddColumn} title="Add New Column">
                  <i className="bi bi-plus-lg"></i>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(col => (
                  <td key={col.key}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={row[col.key] || ''}
                      onChange={(e) => onCellChange(rowIndex, col.key, e.target.value)}
                      readOnly={!col.editable}
                    />
                  </td>
                ))}
                <td className="text-center align-middle">
                    <button className="btn btn-sm btn-outline-danger p-0 delete-row-btn" onClick={() => onDeleteRow(rowIndex)} title="Delete Row">
                        <i className="bi bi-x"></i>
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default EditableContributionTable;