import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function TaskManagementPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "other",
    assigned_to: "",
    priority: "medium",
    due_date: "",
    target_quantity: "",
    festival: "",
    products: []
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks/");
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users/");
      // Filter เฉพาะพนักงาน (ไม่ใช่ admin)
      const employees = response.data.filter(u => !u.is_staff && !u.is_superuser);
      setUsers(employees);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.title || !formData.assigned_to || !formData.due_date) {
      alert("กรุณากรอกข้อมูลที่จำเป็น: ชื่องาน, มอบหมายให้, วันกำหนด");
      return;
    }

    try {
      setLoading(true);
      
      if (editingId) {
        // Update
        await api.patch(`/tasks/${editingId}/`, formData);
        alert("อัปเดตงานเสร็จแล้ว");
      } else {
        // Create
        await api.post("/tasks/", formData);
        alert("สร้างงานเสร็จแล้ว");
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        task_type: "other",
        assigned_to: "",
        priority: "medium",
        due_date: "",
        target_quantity: "",
        festival: "",
        products: []
      });
      setEditingId(null);
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      console.error("Error saving task:", err);
      alert("เกิดข้อผิดพลาด: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      assigned_to: task.assigned_to,
      priority: task.priority,
      due_date: task.due_date,
      target_quantity: task.target_quantity || "",
      festival: task.festival || "",
      products: task.products || []
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบงานนี้ใช่หรือไม่?")) return;
    
    try {
      await api.delete(`/tasks/${id}/`);
      alert("ลบงานเสร็จแล้ว");
      fetchTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-orange-100 text-orange-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🔴',
      'urgent': '⚠️'
    };
    return icons[priority] || '📋';
  };

  // ✅ UPDATED - เปลี่ยน task types
  const getTaskTypeLabel = (taskType) => {
    const labels = {
      'stock_replenishment': '🎁 เติมสินค้า',
      'stock_issue': '📤 เบิกสต๊อก',
      'inventory_check': '🔍 ตรวจสต็อก',
      'preparation': '📋 เตรียมสินค้า',
      'other': '📝 อื่นๆ'
    };
    return labels[taskType] || taskType;
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? (user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.username) : `User #${userId}`;
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดงาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📋 จัดการงาน</h1>
          <p className="text-sm text-gray-500 mt-1">จำนวนงานทั้งหมด: {tasks.length}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (editingId) {
              setEditingId(null);
              setFormData({
                title: "",
                description: "",
                task_type: "other",
                assigned_to: "",
                priority: "medium",
                due_date: "",
                target_quantity: "",
                festival: "",
                products: []
              });
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {showForm ? "ปิดฟอร์ม" : "➕ สร้างงาน"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border shadow-md p-6 space-y-4">
          <h2 className="text-xl font-bold">{editingId ? "แก้ไขงาน" : "สร้างงานใหม่"}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: ชื่องาน + ประเภท */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่องาน *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เช่น เติมสินค้าสำหรับเทศกาล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทงาน
                </label>
                {/* ✅ UPDATED - เปลี่ยน options */}
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  มอบหมายให้ *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ลำดับความสำคัญ
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">🟢 ต่ำ</option>
                  <option value="medium">🟡 ปกติ</option>
                  <option value="high">🔴 สูง</option>
                  <option value="urgent">⚠️ ด่วน</option>
                </select>
              </div>
            </div>

            {/* Row 3: วันกำหนด + จำนวน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันกำหนด *
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนเป้าหมาย (ไม่บังคับ)
                </label>
                <input
                  type="number"
                  value={formData.target_quantity}
                  onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เช่น 50"
                />
              </div>
            </div>

            {/* Row 4: รายละเอียด */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รายละเอียด
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                placeholder="อธิบายรายละเอียดงาน..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    title: "",
                    description: "",
                    task_type: "other",
                    assigned_to: "",
                    priority: "medium",
                    due_date: "",
                    target_quantity: "",
                    festival: "",
                    products: []
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : (editingId ? "อัปเดต" : "สร้างงาน")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'in_progress', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? '📋 ทั้งหมด' :
             status === 'pending' ? '⏳ รอดำเนินการ' :
             status === 'in_progress' ? '⚙️ กำลังทำ' :
             '✅ เสร็จแล้ว'}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">ไม่มีงาน</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getTaskTypeLabel(task.task_type).split(' ')[0]}</span>
                    <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status_display}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl">{getPriorityIcon(task.priority)}</p>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 py-3 border-y text-sm">
                <div>
                  <p className="text-gray-500">มอบหมายให้</p>
                  <p className="font-semibold">{getUserName(task.assigned_to)}</p>
                </div>
                <div>
                  <p className="text-gray-500">ประเภท</p>
                  <p className="font-semibold">{getTaskTypeLabel(task.task_type)}</p>
                </div>
                <div>
                  <p className="text-gray-500">กำหนด</p>
                  <p className="font-semibold">
                    {new Date(task.due_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                {task.target_quantity && (
                  <div>
                    <p className="text-gray-500">เป้าหมาย</p>
                    <p className="font-semibold">{task.target_quantity}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(task)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                >
                  ✏️ แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                >
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}