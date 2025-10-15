import React, { useState, useMemo, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { employeeAPI } from '../../services/api';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const REQUIREMENTS_LIST = [
    { key: 'sssNo', label: 'SSS' },
    { key: 'tinNo', label: 'TIN' },
    { key: 'pagIbigNo', label: 'Pag-IBIG' },
    { key: 'philhealthNo', label: 'PhilHealth' },
];

const getInitialFilters = () => ({
    overall: 'All', sssNo: 'All', tinNo: 'All', pagIbigNo: 'All', philhealthNo: 'All',
});

const FilterToggle = ({ label, reqKey, options, currentFilter, onFilterChange }) => (
    <div className="filter-group">
        <label className="filter-label">{label}</label>
        <div className="btn-group btn-group-sm w-100">
            {options.map(opt => (
                <button 
                    key={opt}
                    type="button" 
                    className={`btn ${currentFilter === opt ? 'btn-primary' : 'btn-outline-secondary'}`} 
                    onClick={() => onFilterChange(reqKey, opt)}
                >
                    {opt}
                </button>
            ))}
        </div>
    </div>
);

const RequirementsChecklist = () => {
    const [filters, setFilters] = useState(getInitialFilters());
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEmployeesData();
    }, []);

    const fetchEmployeesData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch complete employee data including government requirements
            const response = await employeeAPI.getAll();
            const employeesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            
            // Transform the data to match the expected format
            const transformedEmployees = employeesData.map(emp => ({
                id: emp.id,
                name: emp.name,
                imageUrl: emp.image_url,
                sssNo: emp.sss_no,
                tinNo: emp.tin_no,
                pagIbigNo: emp.pag_ibig_no,
                philhealthNo: emp.philhealth_no,
            }));
            
            setEmployees(transformedEmployees);
        } catch (err) {
            console.error('Error fetching employees data:', err);
            setError('Failed to load employee data. Please try again.');
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const processedEmployees = useMemo(() => {
        return employees.map(emp => {
            const isComplete = REQUIREMENTS_LIST.every(req => emp[req.key] && String(emp[req.key]).trim() !== '');
            return { ...emp, isComplete };
        });
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return processedEmployees.filter(emp => {
            const matchesOverall = filters.overall === 'All' || (filters.overall === 'Complete' && emp.isComplete) || (filters.overall === 'Incomplete' && !emp.isComplete);
            if (!matchesOverall) return false;

            return REQUIREMENTS_LIST.every(req => {
                const filterValue = filters[req.key];
                const hasRequirement = emp[req.key] && String(emp[req.key]).trim() !== '';
                if (filterValue === 'With') return hasRequirement;
                if (filterValue === 'Without') return !hasRequirement;
                return true;
            });
        });
    }, [processedEmployees, filters]);
    
    const chartData = useMemo(() => {
        const completeCount = processedEmployees.filter(e => e.isComplete).length;
        const incompleteCount = processedEmployees.length - completeCount;
        return {
            labels: ['Complete', 'Incomplete'],
            datasets: [{
                data: [completeCount, incompleteCount],
                backgroundColor: ['#198754', '#ffc107'],
                borderColor: '#ffffff',
                borderWidth: 4,
            }]
        };
    }, [processedEmployees]);

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' };

    if (loading) {
        return (
            <div className="requirements-checklist-container">
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="requirements-checklist-container">
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                    <button 
                        className="btn btn-outline-danger btn-sm ms-3" 
                        onClick={fetchEmployeesData}
                    >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="requirements-checklist-container">
            <div className="requirements-header-grid">
                <div className="card requirements-filter-panel shadow-sm">
                    <div className="card-header">
                        <h6 className="mb-0"><i className="bi bi-filter-circle-fill me-2 text-primary"></i>Requirements Filter</h6>
                    </div>
                    <div className="card-body">
                        <div className="filter-group-overall">
                            <FilterToggle 
                                label="Overall Status" reqKey="overall"
                                options={['All', 'Complete', 'Incomplete']} 
                                currentFilter={filters.overall} onFilterChange={handleFilterChange}
                            />
                        </div>
                        <hr className="my-3"/>
                        <div className="individual-filters-grid">
                            {REQUIREMENTS_LIST.map(req => (
                                <FilterToggle 
                                    key={req.key} reqKey={req.key} label={req.label} 
                                    options={['All', 'With', 'Without']}
                                    currentFilter={filters[req.key]} onFilterChange={handleFilterChange}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card completeness-chart-container shadow-sm">
                    <div className="card-header">
                        <h6 className="mb-0"><i className="bi bi-pie-chart-fill me-2"></i>Overall Completeness</h6>
                    </div>
                    <div className="card-body">
                        <Doughnut data={chartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            <div className="card data-table-card shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h6>Checklist Results</h6>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">
                        Showing {filteredEmployees.length} of {employees.length} employees
                    </span>
                </div>
                <div className="table-responsive">
                    <table className="table data-table requirements-table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                {REQUIREMENTS_LIST.map(req => <th key={req.key}>{req.label} No.</th>)}
                                <th className="text-center">Overall Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map(emp => (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <img src={emp.imageUrl || placeholderAvatar} alt={emp.name} className="employee-avatar-table me-2" />
                                            <span>{emp.name}</span>
                                        </div>
                                    </td>
                                    {REQUIREMENTS_LIST.map(req => (
                                        <td key={req.key}>
                                            {emp[req.key] ? emp[req.key] : <span className="missing-value"><i className="bi bi-exclamation-diamond-fill me-1"></i>Missing</span>}
                                        </td>
                                    ))}
                                    <td className="text-center">
                                        {emp.isComplete ? 
                                            <span className="status-badge-employee status-badge-complete">Complete</span> :
                                            <span className="status-badge-employee status-badge-incomplete">Incomplete</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredEmployees.length === 0 && <p className="text-center text-muted p-4 mb-0">No employees match the selected filter criteria.</p>}
                </div>
            </div>
        </div>
    );
};

export default RequirementsChecklist;