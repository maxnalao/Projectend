// src/components/EditCustomEventModal.jsx
// ✅ Modal สำหรับแก้ไข Custom Event
import React, { useState, useEffect } from 'react';
import api from '../api';

const EditCustomEventModal = ({ event, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'stock_check',
    priority: 'medium',
    date: '',
    notes: '',
    is_shared: false
  });

  const [loading, setLoading] = useState(false);

  // ✅ Event Type Options
  const EVENT_TYPES = [
    { value: 'stock_check', label: '📋 ตรวจนับสต็อก' },
    { value: 'stock_order', label: '🛒 สั่งซื้อสินค้า' },
    { value: 'delivery', label: '🚚 รับ/ส่งสินค้า' },
    { value: 'meeting', label: '👥 ประชุม/นัดหมาย' },
    { value: 'other', label: '📝 อื่นๆ' }
  ];

  // ✅ Priority Options
  const PRIORITY_OPTIONS = [
    { value: 'low', label: 'ต่ำ', color: 'green' },
    { value: 'medium', label: 'ปกติ', color: 'yellow' },
    { value: 'high', label: 'สูง', color: 'red' },
    { value: 'urgent', label: 'ด่วน', color: 'purple' }
  ];

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        event_type: event.event_type || 'stock_check',
        priority: event.priority || 'medium',
        date: event.date || '',
        notes: event.notes || '',
        is_shared: event.is_shared || false
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/custom-events/${event.id}/`, formData);
      alert('แก้ไขงานสำเร็จ!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`ต้องการลบงาน "${event.title}" ใช่หรือไม่?`)) return;

    setLoading(true);
    try {
      await api.delete(`/custom-events/${event.id}/`);
      alert('ลบงานสำเร็จ!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === formData.priority);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${
          selectedPriority?.color === 'red' ? 'from-red-500 to-rose-500' :
          selectedPriority?.color === 'yellow' ? 'from-yellow-400 to-amber-500' :
          selectedPriority?.color === 'purple' ? 'from-purple-500 to-indigo-500' :
          'from-green-500 to-emerald-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-md flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">แก้ไขงาน</h2>
                <p className="text-white/80 text-sm">อัปเดตข้อมูลงาน/บันทึก</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 ชื่องาน
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="ระบุชื่องาน..."
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏷️ ประเภทงาน
            </label>
            <select
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              {EVENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🚨 ความสำคัญ
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map(priority => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    formData.priority === priority.value
                      ? `border-${priority.color}-500 bg-${priority.color}-50 ring-2 ring-${priority.color}-200`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full bg-${priority.color}-500`}></span>
                    <span className={`font-semibold text-sm ${
                      formData.priority === priority.value ? `text-${priority.color}-700` : 'text-gray-600'
                    }`}>
                      {priority.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 วันที่
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              💬 รายละเอียด
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              placeholder="เพิ่มรายละเอียดเพิ่มเติม..."
            />
          </div>

          {/* Is Shared */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_shared"
                checked={formData.is_shared}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-gray-800">🔄 แชร์ให้ทุกคน</span>
                <p className="text-sm text-gray-600">พนักงานจะสามารถเห็นงานนี้ได้</p>
              </div>
            </label>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span><strong>สร้างโดย:</strong> {event.created_by_name || 'ไม่ระบุ'}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t">
            {/* Delete */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ลบ
            </button>

            <div className="flex-1"></div>

            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-sm font-semibold"
            >
              ปิด
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  บันทึก
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomEventModal;