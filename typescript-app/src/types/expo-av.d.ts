import type { MockFunction } from '../test-utils/test-library';

declare module 'expo-av' {
  export interface RecordingStatus {
    canRecord: boolean;
    isDoneRecording: boolean;
    durationMillis: number;
  }

  export interface Recording {
    status: RecordingStatus;
    startAsync: () => Promise<void>;
    stopAndUnloadAsync: () => Promise<void>;
    getURI: () => string;
  }

  export interface PlaybackStatus {
    isLoaded: boolean;
    isPlaying?: boolean;
    durationMillis?: number;
    positionMillis?: number;
  }

  export interface Sound {
    playAsync: () => Promise<void>;
    pauseAsync: () => Promise<void>;
    unloadAsync: () => Promise<void>;
    setOnPlaybackStatusUpdate: (callback: (status: PlaybackStatus) => void) => void;
  }

  export interface AudioMode {
    allowsRecordingIOS: boolean;
    playsInSilentModeIOS: boolean;
    staysActiveInBackground?: boolean;
    interruptionModeIOS?: number;
    interruptionModeAndroid?: number;
    shouldDuckAndroid?: boolean;
    playThroughEarpieceAndroid?: boolean;
  }

  export interface AudioPermissionResponse {
    granted: boolean;
    status: string;
  }

  export const Audio: {
    Recording: {
      createAsync: MockFunction<Promise<{ recording: Recording }>>;
    };
    Sound: {
      createAsync: MockFunction<Promise<{ sound: Sound }>>;
    };
    requestPermissionsAsync: MockFunction<Promise<AudioPermissionResponse>>;
    setAudioModeAsync: MockFunction<Promise<void>>;
  };
}