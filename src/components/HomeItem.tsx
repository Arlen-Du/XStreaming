import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {Icon, useTheme} from 'react-native-paper';

type Props = {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
};

const HomeItem: React.FC<Props> = ({title, icon, color, onPress}) => {
  const theme = useTheme();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    onPress && onPress();
  };

  const isDark = theme.dark;

  return (
    <Pressable
      focusable={true}
      onPress={handlePress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({pressed}) => [
        styles.pressable,
        (pressed || isFocused) && styles.pressableActive,
      ]}>
      {({pressed}) => {
        const active = pressed || isFocused;
        return (
          <View style={styles.content}>
            <View
              style={[
                styles.circle,
                isLandscape && styles.circleLandscape,
                isDark ? styles.circleDark : styles.circleLight,
                active && (isDark ? styles.circleFocusedDark : styles.circleFocusedLight),
                pressed && styles.circlePressed,
              ]}>
              <Icon
                source={icon}
                color={color}
                size={isLandscape ? 22 : 24}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isLandscape && styles.labelLandscape,
                isDark ? styles.labelDark : styles.labelLight,
                active && (isDark ? styles.labelActiveDark : styles.labelActiveLight),
              ]}>
              {title}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  pressableActive: {
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLandscape: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  circleLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  circleDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  circlePressed: {
    transform: [{scale: 0.92}],
    opacity: 0.85,
  },
  circleFocusedDark: {
    borderColor: '#00D8FF',
    borderWidth: 2.5,
    backgroundColor: 'rgba(0, 216, 255, 0.14)',
    transform: [{scale: 1.12}],
    shadowColor: '#00D8FF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
  },
  circleFocusedLight: {
    borderColor: '#0284C7',
    borderWidth: 2.5,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    transform: [{scale: 1.12}],
    shadowColor: '#0284C7',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  labelLandscape: {
    marginTop: 4,
    fontSize: 11,
  },
  labelLight: {
    color: '#475569',
  },
  labelDark: {
    color: '#94A3B8',
  },
  labelActiveLight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  labelActiveDark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default HomeItem;


