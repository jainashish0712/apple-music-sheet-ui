import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { songs } from '@/data/songs.json';

interface Song {
    id: number | string;
    title: string;
    artist: string;
    artwork: string;
    artwork_bg_color?: string;
    mp4_link: string;
}

interface AudioContextType {
    player: any;
    isPlaying: boolean;
    currentSong: Song | null;
    setCurrentSong: (song: Song | null) => void;
    position: number;
    duration: number;
    playSound: (song: Song) => Promise<void>;
    pauseSound: () => Promise<void>;
    togglePlayPause: () => Promise<void>;
    playNextSong: () => Promise<void>;
    playPreviousSong: () => Promise<void>;
    isLoading: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Initialize player with no source initially for speed
    const player = useAudioPlayer();
    const status = useAudioPlayerStatus(player);

    // Error listener
    useEffect(() => {
        const sub = player.addListener('playbackError', (error) => {
            console.error('[AudioContext] Playback Error:', error);
            setIsLoading(false);
        });
        return () => sub.remove();
    }, [player]);

    // Handle song finishing
    useEffect(() => {
        if (status.didJustFinish) {
            playNextSong();
        }
    }, [status.didJustFinish]);

    const playSound = async (song: Song) => {
        // FAST PATH: Direct player manipulation
        console.log('[AudioContext] playSound (IMPERATIVE) for:', song.title);
        
        try {
            setIsLoading(true);
            
            // 1. Update UI State (Async, non-blocking for playback)
            setCurrentSong(song);
            
            // 2. Direct Engine Commands
            player.pause();
            
            if (song.mp4_link) {
                const source = {
                    uri: song.mp4_link,
                    headers: {
                        'User-Agent': MOBILE_USER_AGENT,
                        'Referer': 'https://yt.omada.cafe/',
                        'Origin': 'https://yt.omada.cafe/'
                    }
                };
                
                // Command the engine immediately
                console.log('[AudioContext] Executing player.replace() and play() immediately');
                player.replace(source);
                player.play();
            }
            
            setIsLoading(false);
        } catch (error) {
            console.error('[AudioContext] playSound Error:', error);
            setIsLoading(false);
        }
    };

    const playNextSong = useCallback(async () => {
        const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
        if (currentIndex === -1) return;
        const nextSong = songs[(currentIndex + 1) % songs.length] as Song;
        playSound(nextSong);
    }, [currentSong]);

    const playPreviousSong = useCallback(async () => {
        const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
        if (currentIndex === -1) return;
        const previousIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
        const previousSong = songs[previousIndex] as Song;
        playSound(previousSong);
    }, [currentSong]);

    const pauseSound = async () => {
        player.pause();
    };

    const togglePlayPause = async () => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    return (
        <AudioContext.Provider value={{
            player,
            isPlaying: status.playing,
            currentSong,
            setCurrentSong,
            position: status.currentTime,
            duration: status.duration,
            playSound,
            pauseSound,
            togglePlayPause,
            playNextSong,
            playPreviousSong,
            isLoading,
        }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}
