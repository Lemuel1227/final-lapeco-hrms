import React, { useState, useMemo, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Popover } from 'bootstrap';
import './HolidayManagementPage.css';
import AddEditHolidayModal from '../../../../../../LAPECO-HRMS/src/components/modals/AddEditHolidayModal';
import HolidayCard from './HolidayCard';
import Layout from '@/layout/Layout';
import { holidayAPI } from '@/services/api';

const HolidayManagementPage = (props) => {
  // Load holidays from API
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const calendarRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    return () => { if (popoverRef.current) { popoverRef.current.dispose(); } };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await holidayAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setHolidays(data);
      } catch (e) {
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const typeLabel = (t) => (t === 'REGULAR' ? 'Regular Holiday' : 'Special Non-Working Day');

  const uniqueYears = useMemo(() => {
    const years = new Set((holidays || []).map(h => new Date(h.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    if (!years.has(currentYear)) { years.add(currentYear); }
    return Array.from(years).sort((a, b) => b - a);
  }, [holidays]);
  
  const holidaysForYear = useMemo(() => {
    return (holidays || []).filter(h => new Date(h.date).getFullYear() === filterYear);
  }, [holidays, filterYear]);

  const filteredHolidays = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return holidaysForYear
      .filter(h => 
        (typeFilter === 'All' || typeLabel(h.type) === typeFilter) &&
        (h.title || '').toLowerCase().includes(lowerSearchTerm)
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [holidaysForYear, typeFilter, searchTerm]);

  const calendarEvents = useMemo(() => {
    const holidayEvents = filteredHolidays.map(h => ({
      id: h.id,
      title: h.title,
      date: h.date,
      allDay: true,
      extendedProps: { type: typeLabel(h.type), icon: h.type === 'REGULAR' ? 'bi-bookmark-star-fill' : 'bi-star-fill' },
      className: h.type === 'REGULAR' ? 'fc-event type-regular' : 'fc-event type-special',
    }));
    return holidayEvents;
  }, [filteredHolidays]);

  const stats = useMemo(() => {
    const total = holidaysForYear.length;
    const regular = holidaysForYear.filter(h => h.type === 'REGULAR').length;
    const special = total - regular;
    return { total, regular, special };
  }, [holidaysForYear]);

  const handleEventMouseEnter = (info) => {
    if (popoverRef.current) { popoverRef.current.dispose(); }
    const popoverTitle = info.event.extendedProps.type;
    const payRule = popoverTitle === 'Regular Holiday' ? 'Double Pay (200%)' : '+30% Pay';
    const content = `<strong>${info.event.title}</strong><br/>Pay Rule: ${payRule}`;
    popoverRef.current = new Popover(info.el, {
      title: popoverTitle,
      content,
      placement: 'top',
      trigger: 'manual',
      html: true,
      container: 'body',
      customClass: 'event-popover',
    });
    popoverRef.current.show();
  };

  const handleEventMouseLeave = () => {
    if (popoverRef.current) { popoverRef.current.dispose(); popoverRef.current = null; }
  };
  
  const handleEventClick = (clickInfo) => {
    const holidayId = Number(clickInfo.event.id);
    const holiday = holidays.find(h => h.id === holidayId);
    if (holiday) { handleOpenModal(holiday); }
  };
  
  const handleDatesSet = (dateInfo) => {
    const newYear = dateInfo.view.currentStart.getFullYear();
    if (filterYear !== newYear) {
      setFilterYear(newYear);
    }
  };

  const handleOpenModal = (holiday = null) => { setEditingHoliday(holiday); setShowModal(true); };
  const handleCloseModal = () => { setEditingHoliday(null); setShowModal(false); };
  const handleSaveHoliday = (formData, holidayId) => { props.handlers?.saveHoliday?.(formData, holidayId); handleCloseModal(); };
  const handleDeleteHoliday = (e, holidayId) => { props.handlers?.deleteHoliday?.(holidayId); };

  const renderListView = () => (
    <div className="holiday-list-container">
      {filteredHolidays.length > 0 ? (
        filteredHolidays.map((holiday) => (
          <HolidayCard 
            key={holiday.id}
            holiday={{...holiday, name: holiday.title, type: typeLabel(holiday.type)}}
            onEdit={handleOpenModal}
            onDelete={handleDeleteHoliday}
          />
        ))
      ) : (
        <div className="text-center p-5 bg-light rounded">
          <p>No holidays found for your criteria.</p>
        </div>
      )}
    </div>
  );

  const renderCalendarView = () => (
    <div className="calendar-container">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={new Date()}
        events={calendarEvents}
        eventClick={handleEventClick}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        datesSet={handleDatesSet}
        height="70vh"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
        eventContent={(eventInfo) => (
          <div className="fc-event-main">
            <i className={`bi ${eventInfo.event.extendedProps.icon} fc-event-icon`}></i>
            <div className="fc-event-title">{eventInfo.event.title}</div>
          </div>
        )}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="text-center p-5 bg-light rounded">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 mb-0">Loading holidays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Holiday Management</h1>
        <button className="btn btn-success" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-circle-fill me-2"></i>Add New Holiday
        </button>
      </header>

      <div className="holiday-stats-bar">
        <div className={`stat-card ${typeFilter === 'All' ? 'active' : ''}`} onClick={() => setTypeFilter('All')}><div className="stat-icon total"><i className="bi bi-calendar3"></i></div><div><span className="stat-value">{stats.total}</span><span className="stat-label">Total Holidays ({filterYear})</span></div></div>
        <div className={`stat-card ${typeFilter === 'Regular Holiday' ? 'active' : ''}`} onClick={() => setTypeFilter('Regular Holiday')}><div className="stat-icon regular"><i className="bi bi-bookmark-star-fill"></i></div><div><span className="stat-value">{stats.regular}</span><span className="stat-label">Regular Holidays</span></div></div>
        <div className={`stat-card ${typeFilter === 'Special Non-Working Day' ? 'active' : ''}`} onClick={() => setTypeFilter('Special Non-Working Day')}><div className="stat-icon special"><i className="bi bi-star-fill"></i></div><div><span className="stat-value">{stats.special}</span><span className="stat-label">Special Days</span></div></div>
      </div>
      
      <div className="controls-bar d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
            <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search holidays..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center">
                <label htmlFor="yearFilter" className="form-label me-2 mb-0">Year:</label>
                <select id="yearFilter" className="form-select" style={{width: '120px'}} value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
                    {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>
            <div className="view-toggle">
                <button className={`btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><i className="bi bi-list-ul"></i> List</button>
                <button className={`btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}><i className="bi bi-calendar-month"></i> Calendar</button>
            </div>
        </div>
      </div>

      <div className="mt-4">
        {viewMode === 'list' ? renderListView() : renderCalendarView()}
      </div>

      <AddEditHolidayModal show={showModal} onClose={handleCloseModal} onSave={handleSaveHoliday} holidayData={editingHoliday} />
    </div>
  );
};

export default HolidayManagementPage;