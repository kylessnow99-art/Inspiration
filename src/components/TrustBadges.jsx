"use client";

const TrustBadges = ({ variant = 'default' }) => {
  if (variant === 'footer') {
    return (
      <div className="flex flex-wrap justify-center gap-6 mt-8 pt-4 border-t border-white/10">
        <span className="trust-badge">✅ Audited by CertiK</span>
        <span className="trust-badge">🛡️ Solana Trust</span>
        <span className="trust-badge">⭐ 50K+ Users</span>
        <span className="trust-badge">🔒 NCC Group Audit</span>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center gap-6 mt-6 text-xs text-gray-400">
      <span className="flex items-center gap-1">
        <span className="text-[#14f195]">✓</span> CertiK Audited
      </span>
      <span className="flex items-center gap-1">
        <span className="text-[#9945ff]">●</span> Solana Trust
      </span>
      <span className="flex items-center gap-1">
        <span className="text-yellow-400">★</span> 50K+ Users
      </span>
    </div>
  );
};

export default TrustBadges;
