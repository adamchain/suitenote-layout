import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { calendarService, CalendarEvent } from '../services/calendarService';
import { Note } from '../types/Note';
import './CalendarModal.css';

interface CalendarModalProps {
  notes: Note[];
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ notes, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Subscribe to calendar events
  React.useEffect(() => {
    const unsubscribe = calendarService.subscribe((events) => {
      setCalendarEvents(events);
    });
    return unsubscribe;
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getNotesForDate = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return (
        noteDate.getDate() === targetDate.getDate() &&
        noteDate.getMonth() === targetDate.getMonth() &&
        noteDate.getFullYear() === targetDate.getFullYear()
      );
    });
  };

  const getCalendarEventsForDate = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return calendarService.getEventsForDate(targetDate);
  };
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayNotes = getNotesForDate(day);
      const dayEvents = getCalendarEventsForDate(day);
      const isToday = 
        today.getDate() === day &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${dayNotes.length > 0 ? 'has-notes' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
        >
          <div className="day-number">{day}</div>
          
          {/* Calendar Events */}
          {dayEvents.length > 0 && (
            <div className="day-events">
              {dayEvents.slice(0, 2).map((event, index) => (
                <div
                  key={event.id}
                  className={`day-event ${event.source}`}
                  title={`${event.title} (${event.source})`}
                >
                  {event.title.substring(0, 15)}...
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="day-event-more">+{dayEvents.length - 2} more</div>
              )}
            </div>
          )}
          
          {/* Notes */}
          {dayNotes.length > 0 && (
            <div className="day-notes">
              {dayNotes.slice(0, 3).map((note, index) => (
                <div
                  key={note.id}
                  className={`day-note ${note.color || 'yellow'}`}
                  title={note.content.substring(0, 50)}
                >
                  {note.content.substring(0, 20)}...
                </div>
              ))}
              {dayNotes.length > 3 && (
                <div className="day-note-more">+{dayNotes.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-header">
          <div className="calendar-title">
            <CalendarIcon size={24} />
            <h2>Calendar View</h2>
          </div>
          <button className="calendar-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="calendar-navigation">
          <button
            className="nav-button"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft size={20} />
          </button>
          
          <h3 className="current-month">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          
          <button
            className="nav-button"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {dayNames.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          
          <div className="calendar-days">
            {renderCalendarDays()}
          </div>
        </div>

        <div className="calendar-footer">
          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-dot has-notes"></div>
              <span>Days with notes</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot today"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;