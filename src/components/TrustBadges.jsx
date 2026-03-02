"use client";

const TrustBadges = ({ variant = 'default' }) => {
  if (variant === 'footer') {
    return (
      <div className="flex flex-wrap justify-center gap-6 mt-8 pt-4 border-t border-solana-purple/20">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <span className="text-solana-green">✓</span> Audited by CertiK
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <span className="text-solana-purple">●</span> Solana Trust
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <span className="text-yellow-400">★</span> 50K+ Users
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <span className="text-solana-green">🔒</span> NCC Group Audit
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center gap-6 mt-6">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <span className="text-solana-green">✓</span> CertiK Audited
      </span>
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <span className="text-solana-purple">●</span> Solana Trust
      </span>
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <span className="text-yellow-400">★</span> 50K+ Users
      </span>
    </div>
  );
};

export default TrustBadges;
