import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingActionButtonProps {
  onPress: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="absolute right-6 z-40"
      style={{ bottom: 100 + Math.max(insets.bottom, 16) }}
    >
      <TouchableOpacity
        onPress={onPress}
        className="shadow-2xl"
        style={{
          shadowColor: '#b497f3',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={['#b497f3', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-16 h-16 rounded-full items-center justify-center"
        >
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default FloatingActionButton;