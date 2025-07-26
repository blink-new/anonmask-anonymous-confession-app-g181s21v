import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Plus, TrendingUp, Clock, MapPin, Heart } from 'lucide-react-native';
import blink from '@/lib/blink';

interface Confession {
  id: string;
  content: string;
  location_name?: string;
  anonymous_name: string;
  anonymous_avatar: string;
  hearts_count: number;
  comments_count: number;
  created_at: string;
}

export default function Home() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState<'recent' | 'trending'>('recent');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadConfessions();
      }
    });
    return unsubscribe;
  }, [feedType]);

  const loadConfessions = async () => {
    try {
      const orderBy = feedType === 'trending' 
        ? { hearts_count: 'desc' as const }
        : { created_at: 'desc' as const };

      const data = await (blink.db as any).confessions.list({
        orderBy,
        limit: 50,
      });

      setConfessions(data);
    } catch (error) {
      console.error('Error loading confessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConfessions();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const toggleHeart = async (confessionId: string) => {
    if (!user) return;
    
    try {
      // Check if already hearted
      const existingHeart = await (blink.db as any).hearts.list({
        where: {
          AND: [
            { user_id: user.id },
            { confession_id: confessionId }
          ]
        },
        limit: 1
      });

      if (existingHeart.length > 0) {
        // Remove heart
        await (blink.db as any).hearts.delete(existingHeart[0].id);
        // Update confession hearts count
        const confession = confessions.find(c => c.id === confessionId);
        if (confession) {
          await (blink.db as any).confessions.update(confessionId, {
            hearts_count: Math.max(0, confession.hearts_count - 1)
          });
        }
      } else {
        // Add heart
        await (blink.db as any).hearts.create({
          user_id: user.id,
          confession_id: confessionId
        });
        // Update confession hearts count
        const confession = confessions.find(c => c.id === confessionId);
        if (confession) {
          await (blink.db as any).confessions.update(confessionId, {
            hearts_count: confession.hearts_count + 1
          });
        }
      }

      // Refresh the feed
      loadConfessions();
    } catch (error) {
      console.error('Error toggling heart:', error);
    }
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-6xl mb-4">🎭</Text>
          <Text className="text-text-primary text-2xl font-inter-medium mb-2">AnonMask</Text>
          <Text className="text-text-secondary text-center">
            Loading your anonymous space...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Text className="text-3xl mr-3">🎭</Text>
            <Text className="text-text-primary text-xl font-inter-medium">AnonMask</Text>
          </View>
        </View>

        {/* Feed Toggle */}
        <View className="flex-row bg-card rounded-full p-1">
          <TouchableOpacity
            onPress={() => setFeedType('recent')}
            className={`flex-1 flex-row items-center justify-center py-2 px-4 rounded-full ${
              feedType === 'recent' ? 'bg-primary' : ''
            }`}
          >
            <Clock size={16} color={feedType === 'recent' ? '#FFFFFF' : '#A1A1AA'} />
            <Text className={`ml-2 font-inter ${
              feedType === 'recent' ? 'text-white' : 'text-text-secondary'
            }`}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFeedType('trending')}
            className={`flex-1 flex-row items-center justify-center py-2 px-4 rounded-full ${
              feedType === 'trending' ? 'bg-primary' : ''
            }`}
          >
            <TrendingUp size={16} color={feedType === 'trending' ? '#FFFFFF' : '#A1A1AA'} />
            <Text className={`ml-2 font-inter ${
              feedType === 'trending' ? 'text-white' : 'text-text-secondary'
            }`}>
              Trending
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confessions Feed */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        <View className="px-6 py-4 space-y-4">
          {confessions.map((confession) => (
            <View key={confession.id} className="bg-card rounded-2xl p-4 border border-gray-800">
              {/* Anonymous User Info */}
              <View className="flex-row items-center mb-3">
                <Text className="text-2xl mr-3">{confession.anonymous_avatar}</Text>
                <View className="flex-1">
                  <Text className="text-text-primary font-inter-medium">
                    {confession.anonymous_name}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-text-secondary text-sm">
                      {formatTimeAgo(confession.created_at)}
                    </Text>
                    {confession.location_name && (
                      <>
                        <Text className="text-text-secondary mx-2">•</Text>
                        <MapPin size={12} color="#F59E0B" />
                        <Text className="text-accent text-sm ml-1">
                          {confession.location_name}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Confession Content */}
              <Text className="text-text-primary text-base leading-6 mb-4">
                {confession.content}
              </Text>

              {/* Engagement */}
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => toggleHeart(confession.id)}
                  className="flex-row items-center"
                >
                  <Heart size={20} color="#F59E0B" fill={confession.hearts_count > 0 ? "#F59E0B" : "transparent"} />
                  <Text className="text-text-secondary ml-2">
                    {confession.hearts_count}
                  </Text>
                </TouchableOpacity>
                <Text className="text-text-secondary text-sm">
                  {confession.comments_count} replies
                </Text>
              </View>
            </View>
          ))}

          {confessions.length === 0 && !loading && (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">🎭</Text>
              <Text className="text-text-primary text-lg font-inter-medium mb-2">
                No confessions yet
              </Text>
              <Text className="text-text-secondary text-center">
                Be the first to share an anonymous confession
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Create Button */}
      <TouchableOpacity
        onPress={() => router.push('/create')}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}