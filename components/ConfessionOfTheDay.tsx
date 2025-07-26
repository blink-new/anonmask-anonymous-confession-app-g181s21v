import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { blink } from '../lib/blink';

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
  sentiment_score: number;
  ai_sentiment?: string;
  reactions?: {
    heart: number;
    cry: number;
    laugh: number;
    relate: number;
  };
  user_reaction?: string;
}

interface ConfessionOfTheDayProps {
  onReact: (confessionId: string, reactionType: string) => void;
}

const ConfessionOfTheDay: React.FC<ConfessionOfTheDayProps> = ({ onReact }) => {
  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadConfessionOfTheDay();
  }, []);

  const loadConfessionOfTheDay = async () => {
    try {
      // First, check if there's already a confession of the day
      const existingCOTD = await blink.db.confessions.list({
        where: { is_confession_of_day: true },
        orderBy: { created_at: 'desc' },
        limit: 1
      });

      if (existingCOTD.length > 0) {
        const cotd = existingCOTD[0];
        const reactions = await loadReactionsForConfession(cotd.id);
        setConfession({ ...cotd, ...reactions });
        setLoading(false);
        return;
      }

      // If no COTD exists, select one using AI sentiment analysis
      await selectNewConfessionOfTheDay();
    } catch (error) {
      console.error('Error loading confession of the day:', error);
      setLoading(false);
    }
  };

  const selectNewConfessionOfTheDay = async () => {
    setIsAnalyzing(true);
    
    try {
      // Get recent confessions from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentConfessions = await blink.db.confessions.list({
        where: { 
          created_at: { gte: yesterday.toISOString() },
          is_confession_of_day: false
        },
        limit: 20
      });

      if (recentConfessions.length === 0) {
        setLoading(false);
        setIsAnalyzing(false);
        return;
      }

      // Use AI to analyze sentiment and select the best confession
      const analysisPrompt = `
        Analyze these anonymous confessions and select the most impactful one for "Confession of the Day".
        Consider factors like:
        - Emotional resonance and relatability
        - Positive impact on community
        - Authenticity and vulnerability
        - Universal themes that many can connect with
        
        Confessions:
        ${recentConfessions.map((c: any, i: number) => 
          `${i + 1}. "${c.content}" (Category: ${c.category})`
        ).join('\n')}
        
        Respond with JSON format:
        {
          "selectedIndex": number (0-based index),
          "sentiment": "positive" | "neutral" | "negative",
          "reasoning": "brief explanation of why this confession was selected",
          "emotionalImpact": number (1-10 scale)
        }
      `;

      const { object: analysis } = await blink.ai.generateObject({
        prompt: analysisPrompt,
        schema: {
          type: 'object',
          properties: {
            selectedIndex: { type: 'number' },
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
            reasoning: { type: 'string' },
            emotionalImpact: { type: 'number', minimum: 1, maximum: 10 }
          },
          required: ['selectedIndex', 'sentiment', 'reasoning', 'emotionalImpact']
        }
      });

      const selectedConfession = recentConfessions[analysis.selectedIndex];
      
      if (selectedConfession) {
        // Update the selected confession as COTD
        await blink.db.confessions.update(selectedConfession.id, {
          is_confession_of_day: true,
          is_featured: true,
          ai_sentiment: analysis.sentiment,
          sentiment_score: analysis.emotionalImpact
        });

        // Load reactions and set as current COTD
        const reactions = await loadReactionsForConfession(selectedConfession.id);
        setConfession({
          ...selectedConfession,
          is_confession_of_day: true,
          is_featured: true,
          ai_sentiment: analysis.sentiment,
          sentiment_score: analysis.emotionalImpact,
          ...reactions
        });
      }
    } catch (error) {
      console.error('Error selecting confession of the day:', error);
      Alert.alert('Error', 'Failed to analyze confessions with AI');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  const loadReactionsForConfession = async (confessionId: string) => {
    try {
      const reactions = await blink.db.confession_reactions.list({
        where: { confession_id: confessionId }
      });

      const reactionCounts = {
        heart: reactions.filter((r: any) => r.reaction_type === 'heart').length,
        cry: reactions.filter((r: any) => r.reaction_type === 'cry').length,
        laugh: reactions.filter((r: any) => r.reaction_type === 'laugh').length,
        relate: reactions.filter((r: any) => r.reaction_type === 'relate').length,
      };

      return { reactions: reactionCounts };
    } catch (error) {
      console.error('Error loading reactions:', error);
      return { reactions: { heart: 0, cry: 0, laugh: 0, relate: 0 } };
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!confession) return;
    await onReact(confession.id, reactionType);
    
    // Reload reactions
    const reactions = await loadReactionsForConfession(confession.id);
    setConfession({ ...confession, ...reactions });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '#22c55e';
      case 'negative': return '#ef4444';
      default: return '#b497f3';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'happy-outline';
      case 'negative': return 'sad-outline';
      default: return 'heart-outline';
    }
  };

  if (loading || isAnalyzing) {
    return (
      <View className="mx-4 mb-6">
        <BlurView intensity={25} tint="dark" className="rounded-3xl overflow-hidden glass-card">
          <LinearGradient
            colors={['#b497f3', '#8b5cf6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-1"
          >
            <BlurView intensity={20} tint="dark" className="rounded-3xl p-6">
              <View className="items-center">
                <View className="w-16 h-16 rounded-full bg-accent/20 items-center justify-center mb-4">
                  <Text className="text-3xl">✨</Text>
                </View>
                <Text className="text-white font-bold text-xl mb-2">Confession of the Day</Text>
                <Text className="text-white/70 text-center">
                  {isAnalyzing ? 'AI is analyzing confessions...' : 'Loading today\'s featured confession...'}
                </Text>
              </View>
            </BlurView>
          </LinearGradient>
        </BlurView>
      </View>
    );
  }

  if (!confession) {
    return (
      <View className="mx-4 mb-6">
        <BlurView intensity={25} tint="dark" className="rounded-3xl overflow-hidden glass-card">
          <LinearGradient
            colors={['#b497f3', '#8b5cf6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-1"
          >
            <BlurView intensity={20} tint="dark" className="rounded-3xl p-6">
              <View className="items-center">
                <View className="w-16 h-16 rounded-full bg-accent/20 items-center justify-center mb-4">
                  <Text className="text-3xl">🎭</Text>
                </View>
                <Text className="text-white font-bold text-xl mb-2">No Confession Today</Text>
                <Text className="text-white/70 text-center">
                  Be the first to share an anonymous confession today!
                </Text>
              </View>
            </BlurView>
          </LinearGradient>
        </BlurView>
      </View>
    );
  }

  return (
    <View className="mx-4 mb-6">
      <BlurView intensity={25} tint="dark" className="rounded-3xl overflow-hidden glass-card">
        <LinearGradient
          colors={['#b497f3', '#8b5cf6', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-1"
        >
          <BlurView intensity={20} tint="dark" className="rounded-3xl p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center mr-3">
                  <Text className="text-2xl">✨</Text>
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">Confession of the Day</Text>
                  <Text className="text-white/70 text-sm">Selected by AI</Text>
                </View>
              </View>
              
              {confession.ai_sentiment && (
                <View className="flex-row items-center bg-white/10 px-3 py-1 rounded-full">
                  <Ionicons 
                    name={getSentimentIcon(confession.ai_sentiment) as any} 
                    size={16} 
                    color={getSentimentColor(confession.ai_sentiment)} 
                  />
                  <Text 
                    className="text-sm font-medium ml-1 capitalize"
                    style={{ color: getSentimentColor(confession.ai_sentiment) }}
                  >
                    {confession.ai_sentiment}
                  </Text>
                </View>
              )}
            </View>

            {/* Author */}
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mr-3">
                <Text className="text-accent font-medium text-lg">{confession.anonymous_avatar}</Text>
              </View>
              <View>
                <Text className="text-white font-medium">{confession.anonymous_name}</Text>
                <Text className="text-white/60 text-xs">Anonymous • {confession.category}</Text>
              </View>
            </View>

            {/* Content */}
            <Text className="text-white text-base leading-6 mb-4">{confession.content}</Text>

            {/* Tags */}
            {confession.tags && (
              <View className="flex-row flex-wrap mb-4">
                {JSON.parse(confession.tags).map((tag: string, index: number) => (
                  <View key={index} className="bg-white/10 px-2 py-1 rounded-full mr-2 mb-1">
                    <Text className="text-white/80 text-xs">#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI Impact Score */}
            {confession.sentiment_score && (
              <View className="bg-white/5 p-3 rounded-xl mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white/80 text-sm">AI Emotional Impact</Text>
                  <View className="flex-row items-center">
                    <View className="flex-row">
                      {[...Array(10)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < confession.sentiment_score ? "star" : "star-outline"}
                          size={12}
                          color={i < confession.sentiment_score ? "#fbbf24" : "#ffffff40"}
                        />
                      ))}
                    </View>
                    <Text className="text-white/80 text-sm ml-2">{confession.sentiment_score}/10</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Reactions */}
            <View className="flex-row justify-between items-center pt-4 border-t border-white/10">
              {['heart', 'cry', 'laugh', 'relate'].map((reactionType) => (
                <TouchableOpacity
                  key={reactionType}
                  onPress={() => handleReaction(reactionType)}
                  className={`flex-row items-center px-3 py-2 rounded-full ${
                    confession.user_reaction === reactionType ? 'bg-accent/20' : 'bg-white/5'
                  }`}
                >
                  <Ionicons
                    name={
                      reactionType === 'heart' ? 'heart' :
                      reactionType === 'cry' ? 'sad' :
                      reactionType === 'laugh' ? 'happy' : 'checkmark-circle'
                    }
                    size={16}
                    color={
                      confession.user_reaction === reactionType ? 
                        (reactionType === 'heart' ? '#ff6b6b' :
                         reactionType === 'cry' ? '#4ecdc4' :
                         reactionType === 'laugh' ? '#ffe66d' : '#b497f3') : 
                        '#ffffff60'
                    }
                  />
                  <Text className={`ml-1 text-xs ${
                    confession.user_reaction === reactionType ? 'text-white' : 'text-white/60'
                  }`}>
                    {confession.reactions?.[reactionType as keyof typeof confession.reactions] || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

export default ConfessionOfTheDay;