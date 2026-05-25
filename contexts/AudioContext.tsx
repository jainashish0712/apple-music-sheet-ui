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
    position: number;
    duration: number;
    playSound: (song: Song) => Promise<void>;
    pauseSound: () => Promise<void>;
    togglePlayPause: () => Promise<void>;
    playNextSong: () => Promise<void>;
    playPreviousSong: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const player = useAudioPlayer();
    const status = useAudioPlayerStatus(player);

    // Watch for song changes and update player source
    useEffect(() => {
        if (currentSong?.mp4_link) {
            console.log('Replacing source with:', currentSong.mp4_link);
            player.replace({ uri: currentSong.mp4_link });
            player.play();
        }
    }, [currentSong?.id]);

    const playNextSong = useCallback(async () => {
        const currentIndex = songs.findIndex(song => song.id === currentSong?.id);
        if (currentIndex === -1) return;

        const nextSong = songs[(currentIndex + 1) % songs.length] as Song;
        setCurrentSong(nextSong);
    }, [currentSong]);

    const playPreviousSong = useCallback(async () => {
        const currentIndex = songs.findIndex(song => song.id === currentSong?.id);
        if (currentIndex === -1) return;

        const previousIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
        const previousSong = songs[previousIndex] as Song;
        setCurrentSong(previousSong);
    }, [currentSong]);

    useEffect(() => {
        if (status.didJustFinish) {
            playNextSong();
        }
    }, [status.didJustFinish, playNextSong]);

    const playSound = async (song: Song) => {
        console.log('playSound called for:', song.title);
        if (currentSong?.id !== song.id) {
            setCurrentSong(song);
        } else {
            player.play();
        }
    };

    const pauseSound = async () => {
        player.pause();
    };

    const togglePlayPause = async () => {
        console.log('togglePlayPause. Playing:', status.playing);
        if (status.playing) {
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
            position: status.currentTime,
            duration: status.duration,
            playSound,
            pauseSound,
            togglePlayPause,
            playNextSong,
            playPreviousSong,
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
