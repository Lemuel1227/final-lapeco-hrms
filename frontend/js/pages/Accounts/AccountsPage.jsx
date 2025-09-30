import React, { useMemo, useState, useEffect } from 'react';
import ConfirmationModal from '../../modals/ConfirmationModal';
import { employeeAPI } from '../../services/api';
import './AccountsPage.css';

const AccountsPage = () => {
    const [userAccounts, setUserAccounts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await employeeAPI.getAll();
                const employeeData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                setEmployees(employeeData);
                
                // Create user accounts from employee data with real account status
                const accounts = employeeData.map(emp => ({
                    employeeId: emp.id, // Use emp.id as the identifier
                    name: emp.name, // Add name directly
                    username: emp.email || `${emp.name?.toLowerCase().replace(/\s+/g, '.')}@company.com`,
                    password: !emp.password_changed ? `lapeco${emp.id}` : '**********', // Show default password or masked
                    passwordChanged: !!emp.password_changed, // Track password change status (convert to boolean)
                    status: emp.account_status || 'Active' // Use real account status from backend
                }));
                setUserAccounts(accounts);
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);

    const handlers = {
        resetPassword: async (employeeId) => {
            try {
                const response = await employeeAPI.resetPassword(employeeId);
                
                // Show success message with the new password
                alert(`Password reset successfully! New password: ${response.data.new_password}`);
                
                // Update local state to reflect password_changed = false
                setUserAccounts(prev => 
                    prev.map(account => 
                        account.employeeId === employeeId 
                            ? { ...account, passwordChanged: false, password: response.data.new_password }
                            : account
                    )
                );
                
            } catch (error) {
                console.error('Error resetting password:', error);
                alert('Failed to reset password. Please try again.');
            }
        },
        toggleAccountStatus: async (employeeId) => {
            try {
                // Find the current account
                const currentAccount = userAccounts.find(account => account.employeeId === employeeId);
                if (!currentAccount) return;
                
                // Determine the action and call the appropriate API
                const isActivating = currentAccount.status === 'Deactivated';
                let response;
                
                if (isActivating) {
                    response = await employeeAPI.activateAccount(employeeId);
                } else {
                    response = await employeeAPI.deactivateAccount(employeeId);
                }
                
                const newStatus = response.data.employee.account_status;
                
                // Update local state
                setUserAccounts(prev => 
                    prev.map(account => 
                        account.employeeId === employeeId 
                            ? { ...account, status: newStatus }
                            : account
                    )
                );
                
                // Also update employees state
                setEmployees(prev => 
                    prev.map(emp => 
                        emp.id === employeeId 
                            ? { ...emp, account_status: newStatus }
                            : emp
                    )
                );
                
                // Show success message
                alert(`Account ${newStatus.toLowerCase()} successfully!`);
                
            } catch (error) {
                console.error('Error updating account status:', error);
                if (error.response?.data?.error) {
                    alert(error.response.data.error);
                } else {
                    alert('Failed to update account status. Please try again.');
                }
            }
        }
    };
    const [confirmationModalState, setConfirmationModalState] = useState({
        isOpen: false,
        title: '',
        body: '',
        confirmText: '',
        confirmVariant: 'danger',
        onConfirm: () => {},
    });

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e.name])), [employees]);

    const filteredAccounts = useMemo(() => {
        return userAccounts.filter(acc => {
            if (statusFilter !== 'All' && acc.status !== statusFilter) {
                return false;
            }
            return (
                (acc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (acc.employeeId || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                (acc.username || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }, [userAccounts, searchTerm, statusFilter]);

    const handleCopyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            alert(`${type} copied to clipboard!`);
        });
    };

    const handleCloseConfirmation = () => {
        setConfirmationModalState({ isOpen: false });
    };

    const handleResetPassword = (account) => {
        setConfirmationModalState({
            isOpen: true,
            title: 'Reset Password',
            body: `Are you sure you want to reset the password for ${employeeMap.get(account.employeeId) || account.employeeId}? The password will be reset to "lapeco${account.employeeId}".`,
            confirmText: 'Yes, Reset',
            confirmVariant: 'warning',
            onConfirm: () => {
                handlers.resetPassword(account.employeeId);
                handleCloseConfirmation();
            }
        });
    };

    const handleToggleStatus = (account) => {
        const isActivating = account.status === 'Deactivated';
        setConfirmationModalState({
            isOpen: true,
            title: `${isActivating ? 'Activate' : 'Deactivate'} Account`,
            body: `Are you sure you want to ${isActivating ? 'activate' : 'deactivate'} the account for ${employeeMap.get(account.employeeId) || account.employeeId}?`,
            confirmText: `Yes, ${isActivating ? 'Activate' : 'Deactivate'}`,
            confirmVariant: isActivating ? 'success' : 'danger',
            onConfirm: () => {
                handlers.toggleAccountStatus(account.employeeId);
                handleCloseConfirmation();
            }
        });
    };

    return (
        <div className="container-fluid p-0 page-module-container">
            <header className="page-header d-flex justify-content-between align-items-center mb-4">
                <h1 className="page-main-title">Accounts Management</h1>
            </header>

            {loading && (
                <div className="text-center p-5">
                    <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Loading accounts...</p>
                </div>
            )}

            {!loading && (
            
            <div className="card data-table-card shadow-sm">
                <div className="card-header accounts-card-header">
                    <div className="input-group" style={{ maxWidth: '400px' }}>
                        <span className="input-group-text"><i className="bi bi-search"></i></span>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search by name, ID, or username..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="btn-group view-toggle" role="group">
                        <button type="button" className={`btn ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>All</button>
                        <button type="button" className={`btn ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')}>Active</button>
                        <button type="button" className={`btn ${statusFilter === 'Deactivated' ? 'active' : ''}`} onClick={() => setStatusFilter('Deactivated')}>Deactivated</button>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table data-table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Employee Name</th>
                                <th>Username</th>
                                <th>Password</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAccounts.map(account => (
                                <tr key={account.employeeId}>
                                    <td><strong>{account.employeeId}</strong></td>
                                    <td>{account.name}</td>
                                    <td>{account.username}</td>
                                    <td>
                                        <div className="password-cell">
                                            <span>{!account.passwordChanged ? account.password : '••••••••'}</span>
                                            <button 
                                                className="btn btn-sm btn-light copy-btn" 
                                                title="Copy Password"
                                                onClick={() => handleCopyToClipboard(account.password, 'Password')}
                                            >
                                                <i className="bi bi-clipboard"></i>
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge-employee status-badge-${account.status.toLowerCase()}`}>
                                            {account.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="dropdown">
                                            <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                                Manage
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleResetPassword(account); }}>Reset Password</a></li>
                                                <li>
                                                    <a className={`dropdown-item ${account.status === 'Active' ? 'text-danger' : 'text-success'}`} href="#" onClick={(e) => { e.preventDefault(); handleToggleStatus(account); }}>
                                                        {account.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            <ConfirmationModal
                show={confirmationModalState.isOpen}
                onClose={handleCloseConfirmation}
                onConfirm={confirmationModalState.onConfirm}
                title={confirmationModalState.title}
                confirmText={confirmationModalState.confirmText}
                confirmVariant={confirmationModalState.confirmVariant}
            >
                <p>{confirmationModalState.body}</p>
            </ConfirmationModal>
        </div>
    );
};

export default AccountsPage;