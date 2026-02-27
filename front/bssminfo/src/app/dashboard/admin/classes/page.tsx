'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Heading, Text, Button, Spinner, Modal, Input } from '@/components/ui/StyledComponents';
import { useToastContext } from '@/contexts/ToastContext';
import AdminPermissionGuard from '@/components/admin/AdminPermissionGuard';
import { userService } from '@/services/userService';
import adminService from '@/services/admin';
import { ClipboardPaste, Upload, RefreshCw, Edit, GraduationCap } from 'lucide-react';
import type { Class } from '@/services/userService';

interface ClassWithCount extends Class {
  student_count?: number;
}

type BlockData = { grade: string; classNum: string; number: string; name: string; email: string };
const emptyBlock = (): BlockData => ({ grade: '', classNum: '', number: '', name: '', email: '' });

export default function ClassManagementPage() {
  const { showSuccess, showError } = useToastContext();
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithCount | null>(null);
  const [editGrade, setEditGrade] = useState(1);
  const [editClassNumber, setEditClassNumber] = useState(1);
  const [editLoading, setEditLoading] = useState(false);
  const [gridRows, setGridRows] = useState<Array<[BlockData, BlockData, BlockData]>>([
    [emptyBlock(), emptyBlock(), emptyBlock()],
  ]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [initialPassword, setInitialPassword] = useState('');
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    success: boolean;
    message?: string;
    created_count: number;
    updated_count: number;
    deleted_count: number;
    error_count: number;
    created: Array<{ row: number; username: string; email: string; name: string; class: string }>;
    updated: Array<{ row: number; username: string; email: string; name: string; class: string }>;
    deleted: Array<{ username: string; email: string; name: string; reason: string }>;
    errors: Array<{ row: number; email: string; code?: string; message: string }>;
    blocked_deletions?: Array<{ username: string; email: string; name: string; rental_count: number; message: string }>;
  } | null>(null);

  const keys: (keyof BlockData)[] = ['grade', 'classNum', 'number', 'name', 'email'];

  const parsedRows = gridRows.flatMap((row) =>
    row.map((block) => {
      const grade = parseInt(block.grade, 10);
      const classNum = parseInt(block.classNum, 10);
      const num = parseInt(block.number, 10);
      return { grade, classNum, number: num, name: block.name || '', email: block.email || '' };
    }).filter((r) => !isNaN(r.grade) && !isNaN(r.classNum) && r.email && r.email.includes('@'))
  );

  const updateCell = (rowIndex: number, blockIndex: number, field: keyof BlockData, value: string) => {
    setGridRows((prev) => {
      const next = prev.map((r) => [r[0] ? { ...r[0] } : emptyBlock(), r[1] ? { ...r[1] } : emptyBlock(), r[2] ? { ...r[2] } : emptyBlock()] as [BlockData, BlockData, BlockData]);
      if (!next[rowIndex]) next[rowIndex] = [emptyBlock(), emptyBlock(), emptyBlock()];
      next[rowIndex][blockIndex] = { ...next[rowIndex][blockIndex], [field]: value };
      return ensureTrailingEmpty(next);
    });
  };

  const ensureTrailingEmpty = (rows: Array<[BlockData, BlockData, BlockData]>): Array<[BlockData, BlockData, BlockData]> => {
    if (rows.length === 0) return [[emptyBlock(), emptyBlock(), emptyBlock()] as [BlockData, BlockData, BlockData]];
    const last = rows[rows.length - 1];
    const lastIsEmpty = last.every((b) => !b.grade && !b.classNum && !b.number && !b.name && !b.email);
    return lastIsEmpty ? rows : ([...rows, [emptyBlock(), emptyBlock(), emptyBlock()] as [BlockData, BlockData, BlockData]] as Array<[BlockData, BlockData, BlockData]>);
  };

  const addRow = () => setGridRows((prev) => ensureTrailingEmpty([...prev, [emptyBlock(), emptyBlock(), emptyBlock()] as [BlockData, BlockData, BlockData]]));
  const removeRow = (index: number) => setGridRows((prev) => {
    const next = prev.filter((_, i) => i !== index) as Array<[BlockData, BlockData, BlockData]>;
    return ensureTrailingEmpty(next.length ? next : []);
  });

  const handleGridPaste = (e: React.ClipboardEvent, rowIndex: number, blockIndex: number) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const maybeHeader = lines[0] || '';
    const isHeader = maybeHeader.includes('학년') || maybeHeader.includes('이메일') || maybeHeader.includes('E-mail');
    const dataLines = isHeader ? lines.slice(1) : lines;
    setGridRows((prev) => {
      let next: Array<[BlockData, BlockData, BlockData]> = prev.map((r) => [r[0] ? { ...r[0] } : emptyBlock(), r[1] ? { ...r[1] } : emptyBlock(), r[2] ? { ...r[2] } : emptyBlock()] as [BlockData, BlockData, BlockData]);
      for (let r = 0; r < dataLines.length; r++) {
        const cols = dataLines[r].split(/\t/).map((c) => c.trim());
        const targetRow = rowIndex + r;
        while (next.length <= targetRow) next.push([emptyBlock(), emptyBlock(), emptyBlock()] as [BlockData, BlockData, BlockData]);
        const block = next[targetRow][blockIndex];
        for (let c = 0; c < Math.min(5, cols.length); c++) {
          (block as Record<string, string>)[keys[c]] = cols[c] ?? '';
        }
      }
      return ensureTrailingEmpty(next);
    });
  };

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getClasses();
      setClasses(Array.isArray(data) ? data : (data as any)?.results || []);
    } catch (error) {
      console.error('학반 목록 조회 실패:', error);
      showError('학반 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleEditClick = (cls: ClassWithCount) => {
    setEditingClass(cls);
    setEditGrade(cls.grade);
    setEditClassNumber(cls.class_number);
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingClass) return;
    setEditLoading(true);
    try {
      await userService.updateClass(editingClass.id, {
        grade: editGrade,
        class_number: editClassNumber,
      });
      showSuccess('학반이 수정되었습니다.');
      setEditModalOpen(false);
      setEditingClass(null);
      await fetchClasses();
    } catch (error) {
      showError(error instanceof Error ? error.message : '학반 수정에 실패했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  const createCsvFile = (): File => {
    const header = '학년,반,번호,이름,E-mail';
    const csvRows = [header, ...parsedRows.map((r) => `${r.grade},${r.classNum},${r.number},"${(r.name || '').replace(/"/g, '""')}",${r.email}`)];
    const csv = '\uFEFF' + csvRows.join('\n');
    return new File([csv], 'class_update.csv', { type: 'text/csv;charset=utf-8' });
  };

  const handleBatchUpload = async () => {
    if (parsedRows.length === 0) {
      showError('붙여넣을 데이터가 없습니다. 학년·반·번호·이름·이메일 순으로 붙여넣어주세요.');
      return;
    }
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const file = createCsvFile();
      const result = await adminService.batchUpdateClasses(file, initialPassword || '');
      if (result.success && result.data) {
        const d = result.data;
        setBatchResult({
          success: true,
          message: result.message,
          created_count: d.created_count ?? 0,
          updated_count: d.updated_count ?? 0,
          deleted_count: d.deleted_count ?? 0,
          error_count: d.error_count ?? 0,
          created: d.created ?? [],
          updated: d.updated ?? [],
          deleted: d.deleted ?? [],
          errors: d.errors ?? [],
          blocked_deletions: d.blocked_deletions,
        });
        setResultModalOpen(true);
        setGridRows([[emptyBlock(), emptyBlock(), emptyBlock()]]);
        await fetchClasses();
        showSuccess(result.message || '학반 일괄 업데이트가 완료되었습니다.');
      } else {
        const d = result.data;
        setBatchResult({
          success: false,
          message: result.message || result.error,
          created_count: d?.created_count ?? 0,
          updated_count: d?.updated_count ?? 0,
          deleted_count: d?.deleted_count ?? 0,
          error_count: d?.error_count ?? 0,
          created: d?.created ?? [],
          updated: d?.updated ?? [],
          deleted: d?.deleted ?? [],
          errors: d?.errors ?? [],
          blocked_deletions: d?.blocked_deletions,
        });
        setResultModalOpen(true);
        showError(result.error || result.message || '학반 일괄 업데이트에 실패했습니다.');
      }
    } catch (error) {
      showError('학반 일괄 업데이트 중 오류가 발생했습니다.');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <AdminPermissionGuard>
      <div className="page-container">
        <div className="page-content">
          <div className="page-header">
            <div>
              <Heading level={1} className="text-xl sm:text-2xl lg:text-3xl flex items-center gap-2">
                <GraduationCap className="h-8 w-8" />
                학반 관리
              </Heading>
              <Text className="page-subtitle text-xs sm:text-sm">
                학반 목록 조회 및 학생 학반 일괄 할당
              </Text>
            </div>
            <Button onClick={fetchClasses} variant="secondary" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          {/* 학반 테이블 */}
          <Card className="mb-6">
            <Heading level={4} className="mb-4">학반 목록</Heading>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">학년</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">반</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">학생 수</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{cls.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{cls.grade}학년</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{cls.class_number}반</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {(cls as ClassWithCount).student_count ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditClick(cls as ClassWithCount)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            수정
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && classes.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                등록된 학반이 없습니다.
              </div>
            )}
          </Card>

          {/* 학반 일괄 업데이트 */}
          <Card className="p-6">
            <Heading level={4} className="mb-4">학반 일괄 업데이트</Heading>
            <div className="space-y-3 mb-4">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                각 학년 블록에 <strong>학년 · 반 · 번호 · 이름 · 이메일</strong> 순으로 붙여넣기(Ctrl+V)하세요.
              </Text>
              <Text className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                ※ 1학년 → 2학년 → 3학년 블록별로 구분되어 있어, 학급별로 편하게 입력·붙여넣기 할 수 있습니다.
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                엑셀/스프레드시트에서 해당 열만 선택 후 복사하면 탭으로 구분되어 붙여넣어집니다. 기존 학생은 학반 수정, 신규 학생은 계정 생성, 목록에 없으면 자퇴 처리됩니다.
              </Text>
            </div>
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-xl border-2 border-gray-300 dark:border-gray-600 shadow-md bg-white dark:bg-gray-800">
                <table className="border-collapse w-full" style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      {[1, 2, 3].map((g) => (
                        <th key={g} colSpan={5} className="border border-gray-300 dark:border-gray-500 px-3 py-2.5 text-center text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 first:rounded-tl-lg">
                          {g}학년
                        </th>
                      ))}
                      <th className="border border-gray-300 dark:border-gray-500 px-1 py-1 w-11 bg-gray-100 dark:bg-gray-700 rounded-tr-lg" />
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      {[1, 2, 3].map((g) => (
                        <React.Fragment key={g}>
                          <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 w-14">학년</th>
                          <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 w-14">반</th>
                          <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 w-12">번호</th>
                          <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[72px]">이름</th>
                          <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">이메일</th>
                        </React.Fragment>
                      ))}
                      <th className="border border-gray-300 dark:border-gray-500" />
                    </tr>
                  </thead>
                  <tbody>
                    {gridRows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50/60 dark:bg-gray-700/20' : ''}>
                        {row.map((block, bi) => (
                          <React.Fragment key={bi}>
                            {keys.map((key, ki) => (
                              <td
                                key={key}
                                className={`border border-gray-300 dark:border-gray-500 p-0 ${bi < 2 ? 'border-r-2 border-r-blue-200 dark:border-r-blue-900' : ''}`}
                              >
                                <input
                                  type="text"
                                  inputMode={key === 'email' ? 'email' : 'text'}
                                  value={block[key]}
                                  onChange={(e) => updateCell(ri, bi, key, e.target.value)}
                                  onPaste={(e) => handleGridPaste(e, ri, bi)}
                                  placeholder={key === 'email' ? 'xxx@bssm.hs.kr' : ki === 0 ? String(bi + 1) : ''}
                                  className="w-full min-w-0 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 bg-transparent border-0 focus:ring-2 focus:ring-blue-400 focus:ring-inset focus:outline-none focus:z-10"
                                />
                              </td>
                            ))}
                          </React.Fragment>
                        ))}
                        <td className="border border-gray-300 dark:border-gray-500 p-0 align-middle text-center bg-gray-50/50 dark:bg-gray-700/30">
                          {gridRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(ri)}
                              className="text-gray-400 hover:text-red-500 p-1.5 text-xs font-medium transition-colors"
                              title="행 삭제"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 border-t-2 border-gray-300 dark:border-gray-600 rounded-b-xl">
                  <Button variant="secondary" size="sm" onClick={addRow}>
                    + 행 추가
                  </Button>
                  {parsedRows.length > 0 && (
                    <span className="text-sm text-green-600 dark:text-green-500 font-semibold">
                      {parsedRows.length}명
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    신규 계정 초기 비밀번호 (8자 이상) <span className="text-gray-400 font-normal">— 신규 학생 있을 때만</span>
                  </label>
                  <input
                    type="password"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="신규 학생이 있으면 입력"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <Button
                  onClick={handleBatchUpload}
                  disabled={parsedRows.length === 0 || batchLoading}
                  variant="primary"
                  className="flex items-center"
                >
                  {batchLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <ClipboardPaste className="h-4 w-4 mr-2" />
                      학반 일괄 업데이트
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 일괄 업데이트 결과 모달 */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => { setResultModalOpen(false); setBatchResult(null); }}
        size="lg"
      >
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <Heading level={3} className="mb-4">
            학반 일괄 업데이트 결과
          </Heading>
          {batchResult && (
            <div className="space-y-4">
              {/* 요약 */}
              <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-sm">
                  <strong className="text-green-600 dark:text-green-400">생성:</strong> {batchResult.created_count}명
                </span>
                <span className="text-sm">
                  <strong className="text-blue-600 dark:text-blue-400">업데이트:</strong> {batchResult.updated_count}명
                </span>
                <span className="text-sm">
                  <strong className="text-amber-600 dark:text-amber-400">삭제(자퇴):</strong> {batchResult.deleted_count}명
                </span>
                <span className="text-sm">
                  <strong className="text-red-600 dark:text-red-400">오류:</strong> {batchResult.error_count}건
                </span>
              </div>

              {/* 장비 미반납 안내 */}
              {batchResult.blocked_deletions && batchResult.blocked_deletions.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <Heading level={4} className="text-red-700 dark:text-red-400 mb-2">장비 미반납</Heading>
                  <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                    {batchResult.blocked_deletions.map((b, i) => (
                      <li key={i}>{b.username} ({b.email}): {b.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 상세 목록 */}
              <div className="space-y-4">
                {batchResult.created.length > 0 && (
                  <div>
                    <Heading level={4} className="mb-2 text-green-600 dark:text-green-400">생성된 계정</Heading>
                    <div className="max-h-32 overflow-y-auto rounded border dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">행</th>
                            <th className="px-3 py-2 text-left">아이디</th>
                            <th className="px-3 py-2 text-left">이메일</th>
                            <th className="px-3 py-2 text-left">이름</th>
                            <th className="px-3 py-2 text-left">학반</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResult.created.map((c, i) => (
                            <tr key={i} className="border-t dark:border-gray-700">
                              <td className="px-3 py-1">{c.row}</td>
                              <td className="px-3 py-1">{c.username}</td>
                              <td className="px-3 py-1">{c.email}</td>
                              <td className="px-3 py-1">{c.name}</td>
                              <td className="px-3 py-1">{c.class}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {batchResult.updated.length > 0 && (
                  <div>
                    <Heading level={4} className="mb-2 text-blue-600 dark:text-blue-400">업데이트된 학반</Heading>
                    <div className="max-h-32 overflow-y-auto rounded border dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">행</th>
                            <th className="px-3 py-2 text-left">아이디</th>
                            <th className="px-3 py-2 text-left">학반</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResult.updated.map((u, i) => (
                            <tr key={i} className="border-t dark:border-gray-700">
                              <td className="px-3 py-1">{u.row}</td>
                              <td className="px-3 py-1">{u.username}</td>
                              <td className="px-3 py-1">{u.class}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {batchResult.deleted.length > 0 && (
                  <div>
                    <Heading level={4} className="mb-2 text-amber-600 dark:text-amber-400">삭제된 계정(자퇴)</Heading>
                    <div className="max-h-32 overflow-y-auto rounded border dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">아이디</th>
                            <th className="px-3 py-2 text-left">이메일</th>
                            <th className="px-3 py-2 text-left">이름</th>
                            <th className="px-3 py-2 text-left">사유</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResult.deleted.map((d, i) => (
                            <tr key={i} className="border-t dark:border-gray-700">
                              <td className="px-3 py-1">{d.username}</td>
                              <td className="px-3 py-1">{d.email}</td>
                              <td className="px-3 py-1">{d.name}</td>
                              <td className="px-3 py-1">{d.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {batchResult.errors.length > 0 && (
                  <div>
                    <Heading level={4} className="mb-2 text-red-600 dark:text-red-400">오류</Heading>
                    <div className="max-h-32 overflow-y-auto rounded border dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">행</th>
                            <th className="px-3 py-2 text-left">이메일</th>
                            <th className="px-3 py-2 text-left">메시지</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResult.errors.map((e, i) => (
                            <tr key={i} className="border-t dark:border-gray-700">
                              <td className="px-3 py-1">{e.row}</td>
                              <td className="px-3 py-1">{e.email}</td>
                              <td className="px-3 py-1">{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4">
                <Button variant="secondary" onClick={() => { setResultModalOpen(false); setBatchResult(null); }}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 학반 수정 모달 */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} size="md">
        <div className="p-6">
          <Heading level={3} className="mb-4">학반 수정</Heading>
          {editingClass && (
            <div className="space-y-4">
              <Input
                label="학년"
                type="number"
                min={1}
                max={6}
                value={editGrade}
                onChange={(e) => setEditGrade(parseInt(e.target.value) || 1)}
              />
              <Input
                label="반"
                type="number"
                min={1}
                max={10}
                value={editClassNumber}
                onChange={(e) => setEditClassNumber(parseInt(e.target.value) || 1)}
              />
              <div className="flex gap-2 mt-6">
                <Button onClick={handleEditSave} disabled={editLoading}>
                  {editLoading ? '저장 중...' : '저장'}
                </Button>
                <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AdminPermissionGuard>
  );
}
