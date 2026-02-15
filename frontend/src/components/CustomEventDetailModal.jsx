// src/components/CustomEventDetailModal.jsx
// ✅ Modal สำหรับแสดงรายละเอียดงาน/บันทึก - แยก UI Admin/Employee
// ✅ รองรับการเปิด EditCustomEventModal
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import EditCustomEventModal from './EditCustomEventModal';

const CustomEventDetailModal = ({ event, onClose, onEdit, onDelete }) => {
  const { user } = useUser();
  const isAdmin = user?.is_staff || user?.is_superuser;
  const [showEditModal, setShowEditModal] = useState(false);

  if (!event) return null;

  // ✅ ข้อมูล Event Types
  const EVENT_TYPES = {
    stock_check: { label: 'ตรวจนับสต็อก', emoji: '📋', color: 'blue' },
    stock_order: { label: 'สั่งซื้อสินค้า', emoji: '🛒', color: 'green' },
    delivery: { label: 'รับ/ส่งสินค้า', emoji: '🚚', color: 'orange' },
    meeting: { label: 'ประชุม/นัดหมาย', emoji: '👥', color: 'indigo' },
    other: { label: 'อื่นๆ', emoji: '📝', color: 'gray' }
  };

  // ✅ ความสำคัญ
  const PRIORITY_CONFIG = {
    low: { 
      label: 'ต่ำ', 
      color: 'bg-green-500', 
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    medium: { 
      label: 'ปกติ', 
      color: 'bg-yellow-500', 
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500'
    },
    high: { 
      label: 'สูง', 
      color: 'bg-red-500', 
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500'
    },
    urgent: { 
      label: 'ด่วน', 
      color: 'bg-purple-500', 
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500'
    }
  };

  const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
  const priority = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.medium;

  // ✅ Handler สำหรับเปิด Edit Modal
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // ✅ Handler เมื่อแก้ไขสำเร็จ
  const handleEditSuccess = () => {
    setShowEditModal(false);
    onClose(); // ปิด Detail Modal
    window.location.reload(); // Reload ข้อมูลใหม่
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header with Priority Color */}
          <div className={`p-6 ${priority.bgColor} border-b-4 ${priority.borderColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Event Type Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl`}>
                    {eventType.emoji}
                  </div>
                  
                  {/* Title */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800">{event.title}</h2>
                    <p className="text-sm text-gray-600 mt-0.5">{eventType.label}</p>
                  </div>

                  {/* Priority Badge */}
                  <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${priority.bgColor} border-2 ${priority.borderColor}`}>
                    <span className={`w-3 h-3 rounded-full ${priority.color}`}></span>
                    <span className={`text-sm font-bold ${priority.textColor}`}>
                      {priority.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="ml-4 p-2 hover:bg-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">วันที่</p>
                <p className="text-sm text-gray-800 font-semibold">
                  {new Date(event.date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Created By */}
            {event.created_by_name && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">สร้างโดย</p>
                  <p className="text-sm text-gray-800 font-semibold">{event.created_by_name}</p>
                </div>
              </div>
            )}

            {/* Sharing Status */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                event.is_shared ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-5 h-5 ${event.is_shared ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">การแชร์</p>
                <p className={`text-sm font-semibold ${event.is_shared ? 'text-green-700' : 'text-gray-600'}`}>
                  {event.is_shared ? '✅ แชร์ให้ทุกคน' : '🔒 ส่วนตัว'}
                </p>
              </div>
            </div>

            {/* Description/Notes */}
            {event.notes && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-semibold mb-1">รายละเอียด</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {event.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between gap-3">
              {/* ✅ Admin: แสดงปุ่มแก้ไข/ลบ */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    แก้ไข
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`ต้องการลบงาน "${event.title}" ใช่หรือไม่?`)) {
                        onDelete?.(event);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    ลบ
                  </button>
                </div>
              )}

              {/* ✅ Employee: แสดงแค่ปุ่มปิด */}
              {!isAdmin && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>งานที่สร้างโดยเจ้าของร้าน</span>
                </div>
              )}

              {/* ปุ่มปิด */}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Edit Modal */}
      {showEditModal && (
        <EditCustomEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};

export default CustomEventDetailModal;