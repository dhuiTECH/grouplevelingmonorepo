import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, XCircle } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
}

interface SkillSearchSelectProps {
  skills: Skill[];
  value: string | null;
  onChange: (skillId: string | null) => void;
  placeholder?: string;
  label?: string;
}

export const SkillSearchSelect: React.FC<SkillSearchSelectProps> = ({
  skills,
  value,
  onChange,
  placeholder = "Select a skill",
  label,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedSkill = useMemo(() => skills.find((s) => s.id === value), [skills, value]);

  const filteredSkills = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    const results = skills.filter((skill) =>
      skill.name.toLowerCase().includes(lowerCaseSearch)
    );
    
    // Always include Basic Attack (NULL) as the first option if it matches or if no search term
    const basicAttackOption = { id: '', name: 'Basic Attack (NULL)' };
    if (searchTerm === '' || basicAttackOption.name.toLowerCase().includes(lowerCaseSearch)) {
      return [basicAttackOption, ...results];
    }

    return results;
  }, [skills, searchTerm]);

  const handleSelect = (skillId: string | null) => {
    onChange(skillId);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        className="flex justify-between items-center w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white cursor-pointer focus:outline-none focus:border-purple-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedSkill?.name || placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-black border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <div className="p-2 border-b border-gray-800 flex items-center">
            <Search size={14} className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search skills..."
              className="flex-1 bg-transparent text-white text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-white ml-2">
                <XCircle size={14} />
              </button>
            )}
          </div>
          <ul className="py-1">
            {filteredSkills.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-500">No skills found.</li>
            ) : (
              filteredSkills.map((skill) => (
                <li
                  key={skill.id || 'null'}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-800 ${
                    value === skill.id ? 'bg-purple-900/40 text-purple-200' : 'text-white'
                  }`}
                  onClick={() => handleSelect(skill.id || null)}
                >
                  {skill.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
