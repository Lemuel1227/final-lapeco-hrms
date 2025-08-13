import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import './MyTeamPage.css';

const MyTeamPage = ({ currentUser, employees, positions }) => {
  const [viewMode, setViewMode] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);

  const { teamRoster, teamLeader, currentPositionTitle } = useMemo(() => {
    if (!currentUser || !employees || !positions) {
      return { teamRoster: [], teamLeader: null, currentPositionTitle: 'N/A' };
    }
    
    const self = employees.find(e => e.id === currentUser.id);
    if (!self || !self.positionId) {
      return { teamRoster: [], teamLeader: null, currentPositionTitle: 'Unassigned' };
    }

    const currentPositionId = self.positionId;
    const posTitle = positionMap.get(currentPositionId) || 'Unassigned';
    
    // Only team leaders should see their team members
    // Regular employees should not see team data
    if (currentUser.role === 'TEAM_LEADER') {
      const colleagues = employees.filter(e => e.positionId === currentPositionId);
      const leader = colleagues.find(e => e.isTeamLeader);
      const members = colleagues.filter(e => !e.isTeamLeader);
      return { teamRoster: members, teamLeader: leader, currentPositionTitle: posTitle };
    } else {
      // Regular employees don't see team data
      return { teamRoster: [], teamLeader: null, currentPositionTitle: posTitle };
    }
  }, [currentUser, employees, positions, positionMap]);

  const sortedAndFilteredTeam = useMemo(() => {
    const filteredMembers = teamRoster.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredMembers.sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    if (teamLeader && (teamLeader.name.toLowerCase().includes(searchTerm.toLowerCase()) || teamLeader.id.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm)) {
      return [teamLeader, ...filteredMembers];
    }
    
    return filteredMembers;
  }, [teamRoster, teamLeader, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const renderCardView = () => (
    <div className="my-team-grid">
      {sortedAndFilteredTeam.map(member => (
        <div key={member.id} className={`team-member-card-final ${member.isTeamLeader ? 'leader' : ''}`}>
          <div className="card-top-section">
            <img 
              src={member.avatarUrl || placeholderAvatar} 
              alt={member.name} 
              className="member-avatar"
              onError={(e) => { e.target.src = placeholderAvatar; }}
            />
            <div className="member-info">
              <h6 className="member-name">{member.name}</h6>
              <p className="member-id text-muted">{member.id}</p>
            </div>
            {member.isTeamLeader ? 
                <span className="leader-tag-card"><i className="bi bi-star-fill"></i> LEADER</span>
              :
                <div className="card-actions">
                  <div className="dropdown">
                    <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><a className="dropdown-item" href="#">View Profile</a></li>
                      {currentUser.isTeamLeader && <li><a className="dropdown-item" href="#">Evaluate</a></li>}
                    </ul>
                  </div>
                </div>
            }
          </div>
          <div className="card-bottom-section">
            <a href={`mailto:${member.email}`} className="contact-link">
              <i className="bi bi-envelope-fill"></i>
              <span>{member.email}</span>
            </a>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="card data-table-card shadow-sm">
        <div className="table-responsive">
            <table className="table data-table mb-0 align-middle">
                <thead>
                    <tr>
                        <th className="sortable" onClick={() => requestSort('id')}>Employee ID {getSortIcon('id')}</th>
                        <th className="sortable" onClick={() => requestSort('name')}>Name {getSortIcon('name')}</th>
                        <th>Email</th>
                        <th>Contact No.</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedAndFilteredTeam.map(member => (
                        <tr key={member.id} className={member.isTeamLeader ? 'leader-row' : ''}>
                            <td>
                                {member.id}
                                {member.isTeamLeader && <span className="badge bg-success-subtle text-success-emphasis ms-2">Leader</span>}
                            </td>
                            <td>
                                <img src={member.avatarUrl || placeholderAvatar} alt={member.name} className="avatar-table me-2" onError={(e) => { e.target.src = placeholderAvatar; }}/>
                                {member.name}
                            </td>
                            <td>{member.email}</td>
                            <td>{member.contactNumber || 'N/A'}</td>
                            <td>
                              {!member.isTeamLeader && (
                                <div className="dropdown">
                                    <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        <li><a className="dropdown-item" href="#">View Profile</a></li>
                                        {currentUser.isTeamLeader && <li><a className="dropdown-item" href="#">Evaluate</a></li>}
                                    </ul>
                                </div>
                              )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <div>
            <h1 className="page-main-title">{currentPositionTitle} Team</h1>
            {teamLeader && <p className="page-subtitle text-muted mb-0">Led by: <strong>{teamLeader.name}</strong></p>}
        </div>
        <div className="d-flex align-items-center gap-2">
            <div className="view-toggle-buttons btn-group">
              <button className={`btn btn-sm ${viewMode === 'card' ? 'active' : 'btn-outline-secondary'}`} onClick={() => setViewMode('card')} title="Card View"><i className="bi bi-grid-fill"></i></button>
              <button className={`btn btn-sm ${viewMode === 'table' ? 'active' : 'btn-outline-secondary'}`} onClick={() => setViewMode('table')} title="List View"><i className="bi bi-list-task"></i></button>
            </div>
        </div>
      </header>
      
      <div className="controls-bar page-controls-bar mb-4">
          <div className="filters-group">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search team members by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
      </div>

      {sortedAndFilteredTeam.length > 0 ? (
        viewMode === 'card' ? renderCardView() : renderTableView()
      ) : (
        <div className="text-center p-5 bg-light rounded">
            <i className="bi bi-people-fill fs-1 text-muted mb-3 d-block"></i>
            <h4 className="text-muted">{teamRoster.length > 0 && searchTerm ? "No team members match your search." : "You are not currently assigned to a team."}</h4>
            <p className="text-muted">{teamRoster.length > 0 && searchTerm ? "Try a different name or ID." : "Please contact HR if you believe this is an error."}</p>
        </div>
      )}
    </div>
  );
};

export default MyTeamPage;