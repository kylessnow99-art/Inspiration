"use client";

const StatsDisplay = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="stat-card">
        <div className="stat-number">
          {stats.distributed.toFixed(2)} SOL
        </div>
        <div className="stat-label">Distributed from pool</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-number">
          {stats.participants.toLocaleString()}
        </div>
        <div className="stat-label">Participants</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-number">
          {(stats.totalPool - stats.distributed).toFixed(2)} SOL
        </div>
        <div className="stat-label">Remaining</div>
      </div>
    </div>
  );
};

export default StatsDisplay;
