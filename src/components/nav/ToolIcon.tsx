import type { ReactNode } from 'react';
import { GITHUB_OUTLINE_PATH } from '../ui/githubMark';

export type ToolIconName = 'copy' | 'check' | 'github' | 'external';

/** Line icons drawn like the rest of the site's: 24-unit grid, 1.6 stroke, round ends. */
const SHAPES: Record<ToolIconName, ReactNode> = {
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  github: <path d={GITHUB_OUTLINE_PATH} />,
  external: <path d="M7 17 17 7M8.5 7H17v8.5" />,
};

interface ToolIconProps {
  name: ToolIconName;
  className?: string;
}

/** A decorative icon: the control's text already names it. */
export default function ToolIcon({ name, className = 'size-4' }: ToolIconProps) {
  return (
    <svg
      data-icon={name}
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  );
}
