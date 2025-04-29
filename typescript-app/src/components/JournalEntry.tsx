/**
 * Journal Entry Component
 * 
 * A component for displaying and editing journal entries with support for
 * text, audio recordings, and spatial positioning.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Animated,
  useWindowDimensions,
  PanResponderGestureState
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useAppTheme } from '../hooks/useAppTheme';
import { JournalEntry as JournalEntryType } from '../types/journal';
import { MaterialIcons } from '@expo/vector-icons';

interface JournalEntryProps {
  entry: JournalEntryType;
  isEditing?: boolean;
  onSave?: (entry: JournalEntryType) => Promise<void>;
  onDelete?: () => Promise<void>;
  onPress?: () => void;
  style?: ViewStyle;
  spatialMode?: boolean;
}

export const JournalEntry: React.FC<JournalEntryProps> = ({
  entry,
  isEditing = false,
  onSave,
  onDelete,
  onPress,
  style,
  spatialMode = false,
}) => {
  const theme = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [editedEntry, setEditedEntry] = useState({ ...entry });
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  // Set up pan responder for spatial mode
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => spatialMode,
    onPanResponderMove: (_, gestureState) => {
      pan.setValue({
        x: gestureState.dx,
        y: gestureState.dy
      });
    },
    onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
      if (spatialMode && onSave) {
        onSave({
          ...editedEntry,
          positionX: gestureState.moveX,
          positionY: gestureState.moveY,
        });
      }
    },
  });

  // Audio recording functions
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri && onSave) {
        await onSave({
          ...editedEntry,
          audioPath: uri,
          type: editedEntry.content ? 'mixed' : 'audio'
        });
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const playSound = async () => {
    if (entry.audioPath) {
      try {
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: entry.audioPath }
          );
          setSound(newSound);
          await newSound.playAsync();
          setIsPlaying(true);
          
          newSound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (status.isLoaded && !status.isPlaying) {
              setIsPlaying(false);
            }
          });
        } else {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } catch (error) {
        console.error('Failed to play sound:', error);
      }
    }
  };

  // Clean up resources
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const renderEditMode = () => (
    <View style={styles.editContainer}>
      <TextInput
        style={[styles.titleInput, { color: theme.colors.text }]}
        value={editedEntry.title}
        onChangeText={title => setEditedEntry({ ...editedEntry, title })}
        placeholder="Entry Title"
        placeholderTextColor={theme.colors.textSecondary}
      />
      <TextInput
        style={[styles.contentInput, { color: theme.colors.text }]}
        value={editedEntry.content}
        onChangeText={content => setEditedEntry({ ...editedEntry, content })}
        placeholder="Write your thoughts..."
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        textAlignVertical="top"
      />
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={recording ? stopRecording : startRecording}
          style={[
            styles.recordButton,
            { backgroundColor: recording ? theme.colors.error : theme.colors.primary }
          ]}
        >
          <MaterialIcons
            name={recording ? 'stop' : 'mic'}
            size={24}
            color={theme.colors.background}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onSave?.(editedEntry)}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.background }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderViewMode = () => (
    <Pressable onPress={onPress}>
      <View style={styles.viewContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {entry.title}
        </Text>
        {entry.content && (
          <Text 
            style={[styles.content, { color: theme.colors.textSecondary }]}
            numberOfLines={3}
          >
            {entry.content}
          </Text>
        )}
        {entry.audioPath && (
          <TouchableOpacity
            onPress={playSound}
            style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
          >
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={24}
              color={theme.colors.background}
            />
          </TouchableOpacity>
        )}
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {new Date(entry.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );

  const containerStyle = [
    styles.container,
    { backgroundColor: theme.colors.surface },
    spatialMode && {
      position: 'absolute' as const,
      left: entry.positionX || 0,
      top: entry.positionY || 0,
      transform: pan.getTranslateTransform(),
    },
    style,
  ];

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={containerStyle}
    >
      {isEditing ? renderEditMode() : renderViewMode()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  } as ViewStyle,
  editContainer: {
    padding: 16,
  } as ViewStyle,
  viewContainer: {
    padding: 16,
  } as ViewStyle,
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  } as TextStyle,
  contentInput: {
    fontSize: 16,
    minHeight: 120,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  } as TextStyle,
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  recordButton: {
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  } as ViewStyle,
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  } as TextStyle,
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  } as TextStyle,
  content: {
    fontSize: 16,
    marginBottom: 8,
  } as TextStyle,
  date: {
    fontSize: 12,
    marginTop: 8,
  } as TextStyle,
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  } as ViewStyle,
});

export default JournalEntry;