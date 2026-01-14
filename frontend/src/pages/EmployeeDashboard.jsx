// src/pages/EmployeeDashboard.jsx
// ✅ ใช้ Tailwind CSS (ไม่ต้องมีไฟล์ .css แยก)
import React, { useEffect, useState } from 'react';
import api from '../api';
import FestivalCalendar from '../components/FestivalCalendar';
import FestivalNoticeCard from '../components/FestivalNoticeCard';

const EmployeeDashboard = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    low_stock_count: 0,
    in_today: 0,
    out_today: 0,
    low_stock_items: [],
  });

  const [tasks, setTasks] = useState({
    pending: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchTasksData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard-stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksData = async () => {
    try {
      const response = await api.get('/tasks/my_tasks/');
      setTasks({
        pending: response.data.pending?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดแดชบอร์ด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          📊 แดชบอร์ด
        </h1>
        <p className="text-gray-500 mt-1">ยินดีต้อนรับเข้า EasyStock</p>
      </div>

      {/* Festival Notice Card */}
      <FestivalNoticeCard />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
              📦
            </div>
            <div>
              <p className="text-blue-100 text-sm">สินค้าทั้งหมด</p>
              <p className="text-3xl font-bold">{stats.total_products}</p>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
              ⚠️
            </div>
            <div>
              <p className="text-amber-100 text-sm">ต่ำกว่า 5 ชิ้น</p>
              <p className="text-3xl font-bold">{stats.low_stock_count}</p>
            </div>
          </div>
        </div>

        {/* Today Issues */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
              📤
            </div>
            <div>
              <p className="text-rose-100 text-sm">เบิกวันนี้</p>
              <p className="text-3xl font-bold">{stats.out_today}</p>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🎯
            </div>
            <div>
              <p className="text-purple-100 text-sm">งานรอดำเนินการ</p>
              <p className="text-3xl font-bold">{tasks.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar + Low Stock Items - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert - Left Side */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <h2 className="text-amber-800 font-bold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              แจ้งเตือนของใกล้หมด
            </h2>
          </div>
          
          <div className="p-4">
            {stats.low_stock_items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">สต็อกทุกรายการเพียงพอ</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {stats.low_stock_items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl"
                  >
                    {item.image_url && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.code}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-red-600">{item.stock}</span>
                      <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Festival Calendar - Right Side */}
        <div className="lg:col-span-2">
          <FestivalCalendar />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;