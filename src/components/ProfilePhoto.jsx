import React, { useState, useRef } from 'react';
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

    const avatarUrl = user?.user_metadata?.avatar_url;
    const initials = user?.email ? user.email[0].toUpperCase() : 'U';

    // Use a ref callback to ensure video is attached as soon as element is available
    const setVideoRef = React.useCallback((node) => {
        if (node && stream) {
            node.srcObject = stream;
            node.play().catch(e => console.warn("Video play failed:", e));
        }
        videoRef.current = node;
    }, [stream]);

    // Cleanup stream on unmount or when showCamera is false
    React.useEffect(() => {
        if (!showCamera) stopCamera();
        return () => stopCamera();
    }, [showCamera]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 600 }, height: { ideal: 600 }, facingMode: "user" }
            });
            setStream(mediaStream);
            setShowCamera(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    const takePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Compress and convert to base64
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            stopCamera();
        }
    };

    const handleSave = async () => {
        if (!capturedImage) return;
        setLoading(true);
        console.log("Saving image to profile...");
        const { error } = await SupabaseAdapter.updateProfile({ avatar_url: capturedImage });
        setLoading(false);

        if (error) {
            console.error("Profile update error:", error);
            alert("Failed to save photo: " + error.message);
        } else {
            setCapturedImage(null);
            eventBus.emit('PROFILE_UPDATED');
            if (onUploadSuccess) onUploadSuccess();
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCapturedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="position-relative d-inline-block">
            <div className="rounded-circle border border-3 border-white shadow-lg overflow-hidden position-relative" style={{ width: '80px', height: '80px' }}>
                <AnimatePresence mode="wait">
                    {/* Default Avatar State */}
                    {!showCamera && !capturedImage && (
                        <motion.div
                            key="avatar"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-100 h-100 d-flex align-items-center justify-content-center"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="w-100 h-100 object-fit-cover" />
                            ) : (
                                <div className="w-100 h-100 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center">
                                    <span className="fs-2 fw-bold">{initials}</span>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Camera Active State */}
                    {showCamera && (
                        <motion.div
                            key="camera"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-100 h-100"
                        >
                            <video
                                ref={setVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-100 h-100 object-fit-cover"
                            />
                        </motion.div>
                    )}

                    {/* Captured Image Preview State */}
                    {capturedImage && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-100 h-100"
                        >
                            <img src={capturedImage} alt="Preview" className="w-100 h-100 object-fit-cover" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading Overlay */}
                {loading && (
                    <div className="position-absolute start-0 top-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{ zIndex: 10 }}>
                        <div className="spinner-border spinner-border-sm text-white" />
                    </div>
                )}
            </div>

            {/* Controls Side Overlay */}
            <div className="position-absolute bottom-0 end-0 mb-n1 me-n1 d-flex gap-1" style={{ zIndex: 5 }}>
                <AnimatePresence mode="wait">
                    {!showCamera && !capturedImage ? (
                        <motion.div
                            key="idle-controls"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="d-flex gap-1"
                        >
                            <button className="btn btn-sm glass rounded-circle p-1 shadow-sm hover-scale" onClick={startCamera}>
                                <Camera size={14} />
                            </button>
                            <button className="btn btn-sm glass rounded-circle p-1 shadow-sm hover-scale" onClick={() => fileInputRef.current.click()}>
                                <Upload size={14} />
                            </button>
                        </motion.div>
                    ) : showCamera ? (
                        <motion.div
                            key="camera-controls"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="d-flex gap-1"
                        >
                            <button className="btn btn-sm btn-danger rounded-circle p-1 shadow-sm hover-scale" onClick={stopCamera}>
                                <X size={14} />
                            </button>
                            <button className="btn btn-sm btn-primary rounded-circle p-1 shadow-sm hover-scale" onClick={takePhoto}>
                                <Camera size={14} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview-controls"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="d-flex gap-1"
                        >
                            <button className="btn btn-sm btn-light rounded-circle p-1 shadow-sm hover-scale" onClick={() => setCapturedImage(null)}>
                                <RefreshCw size={14} />
                            </button>
                            <button className="btn btn-sm btn-success rounded-circle p-1 shadow-sm hover-scale" onClick={handleSave}>
                                <Check size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
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
