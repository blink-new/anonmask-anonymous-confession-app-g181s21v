import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onCategorySelect }) => {
  const categories = [
    { id: 'all', label: 'All', emoji: '🌟' },
    { id: 'love', label: 'Love', emoji: '💕' },
    { id: 'regret', label: 'Regret', emoji: '😔' },
    { id: 'mental-health', label: 'Mental Health', emoji: '🧠' },
    { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { id: 'work', label: 'Work', emoji: '💼' },
    { id: 'college', label: 'College', emoji: '🎓' },
    { id: 'fun', label: 'Fun', emoji: '🎉' },
    { id: 'relationships', label: 'Relationships', emoji: '💑' },
  ];

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="py-2"
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => onCategorySelect(category.id)}
            className="mr-3"
          >
            <BlurView
              intensity={15}
              tint="dark"
              className={`px-4 py-2 rounded-full ${
                selectedCategory === category.id ? 'glass-button' : 'glass'
              }`}
            >
              <View className="flex-row items-center">
                <Text className="mr-2">{category.emoji}</Text>
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === category.id ? 'text-accent' : 'text-white/80'
                  }`}
                >
                  {category.label}
                </Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default CategoryFilter;