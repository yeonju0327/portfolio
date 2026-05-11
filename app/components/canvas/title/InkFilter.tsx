import React from 'react';

const InkFilter = React.memo(({ id }: { id: string }) => (
  <filter id={`ink-bleed-${id}`}>
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
    <feDisplacementMap id={`disp-${id}`} in="SourceGraphic" in2="noise" scale="20" xChannelSelector="R" yChannelSelector="G" />
  </filter>
));
InkFilter.displayName = 'InkFilter';

export default InkFilter;