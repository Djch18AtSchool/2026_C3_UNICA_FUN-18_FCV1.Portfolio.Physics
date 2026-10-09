import type { ReactNode } from 'react';

export interface ControlPanelProps {
  title: string;
  onReset: () => void;
  children: ReactNode;
}

export default function ControlPanel({ title, onReset, children }: ControlPanelProps) {
  return (
    <section className="rounded-base border border-border bg-bg-elevated p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="text-base">{title}</h3>
        <button
          type="button"
          onClick={onReset}
          className="min-h-9 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg"
        >
          Restablecer
        </button>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
