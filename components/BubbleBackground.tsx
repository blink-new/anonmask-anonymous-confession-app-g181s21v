import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BubbleBackground = () => {
  return (
    <View className="absolute inset-0 overflow-hidden">
      {/* Background gradient */}
      <LinearGradient
        colors={['#1e1e2f', '#2a2a3e', '#1e1e2f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      
      {/* Floating bubbles */}
      <View className="absolute top-20 left-10 w-20 h-20 rounded-full bg-accent/10 bubble" />
      <View className="absolute top-40 right-16 w-12 h-12 rounded-full bg-accent/5 bubble" />
      <View className="absolute top-60 left-20 w-16 h-16 rounded-full bg-accent/8 bubble" />
      <View className="absolute bottom-40 right-10 w-24 h-24 rounded-full bg-accent/6 bubble" />
      <View className="absolute bottom-60 left-16 w-14 h-14 rounded-full bg-accent/7 bubble" />
      <View className="absolute top-32 right-32 w-8 h-8 rounded-full bg-accent/12 bubble" />
    </View>
  );
};

export default BubbleBackground;