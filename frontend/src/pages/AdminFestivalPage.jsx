// src/pages/AdminFestivalPage.jsx
// ✅ ใช้ API เก็บ Custom Events
import { useState, useEffect, useMemo } from "react";
import api from "../api";

const GOOGLE_API_KEY = "AIzaSyAtdfhSI2DJHNjiYfX_wD6MRHkiL2EIZb4";

// ✅ Event types พร้อม emoji
const EVENT_TYPES = [
  { value: "stock_check", label: "ตรวจนับสต็อก", emoji: "📋", color: "bg-blue-100 border-blue-400 text-blue-800" },
  { value: "stock_order", label: "สั่งซื้อสินค้า", emoji: "🛒", color: "bg-green-100 border-green-400 text-green-800" },
  { value: "delivery", label: "รับ/ส่งสินค้า", emoji: "🚚", color: "bg-orange-100 border-orange-400 text-orange-800" },
  { value: "meeting", label: "ประชุม/นัดหมาย", emoji: "👥", color: "bg-indigo-100 border-indigo-400 text-indigo-800" },
  { value: "other", label: "อื่นๆ", emoji: "📝", color: "bg-gray-100 border-gray-400 text-gray-800" },
];

const HOLIDAY_COLORS = {
  selling_festival: "bg-pink-100 border-pink-500 text-pink-800",
  national: "bg-red-100 border-red-400 text-red-800",
  buddhist: "bg-orange-100 border-orange-400 text-orange-800",
  royal: "bg-yellow-100 border-yellow-400 text-yellow-800",
  observance: "bg-gray-100 border-gray-400 text-gray-700",
  festival: "bg-green-100 border-green-400 text-green-800",
  custom: "bg-blue-100 border-blue-400 text-blue-800",
};

// ✅ Priority colors สำหรับแสดงวงกลมสี
const PRIORITY_COLORS = {
  low: { dot: 'bg-green-500', label: 'ต่ำ' },
  medium: { dot: 'bg-yellow-500', label: 'ปกติ' },
  high: { dot: 'bg-red-500', label: 'สูง' },
  urgent: { dot: 'bg-purple-500', label: 'ด่วน' },
};

export default function AdminFestivalPage() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [thaiHolidays, setThaiHolidays] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", type: "stock_order", notes: "", is_shared: true, priority: "medium" });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchThaiHolidays(currentDate.getFullYear());
  }, [currentDate.getFullYear()]);

  const loadData = async () => {
    setLoading(true);
    try {
      const festivalsRes = await api.get("/festivals/");
      setFestivals(festivalsRes.data.results || festivalsRes.data || []);
      
      const eventsRes = await api.get("/custom-events/");
      setCustomEvents(eventsRes.data.results || eventsRes.data || []);
    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThaiHolidays = async (year) => {
    setLoadingHolidays(true);
    setApiError(null);

    try {
      const calendarId = 'th.th#holiday@group.v.calendar.google.com';
      const timeMin = `${year}-01-01T00:00:00Z`;
      const timeMax = `${year}-12-31T23:59:59Z`;
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Google API Error");
      
      const result = await response.json();

      if (result.items && result.items.length > 0) {
        const holidays = result.items.map((item) => ({
          date: item.start.date || item.start.dateTime.split("T")[0],
          name: item.summary,
          description: item.description || "",
          type: mapHolidayType(item.summary),
          isHoliday: true,
        }));

        setThaiHolidays(holidays);
        localStorage.setItem(`holidays_${year}`, JSON.stringify({ data: holidays, source: 'google_official' }));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      const cached = localStorage.getItem(`holidays_${year}`);
      if (cached) {
        setThaiHolidays(JSON.parse(cached).data);
        setApiError("ใช้ข้อมูลสำรองจากเครื่อง (Offline)");
      } else {
        setApiError("ไม่สามารถดึงข้อมูลจาก Google ได้");
      }
    } finally {
      setLoadingHolidays(false);
    }
  };

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
    
    if (lowerName.includes("holiday") || thaiName.includes("หยุดชดเชย") || thaiName.includes("วันหยุด")) return "national";
    
    return "national";
  };

  const allEvents = useMemo(() => {
    const events = [];
    
    thaiHolidays.forEach((h) => {
      events.push({ ...h, id: `holiday-${h.date}-${h.name}`, title: h.name, isFromAPI: true });
    });
    
    festivals.forEach((f) => {
      events.push({ id: `festival-${f.id}`, date: f.start_date, endDate: f.end_date, title: f.name, icon: f.icon, type: "festival", isFestival: true });
    });
    
    customEvents.forEach((e) => {
      events.push({ ...e, id: `custom-${e.id}`, title: e.title, type: "custom", isCustom: true, dbId: e.id });
    });
    
    return events;
  }, [thaiHolidays, festivals, customEvents]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days = [];
    
    for (let i = 0; i < startPadding; i++) days.push(null);
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = allEvents.filter((e) => e.date === dateStr);
      days.push({
        day: d, date: dateStr, events: dayEvents,
        isToday: dateStr === new Date().toISOString().split("T")[0],
        isWeekend: (startPadding + d - 1) % 7 === 0 || (startPadding + d - 1) % 7 === 6,
        hasHoliday: dayEvents.some((e) => e.isHoliday),
      });
    }
    return days;
  }, [currentDate, allEvents]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateClick = (day) => {
    if (!day) return;
    setSelectedDate(day);
    setNewEvent({ ...newEvent, date: day.date });
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) return alert("กรุณากรอกข้อมูลให้ครบ");
    
    try {
      await api.post("/custom-events/", {
        title: newEvent.title,
        date: newEvent.date,
        event_type: newEvent.type,
        notes: newEvent.notes,
        is_shared: newEvent.is_shared,
        priority: newEvent.priority
      });
      
      loadData();
      setShowAddModal(false);
      setNewEvent({ title: "", date: "", type: "stock_order", notes: "", is_shared: true, priority: "medium" });
    } catch (err) {
      console.error("Add event error:", err);
      alert("เกิดข้อผิดพลาด: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm("ต้องการลบบันทึกนี้?")) return;
    
    try {
      const eventId = event.dbId || event.id.replace('custom-', '');
      await api.delete(`/custom-events/${eventId}/`);
      loadData();
    } catch (err) {
      console.error("Delete event error:", err);
      alert("ไม่สามารถลบได้: " + (err.response?.data?.detail || err.message));
    }
  };

  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  // ✅ แยกวันหยุดที่ใกล้ถึง (เฉพาะ holidays/festivals) ไม่รวม custom events
  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allEvents
      .filter((e) => e.date >= today && (e.isHoliday || e.isFestival) && !e.isCustom)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [allEvents]);

  // ✅ แก้ไข: บันทึกของฉันในเดือนที่กำลังดู (แทนที่จะเป็นงานที่ใกล้ถึง)
  const currentMonthCustomEvents = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // สร้าง prefix ของเดือนที่กำลังดู เช่น "2026-01"
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    
    return allEvents
      .filter((e) => e.isCustom && e.date.startsWith(monthPrefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, currentDate]);

  const holidaysByType = useMemo(() => {
    const grouped = { selling_festival: [], national: [], buddhist: [], royal: [], observance: [] };
    thaiHolidays.forEach((h) => {
      if (grouped[h.type]) grouped[h.type].push(h);
      else grouped.observance.push(h);
    });
    return grouped;
  }, [thaiHolidays]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header - ไม่มี emoji */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ปฏิทินและวันสำคัญ</h1>
            <p className="text-sm text-gray-500">
              จัดการเทศกาล วันหยุด และบันทึกวันสำคัญ
              {loadingHolidays && <span className="ml-2 text-blue-500">กำลังโหลดวันหยุด...</span>}
            </p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          เพิ่มงาน
        </button>
      </div>

      {apiError && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${apiError.includes("Offline") ? "bg-yellow-50 border border-yellow-200 text-yellow-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{apiError}</span>
        </div>
      )}

      {/* Tabs - ไม่มี emoji */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { key: "calendar", label: "ปฏิทิน", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { key: "holidays", label: `วันหยุดไทย (${thaiHolidays.length})`, icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" },
          { key: "myevents", label: `บันทึกของฉัน (${customEvents.length})`, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-lg font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</h2>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 bg-gray-50 border-b">
              {dayNames.map((day, i) => (
                <div key={day} className={`p-2 text-center text-sm font-medium ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600"}`}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[80px] p-1 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                    !day ? "bg-gray-50" :
                    day.isToday ? "bg-blue-50" :
                    selectedDate?.date === day?.date ? "bg-yellow-50" :
                    day.hasHoliday ? "bg-red-50/50" :
                    day.isWeekend ? "bg-gray-50/50" : "hover:bg-gray-50"
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        day.isToday ? "text-blue-600" :
                        day.hasHoliday ? "text-red-600" :
                        (i % 7 === 0) ? "text-red-500" :
                        (i % 7 === 6) ? "text-blue-500" : "text-gray-700"
                      }`}>{day.day}</div>
                      <div className="space-y-0.5">
                        {day.events.slice(0, 2).map((event, ei) => (
                          <div key={ei} className={`text-xs px-1 py-0.5 rounded truncate border flex items-center gap-1 ${HOLIDAY_COLORS[event.type] || "bg-gray-100"}`} title={event.title}>
                            {event.isCustom && event.priority && (
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[event.priority]?.dot || 'bg-gray-400'}`}></span>
                            )}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {day.events.length > 2 && <div className="text-xs text-gray-500 px-1">+{day.events.length - 2}</div>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {selectedDate && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {selectedDate.day} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                </h3>
                {selectedDate.events.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedDate.events.map((event, i) => {
                      const eventType = EVENT_TYPES.find((t) => t.value === event.event_type);
                      return (
                        <div key={i} className={`p-3 rounded-lg border ${HOLIDAY_COLORS[event.type] || "bg-gray-50"}`}>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {event.isCustom && event.priority && (
                              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${PRIORITY_COLORS[event.priority]?.dot || 'bg-gray-400'}`} title={`ความสำคัญ: ${PRIORITY_COLORS[event.priority]?.label || '-'}`}></span>
                            )}
                            {event.title}
                          </div>
                          {event.isCustom && eventType && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <span>{eventType.emoji}</span>
                              <span>{eventType.label}</span>
                            </div>
                          )}
                          {event.notes && <div className="text-xs opacity-75 mt-1">{event.notes}</div>}
                          {event.isCustom && <button onClick={() => handleDeleteEvent(event)} className="text-xs text-red-500 hover:underline mt-1">ลบ</button>}
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-gray-500">ไม่มีกิจกรรม</p>}
                <button onClick={() => { setNewEvent({ ...newEvent, date: selectedDate.date }); setShowAddModal(true); }} className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  เพิ่มบันทึกวันนี้
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                วันหยุดที่ใกล้ถึง
              </h3>
              {upcomingHolidays.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {upcomingHolidays.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        h.type === "selling_festival" ? "bg-pink-500" :
                        h.type === "national" ? "bg-red-500" :
                        h.type === "buddhist" ? "bg-orange-500" :
                        h.type === "royal" ? "bg-yellow-500" :
                        h.isFestival ? "bg-green-500" : "bg-gray-400"
                      }`}></span>
                      <span className="text-gray-500 w-16">{new Date(h.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                      <span className={`text-gray-700 truncate ${h.type === "selling_festival" ? "font-medium text-pink-700" : ""}`}>
                        {h.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">{loadingHolidays ? "กำลังโหลด..." : "ไม่มีวันหยุดที่ใกล้ถึง"}</p>}
            </div>

            {/* ✅ แก้ไข: บันทึกของฉันในเดือนนี้ (เปลี่ยนตามเดือนที่ดู) */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                บันทึกของฉัน
                <span className="text-xs font-normal text-gray-500">
                  ({monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543})
                </span>
              </h3>
              {currentMonthCustomEvents.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentMonthCustomEvents.map((e, i) => {
                    const eventType = EVENT_TYPES.find((t) => t.value === e.event_type);
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[e.priority]?.dot || 'bg-blue-500'}`}></span>
                        <span className="text-gray-500 w-8 font-medium">{new Date(e.date).getDate()}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-800 truncate block font-medium">{e.title}</span>
                          {eventType && (
                            <span className="text-xs text-gray-500">{eventType.emoji} {eventType.label}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteEvent({ dbId: e.dbId || e.id })} 
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-gray-500">ไม่มีบันทึกในเดือนนี้</p>
                  <button 
                    onClick={() => setShowAddModal(true)} 
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    + เพิ่มบันทึก
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                สัญลักษณ์
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-pink-500"></span><span className="font-medium">เทศกาลขายดี (เตรียมสินค้า!)</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-400"></span><span>วันหยุดราชการ</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-orange-400"></span><span>วันสำคัญทางพุทธศาสนา</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400"></span><span>วันเฉลิมพระชนมพรรษา</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-400"></span><span>บันทึกของฉัน</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === "holidays" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
              <div className="text-2xl font-bold text-pink-600">{holidaysByType.selling_festival.length}</div>
              <div className="text-sm text-pink-700">เทศกาลขายดี</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="text-2xl font-bold text-red-600">{holidaysByType.national.length}</div>
              <div className="text-sm text-red-700">วันหยุดราชการ</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="text-2xl font-bold text-orange-600">{holidaysByType.buddhist.length}</div>
              <div className="text-sm text-orange-700">วันสำคัญทางพุทธ</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">{holidaysByType.royal.length}</div>
              <div className="text-sm text-yellow-700">วันเฉลิมพระชนมพรรษา</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{holidaysByType.observance.length}</div>
              <div className="text-sm text-gray-600">วันสำคัญอื่นๆ</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-600">ปี:</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))} className="px-3 py-1 border rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {currentDate.getFullYear() - 1 + 543}
            </button>
            <span className="font-bold text-lg">{currentDate.getFullYear() + 543}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))} className="px-3 py-1 border rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              {currentDate.getFullYear() + 1 + 543}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {loadingHolidays && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                วันหยุดและวันสำคัญของไทย ปี {currentDate.getFullYear() + 543}
              </h2>
              <p className="text-sm text-gray-500">ข้อมูลจาก Google Calendar API • รวม {thaiHolidays.length} วัน</p>
            </div>
            
            {thaiHolidays.length > 0 ? (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {thaiHolidays.sort((a, b) => a.date.localeCompare(b.date)).map((h, i) => (
                  <div key={i} className={`flex items-start p-4 hover:bg-gray-50 ${h.isHoliday ? "bg-red-50/30" : ""}`}>
                    <div className="w-20 text-center flex-shrink-0">
                      <div className={`text-2xl font-bold ${h.isHoliday ? "text-red-600" : "text-gray-800"}`}>{new Date(h.date).getDate()}</div>
                      <div className="text-xs text-gray-500">{monthNames[new Date(h.date).getMonth()].slice(0, 3)}</div>
                    </div>
                    <div className="flex-1 ml-4">
                      <div className="font-medium text-gray-800">{h.name}</div>
                      {h.description && <div className="text-sm text-gray-500 mt-1">{h.description}</div>}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${HOLIDAY_COLORS[h.type]}`}>
                      {h.type === "selling_festival" ? "เตรียมสินค้า!" : h.type === "national" ? "วันหยุด" : h.type === "buddhist" ? "วันพระ" : h.type === "royal" ? "วันเฉลิมฯ" : "วันสำคัญ"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                {loadingHolidays ? (
                  <>
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    กำลังโหลด...
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>ไม่พบข้อมูลวันหยุด</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Events Tab */}
      {activeTab === "myevents" && (
        <div className="space-y-4">
          {customEvents.length === 0 ? (
            <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-medium text-gray-800 mb-2">ยังไม่มีบันทึก</h3>
              <p className="text-sm text-gray-500 mb-4">เพิ่มบันทึกเพื่อเตือนความจำวันสำคัญ</p>
              <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                + เพิ่มบันทึก
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {customEvents.sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
                  const eventType = EVENT_TYPES.find((t) => t.value === e.event_type);
                  const priorityInfo = PRIORITY_COLORS[e.priority];
                  return (
                    <div key={e.id} className="flex items-center p-4 hover:bg-gray-50">
                      <div className="w-20 text-center">
                        <div className="text-2xl font-bold text-gray-800">{new Date(e.date).getDate()}</div>
                        <div className="text-xs text-gray-500">{monthNames[new Date(e.date).getMonth()].slice(0, 3)}</div>
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="font-medium text-gray-800 flex items-center gap-2">
                          {priorityInfo && (
                            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${priorityInfo.dot}`} title={`ความสำคัญ: ${priorityInfo.label}`}></span>
                          )}
                          {e.title}
                        </div>
                        {e.notes && <div className="text-sm text-gray-500">{e.notes}</div>}
                        {e.is_shared && (
                          <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            แชร์ให้ทุกคน
                          </span>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${eventType?.color || "bg-gray-100"}`}>
                        <span>{eventType?.emoji}</span>
                        <span>{eventType?.label || "อื่นๆ"}</span>
                      </div>
                      <button onClick={() => handleDeleteEvent({ dbId: e.id })} className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal - ไม่มี emoji */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                เพิ่มงาน
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน *</label>
                <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="เช่น เตรียมสต็อกวาเลนไทน์" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน</label>
                <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความสำคัญ</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'low', label: 'ต่ำ', color: 'border-green-500 bg-green-50 text-green-700', dotColor: 'bg-green-500' },
                    { value: 'medium', label: 'ปกติ', color: 'border-yellow-500 bg-yellow-50 text-yellow-700', dotColor: 'bg-yellow-500' },
                    { value: 'high', label: 'สูง', color: 'border-red-500 bg-red-50 text-red-700', dotColor: 'bg-red-500' },
                    { value: 'urgent', label: 'ด่วน', color: 'border-purple-500 bg-purple-50 text-purple-700', dotColor: 'bg-purple-500' },
                  ].map((p) => (
                    <button key={p.value} type="button" onClick={() => setNewEvent({ ...newEvent, priority: p.value })} className={`px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-1.5 ${newEvent.priority === p.value ? p.color + ' ring-2 ring-offset-1' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      <span className={`w-3 h-3 rounded-full ${p.dotColor}`}></span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                <textarea value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} placeholder="รายละเอียดงานที่ต้องทำ..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_shared" checked={newEvent.is_shared} onChange={(e) => setNewEvent({ ...newEvent, is_shared: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="is_shared" className="text-sm text-gray-700">แชร์ให้ทุกคนเห็น (พนักงานเห็นด้วย)</label>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">ยกเลิก</button>
              <button onClick={handleAddEvent} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}