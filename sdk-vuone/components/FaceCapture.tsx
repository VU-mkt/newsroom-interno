'use client';
import { useRef, useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';

interface FaceCaptureProps {
  onCapture: (selfie: string, analysisSelfie: string) => void;
  captured: boolean;
}

const TARGET_W = 600;
const TARGET_H = 720;
const TARGET_ASPECT = TARGET_W / TARGET_H;
const MAX_ANALYSIS_PX = 4_000_000; // cap analysisSelfie at 4MP

export default function FaceCapture({ onCapture, captured }: FaceCaptureProps) {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      setStreaming(true);
    } catch {
      alert(t('face.camera_error'));
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const nativeW = video.videoWidth;
    const nativeH = video.videoHeight;

    // 1. HD image for analysisSelfieList (native resolution, capped at 4MP)
    const scale = Math.min(1, Math.sqrt(MAX_ANALYSIS_PX / (nativeW * nativeH)));
    const analysisW = Math.round(nativeW * scale);
    const analysisH = Math.round(nativeH * scale);
    canvas.width = analysisW;
    canvas.height = analysisH;
    ctx.drawImage(video, 0, 0, analysisW, analysisH);
    const analysisSelfie = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

    // 2. 600x720 center-crop for selfieList
    const videoAspect = nativeW / nativeH;
    let sx = 0, sy = 0, sw = nativeW, sh = nativeH;
    if (videoAspect > TARGET_ASPECT) {
      sw = nativeH * TARGET_ASPECT;
      sx = (nativeW - sw) / 2;
    } else {
      sh = nativeW / TARGET_ASPECT;
      sy = (nativeH - sh) / 2;
    }
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const selfie = dataUrl.split(',')[1];

    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setStreaming(false);
    setPreview(dataUrl);
    onCapture(selfie, analysisSelfie);
  };

  const retake = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setStreaming(false);
    setPreview(null);
    onCapture('', '');
  };

  return (
    <div className="flex flex-col gap-2">
      {!streaming && !preview && (
        <button
          type="button"
          onClick={startCamera}
          className="text-sm text-orange-500 underline text-left"
        >
          {t('face.open_camera')}
        </button>
      )}
      {streaming && (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} className="w-full rounded-lg bg-black" autoPlay muted playsInline />
          <button
            type="button"
            onClick={capture}
            className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg"
          >
            {t('face.capture')}
          </button>
        </div>
      )}
      {preview && (
        <div className="flex flex-col gap-1">
          <img src={preview} alt="selfie preview" className="w-full rounded-lg" />
          <button type="button" onClick={retake} className="text-xs text-gray-400 underline text-left">
            {t('face.retake')}
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
