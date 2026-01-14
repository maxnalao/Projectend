// src/components/FestivalCalendar.jsx
// ✅ รวมวันหยุดไทย + เทศกาล + บันทึกของฉัน (customEvents)
import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';

const GOOGLE_API_KEY = "AIzaSyAtdfhSI2DJHNjiYfX_wD6MRHkiL2EIZb4";

// ✅ แยกประเภทวันหยุด + เทศกาลที่ต้องเตรียมสินค้า
const mapHolidayType = (name) => {
  const lowerName = name.toLowerCase();
  const thaiName = name;
  
  // 🎁 เทศกาลขายดี - ต้องเตรียมสินค้า!
  if (lowerName.includes("new year") || thaiName.includes("ปีใหม่") || thaiName.includes("ขึ้นปีใหม่")) {
    return "selling_festival";
  }
  if (lowerName.includes("songkran") || thaiName.includes("สงกรานต์")) {
    return "selling_festival";
  }
  if (lowerName.includes("loy krathong") || thaiName.includes("ลอยกระทง")) {
    return "selling_festival";
  }
  if (lowerName.includes("valentine") || thaiName.includes("วาเลนไทน์")) {
    return "selling_festival";
  }
  if (lowerName.includes("chinese new year") || thaiName.includes("ตรุษจีน")) {
    return "selling_festival";
  }
  if (lowerName.includes("mother") || thaiName.includes("แม่") || thaiName.includes("สิริกิติ์")) {
    return "selling_festival";
  }
  if (lowerName.includes("father") || thaiName.includes("พ่อ") || thaiName.includes("ภูมิพล")) {
    return "selling_festival";
  }
  
  // 🧡 วันสำคัญทางพุทธศาสนา
  if (lowerName.includes("bucha") || lowerName.includes("buddhist") || lowerName.includes("phansa") || 
      thaiName.includes("มาฆ") || thaiName.includes("วิสาข") || thaiName.includes("อาสาฬ") || 
      thaiName.includes("เข้าพรรษา") || thaiName.includes("ออกพรรษา") || thaiName.includes("บูชา")) {
    return "buddhist";
  }
  
  // 💛 วันเฉลิมพระชนมพรรษา
  if (lowerName.includes("king") || lowerName.includes("queen") || lowerName.includes("birthday") || 
      lowerName.includes("coronation") || thaiName.includes("เฉลิม") || thaiName.includes("พระราช") || 
      thaiName.includes("จักรี") || thaiName.includes("ปิยมหาราช") || thaiName.includes("รัชกาล")) {
    return "royal";
  }
  
  return "national";
};

const FestivalCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [festivals, setFestivals] = useState([]);
  const [thaiHolidays, setThaiHolidays] = useState([]);
  const [customEvents, setCustomEvents] = useState([]); // ✅ เพิ่ม customEvents
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  useEffect(() => {
    fetchAllData();
  }, [currentDate.getFullYear()]);

  // ✅ ดึง customEvents จาก API (fallback ไป localStorage ถ้า API ไม่พร้อม)
  useEffect(() => {
    loadCustomEvents();
  }, [currentDate]);

  const loadCustomEvents = async () => {
    try {
      const response = await api.get("/custom-events/");
      setCustomEvents(response.data.results || response.data || []);
    } catch (error) {
      // Fallback: ใช้ localStorage ถ้า API ยังไม่พร้อม
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

  // ดึงเทศกาลจากระบบ
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

  // ✅ ดึงวันหยุดไทยจาก Google Calendar API
  const fetchThaiHolidays = async () => {
    const year = currentDate.getFullYear();
    
    // ✅ ลบ cache เก่าที่ไม่มี type แยก
    localStorage.removeItem(`holidays_overview_${year}`);

    try {
      const calendarId = 'th.th#holiday@group.v.calendar.google.com';
      const timeMin = `${year}-01-01T00:00:00Z`;
      const timeMax = `${year}-12-31T23:59:59Z`;
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Google API Error");
      }
      
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
      if (cached) {
        setThaiHolidays(JSON.parse(cached).data);
      }
    }
  };

  // ✅ รวม events ทั้งหมด (วันหยุด + เทศกาล + บันทึกของฉัน)
  const allEvents = useMemo(() => {
    const events = [];
    
    // วันหยุดไทย (แยกตามประเภท)
    thaiHolidays.forEach((h) => {
      events.push({
        ...h,
        id: `holiday-${h.date}`,
        title: h.name,
        isHoliday: true,
        isSelling: h.type === "selling_festival",
      });
    });
    
    // เทศกาลจากระบบ
    festivals.forEach((f) => {
      events.push({
        ...f,
        id: `festival-${f.id}`,
        title: f.name,
        isFestival: true,
        color: f.color || "#10b981"
      });
    });

    // ✅ บันทึกของฉัน (customEvents)
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

  // ✅ ดึง events ในวันนั้น
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
          className={`h-20 p-1 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
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
          <div className={`text-sm font-medium ${
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
                className={`text-[10px] px-1 py-0.5 rounded truncate border ${
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
                {(event.isSelling || event.type === "selling_festival") && ' '}
                {event.icon && <span className="mr-0.5">{event.icon}</span>}
                {event.title || event.name}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-[10px] text-gray-500">+{dayEvents.length - 2}</div>
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
      <div className="px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">📅 ปฏิทินเทศกาล</h2>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={previousMonth} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">← เดือนที่แล้ว</button>
          <h3 className="font-bold text-gray-800">{monthNames[month]} {thaiYear}</h3>
          <button onClick={nextMonth} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">เดือนถัดไป →</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((day, idx) => (
            <div key={idx} className={`text-center text-xs font-medium py-2 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {loading ? (
            <div className="col-span-7 py-20 text-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              กำลังโหลด...
            </div>
          ) : renderCalendarDays()}
        </div>

        {!loading && upcomingEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-bold text-gray-700 text-sm mb-2">📌 วันหยุดที่ใกล้ถึง</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  <span className={`truncate text-xs ${event.isSelling || event.type === "selling_festival" ? 'text-pink-700 font-medium' : 'text-gray-700'}`}>
                    {(event.isSelling || event.type === "selling_festival") && ' '}
                    {event.icon && <span className="mr-1">{event.icon}</span>}
                    {event.title || event.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <h4 className="font-bold text-gray-700 text-sm mb-2">🎨 สัญลักษณ์</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-500"></span><span className="text-gray-600 font-medium"> เทศกาลขายดี (เตรียมสินค้า!)</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400"></span><span className="text-gray-600">วันหยุดราชการ</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400"></span><span className="text-gray-600">วันสำคัญทางพุทธศาสนา</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400"></span><span className="text-gray-600">วันเฉลิมพระชนมพรรษา</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400"></span><span className="text-gray-600">เทศกาลร้าน</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400"></span><span className="text-gray-600">บันทึกของฉัน</span></div>
          </div>
        </div>
      </div>

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
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{
                    selectedEvent.isSelling || selectedEvent.type === "selling_festival" ? '' :
                    selectedEvent.icon || (selectedEvent.isHoliday ? '🇹🇭' : selectedEvent.isFestival ? '🎉' : '📝')
                  }</span>
                  <h2 className="text-white font-bold">{selectedEvent.title || selectedEvent.name}</h2>
                </div>
                <button onClick={() => setShowDetail(false)} className="text-white/80 hover:text-white text-xl">✕</button>
              </div>
            </div>
            <div className="p-4">
              {(selectedEvent.description || selectedEvent.notes) && <p className="text-gray-600 text-sm mb-3">{selectedEvent.description || selectedEvent.notes}</p>}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📅 วันที่:</span>
                  <span className="text-gray-700 font-medium">{new Date(selectedEvent.date || selectedEvent.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">🏷️ ประเภท:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedEvent.isSelling || selectedEvent.type === "selling_festival" ? 'bg-pink-100 text-pink-700' :
                    selectedEvent.type === "buddhist" ? 'bg-orange-100 text-orange-700' :
                    selectedEvent.type === "royal" ? 'bg-yellow-100 text-yellow-700' :
                    selectedEvent.isHoliday ? 'bg-red-100 text-red-700' : 
                    selectedEvent.isFestival ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedEvent.isSelling || selectedEvent.type === "selling_festival" ? ' เทศกาลขายดี' :
                     selectedEvent.type === "buddhist" ? 'วันสำคัญทางพุทธ' :
                     selectedEvent.type === "royal" ? 'วันเฉลิมพระชนมพรรษา' :
                     selectedEvent.isHoliday ? 'วันหยุดราชการ' : 
                     selectedEvent.isFestival ? 'เทศกาล' : 'บันทึกของฉัน'}
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