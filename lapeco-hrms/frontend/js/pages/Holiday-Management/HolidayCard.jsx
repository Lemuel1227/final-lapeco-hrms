import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './HolidayCard.css';

const HolidayCard = ({ holiday, onEdit, onDelete }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isDropdownOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      const rightEdge = rect.right + window.scrollX;
      const topEdge = rect.bottom + window.scrollY;
      setMenuStyle({
        position: 'absolute',
        top: `${topEdge + 5}px`,
        left: `${rightEdge - 160}px`,
      });
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleEdit = (e) => { e.stopPropagation(); onEdit(holiday); setIsDropdownOpen(false); };
  const handleDelete = (e) => { e.stopPropagation(); onDelete(e, holiday.id); setIsDropdownOpen(false); };

  const date = new Date(holiday.date + 'T00:00:00');
  const payRuleText = holiday.type === 'Regular Holiday' ? 'Double Pay (200%)' : '+30% Pay';

  const DropdownMenu = (
    <ul ref={dropdownRef} className="holiday-card-dropdown-menu" style={menuStyle}>
        <li>
            <a className="dropdown-item" href="#" onClick={handleEdit}>
                <i className="bi bi-pencil-fill"></i>
                <span>Edit</span>
            </a>
        </li>
        <li>
            <a className="dropdown-item text-danger" href="#" onClick={handleDelete}>
                <i className="bi bi-trash-fill"></i>
                <span>Delete</span>
            </a>
        </li>
    </ul>
  );

  return (
    <div className={`holiday-card ${holiday.type === 'Regular Holiday' ? 'type-regular' : 'type-special'}`} onClick={() => onEdit(holiday)}>
      <div className="date-display">
        <span className="month">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
        <span className="day">{date.getDate()}</span>
        <span className="weekday">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
      </div>
      <div className="info">
        <h5 className="name">{holiday.name}</h5>
        <div><span className={`holiday-type-badge ${holiday.type === 'Regular Holiday' ? 'regular' : 'special'}`}>{holiday.type}</span></div>
        <div className="pay-rule">
            <i className="bi bi-cash-coin"></i>
            <span>{payRuleText}</span>
        </div>
      </div>
      <div className="actions">
        <button ref={buttonRef} className="btn btn-sm btn-light" type="button" onClick={toggleDropdown} aria-expanded={isDropdownOpen}>
            <i className="bi bi-three-dots-vertical"></i>
        </button>
        {isDropdownOpen && ReactDOM.createPortal(DropdownMenu, document.body)}
      </div>
    </div>
  );
};

export default HolidayCard;