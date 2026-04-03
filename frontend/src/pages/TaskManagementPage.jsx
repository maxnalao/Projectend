// src/pages/TaskManagementPage.jsx
import { useEffect, useState } from "react";
import api from "../api";
import CreateTask from "../components/CreateTask"; // ✅ import component ใหม่

export default function TaskManagementPage() {
  const [tasks, setTasks]   = useState([]);
  const [users, setUsers]   = useState([]);   // รายชื่อพนักงาน ส่งเป็น props ให้ CreateTask
  const [loading, setLoading]     = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // ✅ ควบคุม CreateTask Modal
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");

  // State ฟอร์มแก้ไขงาน (แยกจาก CreateTask)
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "", description: "", task_type: "other",
    assigned_to: "", priority: "medium", due_date: "", target_quantity: "",
  });

  // โหลดงานและพนักงานตอนเปิดหน้า
  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  // ── โหลดรายการงานทั้งหมด ──────────────────────────────
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks/"); // GET /tasks/ → ดึงงานทั้งหมด
      const taskData = Array.isArray(response.data)
        ? response.data
        : (response.data?.results || []);
      setTasks(taskData);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // ── โหลดรายชื่อพนักงานสำหรับ dropdown ────────────────
  const fetchUsers = async () => {
    try {
      const response = await api.get("/auth/users/"); // GET /auth/users/ → ดึงผู้ใช้ทั้งหมด
      let userData = [];
      if (response.data && Array.isArray(response.data.users)) userData = response.data.users;
      else if (Array.isArray(response.data)) userData = response.data;
      else if (response.data?.results) userData = response.data.results;
      setUsers(userData.filter(u => !u.is_superuser)); // กรองเฉพาะพนักงาน
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  // ── แก้ไขงาน ──────────────────────────────────────────
  const handleEdit = (task) => {
    setEditFormData({
      title: task.title, description: task.description,
      task_type: task.task_type, assigned_to: task.assigned_to,
      priority: task.priority, due_date: task.due_date,
      target_quantity: task.target_quantity || "",
    });
    setEditingId(task.id);
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.title || !editFormData.assigned_to || !editFormData.due_date) {
      return alert("กรุณากรอกข้อมูลที่จำเป็น");
    }
    try {
      setLoading(true);
      const submitData = {
        title: editFormData.title,
        description: editFormData.description || "",
        task_type: editFormData.task_type,
        assigned_to: parseInt(editFormData.assigned_to),
        priority: editFormData.priority,
        due_date: editFormData.due_date,
      };
      if (editFormData.target_quantity) submitData.target_quantity = parseInt(editFormData.target_quantity);
      await api.patch(`/tasks/${editingId}/`, submitData); // PATCH /tasks/{id}/ → อัปเดตงาน
      alert("อัปเดตงานเสร็จแล้ว");
      setShowEditForm(false);
      setEditingId(null);
      fetchTasks();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + JSON.stringify(err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── ลบงาน ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบงานนี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/tasks/${id}/`); // DELETE /tasks/{id}/
      alert("ลบงานเสร็จแล้ว");
      fetchTasks();
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  // ── Helper functions ───────────────────────────────────
  const getUserRole  = (user) => user.is_superuser ? "ผู้ดูแลระบบ" : "พนักงาน";
  const getUserName  = (userId) => {
    const u = users.find(u => u.id === userId);
    return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username) : `User #${userId}`;
  };
  const getStatusColor = (s) => ({ pending: "bg-amber-100 text-amber-800", in_progress: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", cancelled: "bg-gray-100 text-gray-600" }[s] || "bg-gray-100");
  const getStatusLabel = (s) => ({ pending: "รอดำเนินการ", in_progress: "กำลังทำ", completed: "เสร็จ", cancelled: "ยกเลิก" }[s] || s);
  const getPriorityDot = (p) => ({ low: "bg-green-500", medium: "bg-yellow-500", high: "bg-red-500", urgent: "bg-purple-600" }[p] || "bg-gray-400");
  const getPriorityLabel = (p) => ({ low: "ต่ำ", medium: "ปกติ", high: "สูง", urgent: "ด่วน" }[p] || p);
  const getTaskTypeLabel = (t) => ({ stock_replenishment: "🎁 เติมสินค้า", stock_issue: "📤 เบิกสต๊อก", inventory_check: "🔍 ตรวจสต็อก", preparation: "📋 เตรียมสินค้า", other: "📝 อื่นๆ" }[t] || t);

  // กรองงานตาม tab ที่เลือก (Client-side)
  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  if (loading && tasks.length === 0) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลดงาน...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">จัดการงาน</h1>
            <p className="text-sm text-gray-500">จำนวนงานทั้งหมด: {tasks.length}</p>
          </div>
        </div>
        {/* ✅ ปุ่มสร้างงาน → เปิด CreateTask Modal */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          สร้างงาน
        </button>
      </div>

      {/* ฟอร์มแก้ไขงาน (inline ในหน้า) */}
      {showEditForm && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">แก้ไขงาน</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน *</label>
                <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน</label>
                <select value={editFormData.task_type} onChange={(e) => setEditFormData({ ...editFormData, task_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="stock_replenishment">🎁 เติมสินค้า</option>
                  <option value="stock_issue">📤 เบิกสต๊อก</option>
                  <option value="inventory_check">🔍 ตรวจสต็อก</option>
                  <option value="preparation">📋 เตรียมสินค้า</option>
                  <option value="other">📝 อื่นๆ</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">มอบหมายให้ *</label>
                <select value={editFormData.assigned_to} onChange={(e) => setEditFormData({ ...editFormData, assigned_to: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- เลือกพนักงาน --</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันกำหนด *</label>
                <input type="datetime-local" value={editFormData.due_date} onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
              <textarea value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowEditForm(false); setEditingId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">ยกเลิก</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">อัปเดต</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all",         label: "ทั้งหมด" },
          { key: "pending",     label: "รอดำเนินการ" },
          { key: "in_progress", label: "กำลังทำ" },
          { key: "completed",   label: "เสร็จแล้ว" },
        ].map((item) => (
          <button key={item.key} onClick={() => setFilter(item.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === item.key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
            {item.label}
          </button>
        ))}
      </div>

      {/* รายการงาน */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-500">ไม่มีงาน</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>{getStatusLabel(task.status)}</span>
                  </div>
                  {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getPriorityDot(task.priority)}`}></span>
                  <span className="text-xs text-gray-500">{getPriorityLabel(task.priority)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-gray-100 text-sm">
                <div><p className="text-gray-500 text-xs mb-1">มอบหมายให้</p><p className="font-medium">{getUserName(task.assigned_to)}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">ประเภท</p><p className="font-medium">{getTaskTypeLabel(task.task_type)}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">กำหนด</p><p className="font-medium">{new Date(task.due_date).toLocaleDateString("th-TH")}</p></div>
                {task.target_quantity && <div><p className="text-gray-500 text-xs mb-1">เป้าหมาย</p><p className="font-medium">{task.target_quantity}</p></div>}
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => handleEdit(task)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-medium">แก้ไข</button>
                <button onClick={() => handleDelete(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium">ลบ</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ✅ CreateTask Modal — แยกออกมาเป็น Component แล้ว */}
      <CreateTask
        open={showCreateModal}
        users={users}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => { setShowCreateModal(false); fetchTasks(); }}
      />
    </div>
  );
}