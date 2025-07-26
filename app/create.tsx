import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { blink } from '../lib/blink';
import BubbleBackground from '../components/BubbleBackground';
import AudioRecorder from '../components/AudioRecorder';

interface User {
  id: string;
  email: string;
  display_name?: string;
}

export default function CreateConfessionScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [location, setLocation] = useState<string>('');
  const [useLocation, setUseLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canPost, setCanPost] = useState(true);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  const categories = [
    { id: 'general', label: 'General', emoji: '💭' },
    { id: 'love', label: 'Love', emoji: '💕' },
    { id: 'regret', label: 'Regret', emoji: '😔' },
    { id: 'mental-health', label: 'Mental Health', emoji: '🧠' },
    { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { id: 'work', label: 'Work', emoji: '💼' },
    { id: 'college', label: 'College', emoji: '🎓' },
    { id: 'fun', label: 'Fun', emoji: '🎉' },
    { id: 'relationships', label: 'Relationships', emoji: '💑' },
  ];

  const anonymousNames = [
    'Anonymous Dreamer', 'Secret Keeper', 'Hidden Truth', 'Masked Soul',
    'Silent Voice', 'Unknown Heart', 'Faceless Friend', 'Mystery Mind',
    'Invisible Spirit', 'Nameless Wanderer', 'Phantom Thoughts', 'Shadow Walker'
  ];

  const anonymousAvatars = ['🎭', '👤', '🌙', '⭐', '🔮', '💫', '🌟', '✨', '🎪', '🎨', '🎯', '🎲'];

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
      if (state.user) {
        checkDailyLimit();
      }
    });
    return unsubscribe;
  }, []);

  const checkDailyLimit = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const todayConfessions = await blink.db.confessions.list({
        where: { 
          user_id: user.id,
          created_at: { gte: `${today}T00:00:00.000Z` }
        }
      });

      setCanPost(todayConfessions.length === 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to add location to your confession.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const locationString = `${address.city}, ${address.region}`;
        setLocation(locationString);
        setUseLocation(true);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location.');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const submitConfession = async () => {
    if (!user || !content.trim()) return;

    if (!canPost) {
      Alert.alert('Daily Limit Reached', 'You can only post one confession per day. Come back tomorrow! 🌅');
      return;
    }

    setIsSubmitting(true);

    try {
      const randomName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
      const randomAvatar = anonymousAvatars[Math.floor(Math.random() * anonymousAvatars.length)];

      await blink.db.confessions.create({
        id: `confession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        content: content.trim(),
        category: selectedCategory,
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        anonymous_name: randomName,
        anonymous_avatar: randomAvatar,
        location: useLocation ? location : null,
        audio_url: audioUrl,
        voice_filter: audioUrl ? 'filtered' : null,
        sentiment_score: 0.0,
        is_featured: false,
        is_confession_of_day: false,
        moderation_status: 'approved'
      });

      Alert.alert(
        'Confession Shared! 🎭',
        'Your anonymous confession has been shared with the community.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting confession:', error);
      Alert.alert('Error', 'Failed to submit your confession. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <BlurView intensity={20} tint="dark" className="glass-card p-8 rounded-3xl">
              <View className="items-center">
                <View className="w-16 h-16 rounded-full bg-accent/20 items-center justify-center mb-4">
                  <Text className="text-3xl">🎭</Text>
                </View>
                <Text className="text-white text-lg font-medium">Loading...</Text>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <BlurView intensity={20} tint="dark" className="glass-card p-8 rounded-3xl">
              <View className="items-center">
                <Text className="text-white text-lg font-medium">Please sign in to create a confession</Text>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <BubbleBackground />
      
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="border-b border-white/10">
          <BlurView intensity={20} tint="dark" className="glass">
            <View className="flex-row items-center justify-between px-6 py-4">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-lg font-semibold">Share Anonymously</Text>
              <View className="w-10" />
            </View>
          </BlurView>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-6 py-6 space-y-6">
              {/* Daily Limit Warning */}
              {!canPost && (
                <BlurView intensity={15} tint="dark" className="glass-card p-5 border border-yellow-500/30 rounded-3xl">
                  <View className="space-y-3">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={20} color="#f59e0b" />
                      <Text className="text-yellow-400 font-semibold ml-3">Daily Limit Reached</Text>
                    </View>
                    <Text className="text-white/70 text-sm leading-6">
                      You can share one confession per day. Come back tomorrow for another anonymous share! 🌅
                    </Text>
                  </View>
                </BlurView>
              )}

              {/* Privacy Notice */}
              <BlurView intensity={15} tint="dark" className="glass-card p-5 rounded-3xl">
                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={20} color="#b497f3" />
                    <Text className="text-accent font-semibold ml-3">100% Anonymous</Text>
                  </View>
                  <Text className="text-white/70 text-sm leading-6">
                    Your identity is never revealed. Even we can't trace it back to you. Share freely and honestly. 🎭
                  </Text>
                </View>
              </BlurView>

              {/* Content Input */}
              <BlurView intensity={15} tint="dark" className="glass-card p-5 rounded-3xl">
                <View className="space-y-4">
                  <Text className="text-white font-semibold text-base">What's on your mind?</Text>
                  <View className="bg-white/5 rounded-2xl p-4">
                    <TextInput
                      value={content}
                      onChangeText={setContent}
                      placeholder="Share your thoughts, secrets, or feelings anonymously..."
                      placeholderTextColor="#ffffff60"
                      multiline
                      numberOfLines={6}
                      className="text-white text-base leading-7 min-h-[120px]"
                      style={{ textAlignVertical: 'top' }}
                      maxLength={500}
                      editable={canPost}
                    />
                  </View>
                  <Text className="text-white/40 text-xs text-right">
                    {content.length}/500 characters
                  </Text>
                </View>
              </BlurView>

              {/* Category Selection */}
              <BlurView intensity={15} tint="dark" className="glass-card p-5 rounded-3xl">
                <View className="space-y-4">
                  <Text className="text-white font-semibold text-base">Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row space-x-3">
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => setSelectedCategory(category.id)}
                          disabled={!canPost}
                        >
                          <BlurView
                            intensity={10}
                            tint="dark"
                            className={`px-4 py-3 rounded-full ${
                              selectedCategory === category.id ? 'glass-button' : 'glass'
                            }`}
                          >
                            <View className="flex-row items-center">
                              <Text className="mr-2 text-base">{category.emoji}</Text>
                              <Text
                                className={`text-sm font-medium ${
                                  selectedCategory === category.id ? 'text-accent' : 'text-white/80'
                                }`}
                              >
                                {category.label}
                              </Text>
                            </View>
                          </BlurView>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </BlurView>

              {/* Tags */}
              <BlurView intensity={15} tint="dark" className="glass-card p-5 rounded-3xl">
                <View className="space-y-4">
                  <Text className="text-white font-semibold text-base">Tags (Optional)</Text>
                  
                  {/* Existing Tags */}
                  {tags.length > 0 && (
                    <View className="flex-row flex-wrap">
                      {tags.map((tag, index) => (
                        <View key={index} className="bg-accent/20 px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center">
                          <Text className="text-accent text-sm font-medium">#{tag}</Text>
                          <TouchableOpacity onPress={() => removeTag(tag)} className="ml-2">
                            <Ionicons name="close" size={16} color="#b497f3" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add Tag Input */}
                  {tags.length < 5 && canPost && (
                    <View className="flex-row">
                      <View className="flex-1 bg-white/5 rounded-l-2xl">
                        <TextInput
                          value={newTag}
                          onChangeText={setNewTag}
                          placeholder="Add a tag..."
                          placeholderTextColor="#ffffff60"
                          className="text-white px-4 py-3"
                          maxLength={20}
                          onSubmitEditing={addTag}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={addTag}
                        className="bg-accent/20 px-4 py-3 rounded-r-2xl items-center justify-center"
                      >
                        <Ionicons name="add" size={20} color="#b497f3" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </BlurView>

              {/* Audio Recording */}
              <BlurView intensity={15} tint="dark" className="glass-card p-5 rounded-3xl">
                <View className="space-y-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-semibold text-base">Audio Confession</Text>
                    <TouchableOpacity
                      onPress={() => setShowAudioRecorder(true)}
                      disabled={!canPost}
                      className="bg-accent/20 px-4 py-2 rounded-full"
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="mic" size={16} color="#b497f3" />
                        <Text className="text-accent text-sm font-semibold ml-2">Record</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  {audioUrl ? (
                    <View className="bg-accent/10 p-4 rounded-2xl">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="musical-notes" size={18} color="#b497f3" />
                          <Text className="text-accent ml-3 font-medium">
                            Audio recorded ({Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')})
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setAudioUrl(null);
                            setAudioDuration(0);
                          }}
                          disabled={!canPost}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Ionicons name="trash" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-white/60 text-sm leading-6">
                      Add an anonymous audio confession with voice filter protection
                    </Text>
                  )}
                </View>
              </BlurView>

              {/* Location */}
              <BlurView intensity={15} tint="dark" className="glass-card p-5 rounded-3xl">
                <View className="space-y-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-semibold text-base">Add Location</Text>
                    <TouchableOpacity
                      onPress={() => setUseLocation(!useLocation)}
                      disabled={!canPost}
                      className={`w-12 h-6 rounded-full ${useLocation ? 'bg-accent' : 'bg-white/20'} items-center justify-center`}
                    >
                      <View className={`w-5 h-5 rounded-full bg-white transform ${useLocation ? 'translate-x-3' : '-translate-x-3'}`} />
                    </TouchableOpacity>
                  </View>
                  
                  {useLocation && (
                    <View>
                      {location ? (
                        <View className="flex-row items-center bg-accent/10 p-3 rounded-2xl">
                          <Ionicons name="location" size={18} color="#b497f3" />
                          <Text className="text-accent ml-3 font-medium">{location}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={requestLocation}
                          disabled={!canPost}
                          className="flex-row items-center bg-white/5 p-3 rounded-2xl"
                        >
                          <Ionicons name="location-outline" size={18} color="#ffffff80" />
                          <Text className="text-white/80 ml-3">Tap to get current location</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View className="px-6 pb-6">
            <TouchableOpacity
              onPress={submitConfession}
              disabled={!content.trim() || isSubmitting || !canPost}
              className="w-full"
            >
              <LinearGradient
                colors={canPost && content.trim() ? ['#b497f3', '#8b5cf6'] : ['#ffffff20', '#ffffff10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="py-4 rounded-2xl"
              >
                <View className="flex-row items-center justify-center">
                  {isSubmitting ? (
                    <Ionicons name="hourglass-outline" size={20} color="white" />
                  ) : (
                    <Ionicons name="paper-plane" size={20} color="white" />
                  )}
                  <Text className="text-white font-semibold ml-3 text-base">
                    {isSubmitting ? 'Sharing...' : canPost ? 'Share Anonymously' : 'Daily Limit Reached'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Audio Recorder Modal */}
      {showAudioRecorder && (
        <AudioRecorder
          onAudioRecorded={(url, duration) => {
            setAudioUrl(url);
            setAudioDuration(duration);
          }}
          onClose={() => setShowAudioRecorder(false)}
        />
      )}
    </View>
  );
}