import type { HTMLAttributes } from 'react';

function VisuallyHidden(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      style={{
        position: 'absolute',
        border: 0,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        wordWrap: 'normal',
      }}
      {...props}
    />
  );
}

export { VisuallyHidden };
