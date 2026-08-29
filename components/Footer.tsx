import { ChevronUp, ChevronDown, Heart } from 'lucide-react';

import { Enter } from '@/components/icons/enter';
import { Shift } from '@/components/icons/shift';

export default function Footer() {
  // Get version from manifest
  const version = browser.runtime.getManifest().version;

  return (
    <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--muted)] flex-shrink-0">
      {/* Navigation shortcuts */}
      <div className="flex justify-center items-center text-xs text-[var(--muted-foreground)] mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs flex items-center">
              <ChevronUp className="w-3 h-3" />
            </kbd>
            <kbd className="px-1 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs flex items-center">
              <ChevronDown className="w-3 h-3" />
            </kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs flex items-center">
              <Enter className="w-3 h-3" />
            </kbd>
            <span>New tab</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs flex items-center gap-0.5">
              <Shift className="w-3 h-3" />
              <Enter className="w-3 h-3" />
            </kbd>
            <span>Same tab</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs">
              Alt+L
            </kbd>
            <span>Quick access</span>
          </div>
        </div>
      </div>

      {/* Links and Attribution */}
      <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 border-separate">
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 opacity-75">
            <span>v{version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
