'use client';

import { useTheme } from '@/app/ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/StyledComponents';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="secondary"
      size="sm"
      className="p-2"
      aria-label={theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600" />
      )}
    </Button>
  );
} 