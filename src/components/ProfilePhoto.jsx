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
    const [loadFailed, setLoadFailed] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const localAvatar = localStorage.getItem('user_avatar_local');
    // Prioritize user metadata (cloud sync) over local fallback
    const rawUrl = user?.user_metadata?.avatar_url || localAvatar;

    // Use a stable URL. Cache busting is handled via the user's updated_at timestamp if available.
    const avatarUrl = rawUrl;

    const initials = user?.email ? user.email[0].toUpperCase() : 'U';

    // Reset failure state if URL is updated to something new
    useEffect(() => {
        setLoadFailed(false);
    }, [avatarUrl]);

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
            const size = 300;
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

        // 1. LOCAL-ONLY OPTIMISTIC UPDATE
        // We update the local storage and component state, but we DO NOT 
        // save the heavy Base64 string to the Supabase database.
        localStorage.setItem('user_avatar_local', capturedImage);

        // Notify other components (using a local-only enriched object)
        const localEnrichedUser = {
            ...user,
            user_metadata: {
                ...user.user_metadata,
                avatar_url: capturedImage
            }
        };

        // Use the adapter's internal cache update to notify others without DB hit
        SupabaseAdapter.cachedUser = localEnrichedUser;
        SupabaseAdapter.notifySubscribers(localEnrichedUser);

        // Snapshot the image for the background sync before we clear it from UI
        const imageToUpload = capturedImage;

        // Reset local UI
        setCapturedImage(null);
        if (onUploadSuccess) onUploadSuccess(localEnrichedUser);

        // 2. BACKGROUND CLOUD SYNC: Upload to storage and update URL without blocking
        const syncToCloud = async () => {
            try {
                console.log("Cloud Sync: Step 1 - Starting fetch of image data...");
                const response = await fetch(imageToUpload);
                console.log("Cloud Sync: Step 2 - Fetch complete, converting to blob...");
                const blob = await response.blob();
                const kbSize = (blob.size / 1024).toFixed(2);
                console.log(`Cloud Sync: Step 3 - Blob created (${kbSize} KB). Preparing upload...`);

                // Flat filename for compatibility
                const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
                // ALTERNATIVE UPLOAD: Direct REST API call (Bypasses SDK issues)
                console.log("Cloud Sync: Step 4 - Initiating upload via Direct REST API...");

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                const uploadUrl = `${supabaseUrl}/storage/v1/object/avatars/${fileName}`;

                const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                        'Content-Type': 'image/jpeg',
                        'x-upsert': 'true'
                    },
                    body: blob
                });

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    console.error("Direct Upload Failed:", errorText);
                    throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
                }

                // Construct public URL manually since we bypassed the SDK
                const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;

                console.log("Cloud Sync: File uploaded successfully!");
                console.log("Cloud Sync: Public URL:", publicUrl);

                // 3. FINALIZE DB RECORD
                console.log("Cloud Sync: Updating database with new avatar URL...");
                const updateResult = await SupabaseAdapter.updateProfile({ avatar_url: publicUrl });

                // 3. FINALIZE DB RECORD - DIRECT UPDATE (Bypass Adapter)
                console.log("Cloud Sync: Updating database directly with new avatar URL...");

                // Get fresh client to ensure we are not using a stale one
                const dbClient = SupabaseAdapter.getClient();

                const { data: dbData, error: dbError } = await dbClient
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        avatar_url: publicUrl,
                        updated_at: new Date().toISOString(),
                        email: user.email // Ensure required fields
                    })
                    .select();

                if (dbError) {
                    console.error("Cloud Sync: DB Update Failed:", dbError);
                    throw dbError;
                }

                console.log("Cloud Sync: Database updated successfully! Rows:", dbData?.length);

                // NOW notify the adapter to update its cache
                // We do this manually since we bypassed the adapter's update method
                SupabaseAdapter.cachedUser = {
                    ...user,
                    user_metadata: { ...user.user_metadata, avatar_url: publicUrl }
                };
                SupabaseAdapter.notifySubscribers(SupabaseAdapter.cachedUser);

                localStorage.setItem('user_avatar_local', publicUrl);
                console.info("Cloud Sync: ✅ Avatar successfully synced across Cloud & DB.");
            } catch (err) {
                console.warn("Cloud Sync: Upload deferred (using local cache):", err.message || err);
            } finally {
                setLoading(false);
            }
        };

        syncToCloud();
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
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary">
                        {avatarUrl && !loadFailed ? (
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                className="w-100 h-100 object-fit-cover shadow-inner"
                                onError={(e) => {
                                    console.warn(`Avatar load failed for URL: ${avatarUrl}`, e);
                                    setLoadFailed(true);
                                }}
                            />
                        ) : (
                            <span className="fs-2 fw-bold">{initials}</span>
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
