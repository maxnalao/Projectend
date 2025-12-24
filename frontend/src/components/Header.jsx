// src/components/Header.jsx
export default function Header() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">
              ระบบจัดการคลังสินค้า EasyStock - สำหรับร้านทองศูนย์
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {new Date().toLocaleDateString('th-TH', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}