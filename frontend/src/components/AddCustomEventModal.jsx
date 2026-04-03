// src/components/AddCustomEventModal.jsx
// Component สำหรับเพิ่มงานใหม่ในปฏิทิน แยกออกมาจาก AdminFestivalPage
import { useState, useEffect } from "react";
import api from "../api";

// ประเภทงานที่รองรับ
const EVENT_TYPES = [
  { value: "stock_check", label: "ตรวจนับสต็อก", emoji: "📋" },
  { value: "stock_order", label: "สั่งซื้อสินค้า", emoji: "🛒" },
  { value: "delivery",   label: "รับ/ส่งสินค้า", emoji: "🚚" },
  { value: "meeting",    label: "ประชุม/นัดหมาย", emoji: "👥" },
  { value: "other",      label: "อื่นๆ",          emoji: "📝" },
];

// ระดับความสำคัญ
const PRIORITY_OPTIONS = [
  { value: "low",    label: "ต่ำ",  color: "border-green-500  bg-green-50  text-green-700",  dot: "bg-green-500"  },
  { value: "medium", label: "ปกติ", color: "border-yellow-500 bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  { value: "high",   label: "สูง",  color: "border-red-500    bg-red-50    text-red-700",    dot: "bg-red-500"    },
  { value: "urgent", label: "ด่วน", color: "border-purple-500 bg-purple-50 text-purple-700", dot: "bg-purple-500" },
];

// Props ที่รับมา:
//   open       — true/false เปิด/ปิด Modal
//   defaultDate — วันที่เริ่มต้น (ถ้าคลิกมาจากปฏิทิน)
//   onClose    — callback เมื่อปิด Modal
//   onSaved    — callback เมื่อบันทึกสำเร็จ (ให้ parent โหลดข้อมูลใหม่)
export default function AddCustomEventModal({ open, defaultDate = "", onClose, onSaved }) {
  // State ข้อมูลฟอร์ม
  const [form, setForm] = useState({
    title: "",
    date: defaultDate,
    type: "stock_order",
    notes: "",
    is_shared: true,
    priority: "medium",
  });
  const [saving, setSaving] = useState(false); // สถานะกำลังบันทึก

  // อัปเดตวันที่เมื่อ defaultDate เปลี่ยน (เช่น คลิกวันอื่นในปฏิทิน)
  useEffect(() => {
    setForm((prev) => ({ ...prev, date: defaultDate }));
  }, [defaultDate]);

  // Reset ฟอร์มทุกครั้งที่ปิด Modal
  useEffect(() => {
    if (!open) {
      setForm({ title: "", date: defaultDate, type: "stock_order", notes: "", is_shared: true, priority: "medium" });
      setSaving(false);
    }
  }, [open]);

  // ── บันทึกงานใหม่ ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date) {
      return alert("กรุณากรอกชื่องานและวันที่ให้ครบ");
    }
    setSaving(true);
    try {
      await api.post("/custom-events/", {   // POST /custom-events/ → สร้าง CustomEvent ใหม่
        title: form.title,
        date: form.date,
        event_type: form.type,
        notes: form.notes,
        is_shared: form.is_shared,          // แชร์ให้พนักงานเห็นหรือไม่
        priority: form.priority,
      });
      onSaved?.();  // แจ้ง parent ให้โหลดข้อมูลใหม่
      onClose?.();  // ปิด Modal
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ถ้าไม่ได้เปิด → ไม่ render อะไรเลย
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Overlay คลิกปิด Modal */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มงาน
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ชื่องาน */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="เช่น เตรียมสต็อกวาเลนไทน์"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* วันที่ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* ประเภทงาน */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>

          {/* ระดับความสำคัญ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความสำคัญ</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={`px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-1.5 ${
                    form.priority === p.value
                      ? p.color + " ring-2 ring-offset-1"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${p.dot}`}></span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* รายละเอียด */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="รายละเอียดงานที่ต้องทำ..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* แชร์ให้ทุกคนเห็น */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_shared"
              checked={form.is_shared}
              onChange={(e) => setForm({ ...form, is_shared: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_shared" className="text-sm text-gray-700">
              แชร์ให้ทุกคนเห็น (พนักงานเห็นด้วย)
            </label>
          </div>
        </div>

        {/* Footer ปุ่ม ยกเลิก / บันทึก */}
        <div className="p-4 border-t flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}  // เรียก handleSubmit → POST /custom-events/
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังบันทึก...
              </>
            ) : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}