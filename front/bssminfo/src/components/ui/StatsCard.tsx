import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  className = ''
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      icon: 'text-blue-500',
      value: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      icon: 'text-green-500',
      value: 'text-green-600 dark:text-green-400'
    },
    red: {
      icon: 'text-red-500',
      value: 'text-red-600 dark:text-red-400'
    },
    yellow: {
      icon: 'text-yellow-500',
      value: 'text-yellow-600 dark:text-yellow-400'
    },
    purple: {
      icon: 'text-purple-500',
      value: 'text-purple-600 dark:text-purple-400'
    },
    gray: {
      icon: 'text-gray-500',
      value: 'text-gray-600 dark:text-gray-400'
    }
  };

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-secondary mb-2">{title}</h3>
          <p className={`text-2xl font-bold ${colorClasses[color].value}`}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700`}>
            <Icon className={`w-6 h-6 ${colorClasses[color].icon}`} />
          </div>
        )}
      </div>
    </div>
  );
} 