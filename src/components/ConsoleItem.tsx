import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Menu,
  IconButton,
  useTheme,
  Icon,
} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {SvgXml} from 'react-native-svg';
import icons from '../common/svg';
import {getSettings} from '../store/settingStore';

const ConsoleItem = (props: any) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const settings = getSettings();

  const [menuVisible, setMenuVisible] = React.useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const consoleItem = props.consoleItem || {};
  const {width} = Dimensions.get('window');
  const isWide = width > 600;

  const isPowerOn = consoleItem.powerState === 'On';
  const isStandby = consoleItem.powerState === 'ConnectedStandby';

  const renderStatusBadge = () => {
    let dotColor = '#9CA3AF';
    let textColor = theme.dark ? '#D1D5DB' : '#6B7280';
    let bgColor = theme.dark
      ? 'rgba(156, 163, 175, 0.14)'
      : 'rgba(156, 163, 175, 0.16)';
    let borderColor = theme.dark
      ? 'rgba(156, 163, 175, 0.28)'
      : 'rgba(156, 163, 175, 0.35)';
    let statusText = consoleItem.powerState || t('Offline');

    if (isPowerOn) {
      dotColor = '#10B981';
      textColor = theme.dark ? '#6EE7B7' : '#047857';
      bgColor = theme.dark
        ? 'rgba(16, 185, 129, 0.18)'
        : 'rgba(16, 185, 129, 0.14)';
      borderColor = theme.dark
        ? 'rgba(52, 211, 153, 0.36)'
        : 'rgba(16, 185, 129, 0.35)';
      statusText = t('Powered on');
    } else if (isStandby) {
      dotColor = '#F59E0B';
      textColor = theme.dark ? '#FCD34D' : '#B45309';
      bgColor = theme.dark
        ? 'rgba(245, 158, 11, 0.18)'
        : 'rgba(245, 158, 11, 0.14)';
      borderColor = theme.dark
        ? 'rgba(251, 191, 36, 0.36)'
        : 'rgba(245, 158, 11, 0.35)';
      statusText = t('Standby');
    }

    return (
      <View style={[styles.statusBadge, {backgroundColor: bgColor, borderColor}]}>
        <View style={[styles.statusDot, {backgroundColor: dotColor}]} />
        <Text style={[styles.statusText, {color: textColor}]}>
          {statusText}
        </Text>
      </View>
    );
  };

  const renderImage = () => {
    const type = consoleItem.consoleType;
    if (type === 'XboxSeriesX') {
      return (
        <Image
          source={require('../assets/console/series-x.png')}
          style={[styles.consoleImage, isWide && styles.consoleImageWide]}
          resizeMode="contain"
        />
      );
    } else if (type === 'XboxSeriesS') {
      return (
        <Image
          source={require('../assets/console/series-s.png')}
          style={[styles.consoleImage, isWide && styles.consoleImageWide]}
          resizeMode="contain"
        />
      );
    } else {
      return (
        <View style={styles.svgWrapper}>
          <SvgXml
            xml={theme.dark ? icons.ConsoleDark : icons.ConsoleIcon}
            width={'100%'}
            height={isWide ? 130 : 110}
          />
        </View>
      );
    }
  };

  const shouldWakeAndStream =
    settings.power_on && consoleItem.powerState === 'ConnectedStandby';

  return (
    <Card
      mode="contained"
      style={[
        styles.card,
        theme.dark ? styles.cardDark : styles.cardLight,
        isPowerOn && (theme.dark ? styles.cardGlowDark : styles.cardGlowLight),
      ]}>
      <Card.Content style={styles.cardContent}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text
              variant="titleMedium"
              numberOfLines={1}
              style={[
                styles.deviceName,
                theme.dark ? styles.deviceNameDark : styles.deviceNameLight,
              ]}>
              {consoleItem.deviceName || t('Host')}
            </Text>
            <View style={styles.badgeWrapper}>{renderStatusBadge()}</View>
          </View>

          <View style={styles.menuAnchorWrapper}>
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openMenu}
                  style={[
                    styles.menuButton,
                    theme.dark ? styles.menuButtonDark : styles.menuButtonLight,
                  ]}>
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    iconColor={theme.dark ? '#E2E8F0' : '#475569'}
                    style={styles.menuIconInner}
                  />
                </TouchableOpacity>
              }>
              <Menu.Item
                leadingIcon="power"
                onPress={() => {
                  closeMenu();
                  props.onPoweron && props.onPoweron();
                }}
                title={t('Powered on')}
              />
              <Menu.Item
                leadingIcon="power-off"
                onPress={() => {
                  closeMenu();
                  props.onPoweroff && props.onPoweroff();
                }}
                title={t('Powered off')}
              />
            </Menu>
          </View>
        </View>

        {/* Console Stage with ambient glow backdrop */}
        <View style={styles.stageContainer}>
          <View
            style={[
              styles.stageGlow,
              theme.dark ? styles.stageGlowDark : styles.stageGlowLight,
              isPowerOn && styles.stageGlowActive,
            ]}
          />
          <View style={styles.imageContainer}>{renderImage()}</View>
          <View
            style={[
              styles.stageShadow,
              theme.dark ? styles.stageShadowDark : styles.stageShadowLight,
            ]}
          />
        </View>

        {/* Metadata chip tags */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.techTag,
              theme.dark ? styles.techTagDark : styles.techTagLight,
            ]}>
            <Icon
              source="microsoft-xbox"
              size={13}
              color={theme.dark ? '#6EEB83' : '#107C10'}
            />
            <Text
              style={[
                styles.techTagText,
                theme.dark ? styles.techTagTextDark : styles.techTagTextLight,
              ]}>
              {consoleItem.consoleType || 'Xbox'}
            </Text>
          </View>

          {consoleItem.serverId ? (
            <View
              style={[
                styles.serverTag,
                theme.dark ? styles.serverTagDark : styles.serverTagLight,
              ]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.serverTagText,
                  theme.dark
                    ? styles.serverTagTextDark
                    : styles.serverTagTextLight,
                ]}>
                ID: {consoleItem.serverId.length > 10
                  ? `...${consoleItem.serverId.slice(-8)}`
                  : consoleItem.serverId}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Button */}
        <View style={styles.footer}>
          {shouldWakeAndStream ? (
            <Button
              mode="contained"
              icon="power"
              style={[
                styles.streamButton,
                styles.wakeButton,
                Platform.isTV && styles.tvButton,
              ]}
              labelStyle={styles.streamButtonLabel}
              contentStyle={styles.streamButtonContent}
              onPress={props.onPoweronStream}>
              {t('Power on and start stream')}
            </Button>
          ) : (
            <Button
              mode="contained"
              icon={isPowerOn ? 'play' : 'remote'}
              style={[
                styles.streamButton,
                isPowerOn ? styles.activeStreamButton : styles.idleStreamButton,
                Platform.isTV && styles.tvButton,
              ]}
              labelStyle={styles.streamButtonLabel}
              contentStyle={styles.streamButtonContent}
              onPress={props.onPress}>
              {t('Start stream')}
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  cardDark: {
    backgroundColor: 'rgba(18, 22, 34, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0.36,
  },
  cardGlowLight: {
    borderColor: 'rgba(16, 124, 16, 0.28)',
  },
  cardGlowDark: {
    borderColor: 'rgba(110, 235, 131, 0.26)',
    shadowColor: '#107C10',
    shadowOpacity: 0.25,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  deviceName: {
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  deviceNameLight: {
    color: '#0F172A',
  },
  deviceNameDark: {
    color: '#F8FAFC',
  },
  badgeWrapper: {
    marginTop: 6,
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  menuAnchorWrapper: {
    marginLeft: 4,
  },
  menuButton: {
    borderRadius: 14,
    borderWidth: 1,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonLight: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderColor: 'rgba(203, 213, 225, 0.6)',
  },
  menuButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  menuIconInner: {
    margin: 0,
    padding: 0,
    width: 24,
    height: 24,
  },
  stageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  stageGlow: {
    position: 'absolute',
    width: 140,
    height: 100,
    borderRadius: 70,
    opacity: 0,
  },
  stageGlowLight: {
    backgroundColor: 'rgba(16, 124, 16, 0.08)',
  },
  stageGlowDark: {
    backgroundColor: 'rgba(110, 235, 131, 0.1)',
  },
  stageGlowActive: {
    opacity: 1,
  },
  imageContainer: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  consoleImage: {
    width: 130,
    height: 125,
  },
  consoleImageWide: {
    width: 150,
    height: 145,
  },
  svgWrapper: {
    width: 120,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageShadow: {
    width: 100,
    height: 10,
    borderRadius: 5,
    marginTop: -4,
  },
  stageShadowLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  stageShadowDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  techTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  techTagLight: {
    backgroundColor: 'rgba(16, 124, 16, 0.07)',
    borderColor: 'rgba(16, 124, 16, 0.18)',
  },
  techTagDark: {
    backgroundColor: 'rgba(110, 235, 131, 0.08)',
    borderColor: 'rgba(110, 235, 131, 0.2)',
  },
  techTagText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  techTagTextLight: {
    color: '#107C10',
  },
  techTagTextDark: {
    color: '#86EFAC',
  },
  serverTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  serverTagLight: {
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
    borderColor: 'rgba(203, 213, 225, 0.6)',
  },
  serverTagDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  serverTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  serverTagTextLight: {
    color: '#64748B',
  },
  serverTagTextDark: {
    color: '#94A3B8',
  },
  footer: {
    marginTop: 4,
  },
  streamButton: {
    borderRadius: 14,
    elevation: 2,
  },
  activeStreamButton: {
    backgroundColor: '#107C10',
  },
  idleStreamButton: {
    backgroundColor: '#1E293B',
  },
  wakeButton: {
    backgroundColor: '#D97706',
  },
  streamButtonContent: {
    height: 42,
  },
  streamButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
    marginHorizontal: 4,
  },
  tvButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default ConsoleItem;

