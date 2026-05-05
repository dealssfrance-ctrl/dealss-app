import { PresenceInfo, PresenceStatus } from '../services/presenceService';

interface PresenceIndicatorProps {
  presence: PresenceInfo;
  /** Show the textual label next to the dot. */
  showLabel?: boolean;
  /** Pixel size of the dot. */
  size?: number;
  /** Extra class on the wrapper. */
  className?: string;
  /** Extra class on the label text. */
  labelClassName?: string;
}

const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: 'bg-[#22c55e]', // green-500
  recent: 'bg-[#f59e0b]', // amber-500
  away: 'bg-gray-400',
  unknown: 'bg-gray-300',
};

export function PresenceIndicator({
  presence,
  showLabel = false,
  size = 10,
  className = '',
  labelClassName = '',
}: PresenceIndicatorProps) {
  const dotClass = STATUS_COLORS[presence.status];
  const label = presence.label || 'Hors ligne';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={label}
    >
      <span
        aria-hidden="true"
        className={`inline-block rounded-full ring-2 ring-white ${dotClass} ${
          presence.status === 'online' ? 'animate-pulse' : ''
        }`}
        style={{ width: size, height: size }}
      />
      {showLabel && (
        <span className={`text-xs ${labelClassName}`}>{label}</span>
      )}
    </span>
  );
}
