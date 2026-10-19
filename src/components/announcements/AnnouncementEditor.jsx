import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';
import { announcementContentError, documentDOM, documentFromDOM, validDocument } from '../../services/announcementContent';
import '../../styles/announcement-rich-text.css';

const controls = [['bold', 'Bold', Bold], ['italic', 'Italic', Italic], ['insertUnorderedList', 'Bulleted list', List],
  ['insertOrderedList', 'Numbered list', ListOrdered], ['undo', 'Undo', Undo2], ['redo', 'Redo', Redo2]];

export default function AnnouncementEditor({ value, onChange, disabled, submitted = false }) {
  const editor = useRef(null), selection = useRef(null), last = useRef('');
  const [active, setActive] = useState({});
  const [touched, setTouched] = useState(false);
  const error = announcementContentError(value, touched || submitted);
  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized !== last.current && validDocument(value)) {
      editor.current.replaceChildren(documentDOM(value)); last.current = serialized;
    }
  }, [value]);
  useEffect(() => {
    const remember = () => {
      const selected = window.getSelection();
      if (selected?.rangeCount && editor.current?.contains(selected.anchorNode) && editor.current.contains(selected.focusNode)) {
        selection.current = selected.getRangeAt(0).cloneRange();
        setActive(Object.fromEntries(controls.slice(0, 4).map(([command]) => [command, document.queryCommandState(command)])));
      }
    };
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, []);
  const changed = () => {
    // Native Enter can clone a paragraph's attributes; refresh spacing markers.
    for (const block of editor.current.children) {
      if (!block.matches('p, div')) continue;
      if (/^[\r\n]*$/.test(block.textContent)) block.setAttribute('data-empty-paragraph', 'true');
      else block.removeAttribute('data-empty-paragraph');
    }
    const value = documentFromDOM(editor.current);
    // Send invalid size to the form too; never silently save a previous version.
    last.current = JSON.stringify(value); onChange(value);
  };
  const command = (name, argument) => {
    editor.current.focus();
    if (selection.current && editor.current.contains(selection.current.commonAncestorContainer)) {
      const selected = window.getSelection(); selected.removeAllRanges(); selected.addRange(selection.current);
    }
    // Native editing commands retain the browser's selection and undo history.
    document.execCommand(name, false, argument); changed();
  };
  const paste = (event) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const template = document.createElement('template');
    if (html) template.innerHTML = html;
    else template.content.append(document.createTextNode(event.clipboardData.getData('text/plain')));
    const safe = document.createElement('div'); safe.append(documentDOM(documentFromDOM(template.content)));
    command('insertHTML', safe.innerHTML);
  };
  return <div data-invalid={Boolean(error)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setTouched(true); }}
    className="announcement-editor overflow-hidden rounded-xl border border-gray-300 bg-white">
    <div role="toolbar" aria-label="Description formatting" className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
      {controls.map(([name, label, Icon], index) => <button key={name} type="button" aria-label={label} title={label}
        aria-controls="description" aria-pressed={index < 4 ? Boolean(active[name]) : undefined} disabled={disabled}
        onMouseDown={(event) => event.preventDefault()} onClick={() => command(name)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-[#b7192e] disabled:opacity-50 ${active[name] ? 'bg-red-50 text-[#b7192e]' : ''}`}><Icon size={17} /></button>)}
    </div>
    <div ref={editor} id="description" role="textbox" aria-label="Description" aria-multiline="true" aria-required="true" aria-disabled={disabled}
      aria-describedby="description-guidance" aria-invalid={Boolean(error)} contentEditable={!disabled} suppressContentEditableWarning
      onInput={changed} onPaste={paste} onDrop={(event) => event.preventDefault()}
      className="announcement-rich-text min-h-48 max-h-96 overflow-y-auto break-words px-4 py-3 text-sm leading-6 text-gray-800 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic" />
    <p id="description-guidance" className={`px-4 pb-3 text-xs ${error ? 'text-red-700' : 'text-gray-400'}`} role={error ? 'alert' : undefined}>{error || 'Bold, italic, and simple lists. Maximum 10,000 characters.'}</p>
  </div>;
}
