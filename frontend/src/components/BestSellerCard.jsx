// src/components/BestSellerCard.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import './BestSellerCard.css';

const BestSellerCard = ({ limit = 10 }) => {
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customDays, setCustomDays] = useState('');

  useEffect(() => {
    fetchBestSellers();
  }, [selectedPeriod, customDays]);

  const fetchBestSellers = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/best-sellers/top_products/`,
        {
          params: {
            period: selectedPeriod,
            limit: limit
          }
        }
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
      '7days': '7 วัน',
      '30days': '30 วัน'
    };
    return labels[period] || period;
  };

  const handleCustomDaysChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCustomDays(value);
    }
  };

  return (
    <div className="best-seller-card">
      <div className="bsc-header">
        <div className="bsc-title">
          <span className="bsc-icon">🏆</span>
          <h3>สินค้าขายดี</h3>
        </div>
        <div className="bsc-period-filter">
          {/* ✅ Preset buttons - 1, 3, 7, 30 วัน */}
          {['1', '3', '7', '30'].map((days) => (
            <button
              key={days}
              className={`period-btn ${selectedPeriod === `${days}days` ? 'active' : ''}`}
              onClick={() => {
                setSelectedPeriod(`${days}days`);
              }}
            >
              {days} วัน
            </button>
          ))}
          
          {/* Month & Year */}
          {['month', 'year'].map((p) => (
            <button
              key={p}
              className={`period-btn ${selectedPeriod === p ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(p)}
            >
              {getPeriodLabel(p)}
            </button>
          ))}

          {/* All */}
          <button
            className={`period-btn ${selectedPeriod === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('all')}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* ✅ Custom Days Input */}
      <div className="bsc-custom-section">
        <div className="bsc-custom-input">
          <label htmlFor="custom-days">🔍 กำหนดเองจำนวนวัน:</label>
          <div className="input-group">
            <input
              id="custom-days"
              type="number"
              min="1"
              max="365"
              value={customDays}
              onChange={handleCustomDaysChange}
              placeholder="พิมพ์ 2, 5, 10 ..."
              className="custom-input-field"
            />
            <span className="input-suffix">วัน</span>
          </div>
          {customDays && (
            <p className="custom-info">แสดงสินค้าขายดี {customDays} วันที่ผ่านมา</p>
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