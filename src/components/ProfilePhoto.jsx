import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import SupabaseAdapter from '../agents/adapters/SupabaseAdapter.js';
import { eventBus } from '../agents/core/EventBus.js';

export default function ProfilePhoto({ onUploadSuccess }) {
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Use effect to handle video stream attachment
    React.useEffect(() => {
        if (showCamera && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Video play failed:", e));
        }
    }, [showCamera, stream]);

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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setCapturedImage(dataUrl);
            stopCamera();
        }
    };

    const handleSave = async () => {
        if (!capturedImage) return;
        setLoading(true);
        console.log("Saving image to profile...");
        const { data, error } = await SupabaseAdapter.updateProfile({ avatar_url: capturedImage });
        console.log("Profile update result:", { data, error });
        setLoading(false);

        if (error) {
            alert("Failed to save photo: " + error);
        } else {
            setCapturedImage(null);
            eventBus.emit('PROFILE_UPDATED');
            if (onUploadSuccess) onUploadSuccess();
        }
    };

    const fileInputRef = useRef(null);

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
        <div className="profile-photo-section mt-3">
            {!showCamera && !capturedImage && (
                <div className="d-flex flex-column gap-2">
                    <button
                        className="btn btn-outline-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2 mx-auto"
                        onClick={startCamera}
                    >
                        <Camera size={16} /> Take Photo
                    </button>
                    <button
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-flex align-items-center gap-2 mx-auto"
                        onClick={() => fileInputRef.current.click()}
                    >
                        Upload Photo
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>
            )}

            {showCamera && (
                <div className="camera-container text-center">
                    <div className="position-relative d-inline-block rounded-circle overflow-hidden border border-primary shadow" style={{ width: '150px', height: '150px' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div className="mt-2 d-flex justify-content-center gap-2">
                        <button className="btn btn-sm btn-danger rounded-circle p-2" onClick={stopCamera}>
                            <X size={16} />
                        </button>
                        <button className="btn btn-sm btn-success rounded-circle p-2" onClick={takePhoto}>
                            <Camera size={16} />
                        </button>
                    </div>
                </div>
            )}

            {capturedImage && (
                <div className="captured-container text-center">
                    <div className="position-relative d-inline-block rounded-circle overflow-hidden border border-success shadow" style={{ width: '150px', height: '150px' }}>
                        <img
                            src={capturedImage}
                            alt="Captured"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <p className="small text-muted mt-1">Look good?</p>
                    <div className="mt-2 d-flex justify-content-center gap-2">
                        <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setCapturedImage(null)}>
                            <RefreshCw size={14} className="me-1" /> Retake
                        </button>
                        <button
                            className="btn btn-sm btn-primary rounded-pill px-3"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? "Saving..." : <><Check size={14} className="me-1" /> Save Photo</>}
                        </button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
