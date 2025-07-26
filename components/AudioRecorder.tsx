import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { blink } from '../lib/blink';

interface AudioRecorderProps {
  onAudioRecorded: (audioUrl: string, duration: number) => void;
  onClose: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioRecorded, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<'none' | 'deep' | 'high' | 'robot'>('none');

  const recording = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const voiceFilters = [
    { id: 'none', name: 'Original', icon: '🎤', description: 'Your natural voice' },
    { id: 'deep', name: 'Deep', icon: '🎭', description: 'Lower pitch for anonymity' },
    { id: 'high', name: 'High', icon: '🎪', description: 'Higher pitch for anonymity' },
    { id: 'robot', name: 'Robot', icon: '🤖', description: 'Robotic voice filter' }
  ];

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow microphone access to record audio confessions.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = newRecording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording.current) return;

    try {
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      
      if (uri) {
        setAudioUri(uri);
      }

      recording.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const playRecording = async () => {
    if (!audioUri) return;

    try {
      if (isPlaying) {
        await sound.current?.pauseAsync();
        setIsPlaying(false);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
        sound.current = newSound;
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });

        await newSound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };

  const deleteRecording = () => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAudioUri(null);
            setRecordingDuration(0);
            if (sound.current) {
              sound.current.unloadAsync();
              sound.current = null;
            }
          }
        }
      ]
    );
  };

  const uploadAndSaveRecording = async () => {
    if (!audioUri) return;

    setIsUploading(true);

    try {
      // Create a blob from the audio URI
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      // Create a File object for upload
      const audioFile = new File([blob], `confession_audio_${Date.now()}.m4a`, {
        type: 'audio/m4a'
      });

      // Upload to Blink storage
      const { publicUrl } = await blink.storage.upload(
        audioFile,
        `audio/confessions/${Date.now()}.m4a`,
        { upsert: true }
      );

      // Call the parent callback with the uploaded URL
      onAudioRecorded(publicUrl, recordingDuration);
      
      Alert.alert(
        'Audio Recorded! 🎙️',
        'Your audio confession has been recorded and will be included with your post.',
        [{ text: 'OK', onPress: onClose }]
      );

    } catch (error) {
      console.error('Failed to upload audio:', error);
      Alert.alert('Error', 'Failed to upload audio recording. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="absolute inset-0 bg-black/50 items-center justify-center z-50">
      <BlurView intensity={30} tint="dark" className="m-4 rounded-3xl overflow-hidden glass-card max-w-sm w-full">
        <View className="p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white font-bold text-xl">Audio Confession</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#ffffff80" />
            </TouchableOpacity>
          </View>

          {/* Voice Filter Selection */}
          <View className="mb-6">
            <Text className="text-white font-medium mb-3">Voice Filter</Text>
            <View className="flex-row flex-wrap">
              {voiceFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setSelectedVoiceFilter(filter.id as any)}
                  className="mr-2 mb-2"
                >
                  <BlurView
                    intensity={15}
                    tint="dark"
                    className={`px-3 py-2 rounded-full ${
                      selectedVoiceFilter === filter.id ? 'glass-button' : 'glass'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Text className="mr-2">{filter.icon}</Text>
                      <Text
                        className={`text-sm font-medium ${
                          selectedVoiceFilter === filter.id ? 'text-accent' : 'text-white/80'
                        }`}
                      >
                        {filter.name}
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-white/60 text-xs mt-2">
              {voiceFilters.find(f => f.id === selectedVoiceFilter)?.description}
            </Text>
          </View>

          {/* Recording Controls */}
          <View className="items-center mb-6">
            {!audioUri ? (
              <View className="items-center">
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={isRecording ? ['#ef4444', '#dc2626'] : ['#b497f3', '#8b5cf6']}
                    className="w-20 h-20 rounded-full items-center justify-center"
                  >
                    <Ionicons
                      name={isRecording ? "stop" : "mic"}
                      size={32}
                      color="white"
                    />
                  </LinearGradient>
                </TouchableOpacity>
                
                <Text className="text-white font-medium text-lg mb-2">
                  {isRecording ? 'Recording...' : 'Tap to Record'}
                </Text>
                
                {isRecording && (
                  <View className="bg-red-500/20 px-4 py-2 rounded-full">
                    <Text className="text-red-400 font-mono text-lg">
                      {formatDuration(recordingDuration)}
                    </Text>
                  </View>
                )}
                
                {!isRecording && (
                  <Text className="text-white/60 text-sm text-center">
                    Record your anonymous confession with voice filter protection
                  </Text>
                )}
              </View>
            ) : (
              <View className="items-center w-full">
                <View className="bg-accent/20 w-16 h-16 rounded-full items-center justify-center mb-4">
                  <Ionicons name="musical-notes" size={24} color="#b497f3" />
                </View>
                
                <Text className="text-white font-medium text-lg mb-2">Recording Ready</Text>
                <Text className="text-white/60 text-sm mb-4">
                  Duration: {formatDuration(recordingDuration)}
                </Text>
                
                {/* Playback Controls */}
                <View className="flex-row items-center space-x-4 mb-6">
                  <TouchableOpacity
                    onPress={playRecording}
                    className="bg-accent/20 w-12 h-12 rounded-full items-center justify-center"
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={20}
                      color="#b497f3"
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={deleteRecording}
                    className="bg-red-500/20 w-12 h-12 rounded-full items-center justify-center"
                  >
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                
                {/* Upload Button */}
                <TouchableOpacity
                  onPress={uploadAndSaveRecording}
                  disabled={isUploading}
                  className="w-full"
                >
                  <LinearGradient
                    colors={['#b497f3', '#8b5cf6']}
                    className="py-4 rounded-xl items-center"
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={isUploading ? "hourglass-outline" : "checkmark-circle"}
                        size={20}
                        color="white"
                      />
                      <Text className="text-white font-semibold ml-2">
                        {isUploading ? 'Uploading...' : 'Use This Recording'}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Privacy Notice */}
          <BlurView intensity={10} tint="dark" className="glass p-3 rounded-xl">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={16} color="#b497f3" />
              <Text className="text-white/70 text-xs ml-2 flex-1">
                Audio recordings are processed with voice filters to protect your identity
              </Text>
            </View>
          </BlurView>
        </View>
      </BlurView>
    </View>
  );
};

export default AudioRecorder;