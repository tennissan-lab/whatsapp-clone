import React, { useContext } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors duration-200 active:scale-95"
      title="Toggle Theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
