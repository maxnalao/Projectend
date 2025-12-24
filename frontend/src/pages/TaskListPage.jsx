import { useEffect, useState } from "react";
import api from "../api";

export default function TaskListPage() {
  const [tasks, setTasks] = useState({
    pending: [],
    in_progress: [],
    completed: []
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks/my_tasks/");
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus, notes = "") => {
    try {
      await api.patch(`/tasks/${taskId}/update_status/`, {
        status: newStatus,
        notes: notes
      });
      fetchTasks();
    } catch (err) {
      console.error("Error updating task:", err);
      alert("เกิดข้อผิดพลาด: " + err.response?.data?.error || err.message);
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

  const getTaskTypeIcon = (taskType) => {
    const icons = {
      'stock_replenishment': '🎁',
      'product_listing': '📦',
      'visual_merchandising': '🎨',
      'inventory_check': '🔍',
      'preparation': '📋',
      'purchase_followup': '📞',
      'other': '📝'
    };
    return icons[taskType] || '📋';
  };

  const allTasks = [...tasks.pending, ...tasks.in_progress, ...tasks.completed];
  const displayTasks = filter === 'all' 
    ? allTasks 
    : filter === 'pending' 
    ? tasks.pending 
    : filter === 'in_progress' 
    ? tasks.in_progress 
    : tasks.completed;

  if (loading && allTasks.length === 0) {
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
      <div>
        <h1 className="text-3xl font-bold text-gray-800">📋 งานของฉัน</h1>
        <p className="text-sm text-gray-500 mt-1">จำนวนงานทั้งหมด: {allTasks.length}</p>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
          }`}
        >
          <p className="text-sm font-medium">ทั้งหมด</p>
          <p className="text-2xl font-bold">{allTasks.length}</p>
        </div>
        
        <div 
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${
            filter === 'pending' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800'
          }`}
        >
          <p className="text-sm font-medium">รอดำเนินการ</p>
          <p className="text-2xl font-bold">{tasks.pending.length}</p>
        </div>

        <div 
          onClick={() => setFilter('in_progress')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${
            filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
          }`}
        >
          <p className="text-sm font-medium">กำลังทำ</p>
          <p className="text-2xl font-bold">{tasks.in_progress.length}</p>
        </div>

        <div 
          onClick={() => setFilter('completed')}
          className={`p-4 rounded-lg cursor-pointer transition-all ${
            filter === 'completed' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
          }`}
        >
          <p className="text-sm font-medium">เสร็จแล้ว</p>
          <p className="text-2xl font-bold">{tasks.completed.length}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {displayTasks.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">ไม่มีงาน</p>
          </div>
        ) : (
          displayTasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getTaskTypeIcon(task.task_type)}</span>
                    <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status_display}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl">{getPriorityIcon(task.priority)}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.priority_display}</p>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 py-3 border-y text-sm">
                {task.festival_name && (
                  <div>
                    <p className="text-gray-500">เทศกาล</p>
                    <p className="font-semibold">🎉 {task.festival_name}</p>
                  </div>
                )}
                {task.target_quantity && (
                  <div>
                    <p className="text-gray-500">เป้าหมาย</p>
                    <p className="font-semibold">{task.target_quantity}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">กำหนดเมื่อ</p>
                  <p className="font-semibold">
                    {new Date(task.due_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                {task.days_until_due !== null && (
                  <div>
                    <p className="text-gray-500">คงเหลือ</p>
                    <p className={`font-semibold ${
                      task.days_until_due < 0 ? 'text-red-600' :
                      task.days_until_due <= 2 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {task.days_until_due < 0 
                        ? `เกินกำหนด ${Math.abs(task.days_until_due)} วัน` 
                        : `${task.days_until_due} วัน`}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {task.status === 'pending' && (
                  <button
                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    เริ่มทำ
                  </button>
                )}
                
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => updateTaskStatus(task.id, 'completed')}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  >
                    ส่งรายงาน
                  </button>
                )}

                {task.status !== 'completed' && (
                  <button
                    onClick={() => {
                      const notes = prompt("เพิ่มหมายเหตุ (ไม่บังคับ):");
                      if (notes !== null) {
                        updateTaskStatus(task.id, 'cancelled', notes);
                      }
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>

              {/* Notes */}
              {task.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <p className="font-semibold text-gray-700 mb-1">หมายเหตุ:</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}