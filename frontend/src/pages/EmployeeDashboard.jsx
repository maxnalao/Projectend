// src/pages/EmployeeDashboard.jsx
// ✅ แก้ไข: เพิ่มการแสดงบันทึกของ Admin ใน FestivalCalendar
import React, { useEffect, useState } from 'react';
import api from '../api';
import FestivalCalendarEmployee from '../components/FestivalCalendarEmployee';  // ✅ ใช้ Employee version
import FestivalNoticeCard from '../components/FestivalNoticeCard';

const EmployeeDashboard = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    low_stock_count: 0,
    in_today: 0,
    out_today: 0,
    low_stock_items: [],
    movements: [],
  });

  const [tasks, setTasks] = useState({
    pending: 0,
  });

 
  const [adminEvents, setAdminEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchTasksData();
    fetchAdminEvents(); 
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: dashboardData } = await api.get('/dashboard-stats/');
      
      try {
        const { data: listingsData } = await api.get("/listings/?active=1");
        const listingArr = Array.isArray(listingsData) ? listingsData : (listingsData.results ?? []);
        const totalStock = listingArr.reduce((sum, p) => {
          const qty = parseFloat(p.quantity) || 0;
          return sum + qty;
        }, 0);
        
        setStats({
          ...dashboardData,
          total_products: totalStock  
        });
      } catch {
        setStats(dashboardData);
      }
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

  const fetchAdminEvents = async () => {
    try {
      console.log('🔍 กำลังดึงข้อมูล Admin Events...');
      const response = await api.get('/custom-events/upcoming_shared/');
      console.log('✅ Admin Events ที่ได้:', response.data);
      setAdminEvents(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching admin events:', error);
      setAdminEvents([]);
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
      {/* Header - ไม่มี emoji */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ด</h1>
            <p className="text-gray-500 text-sm">ยินดีต้อนรับเข้า EasyStock</p>
          </div>
        </div>
      </div>

      {/* Festival Notice Card */}
      <FestivalNoticeCard />

      {/* Stats Cards - ไม่มี emoji */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
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
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
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
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
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
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-purple-100 text-sm">งานรอดำเนินการ</p>
              <p className="text-3xl font-bold">{tasks.pending}</p>
            </div>
          </div>
        </div>
      </div>



      {/* Calendar + Recent Movements + Low Stock - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Recent Movements + Low Stock */}
        <div className="flex flex-col gap-3 h-full">
          {/* Recent Stock Movements - อยู่ด้านบน */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
              <h2 className="text-blue-800 font-bold text-base flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                สินค้าเข้า - ออก
              </h2>
              <a href="/history" className="text-blue-600 hover:text-blue-700 text-sm font-bold">
                ดูทั้งหมด
              </a>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto">
              {(!stats.movements || stats.movements.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-gray-400">ยังไม่มีการเคลื่อนไหววันนี้</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">เวลา</th>
                      <th className="px-3 py-2 text-left font-semibold">สินค้า</th>
                      <th className="px-3 py-2 text-center font-semibold">ประเภท</th>
                      <th className="px-3 py-2 text-right font-semibold">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.movements.slice(0, 6).map((mv) => (
<tr key={mv.id} className="hover:bg-gray-50 transition-colors">
  <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
    {mv.date ? new Date(mv.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
  </td>
  <td className="px-3 py-3 font-medium text-gray-700">
    <div className="truncate max-w-[160px] text-xs" title={mv.name}>{mv.name}</div>
  </td>
  <td className="px-3 py-3 text-center whitespace-nowrap">
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${mv.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {mv.type === 'in' ? 'เข้า' : 'ออก'}
    </span>
  </td>
                        <td className={`px-3 py-2.5 text-right font-bold ${
                          mv.type === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {mv.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Low Stock Alert - อยู่ด้านล่าง */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <h2 className="text-amber-800 font-bold text-base flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                แจ้งเตือนของใกล้หมด
              </h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {stats.low_stock_items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-3">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-medium text-green-600">สต็อกทุกรายการเพียงพอ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.low_stock_items.slice(0, 6).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-4 p-3 bg-red-50 border border-red-100 rounded-xl"
                    >
                      <div className="w-12 h-12 rounded-lg bg-white flex-shrink-0 overflow-hidden shadow-sm">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-300">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">รหัส: {item.code}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-red-600">{item.stock}</span>
                        <p className="text-[10px] text-red-400 font-medium">{item.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Festival Calendar - Right Side */}
        {/* ✅ ส่ง adminEvents ไปให้ FestivalCalendarEmployee */}
        <div>
          {console.log('📦 ส่ง adminEvents ไปให้ Calendar:', adminEvents)}
          <FestivalCalendarEmployee adminEvents={adminEvents} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;