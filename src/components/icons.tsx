import React from 'react';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (size = 20, color = '#F4F5F7', strokeWidth = 2) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function HomeIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

export function WrenchIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
    </Svg>
  );
}

export function WalletIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M21 7H5a2 2 0 0 1 0-4h14v4z" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <Path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </Svg>
  );
}

export function UserIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function CarIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6" />
      <Rect x="1" y="13" width="22" height="7" rx="1.5" />
      <Circle cx="6.5" cy="20" r="1.5" />
      <Circle cx="17.5" cy="20" r="1.5" />
    </Svg>
  );
}

export function DropletIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M12 2s6 7.5 6 12a6 6 0 0 1-12 0c0-4.5 6-12 6-12z" />
    </Svg>
  );
}

export function ClockIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function AlertCircleIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="8" x2="12" y2="12" />
      <Line x1="12" y1="16" x2="12.01" y2="16" />
    </Svg>
  );
}

export function ChevronRightIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

export function ChevronDownIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

export function BluetoothIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
    </Svg>
  );
}

export function BellIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function PlusIcon({ size, color, strokeWidth }: IconProps) {
  const p = base(size, color, strokeWidth);
  return (
    <Svg {...p}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}
