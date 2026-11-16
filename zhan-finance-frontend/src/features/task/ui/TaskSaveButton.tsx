import React from 'react';
import { Save, Loader2, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface TaskSaveButtonProps {
  changesCount: number;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function TaskSaveButton({ changesCount, onSave, onCancel, isSaving }: TaskSaveButtonProps) {
  if (changesCount === 0 && !isSaving) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-gray-900 text-white rounded-full shadow-xl pl-6 pr-2 py-2 flex items-center gap-4">
        <span className="text-sm font-medium">
          Unsaved changes: {changesCount}
        </span>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 text-gray-300 hover:text-white"
            title="Cancel changes"
          >
            <X size={18} />
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={twMerge(
              "flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-full font-medium text-sm transition-colors",
              !isSaving && "hover:bg-brand-accent",
              isSaving && "opacity-80 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
