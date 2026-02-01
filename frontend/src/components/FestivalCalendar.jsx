// src/components/FestivalCalendar.jsx
// ✅ รวมวันหยุดไทย + เทศกาล + บันทึกของฉัน (customEvents) - ลด emoji
import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';

const GOOGLE_API_KEY = "AIzaSyAtdfhSI2DJHNjiYfX_wD6MRHkiL2EIZb4";

const mapHolidayType = (name) => {
  const lowerName = name.toLowerCase();
  const thaiName = name;
  
  if (lowerName.includes("new year") || thaiName.includes("ปีใหม่") || thaiName.includes("ขึ้นปีใหม่")) return "selling_festival";
  if (lowerName.includes("songkran") || thaiName.includes("สงกรานต์")) return "selling_festival";
  if (lowerName.includes("loy krathong") || thaiName.includes("ลอยกระทง")) return "selling_festival";
  if (lowerName.includes("valentine") || thaiName.includes("วาเลนไทน์")) return "selling_festival";
  if (lowerName.includes("chinese new year") || thaiName.includes("ตรุษจีน")) return "selling_festival";
  if (lowerName.includes("mother") || thaiName.includes("แม่") || thaiName.includes("สิริกิติ์")) return "selling_festival";
  if (lowerName.includes("father") || thaiName.includes("พ่อ") || thaiName.includes("ภูมิพล")) return "selling_festival";
  
  if (lowerName.includes("bucha") || lowerName.includes("buddhist") || lowerName.includes("phansa") || 
      thaiName.includes("มาฆ") || thaiName.includes("วิสาข") || thaiName.includes("อาสาฬ") || 
      thaiName.includes("เข้าพรรษา") || thaiName.includes("ออกพรรษา") || thaiName.includes("บูชา")) return "buddhist";
  
  if (lowerName.includes("king") || lowerName.includes("queen") || lowerName.includes("birthday") || 
      lowerName.includes("coronation") || thaiName.includes("เฉลิม") || thaiName.includes("พระราช") || 
      thaiName.includes("จักรี") || thaiName.includes("ปิยมหาราช") || thaiName.includes("รัชกาล")) return "royal";
  
  return "national";
};

const FestivalCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [festivals, setFestivals] = useState([]);
  const [thaiHolidays, setThaiHolidays] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // ✅ Priority colors สำหรับแสดงวงกลมสี
  const PRIORITY_COLORS = {
    low: { dot: 'bg-green-500', label: 'ต่ำ' },
    medium: { dot: 'bg-yellow-500', label: 'ปกติ' },
    high: { dot: 'bg-red-500', label: 'สูง' },
    urgent: { dot: 'bg-purple-500', label: 'ด่วน' },
  };

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  useEffect(() => {
    fetchAllData();
  }, [currentDate.getFullYear()]);

  useEffect(() => {
    loadCustomEvents();
  }, [currentDate]);

  const loadCustomEvents = async () => {
    try {
      const response = await api.get("/custom-events/");
      setCustomEvents(response.data.results || response.data || []);
    } catch (error) {
      console.warn("Custom events API not ready, using localStorage fallback");
      const saved = localStorage.getItem("customEvents");
      if (saved) {
        setCustomEvents(JSON.parse(saved));
      } else {
        setCustomEvents([]);
      }
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFestivals(),
        fetchThaiHolidays()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFestivals = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await api.get('/festivals/calendar/', {
        params: { year, month }
      });
      setFestivals(response.data.festivals || []);
    } catch (error) {
      console.error('Error fetching festivals:', error);
      setFestivals([]);
    }
  };

  const fetchThaiHolidays = async () => {
    const year = currentDate.getFullYear();
    localStorage.removeItem(`holidays_overview_${year}`);

    try {
      const calendarId = 'th.th#holiday@group.v.calendar.google.com';
      const timeMin = `${year}-01-01T00:00:00Z`;
      const timeMax = `${year}-12-31T23:59:59Z`;
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Google API Error");
      
      const result = await response.json();

      if (result.items && result.items.length > 0) {
        const holidays = result.items.map((item) => {
          const holidayType = mapHolidayType(item.summary);
          return {
            date: item.start.date || item.start.dateTime?.split("T")[0],
            name: item.summary,
            description: item.description || "",
            type: holidayType,
            isHoliday: true,
            isSelling: holidayType === "selling_festival",
            color: holidayType === "selling_festival" ? "#ec4899" :
                   holidayType === "buddhist" ? "#f97316" :
                   holidayType === "royal" ? "#eab308" : "#ef4444"
          };
        });

        setThaiHolidays(holidays);
        
        localStorage.setItem(`holidays_overview_${year}`, JSON.stringify({
          data: holidays,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error("Fetch Thai holidays error:", err);
      const cached = localStorage.getItem(`holidays_overview_${year}`);
      if (cached) {
        setThaiHolidays(JSON.parse(cached).data);
      }
    }
  };

  const allEvents = useMemo(() => {
    const events = [];
    
    thaiHolidays.forEach((h) => {
      events.push({
        ...h,
        id: `holiday-${h.date}`,
        title: h.name,
        isHoliday: true,
        isSelling: h.type === "selling_festival",
      });
    });
    
    festivals.forEach((f) => {
      events.push({
        ...f,
        id: `festival-${f.id}`,
        title: f.name,
        isFestival: true,
        color: f.color || "#10b981"
      });
    });

    customEvents.forEach((e) => {
      events.push({
        ...e,
        id: e.id,
        title: e.title,
        isCustom: true,
        color: "#3b82f6"
      });
    });
    
    return events;
  }, [thaiHolidays, festivals, customEvents]);

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

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return allEvents.filter((e) => {
      if (e.isHoliday || e.isCustom) {
        return e.date === dateStr;
      }
      if (e.isFestival) {
        const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const startDate = new Date(e.start_date);
        const endDate = new Date(e.end_date);
        return cellDate >= startDate && cellDate <= endDate;
      }
      return false;
    });
  };

  const renderCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const hasSelling = dayEvents.some(e => e.isSelling || e.type === "selling_festival");
      const hasBuddhist = dayEvents.some(e => e.type === "buddhist");
      const hasRoyal = dayEvents.some(e => e.type === "royal");
      const hasHoliday = dayEvents.some(e => e.isHoliday && !e.isSelling && e.type !== "buddhist" && e.type !== "royal");
      const hasFestival = dayEvents.some(e => e.isFestival);
      const hasCustom = dayEvents.some(e => e.isCustom);
      const isToday = new Date().toDateString() === 
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;

      days.push(
        <div
          key={`day-${day}`}
          className={`h-20 p-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
            isToday ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' :
            hasSelling ? 'bg-pink-50 border-pink-300' :
            hasBuddhist ? 'bg-orange-50 border-orange-300' :
            hasRoyal ? 'bg-yellow-50 border-yellow-300' :
            hasHoliday ? 'bg-red-50 border-red-200' :
            hasFestival ? 'bg-green-50 border-green-200' :
            hasCustom ? 'bg-blue-50 border-blue-200' :
            'bg-white border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => dayEvents.length > 0 && handleEventClick(dayEvents[0])}
        >
          <div className={`text-sm font-semibold ${
            isToday ? 'text-blue-600' :
            hasSelling ? 'text-pink-600' :
            hasBuddhist ? 'text-orange-600' :
            hasRoyal ? 'text-yellow-600' :
            hasHoliday ? 'text-red-600' :
            isWeekend ? 'text-red-500' : 'text-gray-700'
          }`}>
            {day}
          </div>
          
          <div className="mt-1 space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 2).map((event, idx) => (
              <div
                key={idx}
                className={`text-xs px-1.5 py-0.5 rounded truncate border flex items-center gap-1 ${
                  event.isSelling || event.type === "selling_festival"
                    ? 'bg-pink-100 text-pink-700 border-pink-300'
                    : event.type === "buddhist" 
                    ? 'bg-orange-100 text-orange-700 border-orange-300'
                    : event.type === "royal" 
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                    : event.isHoliday 
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : event.isFestival
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-blue-100 text-blue-700 border-blue-300'
                }`}
                title={event.title || event.name}
              >
                {event.isCustom && event.priority && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[event.priority]?.dot || 'bg-gray-400'}`}></span>
                )}
                <span className="truncate">{event.title || event.name}</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">+{dayEvents.length - 2}</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetail(true);
  };

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allEvents
      .filter(e => (e.date || e.start_date) >= today)
      .sort((a, b) => (a.date || a.start_date).localeCompare(b.date || b.start_date))
      .slice(0, 6);
  }, [allEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const thaiYear = year + 543;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header - ลด emoji */}
      <div className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          ปฏิทินเทศกาล
        </h2>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={previousMonth} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            เดือนที่แล้ว
          </button>
          <h3 className="font-bold text-gray-800">{monthNames[month]} {thaiYear}</h3>
          <button onClick={nextMonth} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1">
            เดือนถัดไป
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day, idx) => (
            <div key={idx} className={`text-center text-sm font-semibold py-2 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {loading ? (
            <div className="col-span-7 py-12 text-center text-gray-400">
              <div className="animate-spin w-6 h-6 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              กำลังโหลด...
            </div>
          ) : renderCalendarDays()}
        </div>

        {/* Upcoming Events - ลด emoji */}
        {!loading && upcomingEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              วันหยุดที่ใกล้ถึง
            </h4>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg" onClick={() => handleEventClick(event)}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.isSelling || event.type === "selling_festival" ? 'bg-pink-500' :
                    event.type === "buddhist" ? 'bg-orange-500' :
                    event.type === "royal" ? 'bg-yellow-500' :
                    event.isHoliday ? 'bg-red-500' : 
                    event.isFestival ? 'bg-green-500' : 'bg-blue-500'
                  }`}></span>
                  <span className="text-gray-500 text-xs w-14 flex-shrink-0">{new Date(event.date || event.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                  <span className={`truncate ${event.isSelling || event.type === "selling_festival" ? 'text-pink-700 font-medium' : 'text-gray-700'}`}>
                    {event.title || event.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend - ลด emoji */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            สัญลักษณ์
          </h4>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-500"></span><span className="text-gray-600 font-medium">เทศกาลขายดี (เตรียมสินค้า!)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400"></span><span className="text-gray-600">วันหยุดราชการ</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400"></span><span className="text-gray-600">วันสำคัญทางพุทธศาสนา</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-gray-600">วันเฉลิมพระชนมพรรษา</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400"></span><span className="text-gray-600">บันทึกของฉัน</span></div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal - ลด emoji */}
      {showDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 ${
              selectedEvent.isSelling || selectedEvent.type === "selling_festival" ? 'bg-pink-500' :
              selectedEvent.type === "buddhist" ? 'bg-orange-500' :
              selectedEvent.type === "royal" ? 'bg-yellow-500' :
              selectedEvent.isHoliday ? 'bg-red-500' : 
              selectedEvent.isFestival ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold">{selectedEvent.title || selectedEvent.name}</h2>
                <button onClick={() => setShowDetail(false)} className="text-white/80 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              {(selectedEvent.description || selectedEvent.notes) && <p className="text-gray-600 text-sm mb-3">{selectedEvent.description || selectedEvent.notes}</p>}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-500">วันที่:</span>
                  <span className="text-gray-700 font-medium">{new Date(selectedEvent.date || selectedEvent.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-gray-500">ประเภท:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedEvent.isSelling || selectedEvent.type === "selling_festival" ? 'bg-pink-100 text-pink-700' :
                    selectedEvent.type === "buddhist" ? 'bg-orange-100 text-orange-700' :
                    selectedEvent.type === "royal" ? 'bg-yellow-100 text-yellow-700' :
                    selectedEvent.isHoliday ? 'bg-red-100 text-red-700' : 
                    selectedEvent.isFestival ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedEvent.isSelling || selectedEvent.type === "selling_festival" ? 'เทศกาลขายดี' :
                     selectedEvent.type === "buddhist" ? 'วันสำคัญทางพุทธ' :
                     selectedEvent.type === "royal" ? 'วันเฉลิมพระชนมพรรษา' :
                     selectedEvent.isHoliday ? 'วันหยุดราชการ' : 
                     selectedEvent.isFestival ? 'เทศกาล' : 'บันทึกของฉัน'}
                  </span>
                </div>
                {selectedEvent.isCustom && selectedEvent.priority && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    <span className="text-gray-500">ความสำคัญ:</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[selectedEvent.priority]?.dot || 'bg-gray-400'}`}></span>
                      <span className="text-gray-700 font-medium">{PRIORITY_COLORS[selectedEvent.priority]?.label || '-'}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivalCalendar;