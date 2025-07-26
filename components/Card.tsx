import React from 'react';
import { View, Text } from 'react-native';

export function Card() {
  return (
    <View className="bg-card p-6 rounded-2xl mx-6">
      <Text className="text-text-primary text-lg font-inter-medium mb-2">
        AnonMask
      </Text>
      <Text className="text-text-secondary">
        Anonymous confession app loading...
      </Text>
    </View>
  );
}