import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagInput({ value = [], onChange, placeholder = 'Añadir...' }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  const remove = (tag) => onChange(value.filter(t => t !== tag));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent-light rounded-lg text-sm">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="btn-secondary px-3">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
