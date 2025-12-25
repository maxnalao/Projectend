// src/components/BestSellerCard.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import './BestSellerCard.css';

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
      const params = {
        limit: limit
      };

      // ถ้าใช้ custom date range ให้ส่ง start_date และ end_date
      if (useCustomDate && dateRange.startDate && dateRange.endDate) {
        params.start_date = dateRange.startDate;
        params.end_date = dateRange.endDate;
        params.period = 'custom';
      } else {
        params.period = selectedPeriod;
      }

      const response = await api.get(
        `/best-sellers/top_products/`,
        { params }
      );
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
      '1days': '1 วัน',
      '3days': '3 วัน',
      '7days': '7 วัน',
      '30days': '30 วัน'
    };
    return labels[period] || period;
  };

  const handlePeriodClick = (period) => {
    setSelectedPeriod(period);
    setUseCustomDate(false);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
    setUseCustomDate(true);
  };

  const handleClearCustomDate = () => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setUseCustomDate(false);
    setSelectedPeriod('month');
  };

  // ✅ คำนวณเดือน-ปี ที่เลือก
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
    <div className="best-seller-card">
      <div className="bsc-header">
        <div className="bsc-title">
          <span className="bsc-icon">🏆</span>
          <h3>สินค้าขายดี</h3>
        </div>
        <div className="bsc-period-filter">
          {['7days',].map((period) => (
            <button
              key={period}
              className={`period-btn ${selectedPeriod === period && !useCustomDate ? 'active' : ''}`}
              onClick={() => handlePeriodClick(period)}
            >
              {getPeriodLabel(period)}
            </button>
          ))}
          
          {['month', 'year'].map((p) => (
            <button
              key={p}
              className={`period-btn ${selectedPeriod === p && !useCustomDate ? 'active' : ''}`}
              onClick={() => handlePeriodClick(p)}
            >
              {getPeriodLabel(p)}
            </button>
          ))}

          <button
            className={`period-btn ${selectedPeriod === 'all' && !useCustomDate ? 'active' : ''}`}
            onClick={() => handlePeriodClick('all')}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* ✅ Date Range Picker */}
      <div className="bsc-custom-section">
        <div className="bsc-custom-input">
          <label>📅 เลือกช่วงวันที่:</label>
          <div className="date-range-container">
            <div className="date-input-group">
              <label htmlFor="start-date" className="date-label">วันเริ่มต้น:</label>
              <input
                id="start-date"
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="date-input-field"
              />
            </div>

            <div className="date-separator">→</div>

            <div className="date-input-group">
              <label htmlFor="end-date" className="date-label">วันสิ้นสุด:</label>
              <input
                id="end-date"
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="date-input-field"
              />
            </div>

            {useCustomDate && (dateRange.startDate || dateRange.endDate) && (
              <button
                className="clear-date-btn"
                onClick={handleClearCustomDate}
                title="ล้างการเลือก"
              >
                ✕
              </button>
            )}
          </div>

          {useCustomDate && dateRange.startDate && dateRange.endDate && (
            <p className="custom-info">
              📊 แสดงข้อมูล: <strong>{getSelectedDateLabel()}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="bsc-content">
        {loading && (
          <div className="bsc-loading">
            <div className="spinner"></div>
            <p>กำลังโหลด...</p>
          </div>
        )}

        {error && (
          <div className="bsc-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && bestSellers.length === 0 && !error && (
          <div className="bsc-empty">
            <p>ยังไม่มีข้อมูล</p>
          </div>
        )}

        {!loading && bestSellers.length > 0 && (
          <div className="bsc-list">
            {bestSellers.map((item, index) => (
              <div key={index} className="bsc-item">
                <div className="bsc-item-left">
                  <div className="bsc-rank">{item.rank}</div>
                  <div className="bsc-item-info">
                    <h4>{item.product.name}</h4>
                    <p className="bsc-code">{item.product.code}</p>
                  </div>
                </div>
                <div className="bsc-item-right">
                  <div className="bsc-qty">
                    <span className="bsc-qty-value">{item.total_issued}</span>
                    <span className="bsc-qty-label">ชิ้น</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bsc-footer">
        <p className="bsc-updated">
          อัปเดต: {new Date().toLocaleString('th-TH')}
        </p>
      </div>
    </div>
  );
};

export default BestSellerCard;