import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'search', icon: 'search', label: 'Search' },
    { id: 'inbox', icon: 'mail', label: 'Inbox' },
    { id: 'profile', icon: 'person', label: 'Profile' },
  ];

  return (
    <View className="absolute bottom-0 left-0 right-0 z-40">
      <BlurView intensity={30} tint="dark" className="glass">
        <View className="flex-row justify-around items-center py-2 px-4 pb-6">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onTabPress(tab.id)}
              className={`items-center py-2 px-4 rounded-xl ${
                activeTab === tab.id ? 'bg-accent/20' : ''
              }`}
            >
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={activeTab === tab.id ? '#b497f3' : '#ffffff60'}
              />
              <Text
                className={`text-xs mt-1 ${
                  activeTab === tab.id ? 'text-accent' : 'text-white/60'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </View>
  );
};

export default BottomNavigation;