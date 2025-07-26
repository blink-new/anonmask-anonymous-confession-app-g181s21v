import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MapPin, Send, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import blink from '@/lib/blink';

const ANONYMOUS_AVATARS = ['🎭', '👤', '🕶️', '🎪', '🎨', '🎯', '🎲', '🎸'];
const ANONYMOUS_NAMES = [
  'Anonymous Dreamer',
  'Secret Keeper',
  'Hidden Truth',
  'Masked Soul',
  'Silent Voice',
  'Mystery Writer',
  'Faceless Friend',
  'Unknown Sage',
];

export default function CreateConfession() {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [canPost, setCanPost] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [anonymousName] = useState(
    ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)]
  );
  const [anonymousAvatar] = useState(
    ANONYMOUS_AVATARS[Math.floor(Math.random() * ANONYMOUS_AVATARS.length)]
  );

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        checkDailyLimit();
      }
    });
    return unsubscribe;
  }, []);

  const checkDailyLimit = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const todaysPosts = await (blink.db as any).user_posts.list({
        where: {
          AND: [
            { user_id: user.id },
            { post_date: today }
          ]
        },
        limit: 1
      });

      setCanPost(todaysPosts.length === 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is needed to tag your confession.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const locationName = address.city || address.district || address.region || 'Unknown Location';
        
        setLocation({
          name: locationName,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your location. Please try again.');
    }
  };

  const submitConfession = async () => {
    if (!user || !content.trim()) return;

    if (!canPost) {
      Alert.alert('Daily Limit Reached', 'You can only post one confession per day. Come back tomorrow!');
      return;
    }

    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Create the confession
      const confession = await (blink.db as any).confessions.create({
        user_id: user.id,
        content: content.trim(),
        location_name: location?.name || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        anonymous_name: anonymousName,
        anonymous_avatar: anonymousAvatar,
        hearts_count: 0,
        comments_count: 0,
      });

      // Record the daily post
      await (blink.db as any).user_posts.create({
        user_id: user.id,
        post_date: today,
        confession_id: confession.id,
      });

      Alert.alert(
        'Confession Shared',
        'Your anonymous confession has been shared with the world.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating confession:', error);
      Alert.alert('Error', 'Could not share your confession. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-text-secondary">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canPost) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-6 py-4 border-b border-gray-800">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-text-primary text-lg font-inter-medium">Daily Limit</Text>
        </View>

        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-6xl mb-6">⏰</Text>
          <Text className="text-text-primary text-xl font-inter-medium mb-4 text-center">
            You've already shared today
          </Text>
          <Text className="text-text-secondary text-center leading-6 mb-8">
            To encourage thoughtful confessions, you can only share one per day. Come back tomorrow to share another anonymous truth.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-primary px-8 py-3 rounded-full"
          >
            <Text className="text-white font-inter-medium">Back to Feed</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-800">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-text-primary text-lg font-inter-medium">New Confession</Text>
          <TouchableOpacity
            onPress={submitConfession}
            disabled={!content.trim() || loading}
            className={`px-4 py-2 rounded-full ${
              content.trim() && !loading ? 'bg-primary' : 'bg-gray-700'
            }`}
          >
            {loading ? (
              <Text className="text-white font-inter">Sharing...</Text>
            ) : (
              <View className="flex-row items-center">
                <Send size={16} color="#FFFFFF" />
                <Text className="text-white font-inter ml-2">Share</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
          {/* Anonymous Identity */}
          <View className="px-6 py-4 border-b border-gray-800">
            <Text className="text-text-secondary text-sm mb-2">Posting as</Text>
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">{anonymousAvatar}</Text>
              <Text className="text-text-primary font-inter-medium">{anonymousName}</Text>
            </View>
          </View>

          {/* Content Input */}
          <View className="px-6 py-6">
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Share your anonymous confession..."
              placeholderTextColor="#A1A1AA"
              multiline
              className="text-text-primary text-base leading-6 min-h-[200px]"
              style={{ textAlignVertical: 'top' }}
              maxLength={500}
            />
            <Text className="text-text-secondary text-sm text-right mt-2">
              {content.length}/500
            </Text>
          </View>

          {/* Location Section */}
          <View className="px-6 py-4 border-t border-gray-800">
            <Text className="text-text-secondary text-sm mb-3">Location (optional)</Text>
            {location ? (
              <View className="flex-row items-center justify-between bg-card p-3 rounded-xl">
                <View className="flex-row items-center flex-1">
                  <MapPin size={16} color="#F59E0B" />
                  <Text className="text-text-primary ml-2 flex-1">{location.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setLocation(null)}>
                  <Text className="text-accent">Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={requestLocation}
                className="flex-row items-center justify-center bg-card p-3 rounded-xl"
              >
                <MapPin size={16} color="#A1A1AA" />
                <Text className="text-text-secondary ml-2">Add location</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Daily Limit Info */}
          <View className="px-6 py-4 bg-card/30 mx-6 rounded-xl mt-4">
            <View className="flex-row items-center mb-2">
              <Clock size={16} color="#F59E0B" />
              <Text className="text-accent font-inter-medium ml-2">Daily Limit</Text>
            </View>
            <Text className="text-text-secondary text-sm">
              You can share one confession per day to encourage thoughtful, meaningful posts.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}