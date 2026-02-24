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


  const fetchUsers = async () => {
    try {
      const response = await api.get("/auth/users/");
      
      let userData = [];
      
      if (response.data && Array.isArray(response.data.users)) {
        userData = response.data.users;
      } else if (Array.isArray(response.data)) {
        userData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        userData = response.data.results;
      }
      
      const employees = userData.filter(u => !u.is_superuser);
      setUsers(employees);
      
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  const getUserRole = (user) => {
    if (user.is_superuser) return 'ผู้ดูแลระบบ';
    return 'พนักงาน';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assigned_to || !formData.due_date) {
      alert("กรุณากรอกข้อมูลที่จำเป็น: ชื่องาน, มอบหมายให้, วันกำหนด");
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        title: formData.title,
        description: formData.description || "",
        task_type: formData.task_type,
        assigned_to: parseInt(formData.assigned_to),
        priority: formData.priority,
        due_date: formData.due_date,
      };
      
      if (formData.target_quantity) {
        submitData.target_quantity = parseInt(formData.target_quantity);
      }
      
      if (editingId) {
        await api.patch(`/tasks/${editingId}/`, submitData);
        alert("อัปเดตงานเสร็จแล้ว");
      } else {
        await api.post("/tasks/", submitData);
        alert("สร้างงานเสร็จแล้ว");
      }

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
      alert("เกิดข้อผิดพลาด: " + JSON.stringify(err.response?.data || err.message));
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
      'pending': 'bg-amber-100 text-amber-800 border border-amber-200',
      'in_progress': 'bg-blue-100 text-blue-800 border border-blue-200',
      'completed': 'bg-green-100 text-green-800 border border-green-200',
      'cancelled': 'bg-gray-100 text-gray-600 border border-gray-200'
    };
    return colors[status] || 'bg-gray-100';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'รอดำเนินการ',
      'in_progress': 'กำลังทำ',
      'completed': 'เสร็จ',
      'cancelled': 'ยกเลิก'
    };
    return labels[status] || status;
  };

  const getPriorityStyle = (priority) => {
    const styles = {
      'low': 'bg-green-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-red-500',
      'urgent': 'bg-purple-600'
    };
    return styles[priority] || 'bg-gray-400';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'ต่ำ',
      'medium': 'ปกติ',
      'high': 'สูง',
      'urgent': 'ด่วน'
    };
    return labels[priority] || priority;
  };

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

  const getTaskTypeIcon = (taskType) => {
    const icons = {
      'stock_replenishment': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      'stock_issue': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      'inventory_check': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      'preparation': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      'other': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    };
    return icons[taskType] || icons['other'];
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {showForm ? "ปิดฟอร์ม" : "สร้างงาน"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">{editingId ? "แก้ไขงาน" : "สร้างงานใหม่"}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เช่น เติมสินค้าสำหรับเทศกาล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="stock_replenishment">🎁 เติมสินค้า</option>
                  <option value="stock_issue">📤 เบิกสต๊อก</option>
                  <option value="inventory_check">🔍 ตรวจสต็อก</option>
                  <option value="preparation">📋 เตรียมสินค้า</option>
                  <option value="other">📝 อื่นๆ</option>
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">มอบหมายให้ *</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- เลือกพนักงาน --</option>
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
                  <p className="text-xs text-amber-600 mt-1">⚠️ ไม่พบพนักงาน - กรุณาเพิ่มพนักงานในระบบก่อน</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ลำดับความสำคัญ</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'low', label: 'ต่ำ', color: 'border-green-500 bg-green-50 text-green-700', dotColor: 'bg-green-500' },
                    { value: 'medium', label: 'ปกติ', color: 'border-yellow-500 bg-yellow-50 text-yellow-700', dotColor: 'bg-yellow-500' },
                    { value: 'high', label: 'สูง', color: 'border-red-500 bg-red-50 text-red-700', dotColor: 'bg-red-500' },
                    { value: 'urgent', label: 'ด่วน', color: 'border-purple-500 bg-purple-50 text-purple-700', dotColor: 'bg-purple-500' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.value })}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.priority === p.value 
                          ? p.color + ' ring-2 ring-offset-1' 
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${p.dotColor}`}></span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันกำหนด *</label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเป้าหมาย</label>
                <input
                  type="number"
                  value={formData.target_quantity}
                  onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เช่น 50"
                />
              </div>
            </div>

            {/* Row 4 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="อธิบายรายละเอียดงาน..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? "กำลังบันทึก..." : (editingId ? "อัปเดต" : "สร้างงาน")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'ทั้งหมด', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
          { key: 'pending', label: 'รอดำเนินการ', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { key: 'in_progress', label: 'กำลังทำ', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
          { key: 'completed', label: 'เสร็จแล้ว', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === item.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500">ไม่มีงาน</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {getTaskTypeIcon(task.task_type)}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 ml-11">{task.description}</p>
                  )}
                </div>
                {/* Priority Indicator */}
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getPriorityStyle(task.priority)}`}></span>
                  <span className="text-xs text-gray-500">{getPriorityLabel(task.priority)}</span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-gray-100 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">มอบหมายให้</p>
                  <p className="font-medium text-gray-800">{getUserName(task.assigned_to)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">ประเภท</p>
                  <p className="font-medium text-gray-800">{getTaskTypeLabel(task.task_type)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">กำหนด</p>
                  <p className="font-medium text-gray-800">
                    {new Date(task.due_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                {task.target_quantity && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">เป้าหมาย</p>
                    <p className="font-medium text-gray-800">{task.target_quantity}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(task)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}