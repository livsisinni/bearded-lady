import { useRef, useEffect } from 'react';

interface EditableProps {
  value: string;
  onCommit: (val: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  readOnly?: boolean;
}

export function Editable({ value, onCommit, className, placeholder, multiline = false, readOnly = false }: EditableProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== (value || '')) {
      ref.current.innerText = value || '';
    }
  }, [value]);

  const commit = () => {
    if (!ref.current) return;
    const text = ref.current.innerText.replace(/ /g, ' ').trimEnd();
    if (text !== (value || '')) onCommit(text);
  };

  if (readOnly) {
    return <div className={className} data-ph={placeholder}>{value}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); ref.current?.blur(); }
        if (e.key === 'Escape') { ref.current!.innerText = value || ''; ref.current?.blur(); }
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
