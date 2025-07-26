import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { blink } from '../lib/blink';
import BubbleBackground from '../components/BubbleBackground';

interface User {
  id: string;
  email: string;
  display_name?: string;
}

interface InboxMessage {
  id: string;
  sender_id?: string;
  recipient_id: string;
  confession_id?: string;
  content: string;
  is_anonymous: boolean;
  is_read: boolean;
  created_at: string;
}

export default function InboxScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
      if (state.user) {
        loadMessages();
      }
    });
    return unsubscribe;
  }, []);

  const loadMessages = async () => {
    if (!user) return;

    try {
      const inboxMessages = await blink.db.inbox_messages.list({
        where: { recipient_id: user.id },
        orderBy: { created_at: 'desc' },
        limit: 50
      });

      setMessages(inboxMessages);
      
      // Count unread messages
      const unread = inboxMessages.filter((msg: any) => !Number(msg.is_read)).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await blink.db.inbox_messages.update(messageId, { is_read: true });
      loadMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendReply = async () => {
    if (!user || !selectedMessage || !replyContent.trim()) return;

    setIsReplying(true);

    try {
      // Send anonymous reply
      await blink.db.inbox_messages.create({
        id: `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_id: user.id,
        recipient_id: selectedMessage.sender_id || 'anonymous',
        confession_id: selectedMessage.confession_id,
        content: replyContent.trim(),
        is_anonymous: true,
        is_read: false
      });

      setReplyContent('');
      Alert.alert('Reply Sent', 'Your anonymous reply has been sent!');
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await blink.db.inbox_messages.delete(messageId);
              loadMessages();
              setSelectedMessage(null);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        <SafeAreaView className="flex-1 items-center justify-center">
          <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl glass-card">
            <Text className="text-white text-lg">Loading inbox...</Text>
          </BlurView>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        <SafeAreaView className="flex-1 items-center justify-center">
          <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl glass-card">
            <Text className="text-white text-lg">Please sign in to view inbox</Text>
          </BlurView>
        </SafeAreaView>
      </View>
    );
  }

  if (selectedMessage) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        
        <SafeAreaView className="flex-1">
          {/* Header */}
          <BlurView intensity={20} tint="dark" className="glass border-b border-white/10">
            <View className="flex-row items-center justify-between px-4 py-3">
              <TouchableOpacity onPress={() => setSelectedMessage(null)}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-lg font-semibold">Anonymous Message</Text>
              <TouchableOpacity onPress={() => deleteMessage(selectedMessage.id)}>
                <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </BlurView>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView className="flex-1 p-4">
              {/* Message Content */}
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4 mb-6">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mr-3">
                    <Text className="text-accent text-lg">👤</Text>
                  </View>
                  <View>
                    <Text className="text-white font-medium">Anonymous User</Text>
                    <Text className="text-white/60 text-xs">{formatTimeAgo(selectedMessage.created_at)}</Text>
                  </View>
                </View>
                
                <Text className="text-white text-base leading-6">{selectedMessage.content}</Text>
                
                {selectedMessage.confession_id && (
                  <View className="mt-4 pt-4 border-t border-white/10">
                    <Text className="text-white/60 text-sm">💭 In response to a confession</Text>
                  </View>
                )}
              </BlurView>

              {/* Reply Section */}
              <BlurView intensity={15} tint="dark" className="glass-card rounded-2xl p-4">
                <Text className="text-white font-medium mb-3">Send Anonymous Reply</Text>
                <TextInput
                  value={replyContent}
                  onChangeText={setReplyContent}
                  placeholder="Type your anonymous reply..."
                  placeholderTextColor="#ffffff60"
                  multiline
                  numberOfLines={4}
                  className="text-white text-base leading-6 bg-white/5 p-3 rounded-xl mb-4"
                  style={{ textAlignVertical: 'top' }}
                  maxLength={300}
                />
                
                <View className="flex-row items-center justify-between">
                  <Text className="text-white/40 text-xs">{replyContent.length}/300</Text>
                  <TouchableOpacity
                    onPress={sendReply}
                    disabled={!replyContent.trim() || isReplying}
                    className={`px-6 py-3 rounded-xl ${
                      replyContent.trim() ? 'bg-accent' : 'bg-white/10'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={isReplying ? "hourglass-outline" : "paper-plane"} 
                        size={16} 
                        color="white" 
                      />
                      <Text className="text-white font-medium ml-2">
                        {isReplying ? 'Sending...' : 'Reply'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </ScrollView>
          </KeyboardAvoidingView>
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
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-row items-center">
              <Text className="text-white text-xl font-bold">Inbox</Text>
              {unreadCount > 0 && (
                <View className="bg-accent rounded-full w-6 h-6 items-center justify-center ml-2">
                  <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={loadMessages}>
              <Ionicons name="refresh" size={24} color="#ffffff80" />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Privacy Notice */}
        <View className="px-4 py-4">
          <BlurView intensity={15} tint="dark" className="glass-card p-4 rounded-2xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="shield-checkmark" size={20} color="#b497f3" />
              <Text className="text-accent font-medium ml-2">Anonymous Inbox</Text>
            </View>
            <Text className="text-white/70 text-sm">
              All messages are completely anonymous. Neither you nor the sender can see each other's identity.
            </Text>
          </BlurView>
        </View>

        {/* Messages List */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View className="items-center justify-center py-20">
              <BlurView intensity={20} tint="dark" className="p-8 rounded-2xl glass-card mx-4">
                <View className="items-center">
                  <Text className="text-6xl mb-4">📬</Text>
                  <Text className="text-white font-semibold text-lg mb-2">No Messages Yet</Text>
                  <Text className="text-white/60 text-center">
                    When someone sends you an anonymous message, it will appear here.
                  </Text>
                </View>
              </BlurView>
            </View>
          ) : (
            <View className="px-4 pb-20">
              {messages.map((message) => (
                <TouchableOpacity
                  key={message.id}
                  onPress={() => {
                    setSelectedMessage(message);
                    if (!Number(message.is_read)) {
                      markAsRead(message.id);
                    }
                  }}
                  className="mb-3"
                >
                  <BlurView 
                    intensity={20} 
                    tint="dark" 
                    className={`rounded-2xl overflow-hidden ${
                      !Number(message.is_read) ? 'glass-button border-accent/30' : 'glass-card'
                    }`}
                  >
                    <View className="p-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mr-3">
                            <Text className="text-accent text-lg">👤</Text>
                          </View>
                          <View>
                            <Text className="text-white font-medium">Anonymous User</Text>
                            <Text className="text-white/60 text-xs">{formatTimeAgo(message.created_at)}</Text>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center">
                          {!Number(message.is_read) && (
                            <View className="w-3 h-3 bg-accent rounded-full mr-2" />
                          )}
                          <Ionicons name="chevron-forward" size={20} color="#ffffff40" />
                        </View>
                      </View>
                      
                      <Text 
                        className="text-white/80 text-sm leading-5" 
                        numberOfLines={2}
                      >
                        {message.content}
                      </Text>
                      
                      {message.confession_id && (
                        <View className="mt-2">
                          <Text className="text-accent text-xs">💭 Reply to confession</Text>
                        </View>
                      )}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}