// src/components/FestivalCalendar.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import './FestivalCalendar.css';

const FestivalCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const dayNames = ['อ', 'จ', 'อ', 'พ', 'พ', 'ศ', 'ส'];

  useEffect(() => {
    fetchFestivals();
  }, [currentDate]);

  const fetchFestivals = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await api.get('/festivals/calendar/', {
        params: { year, month }
      });

      setFestivals(response.data.festivals || []);
    } catch (error) {
      console.error('Error fetching festivals:', error);
      setFestivals([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // ✅ ดึงเทศกาลในวันนั้น หรือ 2 วันก่อน
  const getFestivalForDay = (day) => {
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    return festivals.find((f) => {
      const startDate = new Date(f.start_date);
      const endDate = new Date(f.end_date);
      const twoDaysBefore = new Date(startDate);
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);

      // วันเทศกาล หรือ 2 วันก่อน
      return cellDate >= twoDaysBefore && cellDate <= endDate;
    });
  };

  // ✅ เช็คว่าเป็นวันเตือน (2 วันก่อน) หรือวันเทศกาล
  const isWarningDay = (day, festival) => {
    if (!festival) return false;
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const startDate = new Date(festival.start_date);
    const twoDaysBefore = new Date(startDate);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
    
    return cellDate >= twoDaysBefore && cellDate < startDate;
  };

  const renderCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const festival = getFestivalForDay(day);
      const isToday = new Date().toDateString() === 
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

      days.push(
        <div
          key={`day-${day}`}
          className={`calendar-day ${festival ? (isWarningDay(day, festival) ? 'warning-day' : 'has-festival') : ''} ${isToday ? 'today' : ''}`}
          style={{
            backgroundColor: festival ? (isWarningDay(day, festival) ? '#fff3cd' : festival.color) : 'transparent',
            borderColor: festival ? (isWarningDay(day, festival) ? '#ffc107' : festival.color) : '#ddd'
          }}
          onClick={() => festival && handleFestivalClick(festival)}
        >
          <div className="day-number">{day}</div>
          {festival && (
            <>
              <div className="day-festival" title={festival.name}>
                {festival.name}
              </div>
              {isWarningDay(day, festival) && (
                <div className="warning-badge">⚠️ เตือน</div>
              )}
            </>
          )}
        </div>
      );
    }

    return days;
  };

  const handleFestivalClick = (festival) => {
    setSelectedFestival(festival);
    setShowDetail(true);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = monthNames[month];

  return (
    <div className="festival-calendar">
      <div className="fc-header">
        <h2>📅 ปฏิทินเทศกาล</h2>
      </div>

      <div className="fc-content">
        <div className="fc-controls">
          <button className="fc-btn-nav" onClick={previousMonth}>
            ← เดือนที่แล้ว
          </button>
          <div className="fc-month-year">
            <h3>{monthName} {year}</h3>
          </div>
          <button className="fc-btn-nav" onClick={nextMonth}>
            เดือนถัดไป →
          </button>
        </div>

        <div className="fc-calendar">
          {/* Day headers */}
          <div className="calendar-weekdays">
            {dayNames.map((day, idx) => (
              <div key={`header-${idx}`} className="weekday-header">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="calendar-days">
            {loading ? (
              <div className="fc-loading">
                <div className="spinner"></div>
                <p>กำลังโหลด...</p>
              </div>
            ) : (
              renderCalendarDays()
            )}
          </div>
        </div>

        {/* Festivals list for this month */}
        {!loading && festivals.length > 0 && (
          <div className="fc-festivals-list">
            <h4>🎉 เทศกาลในเดือนนี้</h4>
            {festivals.map((festival, idx) => (
              <div
                key={idx}
                className="festival-item"
                onClick={() => handleFestivalClick(festival)}
                style={{ borderLeftColor: festival.color }}
              >
                <span className="festival-icon">{festival.icon}</span>
                <div className="festival-info">
                  <div className="festival-name">{festival.name}</div>
                  <div className="festival-date">
                    {new Date(festival.start_date).getDate()} -
                    {new Date(festival.end_date).getDate()}{' '}
                    {monthNames[new Date(festival.start_date).getMonth()]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && festivals.length === 0 && (
          <div className="fc-empty">
            <p>ไม่มีเทศกาลในเดือนนี้</p>
          </div>
        )}
      </div>

      {/* Festival Detail Modal */}
      {showDetail && selectedFestival && (
        <div className="festival-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="festival-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDetail(false)}>
              ✕
            </button>
            <div className="modal-header" style={{ backgroundColor: selectedFestival.color }}>
              <span className="modal-icon">{selectedFestival.icon}</span>
              <h2>{selectedFestival.name}</h2>
            </div>
            <div className="modal-content">
              <p className="modal-description">{selectedFestival.description}</p>
              <div className="modal-details">
                <div className="detail-item">
                  <span className="detail-label">วันที่:</span>
                  <span className="detail-value">
                    {new Date(selectedFestival.start_date).toLocaleDateString('th-TH')} -
                    {new Date(selectedFestival.end_date).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ระยะเวลา:</span>
                  <span className="detail-value">
                    {selectedFestival.duration_days} วัน
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ประจำปี:</span>
                  <span className="detail-value">
                    {selectedFestival.is_recurring ? 'ใช่' : 'ไม่ใช่'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivalCalendar;