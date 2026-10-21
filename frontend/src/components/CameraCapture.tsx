import { useEffect, useRef, useState } from 'react'
import { Camera, Check, RefreshCw, SwitchCamera, VideoOff, X } from 'lucide-react'

interface Props {
  onCapture: (file: File, previewUrl: string) => void
  onCancel: () => void
}

export default function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Start media stream
  async function startCamera(facing: 'environment' | 'user') {
    setError(null)
    setLoading(true)

    // Stop existing stream tracks first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported by this browser. Please upload an image file instead.')
      setLoading(false)
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setLoading(false)
    } catch (err: unknown) {
      setLoading(false)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission was denied. Please allow camera permissions in your browser or choose an image file.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera device was found on this system. Please use the file upload option.')
        } else {
          setError(`Unable to access camera (${err.message}). Try uploading an image file.`)
        }
      } else {
        setError('Camera unavailable. Please upload an image file.')
      }
    }
  }

  useEffect(() => {
    startCamera(facingMode)

    return () => {
      // Clean up camera stream on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount guarantee
  useEffect(() => {
    const videoNode = videoRef.current
    return () => {
      if (videoNode && videoNode.srcObject) {
        const currentStream = videoNode.srcObject as MediaStream
        currentStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  function takeSnapshot() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedPreview(dataUrl)

    // Convert dataURL to File
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `wound-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setCapturedFile(file)
      }
    }, 'image/jpeg', 0.92)

    // Pause video playback
    video.pause()
  }

  function retake() {
    setCapturedPreview(null)
    setCapturedFile(null)
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  function confirmCapture() {
    if (capturedFile && capturedPreview) {
      // Stop stream tracks
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      onCapture(capturedFile, capturedPreview)
    }
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-modal-title">
      <div className="camera-modal">
        <div className="camera-header">
          <div className="camera-title-wrap">
            <Camera size={19} className="text-teal" />
            <h3 id="camera-modal-title">Clinical Photo Capture</h3>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close camera">
            <X size={18} />
          </button>
        </div>

        <p className="camera-guide-note">
          Position the wound in the center with good, uniform lighting. Include a scale calibration marker if physical area calculation is desired. <em>Photograph analysis only — no continuous video scanning.</em>
        </p>

        {error ? (
          <div className="camera-error-box">
            <VideoOff size={32} />
            <strong>Camera Unavailable</strong>
            <p>{error}</p>
            <div className="camera-error-actions">
              <button type="button" className="secondary-button" onClick={() => startCamera(facingMode)}>
                <RefreshCw size={14} /> Retry Permission
              </button>
              <button type="button" className="primary-button" onClick={onCancel}>
                Use File Upload Instead
              </button>
            </div>
          </div>
        ) : (
          <div className="camera-viewfinder">
            {loading && (
              <div className="camera-loading-overlay">
                <RefreshCw size={24} className="spin" />
                <span>Initializing camera feed…</span>
              </div>
            )}

            {/* Video stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera-video ${capturedPreview ? 'hidden' : ''}`}
            />

            {/* Captured Still Preview */}
            {capturedPreview && (
              <img src={capturedPreview} alt="Captured preview" className="camera-captured-img" />
            )}

            {/* Viewfinder crosshairs / guide overlay */}
            {!capturedPreview && !loading && (
              <div className="viewfinder-overlay">
                <div className="guide-corners top-left" />
                <div className="guide-corners top-right" />
                <div className="guide-corners bottom-left" />
                <div className="guide-corners bottom-right" />
                <div className="guide-center-dot" />
                <span className="viewfinder-label">ALIGN WOUND WITH CALIBRATION MARKER</span>
              </div>
            )}

            {/* Hidden canvas for drawing snapshot */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Camera Action Toolbar */}
        {!error && (
          <div className="camera-toolbar">
            {!capturedPreview ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={toggleCamera}
                  disabled={loading}
                  title="Switch camera lens"
                >
                  <SwitchCamera size={16} /> Switch Lens
                </button>

                <button
                  type="button"
                  className="camera-shutter-btn"
                  onClick={takeSnapshot}
                  disabled={loading}
                  aria-label="Take photograph"
                >
                  <span className="shutter-inner" />
                </button>

                <button type="button" className="secondary-button" onClick={onCancel}>
                  Cancel
                </button>
              </>
            ) : (
              <div className="camera-review-actions">
                <button type="button" className="secondary-button" onClick={retake}>
                  <RefreshCw size={16} /> Retake Photo
                </button>
                <button type="button" className="primary-button" onClick={confirmCapture}>
                  <Check size={16} /> Use This Photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
