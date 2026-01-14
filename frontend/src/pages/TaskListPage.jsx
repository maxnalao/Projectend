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
      'pending': 'bg-amber-100 text-amber-800 border border-amber-200',
      'in_progress': 'bg-blue-100 text-blue-800 border border-blue-200',
      'completed': 'bg-green-100 text-green-800 border border-green-200',
      'cancelled': 'bg-gray-100 text-gray-600 border border-gray-200'
    };
    return colors[status] || 'bg-gray-100';
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

  const getTaskTypeLabel = (taskType) => {
    const labels = {
      'stock_replenishment': 'เติมสินค้า',
      'stock_issue': 'เบิกสต๊อก',
      'inventory_check': 'ตรวจสต็อก',
      'preparation': 'เตรียมสินค้า',
      'other': 'อื่นๆ'
    };
    return labels[taskType] || taskType;
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">งานของฉัน</h1>
          <p className="text-sm text-gray-500">จำนวนงานทั้งหมด: {allTasks.length}</p>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            filter === 'all' 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300'
          }`}
        >
          <p className="text-sm font-medium opacity-80">ทั้งหมด</p>
          <p className="text-2xl font-bold">{allTasks.length}</p>
        </div>
        
        <div 
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            filter === 'pending' 
              ? 'bg-amber-500 text-white border-amber-500' 
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400'
          }`}
        >
          <p className="text-sm font-medium opacity-80">รอดำเนินการ</p>
          <p className="text-2xl font-bold">{tasks.pending.length}</p>
        </div>

        <div 
          onClick={() => setFilter('in_progress')}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            filter === 'in_progress' 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-blue-50 text-blue-800 border-blue-200 hover:border-blue-400'
          }`}
        >
          <p className="text-sm font-medium opacity-80">กำลังทำ</p>
          <p className="text-2xl font-bold">{tasks.in_progress.length}</p>
        </div>

        <div 
          onClick={() => setFilter('completed')}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            filter === 'completed' 
              ? 'bg-green-600 text-white border-green-600' 
              : 'bg-green-50 text-green-800 border-green-200 hover:border-green-400'
          }`}
        >
          <p className="text-sm font-medium opacity-80">เสร็จแล้ว</p>
          <p className="text-2xl font-bold">{tasks.completed.length}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {displayTasks.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500">ไม่มีงาน</p>
          </div>
        ) : (
          displayTasks.map((task) => (
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
                      {task.status_display}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 ml-11">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getPriorityStyle(task.priority)}`}></span>
                  <span className="text-xs text-gray-500">{getPriorityLabel(task.priority)}</span>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-gray-100 text-sm">
                {task.festival_name && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">เทศกาล</p>
                    <p className="font-medium text-gray-800">{task.festival_name}</p>
                  </div>
                )}
                {task.target_quantity && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">เป้าหมาย</p>
                    <p className="font-medium text-gray-800">{task.target_quantity}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs mb-1">กำหนดเมื่อ</p>
                  <p className="font-medium text-gray-800">
                    {new Date(task.due_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                {task.days_until_due !== null && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">คงเหลือ</p>
                    <p className={`font-semibold ${
                      task.days_until_due < 0 ? 'text-red-600' :
                      task.days_until_due <= 2 ? 'text-amber-600' :
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
              <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-100">
                {task.status === 'pending' && (
                  <button
                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เริ่มทำ
                  </button>
                )}
                
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => updateTaskStatus(task.id, 'completed')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    ยกเลิก
                  </button>
                )}
              </div>

              {/* Notes */}
              {task.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
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