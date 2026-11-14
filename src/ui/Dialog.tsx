import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Dialog({ open, onOpenChange, title, kicker, description, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  kicker: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="dialog-overlay" />
        <D.Content className="dialog">
          <div className="dialog-top">
            <span className="micro">{kicker}</span>
            <D.Close className="icon-button" aria-label="Close">
              <X size={18} />
            </D.Close>
          </div>
          <D.Title className="dialog-title">{title}</D.Title>
          <D.Description className={description ? 'dialog-lead' : 'sr-only'}>
            {description ?? title}
          </D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
