import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface ReviewVideoPlayerProps {
  videoIdOrUrl?: string;
  videoId?: string;
  mediaId?: string;
  directUrl?: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}

export function ReviewVideoPlayer({
  videoIdOrUrl,
  videoId,
  mediaId,
  directUrl,
  poster,
  autoPlay = true,
  className
}: ReviewVideoPlayerProps) {
  const targetId = videoIdOrUrl || videoId || mediaId || directUrl || '';
  const isDirectUrl =
    targetId.startsWith('data:') ||
    targetId.startsWith('blob:') ||
    targetId.startsWith('http://') ||
    targetId.startsWith('https://');

  const [src, setSrc] = useState<string>(isDirectUrl ? targetId : '');
  const [loading, setLoading] = useState<boolean>(!isDirectUrl && !!targetId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    if (isDirectUrl) {
      setSrc(targetId);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    api
      .getReviewVideoBlobUrl(targetId)
      .then((url: string | null) => {
        if (!active) return;
        if (!url) {
          setError('Không thể tải dữ liệu video');
        } else {
          setSrc(url);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Lỗi tải video');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [targetId, isDirectUrl]);

  if (loading) {
    return (
      <div className={`w-full min-h-[220px] max-h-[75vh] max-w-[90vw] flex flex-col items-center justify-center bg-black/85 rounded-2xl p-6 text-white ${className || ''}`}>
        <div className="w-9 h-9 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-stone-200 font-medium">Đang nạp và ghép dữ liệu video...</span>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`w-full min-h-[180px] flex flex-col items-center justify-center bg-stone-900 rounded-2xl p-6 text-white text-center ${className || ''}`}>
        <p className="text-xs text-stone-300 mb-2">{error || 'Không tìm thấy video'}</p>
        {poster && <img src={poster} alt="" className="max-h-40 object-contain rounded-lg opacity-60" />}
      </div>
    );
  }

  return (
    <video
      src={src}
      poster={poster}
      controls
      autoPlay
      playsInline
      className={className || 'max-h-[75vh] max-w-[90vw] rounded-2xl shadow-2xl bg-black'}
    />
  );
}
