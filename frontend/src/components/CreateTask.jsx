// src/components/CreateTask.jsx
// Component สำหรับสร้างงานใหม่ แยกออกมาจาก TaskManagementPage
import { useState } from "react";
import api from "../api";

// Props ที่รับมา:
//   open     — true/false เปิด/ปิด Modal
//   users    — รายชื่อพนักงานสำหรับ dropdown (โหลดมาจาก TaskManagementPage)
//   onClose  — callback เมื่อปิด Modal
//   onSaved  — callback เมื่อบันทึกสำเร็จ (ให้ parent โหลดข้อมูลใหม่)
export default function CreateTask({ open, users = [], onClose, onSaved }) {
  // State ข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "other",
    assigned_to: "",
    priority: "medium",
    due_date: "",
    target_quantity: "",
  });
  const [saving, setSaving] = useState(false); // สถานะกำลังบันทึก

  // ── Reset ฟอร์มเมื่อปิด ────────────────────────────────
  const resetForm = () => {
    setFormData({
      title: "", description: "", task_type: "other",
      assigned_to: "", priority: "medium",
      due_date: "", target_quantity: "",
    });
  };

  // ── บันทึกงานใหม่ ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ตรวจสอบข้อมูลจำเป็น 3 ช่อง
    if (!formData.title || !formData.assigned_to || !formData.due_date) {
      return alert("กรุณากรอกข้อมูลที่จำเป็น: ชื่องาน, มอบหมายให้, วันกำหนด");
    }

    setSaving(true);
    try {
      // สร้าง payload ส่งไป Backend
      const submitData = {
        title: formData.title,
        description: formData.description || "",
        task_type: formData.task_type,
        assigned_to: parseInt(formData.assigned_to), // แปลงเป็น int
        priority: formData.priority,
        due_date: formData.due_date,
      };

      // เพิ่ม target_quantity ถ้ากรอกมา
      if (formData.target_quantity) {
        submitData.target_quantity = parseInt(formData.target_quantity);
      }

      await api.post("/tasks/", submitData); // POST /tasks/ → สร้าง Task ใหม่ สถานะเริ่มต้น = pending
      alert("สร้างงานเสร็จแล้ว");
      resetForm();    // ล้างฟอร์ม
      onSaved?.();    // แจ้ง parent ให้โหลดข้อมูลใหม่
      onClose?.();    // ปิด Modal
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + JSON.stringify(err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ปุ่มยกเลิก → reset + ปิด
  const handleCancel = () => {
    resetForm();
    onClose?.();
  };

  // helper แสดงชื่อพนักงาน
  const getUserRole = (user) => user.is_superuser ? "ผู้ดูแลระบบ" : "พนักงาน";

  // ถ้าไม่ได้เปิด → ไม่ render อะไรเลย
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Overlay คลิกปิด */}
      <div className="absolute inset-0" onClick={handleCancel} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            สร้างงานใหม่
          </h2>
          <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Row 1: ชื่องาน + ประเภทงาน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="เช่น เติมสินค้าสำหรับเทศกาล"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน</label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="stock_replenishment">🎁 เติมสินค้า</option>
                <option value="stock_issue">📤 เบิกสต๊อก</option>
                <option value="inventory_check">🔍 ตรวจสต็อก</option>
                <option value="preparation">📋 เตรียมสินค้า</option>
                <option value="other">📝 อื่นๆ</option>
              </select>
            </div>
          </div>

          {/* Row 2: มอบหมายให้ + ลำดับความสำคัญ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">มอบหมายให้ *</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">-- เลือกพนักงาน --</option>
                {/* users โหลดมาจาก TaskManagementPage ผ่าน props */}
                {users.map((user) => {
                  const displayName = user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username;
                  return (
                    <option key={user.id} value={user.id}>
                      {displayName} ({getUserRole(user)})
                    </option>
                  );
                })}
              </select>
              {users.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ ไม่พบพนักงาน กรุณาเพิ่มพนักงานก่อน</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ลำดับความสำคัญ</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "low",    label: "ต่ำ",  color: "border-green-500  bg-green-50  text-green-700",  dot: "bg-green-500"  },
                  { value: "medium", label: "ปกติ", color: "border-yellow-500 bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
                  { value: "high",   label: "สูง",  color: "border-red-500    bg-red-50    text-red-700",    dot: "bg-red-500"    },
                  { value: "urgent", label: "ด่วน", color: "border-purple-500 bg-purple-50 text-purple-700", dot: "bg-purple-500" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-1.5 ${
                      formData.priority === p.value
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
          </div>

          {/* Row 3: วันกำหนด + จำนวนเป้าหมาย */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันกำหนด *</label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเป้าหมาย</label>
              <input
                type="number"
                value={formData.target_quantity}
                onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                placeholder="เช่น 50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Row 4: รายละเอียด */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="อธิบายรายละเอียดงาน..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Footer ปุ่ม ยกเลิก / สร้างงาน */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังบันทึก...
                </>
              ) : "สร้างงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}