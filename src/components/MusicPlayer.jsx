import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Music } from 'lucide-react';

// Import music files directly so Vite bundles them correctly
import relaxMusic from '../assets/Music/Relax Music.mp3';
import rainPianoMusic from '../assets/Music/Rain + Piano Muisc.mp3';
import nauloSuruwat from '../assets/Music/Naulo Suruwat - Nepali Sound Track.mp3';
import lofiMusic from '../assets/Music/LO-FI MUSIC.mp3';
import deepMusic from '../assets/Music/Deep Music.mp3';

const playlist = [
    { id: 1, title: 'Relax Music', src: relaxMusic, emoji: '🌿', desc: 'Serene melodies for deep focus' },
    { id: 2, title: 'Rain + Piano Music', src: rainPianoMusic, emoji: '🌧️', desc: 'Calming rain with soft piano' },
    { id: 3, title: 'Naulo Suruwat', src: nauloSuruwat, emoji: '🎵', desc: 'Inspiring Nepali soundtrack' },
    { id: 4, title: 'LO-FI Music', src: lofiMusic, emoji: '🎧', desc: 'Chill beats for steady work' },
    { id: 5, title: 'Deep Music', src: deepMusic, emoji: '🌊', desc: 'Ambient soundscapes' },
];

function MusicPlayer() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [volume, setVolume] = useState(0.6);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLooping, setIsLooping] = useState(true);

    const audioRef = useRef(null);
    const playerContainerRef = useRef(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (playerContainerRef.current && !playerContainerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const currentTrack = playlist[currentTrackIndex];

    // Format time as mm:ss
    const formatTime = (secs) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Sync volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Handle play/pause
    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    }, [isPlaying]);

    // Change track
    const changeTrack = useCallback((index) => {
        const audio = audioRef.current;
        if (!audio) return;

        // If clicking the currently playing track, toggle play/pause instead
        if (index === currentTrackIndex) {
            togglePlay();
            return;
        }

        setCurrentTrackIndex(index);
        setProgress(0);
        setCurrentTime(0);
        setIsLoading(true);
        setIsPlaying(true); // Automatically start playing when a new track is selected
    }, [currentTrackIndex, togglePlay]);

    const nextTrack = useCallback(() => {
        changeTrack((currentTrackIndex + 1) % playlist.length);
    }, [currentTrackIndex, changeTrack]);

    const prevTrack = useCallback(() => {
        changeTrack((currentTrackIndex - 1 + playlist.length) % playlist.length);
    }, [currentTrackIndex, changeTrack]);

    // Auto-play next or loop
    const handleEnded = useCallback(() => {
        if (isLooping) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
        } else {
            nextTrack();
        }
    }, [isLooping, nextTrack]);

    // When src changes, if we were playing, auto-play
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.src = currentTrack.src;
        audio.load();

        if (isPlaying) {
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    }, [currentTrackIndex]);

    // Update progress
    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime);
        if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        const audio = audioRef.current;
        if (audio) {
            setDuration(audio.duration);
            setIsLoading(false);
        }
    };

    // Seek by clicking progress bar
    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        audio.currentTime = pct * audio.duration;
    };

    // Global listener for cross-component sync
    useEffect(() => {
        const handleToggle = () => togglePlay();
        const handleChange = (e) => changeTrack(e.detail.index);

        window.addEventListener('music-toggle', handleToggle);
        window.addEventListener('music-change', handleChange);
        return () => {
            window.removeEventListener('music-toggle', handleToggle);
            window.removeEventListener('music-change', handleChange);
        };
    }, [togglePlay, changeTrack]);

    return (
        <>
            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                loop={false} // Handled by handleEnded for better control
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
                src={currentTrack.src}
                preload="auto"
            />

            {/* Floating Music Button */}
            <motion.div
                ref={playerContainerRef}
                style={{
                    position: 'fixed',
                    bottom: '5rem',
                    left: '1.5rem',
                    zIndex: 1040,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                }}
            >
                {/* Expanded Player Panel */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            style={{
                                width: '250px',
                                background: 'var(--card-bg)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '24px',
                                padding: '0.75rem',
                                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.3)',
                            }}
                        >
                            {/* Header */}
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="p-1 px-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                                        <Music size={12} />
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-color)' }}>Focus Music</span>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="btn btn-sm btn-light rounded-circle p-0"
                                    style={{ width: '20px', height: '20px' }}
                                    aria-label="Close music player"
                                >
                                    <span style={{ fontSize: '0.7rem' }}>✕</span>
                                </button>
                            </div>

                            {/* Current Track Display */}
                            <div className="text-center p-1 rounded-4 bg-primary bg-opacity-10 mb-2">
                                <div style={{ fontSize: '1.8rem', marginBottom: '0', display: 'inline-block' }}>
                                    {currentTrack.emoji}
                                </div>
                                <div className="fw-bold text-body" style={{ fontSize: '0.8rem' }}>
                                    {currentTrack.title}
                                </div>
                                {isLoading && <div className="text-muted small" style={{ fontSize: '0.65rem' }}>Loading...</div>}
                            </div>

                            {/* Controls - Compact */}
                            <div className="d-flex justify-content-center align-items-center mb-2">
                                <button
                                    onClick={togglePlay}
                                    disabled={isLoading}
                                    className="btn border-0 p-0 text-primary d-flex align-items-center justify-content-center shadow-none"
                                    style={{ width: '32px', height: '32px', background: 'none' }}
                                    aria-label={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause size={24} /> : <Play size={24} className="ms-1" />}
                                </button>
                            </div>

                            {/* Song List - No Scroll */}
                            <div className="song-list pe-1">
                                <div className="text-muted small mb-1 fw-bold text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                                    Playlist
                                </div>
                                {playlist.map((track, index) => (
                                    <button
                                        key={track.id}
                                        onClick={() => changeTrack(index)}
                                        className={`btn btn-sm w-100 text-start d-flex align-items-center gap-2 py-1 px-2 rounded-3 mb-1 border-0 transition-all ${currentTrackIndex === index ? 'bg-primary text-white shadow-sm' : 'btn-light text-body hover-bg-light'}`}
                                    >
                                        <span style={{ fontSize: '0.9rem' }}>{track.emoji}</span>
                                        <div className="flex-grow-1 text-truncate">
                                            <div className="fw-bold" style={{ fontSize: '0.7rem' }}>{track.title}</div>
                                        </div>
                                        {currentTrackIndex === index && isPlaying && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                                style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white' }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Toggle Button */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(prev => !prev)}
                    className={`music-fab ${isPlaying ? 'playing' : ''}`}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: isPlaying ? 'var(--primary)' : 'var(--card-bg)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: isPlaying ? '0 10px 25px rgba(99,102,241,0.4)' : '0 10px 25px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPlaying ? 'white' : 'var(--text-color)',
                        backdropFilter: 'blur(10px)',
                        position: 'relative',
                    }}
                >
                    <Music size={20} />
                </motion.button>
            </motion.div>
        </>
    );
}

// Section component for Home/Library etc.
export function MusicSection() {
    return (
        <section className="py-5">
            <div className="container">
                <div className="glass p-4 p-md-5 rounded-5 border-0 shadow-lg overflow-hidden position-relative">
                    {/* Background Decorative Element */}
                    <div className="position-absolute top-0 end-0 p-5 opacity-10">
                        <Music size={120} />
                    </div>

                    <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
                        <div className="col-lg-5 mb-4 mb-lg-0">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                            >
                                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold mb-3">Focus Audio</span>
                                <h2 className="display-5 fw-bold mb-4">Perfect Soundscapes</h2>
                                <p className="lead text-muted mb-4">
                                    Science-backed music designed to enhance your cognitive performance and keep you in the flow.
                                </p>
                                <div className="d-flex align-items-center gap-2 text-primary fw-bold">
                                    <div className="p-2 rounded-circle bg-primary bg-opacity-10">
                                        <Repeat size={18} />
                                    </div>
                                    <span>Looped for continuous focus</span>
                                </div>
                            </motion.div>
                        </div>
                        <div className="col-lg-7">
                            <div className="row g-3">
                                {playlist.map((track, index) => (
                                    <div key={track.id} className="col-md-6">
                                        <motion.div
                                            whileHover={{ y: -5 }}
                                            className="card glass border-0 rounded-4 p-3 h-100 cursor-pointer hover-shadow"
                                            onClick={() => {
                                                window.dispatchEvent(new CustomEvent('music-change', { detail: { index } }));
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="fs-1">{track.emoji}</div>
                                                <div>
                                                    <h3 className="fs-6 fw-bold mb-1">{track.title}</h3>
                                                    <p className="small text-muted mb-0">{track.desc}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default MusicPlayer;
