// src/hooks/useHeartbeat.js
// ✅ Hook สำหรับส่ง Heartbeat ทุก 30 วินาที เพื่ออัพเดทสถานะ Online
import { useEffect, useRef } from 'react';
import api from '../api';

export default function useHeartbeat(interval = 30000) {
  const intervalRef = useRef(null);

  useEffect(() => {
    // ส่ง Heartbeat ครั้งแรก
    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem('access');
        if (token) {
          await api.post('/auth/heartbeat/');
        }
      } catch (error) {
        // Ignore errors - user might be logged out
        console.log('Heartbeat skipped');
      }
    };

    // ส่งทันทีเมื่อ mount
    sendHeartbeat();

    // ตั้ง interval
    intervalRef.current = setInterval(sendHeartbeat, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval]);

  return null;
}