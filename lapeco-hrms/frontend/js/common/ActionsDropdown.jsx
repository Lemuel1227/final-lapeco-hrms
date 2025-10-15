import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import './ActionsDropdown.css';

const ActionsDropdown = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuHeight = dropdownRef.current ? dropdownRef.current.offsetHeight : 0;
      const windowHeight = window.innerHeight;

      let topPosition = buttonRect.bottom + 2;

      if (topPosition + menuHeight > windowHeight) {
        topPosition = buttonRect.top - menuHeight - 2;
      }

      setPosition({
        top: topPosition,
        right: window.innerWidth - buttonRect.right,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', closeDropdownOnScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeDropdownOnScroll, true);
    };
  }, [isOpen]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };
  
  const closeDropdown = () => setIsOpen(false);
  const closeDropdownOnScroll = () => {
    if(isOpen) {
      setIsOpen(false);
    }
  };

  const menu = (
    <div
      ref={dropdownRef}
      className={`actions-dropdown-menu dropdown-menu ${isOpen ? 'show' : ''}`}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
      onClick={closeDropdown}
    >
      {children}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        className="btn btn-sm btn-outline-secondary dropdown-toggle"
        type="button"
        onClick={toggleDropdown}
      >
        Actions
      </button>
      {ReactDOM.createPortal(menu, document.body)}
    </>
  );
};

export default ActionsDropdown;