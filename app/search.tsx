import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { blink } from '../lib/blink';
import BubbleBackground from '../components/BubbleBackground';
import ConfessionCard from '../components/ConfessionCard';

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

export default function SearchScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Confession[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'content' | 'tags' | 'category'>('all');

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
      if (state.user) {
        loadSearchHistory();
        loadPopularTags();
      }
    });
    return unsubscribe;
  }, []);

  const loadSearchHistory = async () => {
    if (!user) return;
    
    try {
      const history = await blink.db.search_history.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        limit: 10
      });
      setSearchHistory(history.map((h: any) => h.query));
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const loadPopularTags = async () => {
    try {
      const confessions = await blink.db.confessions.list({
        where: { tags: { not: null } },
        limit: 100
      });
      
      const tagCounts: { [key: string]: number } = {};
      confessions.forEach((confession: any) => {
        if (confession.tags) {
          const tags = JSON.parse(confession.tags);
          tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      const sortedTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([tag]) => tag);
      
      setPopularTags(sortedTags);
    } catch (error) {
      console.error('Error loading popular tags:', error);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Save to search history
      if (user) {
        await blink.db.search_history.create({
          id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.id,
          query: query.trim()
        });
      }
      
      // Search confessions based on filter
      let searchConditions: any = {};
      
      if (selectedFilter === 'content' || selectedFilter === 'all') {
        // Search in content (case-insensitive)
        const contentResults = await blink.db.confessions.list({
          limit: 50
        });
        
        const filteredResults = contentResults.filter((confession: any) => 
          confession.content.toLowerCase().includes(query.toLowerCase())
        );
        
        if (selectedFilter === 'content') {
          setSearchResults(await loadReactionsForConfessions(filteredResults));
          return;
        }
        
        searchConditions.content = filteredResults;
      }
      
      if (selectedFilter === 'tags' || selectedFilter === 'all') {
        // Search in tags
        const tagResults = await blink.db.confessions.list({
          where: { tags: { not: null } },
          limit: 50
        });
        
        const tagFilteredResults = tagResults.filter((confession: any) => {
          if (!confession.tags) return false;
          const tags = JSON.parse(confession.tags);
          return tags.some((tag: string) => 
            tag.toLowerCase().includes(query.toLowerCase())
          );
        });
        
        if (selectedFilter === 'tags') {
          setSearchResults(await loadReactionsForConfessions(tagFilteredResults));
          return;
        }
        
        searchConditions.tags = tagFilteredResults;
      }
      
      if (selectedFilter === 'category' || selectedFilter === 'all') {
        // Search in category
        const categoryResults = await blink.db.confessions.list({
          where: { category: { like: `%${query.toLowerCase()}%` } },
          limit: 50
        });
        
        if (selectedFilter === 'category') {
          setSearchResults(await loadReactionsForConfessions(categoryResults));
          return;
        }
        
        searchConditions.category = categoryResults;
      }
      
      // Combine all results for 'all' filter
      if (selectedFilter === 'all') {
        const allResults = await blink.db.confessions.list({
          limit: 100
        });
        
        const combinedResults = allResults.filter((confession: any) => {
          const contentMatch = confession.content.toLowerCase().includes(query.toLowerCase());
          const categoryMatch = confession.category.toLowerCase().includes(query.toLowerCase());
          let tagMatch = false;
          
          if (confession.tags) {
            const tags = JSON.parse(confession.tags);
            tagMatch = tags.some((tag: string) => 
              tag.toLowerCase().includes(query.toLowerCase())
            );
          }
          
          return contentMatch || categoryMatch || tagMatch;
        });
        
        setSearchResults(await loadReactionsForConfessions(combinedResults));
      }
      
      // Update search history
      loadSearchHistory();
      
    } catch (error) {
      console.error('Error performing search:', error);
      Alert.alert('Error', 'Failed to search confessions');
    } finally {
      setIsSearching(false);
    }
  };

  const loadReactionsForConfessions = async (confessions: any[]) => {
    return await Promise.all(
      confessions.map(async (confession: any) => {
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

      // Reload search results
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        <SafeAreaView className="flex-1 items-center justify-center">
          <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl glass-card">
            <Text className="text-white text-lg">Loading...</Text>
          </BlurView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <BubbleBackground />
      
      <SafeAreaView className="flex-1">
        {/* Header */}
        <BlurView intensity={20} tint="dark" className="glass border-b border-white/10">
          <View className="flex-row items-center px-4 py-3">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Search & Discover</Text>
          </View>
        </BlurView>

        {/* Search Input */}
        <View className="px-4 py-4">
          <BlurView intensity={15} tint="dark" className="glass-card rounded-2xl">
            <View className="flex-row items-center px-4 py-3">
              <Ionicons name="search" size={20} color="#b497f3" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search confessions, tags, or categories..."
                placeholderTextColor="#ffffff60"
                className="flex-1 text-white ml-3"
                onSubmitEditing={() => performSearch(searchQuery)}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#ffffff60" />
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>

        {/* Search Filters */}
        <View className="px-4 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {[
                { key: 'all', label: 'All', icon: 'apps' },
                { key: 'content', label: 'Content', icon: 'document-text' },
                { key: 'tags', label: 'Tags', icon: 'pricetag' },
                { key: 'category', label: 'Category', icon: 'folder' }
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setSelectedFilter(filter.key as any)}
                  className="mr-3"
                >
                  <BlurView
                    intensity={15}
                    tint="dark"
                    className={`px-4 py-2 rounded-full flex-row items-center ${
                      selectedFilter === filter.key ? 'glass-button' : 'glass'
                    }`}
                  >
                    <Ionicons
                      name={filter.icon as any}
                      size={16}
                      color={selectedFilter === filter.key ? '#b497f3' : '#ffffff80'}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        selectedFilter === filter.key ? 'text-accent' : 'text-white/80'
                      }`}
                    >
                      {filter.label}
                    </Text>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Search Results */}
          {searchQuery.trim() && (
            <View className="mb-6">
              <View className="px-4 mb-4">
                <Text className="text-white font-semibold text-lg">
                  {isSearching ? 'Searching...' : `Results for "${searchQuery}"`}
                </Text>
                {!isSearching && (
                  <Text className="text-white/60 text-sm">
                    {searchResults.length} confession{searchResults.length !== 1 ? 's' : ''} found
                  </Text>
                )}
              </View>
              
              {isSearching ? (
                <View className="items-center py-8">
                  <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl glass-card">
                    <Text className="text-white/60">Searching confessions...</Text>
                  </BlurView>
                </View>
              ) : searchResults.length === 0 ? (
                <View className="items-center py-8">
                  <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl glass-card mx-4">
                    <Text className="text-white/60 text-center">
                      No confessions found for "{searchQuery}"
                    </Text>
                    <Text className="text-white/40 text-sm text-center mt-2">
                      Try different keywords or browse popular tags below
                    </Text>
                  </BlurView>
                </View>
              ) : (
                searchResults.map((confession) => (
                  <ConfessionCard
                    key={confession.id}
                    confession={confession}
                    onReact={handleReaction}
                  />
                ))
              )}
            </View>
          )}

          {/* Search History */}
          {!searchQuery.trim() && searchHistory.length > 0 && (
            <View className="px-4 mb-6">
              <Text className="text-white font-semibold text-lg mb-3">Recent Searches</Text>
              <View className="flex-row flex-wrap">
                {searchHistory.map((query, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSearchQuery(query);
                      performSearch(query);
                    }}
                    className="mr-2 mb-2"
                  >
                    <BlurView intensity={15} tint="dark" className="glass px-3 py-2 rounded-full">
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#ffffff60" />
                        <Text className="text-white/80 text-sm ml-2">{query}</Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Tags */}
          {!searchQuery.trim() && popularTags.length > 0 && (
            <View className="px-4 mb-6">
              <Text className="text-white font-semibold text-lg mb-3">Popular Tags</Text>
              <View className="flex-row flex-wrap">
                {popularTags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSearchQuery(tag);
                      performSearch(tag);
                    }}
                    className="mr-2 mb-2"
                  >
                    <BlurView intensity={15} tint="dark" className="glass-card px-3 py-2 rounded-full">
                      <View className="flex-row items-center">
                        <Text className="text-accent">#</Text>
                        <Text className="text-white/80 text-sm ml-1">{tag}</Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quick Search Suggestions */}
          {!searchQuery.trim() && (
            <View className="px-4 mb-20">
              <Text className="text-white font-semibold text-lg mb-3">Quick Searches</Text>
              <View className="space-y-2">
                {[
                  { query: 'love', icon: '💕', description: 'Romantic confessions and relationships' },
                  { query: 'regret', icon: '😔', description: 'Things people wish they could change' },
                  { query: 'mental health', icon: '🧠', description: 'Mental health struggles and support' },
                  { query: 'family', icon: '👨‍👩‍👧‍👦', description: 'Family dynamics and secrets' },
                  { query: 'work', icon: '💼', description: 'Workplace confessions and stress' }
                ].map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSearchQuery(suggestion.query);
                      performSearch(suggestion.query);
                    }}
                    className="mb-2"
                  >
                    <BlurView intensity={15} tint="dark" className="glass-card p-4 rounded-2xl">
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">{suggestion.icon}</Text>
                        <View className="flex-1">
                          <Text className="text-white font-medium">{suggestion.query}</Text>
                          <Text className="text-white/60 text-sm">{suggestion.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ffffff40" />
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}