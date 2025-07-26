import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

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

interface ConfessionCardProps {
  confession: Confession;
  onReact: (confessionId: string, reactionType: string) => void;
}

const ConfessionCard: React.FC<ConfessionCardProps> = ({ confession, onReact }) => {
  const [isReacting, setIsReacting] = useState(false);

  const handleReaction = async (reactionType: string) => {
    if (isReacting) return;
    setIsReacting(true);
    await onReact(confession.id, reactionType);
    setIsReacting(false);
  };

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'heart': return 'heart';
      case 'cry': return 'sad';
      case 'laugh': return 'happy';
      case 'relate': return 'checkmark-circle';
      default: return 'heart';
    }
  };

  const getReactionColor = (type: string) => {
    switch (type) {
      case 'heart': return '#ff6b6b';
      case 'cry': return '#4ecdc4';
      case 'laugh': return '#ffe66d';
      case 'relate': return '#b497f3';
      default: return '#b497f3';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <View className="mx-6 mb-4">
      <BlurView intensity={20} tint="dark" className="glass-card rounded-3xl overflow-hidden">
        <View className="p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center mr-4">
                <Text className="text-accent font-medium text-xl">{confession.anonymous_avatar}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">{confession.anonymous_name}</Text>
                <Text className="text-white/60 text-sm">{formatTimeAgo(confession.created_at)}</Text>
              </View>
            </View>
            
            {/* Badges */}
            <View className="flex-row space-x-2">
              {confession.is_confession_of_day && (
                <View className="bg-accent/20 px-3 py-1 rounded-full">
                  <Text className="text-accent text-xs font-semibold">✨ Today</Text>
                </View>
              )}
              {confession.is_featured && (
                <View className="bg-yellow-500/20 px-3 py-1 rounded-full">
                  <Text className="text-yellow-400 text-xs font-semibold">🔥 Hot</Text>
                </View>
              )}
            </View>
          </View>

          {/* Category */}
          <View className="mb-4">
            <View className="bg-accent/10 px-3 py-2 rounded-full self-start">
              <Text className="text-accent text-sm font-medium capitalize">{confession.category}</Text>
            </View>
          </View>

          {/* Content */}
          <Text className="text-white text-base leading-7 mb-5">{confession.content}</Text>

          {/* Tags */}
          {confession.tags && (
            <View className="flex-row flex-wrap mb-4">
              {JSON.parse(confession.tags).map((tag: string, index: number) => (
                <View key={index} className="bg-white/5 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-white/70 text-sm">#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          {confession.location && (
            <View className="flex-row items-center mb-5">
              <Ionicons name="location-outline" size={16} color="#b497f3" />
              <Text className="text-accent text-sm ml-2">{confession.location}</Text>
            </View>
          )}

          {/* Reactions */}
          <View className="border-t border-white/10 pt-4">
            <View className="flex-row justify-between">
              {['heart', 'cry', 'laugh', 'relate'].map((reactionType) => (
                <TouchableOpacity
                  key={reactionType}
                  onPress={() => handleReaction(reactionType)}
                  disabled={isReacting}
                  className={`flex-1 flex-row items-center justify-center py-3 mx-1 rounded-2xl ${
                    confession.user_reaction === reactionType ? 'bg-accent/20' : 'bg-white/5'
                  }`}
                >
                  <Ionicons
                    name={getReactionIcon(reactionType) as any}
                    size={18}
                    color={confession.user_reaction === reactionType ? getReactionColor(reactionType) : '#ffffff60'}
                  />
                  <Text className={`ml-2 text-sm font-medium ${
                    confession.user_reaction === reactionType ? 'text-white' : 'text-white/60'
                  }`}>
                    {confession.reactions?.[reactionType as keyof typeof confession.reactions] || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

export default ConfessionCard;