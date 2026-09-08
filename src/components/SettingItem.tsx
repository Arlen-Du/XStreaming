import React from 'react';
import {StyleSheet, View, TouchableOpacity} from 'react-native';
import {List, Text, useTheme, Icon} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  title: string;
  description?: string;
  onPress: () => void;
  showDivider?: boolean;
  leftIcon?: string;
  leftIconColor?: string;
  isDestructive?: boolean;
  badgeText?: string;
};

const SettingItem: React.FC<Props> = ({
  title,
  description,
  onPress,
  showDivider = true,
  leftIcon,
  leftIconColor,
  isDestructive = false,
  badgeText,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress && onPress();
  };

  return (
    <View style={styles.container}>
      <List.Item
        title={title}
        description={description}
        descriptionNumberOfLines={4}
        titleStyle={[
          styles.title,
          isDestructive
            ? styles.destructiveText
            : theme.dark
            ? styles.titleDark
            : styles.titleLight,
        ]}
        descriptionStyle={[
          styles.description,
          theme.dark ? styles.descriptionDark : styles.descriptionLight,
        ]}
        left={
          leftIcon
            ? () => (
                <View
                  style={[
                    styles.leftIconWrapper,
                    {
                      backgroundColor: `${leftIconColor || '#107C10'}18`,
                      borderColor: `${leftIconColor || '#107C10'}30`,
                    },
                  ]}>
                  <Icon
                    source={leftIcon}
                    size={18}
                    color={leftIconColor || '#107C10'}
                  />
                </View>
              )
            : undefined
        }
        right={() => (
          <View style={styles.rightWrapper}>
            {badgeText ? (
              <View
                style={[
                  styles.badge,
                  theme.dark ? styles.badgeDark : styles.badgeLight,
                ]}>
                <Text
                  style={[
                    styles.badgeText,
                    theme.dark ? styles.badgeTextDark : styles.badgeTextLight,
                  ]}>
                  {badgeText}
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={'chevron-forward-outline'}
              size={18}
              color={
                theme.dark
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(15, 23, 42, 0.3)'
              }
            />
          </View>
        )}
        onPress={handlePress}
        style={styles.listItem}
      />
      {showDivider && (
        <View
          style={[
            styles.divider,
            theme.dark ? styles.dividerDark : styles.dividerLight,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  titleLight: {
    color: '#0F172A',
  },
  titleDark: {
    color: '#F8FAFC',
  },
  destructiveText: {
    color: '#EF4444',
  },
  description: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },
  descriptionLight: {
    color: '#64748B',
  },
  descriptionDark: {
    color: '#94A3B8',
  },
  leftIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    alignSelf: 'center',
  },
  rightWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  badgeLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  badgeDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextLight: {
    color: '#475569',
  },
  badgeTextDark: {
    color: '#CBD5E1',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  dividerLight: {
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
  },
  dividerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});

export default SettingItem;

