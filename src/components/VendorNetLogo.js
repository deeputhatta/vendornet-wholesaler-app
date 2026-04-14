import React from 'react';
import Svg, {
  Rect, Circle, Line
} from 'react-native-svg';

export default function VendorNetLogo({ size = 120 }) {
  return (
    <Svg viewBox="0 0 400 400" width={size} height={size}>
      <Rect width="400" height="400" rx="80" fill="#185FA5" />
      <Line x1="87" y1="147" x2="220" y2="147" stroke="white" strokeWidth="1.5" opacity="0.12" />
      <Line x1="200" y1="69" x2="253" y2="330" stroke="white" strokeWidth="1.5" opacity="0.12" />
      <Line x1="67" y1="240" x2="313" y2="227" stroke="white" strokeWidth="1.5" opacity="0.12" />
      <Line x1="87" y1="147" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="200" y1="69" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="313" y1="147" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="340" y1="227" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="253" y1="330" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="147" y1="333" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Line x1="60" y1="240" x2="200" y2="200" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <Circle cx="87" cy="147" r="20" fill="#1D9E75" />
      <Circle cx="200" cy="69" r="16" fill="#F2C94C" />
      <Circle cx="313" cy="147" r="20" fill="#1D9E75" />
      <Circle cx="340" cy="227" r="16" fill="#F2C94C" />
      <Circle cx="253" cy="330" r="18" fill="#1D9E75" />
      <Circle cx="147" cy="333" r="16" fill="#F2C94C" />
      <Circle cx="60" cy="240" r="18" fill="#1D9E75" />
      <Circle cx="200" cy="200" r="62" fill="white" opacity="0.12" />
      <Circle cx="200" cy="200" r="44" fill="white" opacity="0.2" />
      <Circle cx="200" cy="200" r="28" fill="white" />
      <Circle cx="200" cy="200" r="14" fill="#185FA5" />
    </Svg>
  );
}