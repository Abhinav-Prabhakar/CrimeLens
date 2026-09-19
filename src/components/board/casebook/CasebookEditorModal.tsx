'use client';

import React, { useEffect, useRef } from 'react';

export interface CasebookEditorModalProps {
  open: boolean;
  title: string; // e.g. 'Edit sticky note'
  text: string;
  onSave(text: string): void;
  onCancel(): void;
}

export const CasebookEditorModal: React.FC<CasebookEditorModalProps> = ({
  open,
  title,
  text,
  onSave,
  onCancel,
}) => {
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Populate + focus the textarea each time the overlay opens.
  useEffect(() => {
    if (open && textRef.current) {
      textRef.current.value = text;
      textRef.current.focus();
    }
  }, [open, text]);

  // Esc cancels while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <div id="editor" className={open ? 'open' : ''}>
      <div id="editcard">
        <span className="eyebrow" id="edittitle">
          {title}
        </span>
        <textarea
          id="edittext"
          ref={textRef}
          defaultValue={text}
          spellCheck={false}
        />
        <div id="editrow">
          <button className="btn" id="editCancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn primary"
            id="editSave"
            onClick={() => onSave(textRef.current?.value ?? '')}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CasebookEditorModal;
