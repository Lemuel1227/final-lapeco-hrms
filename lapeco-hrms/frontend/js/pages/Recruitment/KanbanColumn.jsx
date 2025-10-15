import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ApplicantCard from './ApplicantCard';

const KanbanColumn = ({ id, title, applicants, jobOpeningsMap, onAction }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="kanban-column">
      <div className={`kanban-column-header kanban-header-${id.replace(/\s+/g, '-').toLowerCase()}`}>
        <h5 className="column-title">{title}</h5>
        <span className="badge rounded-pill applicant-count-badge">{applicants.length}</span>
      </div>
      
      <SortableContext items={applicants.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`kanban-column-body ${isOver ? 'is-dragging-over' : ''}`}
        >
          {applicants.map(applicant => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              jobTitle={jobOpeningsMap.get(applicant.jobOpeningId)}
              onAction={onAction}
            />
          ))}
          {applicants.length === 0 && <div className="kanban-empty-state"></div>}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;