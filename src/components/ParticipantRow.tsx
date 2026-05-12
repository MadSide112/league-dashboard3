import React, { useState } from 'react';
import { Participant } from '../types';

interface ParticipantRowProps {
  participant: Participant;
  rank: number;
  onUpdate: (id: string, updates: Partial<Participant>) => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

const ParticipantRow: React.FC<ParticipantRowProps> = ({
  participant,
  rank,
  onUpdate,
  onDelete,
  isAdmin = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(participant.fullName);

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdate(participant.id, { fullName: tempName });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempName(participant.fullName);
    setIsEditing(false);
  };

  const isTop3 = rank <= 3;
  const rankIcons = ['🥇', '🥈', '🥉'];

  const getRankStyles = () => {
    if (rank === 1) return 'border-amber-400/50 bg-gradient-to-r from-neutral-900 via-amber-900/20 to-neutral-900 shadow-[0_0_15px_rgba(251,191,36,0.15)]';
    if (rank === 2) return 'border-slate-400/50 bg-gradient-to-r from-neutral-900 via-slate-800/20 to-neutral-900';
    if (rank === 3) return 'border-orange-600/50 bg-gradient-to-r from-neutral-900 via-orange-900/20 to-neutral-900';
    return 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700';
  };

  const getPointsColor = () => {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-slate-300';
    if (rank === 3) return 'text-orange-500';
    return 'text-amber-100/80';
  };

  if (!isAdmin) {
    return (
      <div className={`mb-4 overflow-hidden rounded-xl border p-5 transition-all duration-300 ${getRankStyles()}`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-5 md:w-3/4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-bold ${
                isTop3 ? 'border-amber-500/50 bg-amber-500/10' : 'border-neutral-700 bg-neutral-800 text-neutral-400'
              }`}
            >
              {isTop3 ? rankIcons[rank - 1] : rank}
            </div>
            <div className="flex-1">
              <h3 className={`text-2xl font-bold tracking-tight ${isTop3 ? 'text-white' : 'text-neutral-200'}`}>
                {participant.fullName}
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(participant.parameters).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="font-medium uppercase tracking-tighter text-neutral-500">{key}:</span>
                    <span className="font-bold text-amber-100/90">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-center md:w-1/4 md:border-l md:border-neutral-800 md:pl-8">
            <div className="text-right">
              <span className={`text-4xl font-black italic tracking-tighter ${getPointsColor()}`}>
                {participant.totalScore}
              </span>
              <span className="ml-2 text-xs font-bold uppercase tracking-widest text-neutral-500">pts</span>
            </div>
            <div className="mt-3 w-full">
              <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                <span>Бонус за выручку</span>
                <span className="text-neutral-300">+{participant.revenueScore} баллов</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full transition-all duration-1000 ${rank === 1 ? 'bg-amber-500' : 'bg-neutral-600'}`}
                  style={{ width: `${Math.min(100, (participant.revenueScore / Math.max(1, participant.totalScore)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="border-b border-neutral-800 transition-colors hover:bg-neutral-800/50">
      <td className="px-4 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 text-sm font-bold text-neutral-400">
            {rank}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-lg text-green-500 hover:text-green-400">✓</button>
                <button onClick={handleCancel} className="text-lg text-red-500 hover:text-red-400">✗</button>
              </div>
            ) : (
              <div className="group flex items-center">
                <span className="font-medium text-neutral-200">{participant.fullName}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="ml-2 opacity-0 text-neutral-500 hover:text-neutral-300 group-hover:opacity-100"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 font-bold text-amber-400">{participant.totalScore}</td>
      <td className="px-4 py-4">
        <button
          onClick={() => onDelete(participant.id)}
          className="text-xs font-bold uppercase tracking-widest text-red-500/70 transition-colors hover:text-red-500"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

export default ParticipantRow;
