import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, Upload } from 'lucide-react';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';
import { eventBus } from '../agents/core/EventBus.js';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePhoto({ user, onUploadSuccess }) {
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const localAvatar = localStorage.getItem('user_avatar_local');
    const avatarUrl = localAvatar || user?.user_metadata?.avatar_url;
    const initials = user?.email ? user.email[0].toUpperCase() : 'U';

    // Connect stream to video element whenever stream changes or view appears
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Video play failed:", e));
        }
    }, [stream, showCamera]);

    const startCamera = async () => {
        setLoading(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 300, height: 300, facingMode: "user" }
            });
            setStream(mediaStream);
            setShowCamera(true);
            setCapturedImage(null); // Clear any previous capture
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Camera access denied or failed. Please check permissions.");
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    const processImage = (sourceImage) => {
        return new Promise((resolve) => {
            const canvas = canvasRef.current;
            if (!canvas) return; // Guard clause

            const context = canvas.getContext('2d');
            const size = 100;
            canvas.width = size;
            canvas.height = size;

            // Determine dimensions based on element type (Video vs Image)
            const srcWidth = sourceImage.videoWidth || sourceImage.naturalWidth || sourceImage.width;
            const srcHeight = sourceImage.videoHeight || sourceImage.naturalHeight || sourceImage.height;

            if (!srcWidth || !srcHeight) {
                console.error("Source dimensions empty", { srcWidth, srcHeight });
                return;
            }

            // Calculate center crop to preserve aspect ratio
            const scale = Math.max(size / srcWidth, size / srcHeight);
            const scaledWidth = srcWidth * scale;
            const scaledHeight = srcHeight * scale;
            const x = (size - scaledWidth) / 2;
            const y = (size - scaledHeight) / 2;

            context.clearRect(0, 0, size, size);
            context.drawImage(sourceImage, x, y, scaledWidth, scaledHeight);

            resolve(canvas.toDataURL('image/jpeg', 0.5));
        });
    };

    const takePhoto = async () => {
        const video = videoRef.current;
        if (video && video.readyState === 4) { // HAVE_ENOUGH_DATA
            const dataUrl = await processImage(video);
            setCapturedImage(dataUrl);
            stopCamera();
        } else {
            console.warn("Camera not ready for capture");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.onload = async () => {
                const dataUrl = await processImage(img);
                setCapturedImage(dataUrl);
            };
            img.src = URL.createObjectURL(file);
        }
    };

    const handleSave = async () => {
        if (!capturedImage) return;
        setLoading(true);

        // 1. ALWAYS save locally first (Fallback for network blocks)
        localStorage.setItem('user_avatar_local', capturedImage);

        // 2. Try to sync to cloud (it might fail, but we don't care as much now)
        console.log("Saving image to profile...");
        await SupabaseAdapter.updateProfile({ avatar_url: capturedImage });

        setLoading(false);
        setCapturedImage(null);
        eventBus.emit('PROFILE_UPDATED');
        if (onUploadSuccess) onUploadSuccess();
    };

    return (
        <div className="d-flex flex-column align-items-center gap-2">
            <div className="rounded-circle border border-3 border-white shadow-lg overflow-hidden position-relative bg-light" style={{ width: '80px', height: '80px' }}>

                {/* 1. Camera View (Highest Priority if active) */}
                {showCamera && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-100 h-100 object-fit-cover"
                        onLoadedMetadata={(e) => e.target.play()}
                    />
                )}

                {/* 2. Captured Preview (Priority if no camera) */}
                {!showCamera && capturedImage && (
                    <img src={capturedImage} alt="Preview" className="w-100 h-100 object-fit-cover" />
                )}

                {/* 3. Default Avatar (Fallback) */}
                {!showCamera && !capturedImage && (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="w-100 h-100 object-fit-cover" />
                        ) : (
                            <div className="w-100 h-100 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center">
                                <span className="fs-2 fw-bold">{initials}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div className="position-absolute start-0 top-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{ zIndex: 10 }}>
                        <div className="spinner-border spinner-border-sm text-white" />
                    </div>
                )}
            </div>

            {/* Controls - Moved BELOW the circle to avoid blocking view */}
            <div className="d-flex gap-2">
                {!showCamera && !capturedImage ? (
                    <>
                        <button className="btn btn-sm btn-light rounded-circle p-2 shadow-sm hover-scale border" onClick={startCamera} title="Take Photo">
                            <Camera size={16} />
                        </button>
                        <button className="btn btn-sm btn-light rounded-circle p-2 shadow-sm hover-scale border" onClick={() => fileInputRef.current.click()} title="Upload File">
                            <Upload size={16} />
                        </button>
                    </>
                ) : showCamera ? (
                    <>
                        <button className="btn btn-sm btn-danger rounded-circle p-2 shadow-sm hover-scale" onClick={stopCamera} title="Cancel">
                            <X size={16} />
                        </button>
                        <button className="btn btn-sm btn-primary rounded-circle p-2 shadow-sm hover-scale" onClick={takePhoto} title="Snap">
                            <Camera size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-sm btn-light rounded-circle p-2 shadow-sm hover-scale border" onClick={() => setCapturedImage(null)} title="Retake">
                            <RefreshCw size={16} />
                        </button>
                        <button className="btn btn-sm btn-success rounded-circle p-2 shadow-sm hover-scale" onClick={handleSave} title="Save">
                            <Check size={16} />
                        </button>
                    </>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
