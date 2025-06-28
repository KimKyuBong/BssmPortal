"use client";

import React, { useEffect, useState } from "react";
import { broadcastService } from "@/services/broadcastService";
import { BroadcastHistory, PreviewListItem } from "@/types/broadcast";

export default function BroadcastManagementPage() {
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [previews, setPreviews] = useState<PreviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyRes, previewRes] = await Promise.all([
        broadcastService.getAdminHistory(100),
        broadcastService.getAdminPreviews()
      ]);
      if (historyRes.success) setHistory(historyRes.history);
      if (previewRes.success) setPreviews(previewRes.previews);
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = async (previewId: string) => {
    if (playingPreviewId === previewId) {
      setPlayingPreviewId(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      return;
    }
    try {
      setPlayingPreviewId(previewId);
      setAudioUrl(null);
      const detail = await broadcastService.getPreviewDetail(previewId);
      if (detail.success && detail.preview_info.audio_base64) {
        const base64Data = detail.preview_info.audio_base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        alert('오디오 파일이 없습니다.');
        setPlayingPreviewId(null);
      }
    } catch (e) {
      alert('프리뷰 오디오를 불러오지 못했습니다.');
      setPlayingPreviewId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">방송관리 (어드민)</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {loading ? (
          <div>로딩중...</div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-2">방송 이력 전체</h2>
              <div className="bg-white shadow rounded-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>타입</th>
                      <th>내용</th>
                      <th>방송자</th>
                      <th>상태</th>
                      <th>생성일</th>
                      <th>오디오</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td>{item.broadcast_type_display}</td>
                        <td>{item.content}</td>
                        <td>{item.broadcasted_by_username}</td>
                        <td>{item.status_display}</td>
                        <td>{item.created_at}</td>
                        <td>
                          {item.audio_file?.download_url ? (
                            <audio controls src={item.audio_file.download_url} />
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h2 className="text-xl font-semibold mb-2">생성된 프리뷰 전체</h2>
              <div className="bg-white shadow rounded-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>프리뷰ID</th>
                      <th>타입</th>
                      <th>상태</th>
                      <th>생성일</th>
                      <th>예상길이</th>
                      <th>오디오</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((item) => (
                      <tr key={item.preview_id} className="border-t">
                        <td>{item.preview_id}</td>
                        <td>{item.job_type === 'text' ? '텍스트' : '오디오'}</td>
                        <td>{item.status}</td>
                        <td>{item.created_at}</td>
                        <td>{item.estimated_duration}s</td>
                        <td>
                          <button
                            className={`px-2 py-1 rounded ${playingPreviewId === item.preview_id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            onClick={() => handlePlayPreview(item.preview_id)}
                          >
                            {playingPreviewId === item.preview_id ? '정지' : '오디오 재생'}
                          </button>
                          {playingPreviewId === item.preview_id && audioUrl && (
                            <audio controls autoPlay src={audioUrl} onEnded={() => setPlayingPreviewId(null)} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
} 