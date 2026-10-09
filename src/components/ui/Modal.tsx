import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Modal Dialog Primitive (PR-MODAL)
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[1px]">
      <div
        className={`w-full ${widthClasses[maxWidth]} bg-surface border border-line rounded-md shadow-lg overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-line">
          <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {description && <p className="text-xs text-ink-secondary mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
