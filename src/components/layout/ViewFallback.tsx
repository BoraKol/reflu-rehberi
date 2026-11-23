import { memo } from 'react';

export const ViewFallback = memo(function ViewFallback() {
  return (
    <div
      role="status"
      aria-label="Sayfa yükleniyor"
      className="space-y-4 animate-pulse py-4"
    >
      <div className="h-4 w-36 bg-[#DCE7F3] rounded-md" />
      <div className="h-8 w-64 max-w-full bg-[#DCE7F3] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="h-40 bg-white border border-[#DCE7F3] rounded-2xl" />
        <div className="h-40 bg-white border border-[#DCE7F3] rounded-2xl" />
      </div>
    </div>
  );
});
