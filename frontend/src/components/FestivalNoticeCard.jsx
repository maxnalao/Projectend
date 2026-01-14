// src/components/FestivalNoticeCard.jsx
// ✅ ใช้ Tailwind CSS (ไม่ต้องมีไฟล์ .css แยก)
import React, { useEffect, useState } from 'react';
import api from '../api';

const FestivalNoticeCard = () => {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingFestivals();
  }, []);

  const fetchUpcomingFestivals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/festivals/upcoming/');
      setFestivals(response.data.results || []);
    } catch (error) {
      console.error('Error fetching festivals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
          <span>กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  if (festivals.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          📅 เทศกาลที่กำลังมาถึง
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {festivals.map((festival) => (
          <div
            key={festival.id}
            className="relative pl-4 border-l-4 rounded-r-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4"
            style={{ borderLeftColor: festival.color || '#8b5cf6' }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                {festival.icon || '🎉'}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 text-lg">{festival.name}</h4>

                {/* Date */}
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                  <span>📅</span>
                  <span>
                    {new Date(festival.start_date).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {festival.end_date !== festival.start_date && (
                      <> - {new Date(festival.end_date).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</>
                    )}
                  </span>
                </div>

                {/* Countdown */}
                {festival.days_until !== null && (
                  <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                    festival.days_until <= 3 
                      ? 'bg-red-100 text-red-700' 
                      : festival.days_until <= 7 
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <span>⏳</span>
                    <span>
                      {festival.days_until === 0 
                        ? 'วันนี้!' 
                        : festival.days_until === 1 
                        ? 'พรุ่งนี้!' 
                        : `อีก ${festival.days_until} วัน`}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {festival.notes && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2 text-sm text-yellow-800">
                      <span className="flex-shrink-0">⚠️</span>
                      <div>
                        <strong>หมายเหตุ:</strong> {festival.notes}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preparation Tasks */}
                {festival.preparation_tasks_list && festival.preparation_tasks_list.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <div className="flex items-center gap-1 font-medium mb-2">
                        <span>📋</span>
                        <span>ต้องเตรียม:</span>
                      </div>
                      <ul className="space-y-1 ml-5">
                        {festival.preparation_tasks_list.map((task, taskIdx) => (
                          <li key={taskIdx} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FestivalNoticeCard;