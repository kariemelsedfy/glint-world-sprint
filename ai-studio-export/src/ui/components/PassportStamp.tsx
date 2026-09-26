import React from 'react';

interface PassportStampProps {
  label: string;
  sublabel?: string;
  variant?: 'gold' | 'red' | 'teal' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function PassportStamp({
  label,
  sublabel,
  variant = 'teal',
  size = 'md',
  animated = false,
  className = '',
}: PassportStampProps) {
  const colorMap = {
    gold: 'border-[#B45309] text-[#B45309] bg-[#FFC857]/15',
    red: 'border-[#DC2626] text-[#DC2626] bg-[#DC2626]/10',
    teal: 'border-[#0D7D78] text-[#0D7D78] bg-[#19A7A0]/15',
    navy: 'border-[#12253B] text-[#12253B] bg-[#12253B]/10',
  };

  const sizeMap = {
    sm: 'px-2 py-0.5 text-[10px] border-[1.5px] rounded-md tracking-wider',
    md: 'px-3.5 py-1.5 text-xs border-2 rounded-lg tracking-widest',
    lg: 'px-5 py-2.5 text-base border-[2.5px] rounded-xl tracking-widest',
  };

  return (
    <div
      className={`inline-flex flex-col items-center justify-center font-black uppercase select-none transition-transform ${
        colorMap[variant]
      } ${sizeMap[size]} ${
        animated ? 'animate-stamp-slam' : '-rotate-3 hover:rotate-0'
      } ${className}`}
      style={{
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
      }}
    >
      <div className="flex items-center gap-1 leading-none font-extrabold">
        <span>★</span>
        <span>{label}</span>
        <span>★</span>
      </div>
      {sublabel && (
        <span className="text-[9px] font-bold opacity-80 mt-0.5 tracking-normal lowercase first-letter:uppercase">
          {sublabel}
        </span>
      )}
    </div>
  );
}
