import React from 'react';
import { Users, GraduationCap, Laptop, Package } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';

interface AdminStatsSectionProps {
  teachersCount: number;
  studentsCount: number;
  classesCount: number;
  activeRentalsCount: number;
}

export default function AdminStatsSection({
  teachersCount,
  studentsCount,
  classesCount,
  activeRentalsCount
}: AdminStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="총 교사"
        value={`${teachersCount}명`}
        icon={Users}
        color="blue"
      />
      
      <StatsCard
        title="총 학생"
        value={`${studentsCount}명`}
        icon={GraduationCap}
        color="green"
      />
      
      <StatsCard
        title="총 학반"
        value={`${classesCount}개`}
        icon={Laptop}
        color="purple"
      />
      
      <StatsCard
        title="활성 대여"
        value={`${activeRentalsCount}개`}
        icon={Package}
        color="yellow"
      />
    </div>
  );
} 