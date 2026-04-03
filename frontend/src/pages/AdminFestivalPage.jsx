// src/pages/AdminFestivalPage.jsx
import { useState, useEffect, useMemo } from "react";
import api from "../api";
import EditCustomEventModal from "../components/EditCustomEventModal";
import AddCustomEventModal from "../components/AddCustomEventModal";

const GOOGLE_API_KEY = "AIzaSyAtdfhSI2DJHNjiYfX_wD6MRHkiL2EIZb4";

const EVENT_TYPES = [
  { value: "stock_check", label: "ตรวจนับสต็อก", emoji: "📋", color: "bg-blue-100 border-blue-400 text-blue-800" },
  { value: "stock_order", label: "สั่งซื้อสินค้า", emoji: "🛒", color: "bg-green-100 border-green-400 text-green-800" },
  { value: "delivery",    label: "รับ/ส่งสินค้า", emoji: "🚚", color: "bg-orange-100 border-orange-400 text-orange-800" },
  { value: "meeting",     label: "ประชุม/นัดหมาย", emoji: "👥", color: "bg-indigo-100 border-indigo-400 text-indigo-800" },
  { value: "other",       label: "อื่นๆ",          emoji: "📝", color: "bg-gray-100 border-gray-400 text-gray-800" },
];

const HOLIDAY_COLORS = {
  selling_festival: "bg-pink-100 border-pink-500 text-pink-800",
  national:         "bg-red-100 border-red-400 text-red-800",
  buddhist:         "bg-orange-100 border-orange-400 text-orange-800",
  royal:            "bg-yellow-100 border-yellow-400 text-yellow-800",
  observance:       "bg-gray-100 border-gray-400 text-gray-700",
  festival:         "bg-green-100 border-green-400 text-green-800",
  custom:           "bg-blue-100 border-blue-400 text-blue-800",
};

const PRIORITY_COLORS = {
  low:    { dot: "bg-green-500",  label: "ต่ำ"  },
  medium: { dot: "bg-yellow-500", label: "ปกติ" },
  high:   { dot: "bg-red-500",    label: "สูง"  },
  urgent: { dot: "bg-purple-500", label: "ด่วน" },
};

export default function AdminFestivalPage() {
  const [activeTab, setActiveTab]       = useState("calendar");
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [thaiHolidays, setThaiHolidays] = useState([]);
  const [festivals, setFestivals]       = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);      // ✅ ควบคุม AddCustomEventModal
  const [addModalDate, setAddModalDate] = useState("");         // ✅ วันที่เริ่มต้นส่งให้ AddCustomEventModal
  const [loading, setLoading]           = useState(true);
  const [apiError, setApiError]         = useState(null);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => { loadData(); }, []);

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

  useEffect(() => {
    fetchThaiHolidays(currentDate.getFullYear());
  }, [currentDate.getFullYear()]);

  const fetchThaiHolidays = async (year) => {
    setLoadingHolidays(true);
    setApiError(null);
    try {
      const calendarId = "th.th#holiday@group.v.calendar.google.com";
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${GOOGLE_API_KEY}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true&orderBy=startTime`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Google API Error");
      const result = await response.json();
      if (result.items?.length > 0) {
        const holidays = result.items.map((item) => ({
          date: item.start.date || item.start.dateTime.split("T")[0],
          name: item.summary,
          description: item.description || "",
          type: mapHolidayType(item.summary),
          isHoliday: true,
        }));
        setThaiHolidays(holidays);
        localStorage.setItem(`holidays_${year}`, JSON.stringify({ data: holidays }));
      }
    } catch (err) {
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
    const l = name.toLowerCase();
    if (l.includes("new year") || name.includes("ปีใหม่")) return "selling_festival";
    if (l.includes("songkran") || name.includes("สงกรานต์")) return "selling_festival";
    if (l.includes("loy krathong") || name.includes("ลอยกระทง")) return "selling_festival";
    if (l.includes("valentine") || name.includes("วาเลนไทน์")) return "selling_festival";
    if (l.includes("chinese new year") || name.includes("ตรุษจีน")) return "selling_festival";
    if (l.includes("mother") || name.includes("แม่")) return "selling_festival";
    if (l.includes("father") || name.includes("พ่อ")) return "selling_festival";
    if (l.includes("bucha") || name.includes("มาฆ") || name.includes("วิสาข") || name.includes("เข้าพรรษา") || name.includes("ออกพรรษา")) return "buddhist";
    if (l.includes("king") || l.includes("queen") || name.includes("เฉลิม") || name.includes("จักรี") || name.includes("รัชกาล")) return "royal";
    if (name.includes("หยุดชดเชย") || name.includes("วันหยุด")) return "national";
    return "national";
  };

  const allEvents = useMemo(() => {
    const events = [];
    thaiHolidays.forEach((h) => events.push({ ...h, id: `holiday-${h.date}-${h.name}`, title: h.name, isFromAPI: true }));
    festivals.forEach((f) => events.push({ id: `festival-${f.id}`, date: f.start_date, endDate: f.end_date, title: f.name, icon: f.icon, type: "festival", isFestival: true }));
    customEvents.forEach((e) => events.push({ ...e, id: `custom-${e.id}`, title: e.title, type: "custom", isCustom: true, dbId: e.id }));
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
      days.push({ day: d, date: dateStr, events: dayEvents,
        isToday: dateStr === new Date().toISOString().split("T")[0],
        isWeekend: (startPadding + d - 1) % 7 === 0 || (startPadding + d - 1) % 7 === 6,
        hasHoliday: dayEvents.some((e) => e.isHoliday),
      });
    }
    return days;
  }, [currentDate, allEvents]);

  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allEvents.filter((e) => e.date >= today && (e.isHoliday || e.isFestival) && !e.isCustom)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  }, [allEvents]);

  const currentMonthCustomEvents = useMemo(() => {
    const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    return allEvents.filter((e) => e.isCustom && e.date.startsWith(monthPrefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, currentDate]);

  const holidaysByType = useMemo(() => {
    const grouped = { selling_festival: [], national: [], buddhist: [], royal: [], observance: [] };
    thaiHolidays.forEach((h) => { if (grouped[h.type]) grouped[h.type].push(h); else grouped.observance.push(h); });
    return grouped;
  }, [thaiHolidays]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateClick = (day) => {
    if (!day) return;
    setSelectedDate(day);
  };

  // ✅ เปิด AddCustomEventModal พร้อมวันที่ที่เลือก
  const handleOpenAddModal = (date = "") => {
    setAddModalDate(date);
    setShowAddModal(true);
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm("ต้องการลบบันทึกนี้?")) return;
    try {
      const eventId = event.dbId || event.id.replace("custom-", "");
      await api.delete(`/custom-events/${eventId}/`);
      loadData();
    } catch (err) {
      alert("ไม่สามารถลบได้: " + (err.response?.data?.detail || err.message));
    }
  };

  const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const dayNames = ["อา","จ","อ","พ","พฤ","ศ","ส"];

  if (loading) return (
    <div className="p-8 text-center text-gray-500">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      กำลังโหลด...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">

      {/* Header */}
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
        {/* ✅ ปุ่มเพิ่มงาน → เปิด AddCustomEventModal */}
        <button onClick={() => handleOpenAddModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { key: "calendar", label: "ปฏิทิน", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { key: "holidays", label: `วันหยุดไทย (${thaiHolidays.length})`, icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" },
          { key: "myevents", label: `บันทึกของฉัน (${customEvents.length})`, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" }
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: ปฏิทิน */}
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
                <div key={i} onClick={() => handleDateClick(day)}
                  className={`min-h-[80px] p-1 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                    !day ? "bg-gray-50" : day.isToday ? "bg-blue-50" :
                    selectedDate?.date === day?.date ? "bg-yellow-50" :
                    day.hasHoliday ? "bg-red-50/50" : day.isWeekend ? "bg-gray-50/50" : "hover:bg-gray-50"
                  }`}>
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${day.isToday ? "text-blue-600" : day.hasHoliday ? "text-red-600" : (i % 7 === 0) ? "text-red-500" : (i % 7 === 6) ? "text-blue-500" : "text-gray-700"}`}>{day.day}</div>
                      <div className="space-y-0.5">
                        {day.events.slice(0, 2).map((event, ei) => (
                          <div key={ei} className={`text-xs px-1 py-0.5 rounded truncate border flex items-center gap-1 ${HOLIDAY_COLORS[event.type] || "bg-gray-100"}`} title={event.title}>
                            {event.isCustom && event.priority && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[event.priority]?.dot || "bg-gray-400"}`}></span>}
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
                <h3 className="font-bold text-gray-800 mb-3">
                  {selectedDate.day} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                </h3>
                {selectedDate.events.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedDate.events.map((event, i) => {
                      const eventType = EVENT_TYPES.find((t) => t.value === event.event_type);
                      return (
                        <div key={i} className={`p-3 rounded-lg border ${HOLIDAY_COLORS[event.type] || "bg-gray-50"}`}>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {event.isCustom && event.priority && <span className={`w-3 h-3 rounded-full flex-shrink-0 ${PRIORITY_COLORS[event.priority]?.dot || "bg-gray-400"}`}></span>}
                            {event.title}
                          </div>
                          {event.isCustom && eventType && <div className="text-xs text-gray-500 mt-1">{eventType.emoji} {eventType.label}</div>}
                          {event.notes && <div className="text-xs opacity-75 mt-1">{event.notes}</div>}
                          {event.isCustom && (
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => setEditingEvent({ ...event, id: event.dbId || event.id?.toString().replace("custom-", "") })} className="text-xs text-blue-500 hover:underline">แก้ไข</button>
                              <button onClick={() => handleDeleteEvent(event)} className="text-xs text-red-500 hover:underline">ลบ</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-gray-500">ไม่มีกิจกรรม</p>}
                {/* ✅ ปุ่มเพิ่มบันทึกวันนี้ → เปิด AddCustomEventModal พร้อมวันที่ */}
                <button onClick={() => handleOpenAddModal(selectedDate.date)} className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  เพิ่มบันทึกวันนี้
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3">วันหยุดที่ใกล้ถึง</h3>
              {upcomingHolidays.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {upcomingHolidays.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.type === "selling_festival" ? "bg-pink-500" : h.type === "national" ? "bg-red-500" : h.type === "buddhist" ? "bg-orange-500" : h.type === "royal" ? "bg-yellow-500" : h.isFestival ? "bg-green-500" : "bg-gray-400"}`}></span>
                      <span className="text-gray-500 w-16">{new Date(h.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                      <span className={`text-gray-700 truncate ${h.type === "selling_festival" ? "font-medium text-pink-700" : ""}`}>{h.title}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">{loadingHolidays ? "กำลังโหลด..." : "ไม่มีวันหยุดที่ใกล้ถึง"}</p>}
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3">
                บันทึกของฉัน
                <span className="text-xs font-normal text-gray-500 ml-1">({monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543})</span>
              </h3>
              {currentMonthCustomEvents.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentMonthCustomEvents.map((e, i) => {
                    const eventType = EVENT_TYPES.find((t) => t.value === e.event_type);
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[e.priority]?.dot || "bg-blue-500"}`}></span>
                        <span className="text-gray-500 w-8 font-medium">{new Date(e.date).getDate()}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-800 truncate block font-medium">{e.title}</span>
                          {eventType && <span className="text-xs text-gray-500">{eventType.emoji} {eventType.label}</span>}
                        </div>
                        <button onClick={() => setEditingEvent({ ...e, id: e.dbId || e.id?.toString().replace("custom-", "") })} className="p-1 text-blue-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-all" title="แก้ไข">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteEvent({ dbId: e.dbId || e.id })} className="p-1 text-red-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all" title="ลบ">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">ไม่มีบันทึกในเดือนนี้</p>
                  {/* ✅ ปุ่มเพิ่มบันทึก → เปิด AddCustomEventModal */}
                  <button onClick={() => handleOpenAddModal()} className="mt-2 text-xs text-blue-600 hover:underline">+ เพิ่มบันทึก</button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3">สัญลักษณ์</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-pink-500"></span><span className="font-medium">เทศกาลขายดี</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-400"></span><span>วันหยุดราชการ</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-orange-400"></span><span>วันสำคัญทางพุทธศาสนา</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400"></span><span>วันเฉลิมพระชนมพรรษา</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-400"></span><span>บันทึกของฉัน</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: วันหยุดไทย */}
      {activeTab === "holidays" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: "selling_festival", label: "เทศกาลขายดี", bg: "bg-pink-50 border-pink-200", text: "text-pink-600", sub: "text-pink-700" },
              { key: "national",         label: "วันหยุดราชการ", bg: "bg-red-50 border-red-100",   text: "text-red-600",  sub: "text-red-700"  },
              { key: "buddhist",         label: "วันสำคัญทางพุทธ", bg: "bg-orange-50 border-orange-100", text: "text-orange-600", sub: "text-orange-700" },
              { key: "royal",            label: "วันเฉลิมพระชนมพรรษา", bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-600", sub: "text-yellow-700" },
              { key: "observance",       label: "วันสำคัญอื่นๆ", bg: "bg-gray-50 border-gray-200", text: "text-gray-600", sub: "text-gray-600" },
            ].map((t) => (
              <div key={t.key} className={`rounded-xl p-4 border ${t.bg}`}>
                <div className={`text-2xl font-bold ${t.text}`}>{holidaysByType[t.key]?.length || 0}</div>
                <div className={`text-sm ${t.sub}`}>{t.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))} className="px-3 py-1 border rounded hover:bg-gray-50">{currentDate.getFullYear() - 1 + 543}</button>
            <span className="font-bold text-lg">{currentDate.getFullYear() + 543}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))} className="px-3 py-1 border rounded hover:bg-gray-50">{currentDate.getFullYear() + 1 + 543}</button>
            {loadingHolidays && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <h2 className="text-lg font-bold text-gray-800">วันหยุดและวันสำคัญของไทย ปี {currentDate.getFullYear() + 543}</h2>
              <p className="text-sm text-gray-500">ข้อมูลจาก Google Calendar API • รวม {thaiHolidays.length} วัน</p>
            </div>
            {thaiHolidays.length > 0 ? (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {thaiHolidays.sort((a, b) => a.date.localeCompare(b.date)).map((h, i) => (
                  <div key={i} className="flex items-start p-4 hover:bg-gray-50">
                    <div className="w-20 text-center flex-shrink-0">
                      <div className="text-2xl font-bold text-red-600">{new Date(h.date).getDate()}</div>
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
                {loadingHolidays ? <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div> : <p>ไม่พบข้อมูลวันหยุด</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: บันทึกของฉัน */}
      {activeTab === "myevents" && (
        <div className="space-y-4">
          {customEvents.length === 0 ? (
            <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
              <h3 className="font-medium text-gray-800 mb-2">ยังไม่มีบันทึก</h3>
              <p className="text-sm text-gray-500 mb-4">เพิ่มบันทึกเพื่อเตือนความจำวันสำคัญ</p>
              {/* ✅ ปุ่มเพิ่มบันทึก → เปิด AddCustomEventModal */}
              <button onClick={() => handleOpenAddModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">+ เพิ่มบันทึก</button>
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
                          {priorityInfo && <span className={`w-3 h-3 rounded-full flex-shrink-0 ${priorityInfo.dot}`}></span>}
                          {e.title}
                        </div>
                        {e.notes && <div className="text-sm text-gray-500">{e.notes}</div>}
                        {e.is_shared && <span className="text-xs text-green-600 mt-1 block">แชร์ให้ทุกคน</span>}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${eventType?.color || "bg-gray-100"}`}>
                        <span>{eventType?.emoji}</span><span>{eventType?.label || "อื่นๆ"}</span>
                      </div>
                      <button onClick={() => setEditingEvent({ ...e, id: e.id })} className="ml-2 p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteEvent({ dbId: e.id })} className="ml-1 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* ✅ AddCustomEventModal — แยกออกมาเป็น Component แล้ว */}
      <AddCustomEventModal
        open={showAddModal}
        defaultDate={addModalDate}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); loadData(); }}
      />

      {/* EditCustomEventModal — เปิดเมื่อกดปุ่มแก้ไข */}
      {editingEvent && (
        <EditCustomEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => { setEditingEvent(null); loadData(); }}
        />
      )}
    </div>
  );
}