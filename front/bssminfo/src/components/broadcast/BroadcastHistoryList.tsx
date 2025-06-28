'use client';

import React, { useState } from 'react';
import { BroadcastHistory } from '../../types/broadcast';
import { Clock, User, MapPin, Volume2, MessageSquare, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';

interface BroadcastHistoryListProps {
  history: BroadcastHistory[];
  onRefresh: () => void;
  isAdmin?: boolean;
  currentUser?: string;
}

export default function BroadcastHistoryList({ 
  history, 
  onRefresh, 
  isAdmin = false, 
  currentUser 
}: BroadcastHistoryListProps) {
  const [filter, setFilter] = useState<'all' | 'text' | 'audio'>('all');
  const [reusingHistory, setReusingHistory] = useState<number | null>(null);

  // 교사인 경우 자신의 방송 이력만 필터링
  const filteredHistory = isAdmin 
    ? history.filter(item => filter === 'all' || item.broadcast_type === filter)
    : history.filter(item => 
        item.broadcasted_by_username === currentUser && 
        (filter === 'all' || item.broadcast_type === filter)
      );

  const handleReuseAudio = async (historyId: number) => {
    try {
      setReusingHistory(historyId);
      
      const response = await broadcastService.reuseHistoryAudio(historyId);
      
      if (response.success) {
        alert('방송 이력에서 오디오 파일을 재사용하여 새로운 프리뷰가 생성되었습니다.');
        onRefresh(); // 프리뷰 목록 새로고침
      } else {
        alert('오디오 파일 재사용에 실패했습니다: ' + response.message);
      }
    } catch (error) {
      console.error('오디오 파일 재사용 오류:', error);
      alert('오디오 파일 재사용 중 오류가 발생했습니다.');
    } finally {
      setReusingHistory(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBroadcastTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'audio':
        return <Volume2 className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {isAdmin ? '전체 방송 이력' : '내 방송 이력'}
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'text' | 'audio')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="text">텍스트</option>
            <option value="audio">오디오</option>
          </select>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            새로고침
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {isAdmin ? '방송 이력이 없습니다.' : '내 방송 이력이 없습니다.'}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredHistory.map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getBroadcastTypeIcon(item.broadcast_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.content}
                        </p>
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(item.created_at)}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {item.broadcasted_by_username}
                          </div>
                        )}
                        {item.target_rooms && item.target_rooms.length > 0 && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {item.target_rooms.join(', ')}호
                          </div>
                        )}
                        {item.audio_file && (
                          <div className="flex items-center">
                            <Volume2 className="h-3 w-3 mr-1" />
                            {item.audio_file.original_filename}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status_display}
                    </span>
                    {item.broadcast_type === 'audio' && item.audio_file && (
                      <button
                        onClick={() => handleReuseAudio(item.id)}
                        disabled={reusingHistory === item.id}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reusingHistory === item.id ? (
                          <>
                            <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                            처리중...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            재사용
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 