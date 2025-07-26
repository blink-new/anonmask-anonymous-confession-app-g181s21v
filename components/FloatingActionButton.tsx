import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface FloatingActionButtonProps {
  onPress: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress }) => {
  return (
    <View className="absolute bottom-20 right-6 z-50">
      <TouchableOpacity
        onPress={onPress}
        className="w-14 h-14 rounded-full overflow-hidden shadow-lg"
        style={{
          shadowColor: '#b497f3',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={['#b497f3', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full items-center justify-center"
        >
          <BlurView intensity={20} tint="light" className="w-full h-full items-center justify-center">
            <Ionicons name="add" size={28} color="white" />
          </BlurView>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default FloatingActionButton;