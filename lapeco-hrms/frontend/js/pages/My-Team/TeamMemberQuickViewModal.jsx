import React from 'react';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { formatDate as formatMDY } from '../../utils/dateUtils';

const TeamMemberQuickViewModal = ({ show, onClose, member, positionTitle }) => {
  if (!show || !member) return null;

  const computeAge = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }
    return age;
  };
  const age = computeAge(member.birthdate);

  return (
    <div className="modal fade show team-member-quick-view" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-light border-0">
            <h5 className="modal-title">Team Member Details</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="d-flex align-items-center mb-3">
              <img
                src={member.avatarUrl || placeholderAvatar}
                alt={member.name}
                className="rounded-circle border border-2 border-light-subtle me-3 shadow-sm"
                style={{ width: 64, height: 64, objectFit: 'cover' }}
                onError={(e) => { e.target.src = placeholderAvatar; }}
              />
              <div className="flex-grow-1">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold fs-6">{member.name}</div>
                    <div className="text-muted small">Employee ID: {member.id}</div>
                  </div>
                  {member.isTeamLeader && (
                    <span className="badge bg-success-subtle text-success-emphasis"><i className="bi bi-star-fill me-1"></i>Leader</span>
                  )}
                </div>
              </div>
            </div>

            <div className="list-group list-group-flush">
              <div className="list-group-item px-0 kv-row">
                <span className="kv-icon text-primary"><i className="bi bi-envelope-fill"></i></span>
                <div>
                  <div className="kv-label">Email</div>
                  <div className="kv-value">{member.email || 'N/A'}</div>
                </div>
              </div>
              <div className="list-group-item px-0 kv-row">
                <span className="kv-icon text-secondary"><i className="bi bi-gender-ambiguous"></i></span>
                <div>
                  <div className="kv-label">Gender</div>
                  <div className="kv-value">{member.gender || 'N/A'}</div>
                </div>
              </div>
              <div className="list-group-item px-0 kv-row">
                <span className="kv-icon text-success"><i className="bi bi-telephone-fill"></i></span>
                <div>
                  <div className="kv-label">Contact Number</div>
                  <div className="kv-value">{member.contactNumber || 'N/A'}</div>
                </div>
              </div>
              <div className="list-group-item px-0 kv-row">
                <span className="kv-icon text-info"><i className="bi bi-calendar-date-fill"></i></span>
                <div>
                  <div className="kv-label">Birthday</div>
                  <div className="kv-value">
                    {member.birthdate ? formatMDY(new Date(member.birthdate), 'long') : 'N/A'}
                    {age !== null && (
                      <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2">Age {age}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberQuickViewModal;
