import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { blink } from '../lib/blink';
import BubbleBackground from '../components/BubbleBackground';

interface User {
  id: string;
  email: string;
  display_name?: string;
}

interface UserSettings {
  id: string;
  user_id: string;
  theme: 'dark' | 'light' | 'neon';
  notifications_enabled: boolean;
  location_enabled: boolean;
}

export default function SettingsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'neon'>('dark');

  const themes = [
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Classic dark theme with purple accents',
      colors: ['#1e1e2f', '#2a2a3e'],
      accent: '#b497f3',
      icon: '🌙'
    },
    {
      id: 'light',
      name: 'Light Mode',
      description: 'Clean light theme with soft shadows',
      colors: ['#f8f9fa', '#ffffff'],
      accent: '#6366f1',
      icon: '☀️'
    },
    {
      id: 'neon',
      name: 'Neon Mode',
      description: 'Cyberpunk-inspired neon theme',
      colors: ['#0a0a0a', '#1a1a2e'],
      accent: '#00ff88',
      icon: '⚡'
    }
  ];

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
      if (state.user) {
        loadUserSettings();
      }
    });
    return unsubscribe;
  }, []);

  const loadUserSettings = async () => {
    if (!user) return;

    try {
      const userSettings = await blink.db.user_settings.list({
        where: { user_id: user.id },
        limit: 1
      });

      if (userSettings.length > 0) {
        const settings = userSettings[0];
        setSettings(settings);
        setSelectedTheme(settings.theme as 'dark' | 'light' | 'neon');
      } else {
        // Create default settings
        const defaultSettings = {
          id: `settings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.id,
          theme: 'dark',
          notifications_enabled: true,
          location_enabled: false
        };
        
        await blink.db.user_settings.create(defaultSettings);
        setSettings(defaultSettings as any);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (!settings || !user) return;

    try {
      await blink.db.user_settings.update(settings.id, {
        [key]: value,
        updated_at: new Date().toISOString()
      });

      setSettings({ ...settings, [key]: value } as any);
      
      if (key === 'theme') {
        setSelectedTheme(value);
        Alert.alert('Theme Updated', `Switched to ${value} mode!`);
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const clearSearchHistory = async () => {
    if (!user) return;

    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear all your search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const searchHistory = await blink.db.search_history.list({
                where: { user_id: user.id }
              });
              
              for (const search of searchHistory) {
                await blink.db.search_history.delete(search.id);
              }
              
              Alert.alert('Success', 'Search history cleared!');
            } catch (error) {
              console.error('Error clearing search history:', error);
              Alert.alert('Error', 'Failed to clear search history');
            }
          }
        }
      ]
    );
  };

  const exportData = async () => {
    if (!user) return;

    Alert.alert(
      'Export Data',
      'This feature will be available soon. You\'ll be able to export all your anonymous confessions and settings.',
      [{ text: 'OK' }]
    );
  };

  const deleteAccount = async () => {
    if (!user) return;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete all your confessions, reactions, and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete everything. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Delete user's confessions
                      const confessions = await blink.db.confessions.list({
                        where: { user_id: user.id }
                      });
                      for (const confession of confessions) {
                        await blink.db.confessions.delete(confession.id);
                      }

                      // Delete user's reactions
                      const reactions = await blink.db.confession_reactions.list({
                        where: { user_id: user.id }
                      });
                      for (const reaction of reactions) {
                        await blink.db.confession_reactions.delete(reaction.id);
                      }

                      // Delete user's messages
                      const messages = await blink.db.inbox_messages.list({
                        where: { recipient_id: user.id }
                      });
                      for (const message of messages) {
                        await blink.db.inbox_messages.delete(message.id);
                      }

                      // Delete user settings
                      if (settings) {
                        await blink.db.user_settings.delete(settings.id);
                      }

                      // Sign out
                      blink.auth.logout();
                      
                      Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.');
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary">
        <BubbleBackground />
        <SafeAreaView className="flex-1 items-center justify-center">
          <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl glass-card">
            <Text className="text-white text-lg">Loading settings...</Text>
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
            <Text className="text-white text-lg">Please sign in to access settings</Text>
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
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Settings</Text>
            <View className="w-6" />
          </View>
        </BlurView>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View className="px-4 py-6">
            <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4">
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-full bg-accent/20 items-center justify-center mr-4">
                  <Text className="text-accent text-2xl">🎭</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-lg">Anonymous User</Text>
                  <Text className="text-white/60 text-sm">{user.email}</Text>
                  <Text className="text-accent text-xs mt-1">Your identity is always protected</Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Theme Selection */}
          <View className="px-4 mb-6">
            <Text className="text-white font-semibold text-lg mb-4">Theme</Text>
            <View className="space-y-3">
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => updateSetting('theme', theme.id)}
                  className="mb-3"
                >
                  <BlurView
                    intensity={20}
                    tint="dark"
                    className={`rounded-2xl overflow-hidden ${
                      selectedTheme === theme.id ? 'glass-button border-accent/30' : 'glass-card'
                    }`}
                  >
                    <View className="p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <Text className="text-2xl mr-3">{theme.icon}</Text>
                          <View className="flex-1">
                            <Text className="text-white font-medium">{theme.name}</Text>
                            <Text className="text-white/60 text-sm">{theme.description}</Text>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center">
                          <LinearGradient
                            colors={theme.colors}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                          {selectedTheme === theme.id && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
                          )}
                        </View>
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Privacy & Notifications */}
          <View className="px-4 mb-6">
            <Text className="text-white font-semibold text-lg mb-4">Privacy & Notifications</Text>
            
            <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white font-medium">Push Notifications</Text>
                  <Text className="text-white/60 text-sm">Get notified about new messages and reactions</Text>
                </View>
                <Switch
                  value={settings?.notifications_enabled || false}
                  onValueChange={(value) => updateSetting('notifications_enabled', value)}
                  trackColor={{ false: '#ffffff20', true: '#b497f3' }}
                  thumbColor="#ffffff"
                />
              </View>
            </BlurView>

            <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white font-medium">Location Services</Text>
                  <Text className="text-white/60 text-sm">Allow location tagging for confessions</Text>
                </View>
                <Switch
                  value={settings?.location_enabled || false}
                  onValueChange={(value) => updateSetting('location_enabled', value)}
                  trackColor={{ false: '#ffffff20', true: '#b497f3' }}
                  thumbColor="#ffffff"
                />
              </View>
            </BlurView>
          </View>

          {/* Data & Privacy */}
          <View className="px-4 mb-6">
            <Text className="text-white font-semibold text-lg mb-4">Data & Privacy</Text>
            
            <TouchableOpacity onPress={clearSearchHistory} className="mb-3">
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4">
                <View className="flex-row items-center">
                  <Ionicons name="trash-outline" size={24} color="#ffffff80" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-medium">Clear Search History</Text>
                    <Text className="text-white/60 text-sm">Remove all your search queries</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff40" />
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity onPress={exportData} className="mb-3">
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4">
                <View className="flex-row items-center">
                  <Ionicons name="download-outline" size={24} color="#ffffff80" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-medium">Export My Data</Text>
                    <Text className="text-white/60 text-sm">Download your confessions and settings</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff40" />
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View className="px-4 mb-6">
            <Text className="text-white font-semibold text-lg mb-4">About</Text>
            
            <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4 mb-3">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={24} color="#ffffff80" />
                <View className="ml-3 flex-1">
                  <Text className="text-white font-medium">AnonMask v1.0</Text>
                  <Text className="text-white/60 text-sm">Anonymous confession app</Text>
                </View>
              </View>
            </BlurView>

            <TouchableOpacity>
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="help-circle-outline" size={24} color="#ffffff80" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-medium">Help & Support</Text>
                    <Text className="text-white/60 text-sm">Get help or report issues</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff40" />
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity>
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark-outline" size={24} color="#ffffff80" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-medium">Privacy Policy</Text>
                    <Text className="text-white/60 text-sm">How we protect your anonymity</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff40" />
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View className="px-4 mb-20">
            <Text className="text-red-400 font-semibold text-lg mb-4">Danger Zone</Text>
            
            <TouchableOpacity onPress={() => blink.auth.logout()} className="mb-3">
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4 border border-yellow-500/30">
                <View className="flex-row items-center">
                  <Ionicons name="log-out-outline" size={24} color="#f59e0b" />
                  <View className="ml-3 flex-1">
                    <Text className="text-yellow-400 font-medium">Sign Out</Text>
                    <Text className="text-white/60 text-sm">Sign out of your account</Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity onPress={deleteAccount}>
              <BlurView intensity={20} tint="dark" className="glass-card rounded-2xl p-4 border border-red-500/30">
                <View className="flex-row items-center">
                  <Ionicons name="warning-outline" size={24} color="#ef4444" />
                  <View className="ml-3 flex-1">
                    <Text className="text-red-400 font-medium">Delete Account</Text>
                    <Text className="text-white/60 text-sm">Permanently delete all your data</Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}