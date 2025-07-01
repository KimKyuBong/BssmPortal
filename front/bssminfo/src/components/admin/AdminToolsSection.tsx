import React from 'react';
import { Download, Upload } from 'lucide-react';
import { Card, Button } from '@/components/ui/StyledComponents';

interface AdminToolsSectionProps {
  onDownloadTemplate: () => void;
  onExportToExcel: () => void;
}

export default function AdminToolsSection({
  onDownloadTemplate,
  onExportToExcel
}: AdminToolsSectionProps) {
  return (
    <Card className="mb-8">
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={onDownloadTemplate}
          variant="secondary"
          className="flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          템플릿 다운로드
        </Button>
        <Button
          onClick={onExportToExcel}
          variant="success"
          className="flex items-center"
        >
          <Upload className="h-4 w-4 mr-2" />
          엑셀 내보내기
        </Button>
      </div>
    </Card>
  );
} 