// src/components/BestSellerCard.jsx
// ✅ ใช้ Tailwind CSS (ไม่ต้องมีไฟล์ .css แยก)
import React, { useEffect, useState } from 'react';
import api from '../api';

const BestSellerCard = ({ limit = 10 }) => {
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [useCustomDate, setUseCustomDate] = useState(false);

  useEffect(() => {
    fetchBestSellers();
  }, [selectedPeriod, dateRange, useCustomDate]);

  const fetchBestSellers = async () => {
    try {
      setLoading(true);
      const params = { limit };

      if (useCustomDate && dateRange.startDate && dateRange.endDate) {
        params.start_date = dateRange.startDate;
        params.end_date = dateRange.endDate;
        params.period = 'custom';
      } else {
        params.period = selectedPeriod;
      }

      const response = await api.get('/best-sellers/top_products/', { params });
      setBestSellers(response.data.results || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching best sellers:', err);
      setError('ไม่สามารถโหลดข้อมูลได้');
      setBestSellers([]);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period) => {
    const labels = {
      'all': 'ทั้งหมด',
      'year': 'ปีนี้',
      'month': 'เดือนนี้',
      '7days': '7 วัน',
    };
    return labels[period] || period;
  };

  const handlePeriodClick = (period) => {
    setSelectedPeriod(period);
    setUseCustomDate(false);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    setUseCustomDate(true);
  };

  const handleClearCustomDate = () => {
    setDateRange({ startDate: '', endDate: '' });
    setUseCustomDate(false);
    setSelectedPeriod('month');
  };

  const getSelectedDateLabel = () => {
    if (!dateRange.startDate || !dateRange.endDate) return '';
    
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleString('th-TH', { month: 'short' });
    const endMonth = end.toLocaleString('th-TH', { month: 'short' });
    const startYear = start.getFullYear() + 543;
    const endYear = end.getFullYear() + 543;
    
    if (startMonth === endMonth && startYear === endYear) {
      return `${startDay}-${endDay} ${startMonth} ${startYear}`;
    }
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-white font-bold text-lg">สินค้าขายดี</h3>
          </div>
          
          {/* Period Filter */}
          <div className="flex flex-wrap gap-1">
            {['7days', 'month', 'year', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodClick(period)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedPeriod === period && !useCustomDate
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <span>📅</span>
          <span>เลือกช่วงวันที่:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">วันเริ่มต้น:</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          <span className="text-gray-400">→</span>

          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">วันสิ้นสุด:</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          {useCustomDate && (dateRange.startDate || dateRange.endDate) && (
            <button
              onClick={handleClearCustomDate}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="ล้างการเลือก"
            >
              ✕
            </button>
          )}
        </div>

        {useCustomDate && dateRange.startDate && dateRange.endDate && (
          <p className="mt-2 text-xs text-orange-600">
            📊 แสดงข้อมูล: <strong>{getSelectedDateLabel()}</strong>
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 min-h-[300px]">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">กำลังโหลด...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-red-500">
            <span className="text-3xl mb-2">⚠️</span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && bestSellers.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-2">📦</span>
            <p className="text-sm">ยังไม่มีข้อมูล</p>
          </div>
        )}

        {/* List */}
        {!loading && bestSellers.length > 0 && (
          <div className="space-y-2">
            {bestSellers.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-orange-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    item.rank === 2 ? 'bg-gray-300 text-gray-700' :
                    item.rank === 3 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.rank}
                  </div>
                  
                  {/* Product Info */}
                  <div>
                    <h4 className="font-medium text-gray-800 text-sm">{item.product.name}</h4>
                    <p className="text-xs text-gray-500">{item.product.code}</p>
                  </div>
                </div>
                
                {/* Quantity */}
                <div className="text-right">
                  <span className="text-lg font-bold text-orange-600">{item.total_issued}</span>
                  <span className="text-xs text-gray-500 ml-1">ชิ้น</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          อัปเดต: {new Date().toLocaleString('th-TH')}
        </p>
      </div>
    </div>
  );
};

export default BestSellerCard;