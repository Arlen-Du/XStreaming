import React from 'react';
import {StyleSheet, View, Platform, TouchableOpacity} from 'react-native';
import {Text, Icon, Card, Button, useTheme} from 'react-native-paper';

type Props = {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
};

const HomeItem: React.FC<Props> = ({title, icon, color, onPress}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress && onPress();
  };

  const haloBg = color ? `${color}18` : 'rgba(255, 255, 255, 0.08)';
  const haloBorder = color ? `${color}35` : 'rgba(255, 255, 255, 0.15)';

  if (Platform.isTV) {
    return (
      <View style={styles.tvWrapper}>
        <Card
          mode="contained"
          style={[
            styles.card,
            theme.dark ? styles.cardDark : styles.cardLight,
            {borderColor: haloBorder},
          ]}>
          <Card.Content style={styles.cardContent}>
            <View
              style={[
                styles.iconHalo,
                {backgroundColor: haloBg, borderColor: haloBorder},
              ]}>
              <Icon source={icon} color={color} size={36} />
            </View>
            <Button
              mode="elevated"
              style={[
                styles.tvButton,
                theme.dark ? styles.tvButtonDark : styles.tvButtonLight,
              ]}
              labelStyle={styles.buttonLabel}
              textColor={theme.dark ? '#F8FAFC' : '#0F172A'}
              onPress={handlePress}>
              {title}
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.72}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.pressable}>
      <Card
        mode="contained"
        style={[
          styles.card,
          theme.dark ? styles.cardDark : styles.cardLight,
        ]}>
        <Card.Content style={styles.cardContent}>
          <View
            style={[
              styles.iconHalo,
              {backgroundColor: haloBg, borderColor: haloBorder},
            ]}>
            <Icon source={icon} color={color} size={38} />
          </View>
          <Text
            variant="labelLarge"
            numberOfLines={1}
            style={[
              styles.title,
              theme.dark ? styles.titleDark : styles.titleLight,
            ]}>
            {title}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 20,
  },
  tvWrapper: {
    borderRadius: 20,
  },
  card: {
    minHeight: 126,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(226, 232, 240, 0.85)',
  },
  cardDark: {
    backgroundColor: 'rgba(18, 22, 34, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0.35,
  },
  cardContent: {
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  iconHalo: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  titleLight: {
    color: '#1E293B',
  },
  titleDark: {
    color: '#F1F5F9',
  },
  tvButton: {
    marginTop: 6,
    borderRadius: 12,
  },
  tvButtonLight: {
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
  },
  tvButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonLabel: {
    marginHorizontal: 0,
    fontWeight: '800',
    fontSize: 12,
  },
});

export default HomeItem;

