import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { blink } from '../lib/blink';
import BubbleBackground from '../components/BubbleBackground';
import ConfessionCard from '../components/ConfessionCard';
import FloatingActionButton from '../components/FloatingActionButton';
import BottomNavigation from '../components/BottomNavigation';
import CategoryFilter from '../components/CategoryFilter';
import ConfessionOfTheDay from '../components/ConfessionOfTheDay';

interface User {
  id: string;
  email: string;
  display_name?: string;
}

interface Confession {
  id: string;
  content: string;
  category: string;
  tags?: string;
  anonymous_name: string;
  anonymous_avatar: string;
  location?: string;
  is_featured: boolean;
  is_confession_of_day: boolean;
  created_at: string;
  reactions?: {
    heart: number;
    cry: number;
    laugh: number;
    relate: number;
  };
  user_reaction?: string;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
      if (state.user) {
        loadConfessions();
      }
    });
    return unsubscribe;
  }, []);

  const loadConfessions = async () => {
    try {
      const confessionsData = await blink.db.confessions.list({
        orderBy: sortBy === 'latest' ? { created_at: 'desc' } : { created_at: 'desc' },
        limit: 50,
        where: selectedCategory !== 'all' ? { category: selectedCategory } : undefined
      });

      const confessionsWithReactions = await Promise.all(
        confessionsData.map(async (confession: any) => {
          const reactions = await blink.db.confession_reactions.list({
            where: { confession_id: confession.id }
          });

          const reactionCounts = {
            heart: reactions.filter((r: any) => r.reaction_type === 'heart').length,
            cry: reactions.filter((r: any) => r.reaction_type === 'cry').length,
            laugh: reactions.filter((r: any) => r.reaction_type === 'laugh').length,
            relate: reactions.filter((r: any) => r.reaction_type === 'relate').length,
          };

          const userReaction = reactions.find((r: any) => r.user_id === user?.id)?.reaction_type;

          return {
            ...confession,
            reactions: reactionCounts,
            user_reaction: userReaction
          };
        })
      );

      setConfessions(confessionsWithReactions);
    } catch (error) {
      console.error('Error loading confessions:', error);
    }
  };

  const handleReaction = async (confessionId: string, reactionType: string) => {
    if (!user) return;

    try {
      const existingReaction = await blink.db.confession_reactions.list({
        where: { 
          confession_id: confessionId, 
          user_id: user.id, 
          reaction_type: reactionType 
        }
      });

      if (existingReaction.length > 0) {
        await blink.db.confession_reactions.delete(existingReaction[0].id);
      } else {
        const allUserReactions = await blink.db.confession_reactions.list({
          where: { confession_id: confessionId, user_id: user.id }
        });
        
        for (const reaction of allUserReactions) {
          await blink.db.confession_reactions.delete(reaction.id);
        }

        await blink.db.confession_reactions.create({
          id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          confession_id: confessionId,
          user_id: user.id,
          reaction_type: reactionType
        });
      }

      loadConfessions();
    } catch (error) {
      console.error('Error handling reaction:', error);
      Alert.alert('Error', 'Failed to update reaction');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConfessions();
    setRefreshing(false);
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'search') {
      router.push('/search');
    } else if (tab === 'inbox') {
      router.push('/inbox');
    } else if (tab === 'profile') {
      router.push('/settings');
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
                <Text className="text-white text-lg font-medium">Loading AnonMask...</Text>
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
            <BlurView intensity={25} tint="dark" className="glass-card p-8 rounded-3xl w-full max-w-sm">
              <View className="items-center space-y-6">
                <View className="items-center space-y-4">
                  <View className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center">
                    <Text className="text-4xl">🎭</Text>
                  </View>
                  <View className="items-center space-y-2">
                    <Text className="text-white text-2xl font-bold">Welcome to AnonMask</Text>
                    <Text className="text-white/70 text-center text-sm leading-6">
                      Share your secrets anonymously. Your identity is never revealed. Even we can't trace it.
                    </Text>
                  </View>
                </View>
                
                <View className="w-full space-y-4">
                  <TouchableOpacity
                    onPress={() => blink.auth.login()}
                    className="w-full"
                  >
                    <LinearGradient
                      colors={['#b497f3', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="py-4 rounded-xl"
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="logo-google" size={20} color="white" />
                        <Text className="text-white font-semibold ml-3">Continue with Google</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <View className="bg-white/5 p-4 rounded-xl">
                    <Text className="text-white/60 text-xs text-center leading-5">
                      🔒 Your identity is protected by advanced encryption
                    </Text>
                  </View>
                </View>
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
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mr-3">
                  <Text className="text-2xl">🎭</Text>
                </View>
                <Text className="text-white text-xl font-bold">AnonMask</Text>
              </View>
              
              <View className="flex-row items-center space-x-4">
                <TouchableOpacity 
                  onPress={() => router.push('/inbox')} 
                  className="w-10 h-10 items-center justify-center"
                >
                  <Ionicons name="mail-outline" size={24} color="#ffffff80" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => router.push('/settings')}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Ionicons name="settings-outline" size={24} color="#ffffff80" />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Sort Toggle */}
        <View className="px-6 py-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-3">
              {[
                { key: 'latest', label: 'Latest', icon: 'time-outline' },
                { key: 'popular', label: 'Popular', icon: 'flame-outline' },
                { key: 'trending', label: 'Trending', icon: 'trending-up-outline' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  onPress={() => setSortBy(sort.key as any)}
                >
                  <BlurView
                    intensity={15}
                    tint="dark"
                    className={`px-4 py-3 rounded-full ${
                      sortBy === sort.key ? 'glass-button' : 'glass'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={sort.icon as any}
                        size={16}
                        color={sortBy === sort.key ? '#b497f3' : '#ffffff80'}
                      />
                      <Text
                        className={`ml-2 text-sm font-medium ${
                          sortBy === sort.key ? 'text-accent' : 'text-white/80'
                        }`}
                      >
                        {sort.label}
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategorySelect={(category) => {
            setSelectedCategory(category);
            loadConfessions();
          }}
        />

        {/* Confession of the Day */}
        <ConfessionOfTheDay onReact={handleReaction} />

        {/* Confessions Feed */}
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b497f3" />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {confessions.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20 px-6">
              <BlurView intensity={20} tint="dark" className="glass-card p-8 rounded-3xl w-full max-w-sm">
                <View className="items-center space-y-4">
                  <Text className="text-6xl">🎭</Text>
                  <View className="items-center space-y-2">
                    <Text className="text-white font-semibold text-lg">No confessions yet</Text>
                    <Text className="text-white/60 text-center text-sm leading-6">
                      Be the first to share anonymously! Your story matters.
                    </Text>
                  </View>
                </View>
              </BlurView>
            </View>
          ) : (
            <View className="space-y-4">
              {confessions.map((confession) => (
                <ConfessionCard
                  key={confession.id}
                  confession={confession}
                  onReact={handleReaction}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Floating Action Button */}
      <FloatingActionButton onPress={() => router.push('/create')} />

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}