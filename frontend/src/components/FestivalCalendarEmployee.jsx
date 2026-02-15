// src/components/FestivalCalendarEmployee.jsx
// ✅ สำหรับพนักงาน - แสดงเฉพาะ "งาน" (Admin Events)
// ✅ ใช้ CustomEventDetailModal แทน modal เดิม
import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import CustomEventDetailModal from './CustomEventDetailModal';

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

const FestivalCalendarEmployee = ({ adminEvents = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [festivals, setFestivals] = useState([]);
  const [thaiHolidays, setThaiHolidays] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const PRIORITY_COLORS = {
    low: { dot: 'bg-green-500', label: 'ต่ำ' },
    medium: { dot: 'bg-yellow-500', label: 'ปกติ' },
    high: { dot: 'bg-red-500', label: 'สูง' },
    urgent: { dot: 'bg-purple-500', label: 'ด่วน' },
  };

  const getEventTypeLabel = (eventType) => {
    const labels = {
      'stock_check': 'ตรวจนับสต็อก',
      'stock_order': 'สั่งซื้อสินค้า',
      'delivery': 'รับ/ส่งสินค้า',
      'meeting': 'ประชุม/นัดหมาย',
      'other': 'อื่นๆ'
    };
    return labels[eventType] || 'อื่นๆ';
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
      console.warn("Custom events API not ready");
      setCustomEvents([]);
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
      }
    } catch (err) {
      console.error("Fetch Thai holidays error:", err);
    }
  };

  const allEvents = useMemo(() => {
    const events = [];
    thaiHolidays.forEach((h) => {
      events.push({ ...h, id: `holiday-${h.date}`, title: h.name, isHoliday: true, isSelling: h.type === "selling_festival" });
    });
    festivals.forEach((f) => {
      events.push({ ...f, id: `festival-${f.id}`, title: f.name, isFestival: true, color: f.color || "#10b981" });
    });
    customEvents.forEach((e) => {
      events.push({ ...e, id: e.id, title: e.title, isCustom: true, color: "#3b82f6" });
    });
    return events;
  }, [thaiHolidays, festivals, customEvents]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter((e) => {
      if (e.isHoliday || e.isCustom) return e.date === dateStr;
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
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;
      days.push(
        <div key={`day-${day}`} className={`h-20 p-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
            isToday ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' :
            hasSelling ? 'bg-pink-50 border-pink-300' : hasBuddhist ? 'bg-orange-50 border-orange-300' :
            hasRoyal ? 'bg-yellow-50 border-yellow-300' : hasHoliday ? 'bg-red-50 border-red-200' :
            hasFestival ? 'bg-green-50 border-green-200' : hasCustom ? 'bg-blue-50 border-blue-200' :
            'bg-white border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => dayEvents.length > 0 && handleEventClick(dayEvents[0])}
        >
          <div className={`text-sm font-semibold ${
            isToday ? 'text-blue-600' : hasSelling ? 'text-pink-600' : hasBuddhist ? 'text-orange-600' :
            hasRoyal ? 'text-yellow-600' : hasHoliday ? 'text-red-600' : isWeekend ? 'text-red-500' : 'text-gray-700'
          }`}>{day}</div>
          <div className="mt-1 space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 2).map((event, idx) => (
              <div key={idx} className={`text-xs px-1.5 py-0.5 rounded truncate border flex items-center gap-1 ${
                  event.isSelling || event.type === "selling_festival" ? 'bg-pink-100 text-pink-700 border-pink-300' :
                  event.type === "buddhist" ? 'bg-orange-100 text-orange-700 border-orange-300' :
                  event.type === "royal" ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                  event.isHoliday ? 'bg-red-100 text-red-700 border-red-300' :
                  event.isFestival ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300'
                }`}
                title={event.title || event.name}
              >
                {event.isCustom && event.priority && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[event.priority]?.dot || 'bg-gray-400'}`}></span>
                )}
                <span className="truncate">{event.title || event.name}</span>
              </div>
            ))}
            {dayEvents.length > 2 && <div className="text-xs text-gray-500">+{dayEvents.length - 2}</div>}
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const thaiYear = year + 543;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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

        {/* ✅ งาน (Admin Events) - พนักงานดูได้อย่างเดียว */}
        {!loading && adminEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              งาน ({monthNames[month]} {thaiYear})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {adminEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 bg-blue-50/30 cursor-pointer"
                  onClick={() => handleEventClick({ ...event, isAdminEvent: true })}
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {new Date(event.date).getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{getEventTypeLabel(event.event_type)}</p>
                    {event.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            สัญลักษณ์
          </h4>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-500"></span><span className="text-gray-600 font-medium">เทศกาลขายดี</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400"></span><span className="text-gray-600">วันหยุดราชการ</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400"></span><span className="text-gray-600">วันพุทธ</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-gray-600">วันพระราชา</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cyan-400"></span><span className="text-gray-600">บันทึก</span></div>
          </div>
        </div>
      </div>

      {/* ✅ ใช้ CustomEventDetailModal สำหรับ Admin Events (Employee เห็นอย่างเดียว) */}
      {showDetail && selectedEvent && selectedEvent.isAdminEvent && (
        <CustomEventDetailModal
          event={selectedEvent}
          onClose={() => setShowDetail(false)}
          onEdit={null}  // Employee ไม่สามารถแก้ไขได้
          onDelete={null}  // Employee ไม่สามารถลบได้
        />
      )}
    </div>
  );
};

export default FestivalCalendarEmployee;