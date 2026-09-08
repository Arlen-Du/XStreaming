import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Platform,
  Dimensions,
  TouchableOpacity,
  useWindowDimensions,
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
import NetInfo from '@react-native-community/netinfo';
import icons from '../common/svg';
import {getSettings} from '../store/settingStore';

const ConsoleItem = (props: any) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const settings = getSettings();

  const [menuVisible, setMenuVisible] = React.useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const [netType, setNetType] = React.useState<string>('wifi');
  React.useEffect(() => {
    NetInfo.fetch().then(state => {
      setNetType(state.type);
    });
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetType(state.type);
    });
    return () => unsubscribe();
  }, []);

  const consoleItem = props.consoleItem || {};
  console.log('CONSOLE_ITEM_DATA:', JSON.stringify(consoleItem));
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const isWide = width > 600 && !isLandscape;

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
      <View
        style={[
          styles.statusBadge,
          isLandscape && styles.statusBadgeLandscape,
          {backgroundColor: bgColor, borderColor},
        ]}>
        <View
          style={[
            styles.statusDot,
            isLandscape && styles.statusDotLandscape,
            {backgroundColor: dotColor},
          ]}
        />
        <Text
          style={[
            styles.statusText,
            isLandscape && styles.statusTextLandscape,
            {color: textColor},
          ]}>
          {statusText}
        </Text>
      </View>
    );
  };

  const renderNetworkBadge = () => {
    // 只要设备连接局域网 Wi-Fi 或有线，且主机可用（开机或待机），即为本地网络状态
    const isLocalDirect =
      (netType === 'wifi' || netType === 'ethernet') && (isPowerOn || isStandby);
    const iconName = isLocalDirect ? 'wifi' : 'earth';
    const text = isLocalDirect ? t('Local direct') : t('Remote stream');

    const color = isLocalDirect
      ? theme.dark
        ? '#34D399'
        : '#059669'
      : theme.dark
      ? '#60A5FA'
      : '#2563EB';

    const bgColor = isLocalDirect
      ? theme.dark
        ? 'rgba(16, 185, 129, 0.14)'
        : 'rgba(16, 185, 129, 0.1)'
      : theme.dark
      ? 'rgba(59, 130, 246, 0.14)'
      : 'rgba(37, 99, 235, 0.1)';

    const borderColor = isLocalDirect
      ? theme.dark
        ? 'rgba(52, 211, 153, 0.32)'
        : 'rgba(16, 185, 129, 0.3)'
      : theme.dark
      ? 'rgba(96, 165, 250, 0.32)'
      : 'rgba(37, 99, 235, 0.28)';

    return (
      <View
        style={[
          styles.netBadge,
          isLandscape && styles.netBadgeLandscape,
          {backgroundColor: bgColor, borderColor},
        ]}>
        <Icon source={iconName} size={isLandscape ? 10 : 12} color={color} />
        <Text
          style={[
            styles.netBadgeText,
            isLandscape && styles.netBadgeTextLandscape,
            {color},
          ]}>
          {text}
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
          style={[
            styles.consoleImage,
            isWide && styles.consoleImageWide,
            isLandscape && styles.consoleImageLandscape,
          ]}
          resizeMode="contain"
        />
      );
    } else if (type === 'XboxSeriesS') {
      return (
        <Image
          source={require('../assets/console/series-s.png')}
          style={[
            styles.consoleImage,
            isWide && styles.consoleImageWide,
            isLandscape && styles.consoleImageLandscape,
          ]}
          resizeMode="contain"
        />
      );
    } else {
      return (
        <View style={[styles.svgWrapper, isLandscape && styles.svgWrapperLandscape]}>
          <SvgXml
            xml={theme.dark ? icons.ConsoleDark : icons.ConsoleIcon}
            width={'100%'}
            height={isLandscape ? 50 : isWide ? 130 : 110}
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
      contentStyle={isLandscape ? styles.cardInnerLandscape : undefined}
      style={[
        styles.card,
        isLandscape && styles.cardLandscape,
        theme.dark ? styles.cardDark : styles.cardLight,
        isPowerOn && (theme.dark ? styles.cardGlowDark : styles.cardGlowLight),
      ]}>
      <Card.Content
        style={[
          styles.cardContent,
          isLandscape && styles.cardContentLandscape,
        ]}>
        {/* Top Header Row */}
        <View style={[styles.headerRow, isLandscape && styles.headerRowLandscape]}>
          <View style={styles.titleContainer}>
            <Text
              variant="titleMedium"
              numberOfLines={1}
              style={[
                styles.deviceName,
                isLandscape && styles.deviceNameLandscape,
                theme.dark ? styles.deviceNameDark : styles.deviceNameLight,
              ]}>
              {consoleItem.deviceName || t('Host')}
            </Text>
            <View style={[styles.badgeWrapper, isLandscape && styles.badgeWrapperLandscape]}>
              {renderStatusBadge()}
            </View>
            <View style={[styles.netBadgeWrapper, isLandscape && styles.netBadgeWrapperLandscape]}>
              {renderNetworkBadge()}
            </View>
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
                    isLandscape && styles.menuButtonLandscape,
                    theme.dark ? styles.menuButtonDark : styles.menuButtonLight,
                  ]}>
                  <IconButton
                    icon="dots-vertical"
                    size={isLandscape ? 16 : 20}
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
        <View style={[styles.stageContainer, isLandscape && styles.stageContainerLandscape]}>
          <View
            style={[
              styles.stageGlow,
              isLandscape && styles.stageGlowLandscape,
              theme.dark ? styles.stageGlowDark : styles.stageGlowLight,
              isPowerOn && styles.stageGlowActive,
            ]}
          />
          <View
            style={[
              styles.imageContainer,
              isLandscape && styles.imageContainerLandscape,
            ]}>
            {renderImage()}
          </View>
          <View
            style={[
              styles.stageShadow,
              isLandscape && styles.stageShadowLandscape,
              theme.dark ? styles.stageShadowDark : styles.stageShadowLight,
            ]}
          />
        </View>

        {/* Metadata chip tags (vertical only to prevent crowding in landscape 1:1 card) */}
        {!isLandscape && (
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
                  theme.dark ? styles.techTagTextDark : styles.techTagLight,
                ]}>
                {consoleItem.consoleType || 'Xbox'}
              </Text>
            </View>
          </View>
        )}

        {/* Action Button */}
        <View style={[styles.footer, isLandscape && styles.footerLandscape]}>
          {shouldWakeAndStream ? (
            <Button
              mode="contained"
              icon="power"
              compact={true}
              style={[
                styles.streamButton,
                styles.wakeButton,
                Platform.isTV && styles.tvButton,
              ]}
              labelStyle={[
                styles.streamButtonLabel,
                isLandscape && styles.streamButtonLabelLandscape,
              ]}
              contentStyle={[
                styles.streamButtonContent,
                isLandscape && styles.streamButtonContentLandscape,
              ]}
              onPress={props.onPoweronStream}>
              {t('Power on and start stream')}
            </Button>
          ) : (
            <Button
              mode="contained"
              icon={isPowerOn ? 'play' : 'remote'}
              compact={true}
              style={[
                styles.streamButton,
                isPowerOn ? styles.activeStreamButton : styles.idleStreamButton,
                Platform.isTV && styles.tvButton,
              ]}
              labelStyle={[
                styles.streamButtonLabel,
                isLandscape && styles.streamButtonLabelLandscape,
              ]}
              contentStyle={[
                styles.streamButtonContent,
                isLandscape && styles.streamButtonContentLandscape,
              ]}
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
  cardLandscape: {
    width: 196,
    height: 196,
    aspectRatio: 1,
    borderRadius: 18,
    elevation: 2,
    alignSelf: 'center',
  },
  cardInnerLandscape: {
    flex: 1,
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
  cardContentLandscape: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerRowLandscape: {
    marginBottom: 2,
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
  deviceNameLandscape: {
    fontSize: 12,
    lineHeight: 16,
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
  badgeWrapperLandscape: {
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeLandscape: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotLandscape: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusTextLandscape: {
    fontSize: 9.5,
    lineHeight: 12,
  },
  netBadgeWrapper: {
    marginTop: 4,
    flexDirection: 'row',
  },
  netBadgeWrapperLandscape: {
    marginTop: 2,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  netBadgeLandscape: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 7,
  },
  netBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  netBadgeTextLandscape: {
    fontSize: 9,
    lineHeight: 12,
    marginLeft: 3,
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
  menuButtonLandscape: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  stageContainerLandscape: {
    paddingVertical: 1,
  },
  stageGlow: {
    position: 'absolute',
    width: 140,
    height: 100,
    borderRadius: 70,
    opacity: 0,
  },
  stageGlowLandscape: {
    width: 80,
    height: 54,
    borderRadius: 27,
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
  imageContainerLandscape: {
    minHeight: 48,
    marginVertical: 1,
  },
  consoleImage: {
    width: 130,
    height: 125,
  },
  consoleImageWide: {
    width: 150,
    height: 145,
  },
  consoleImageLandscape: {
    width: 60,
    height: 46,
  },
  svgWrapper: {
    width: 120,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapperLandscape: {
    width: 58,
    height: 46,
  },
  stageShadow: {
    width: 100,
    height: 10,
    borderRadius: 5,
    marginTop: -4,
  },
  stageShadowLandscape: {
    width: 58,
    height: 6,
    borderRadius: 3,
    marginTop: -2,
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
  metaRowLandscape: {
    marginTop: 1,
    marginBottom: 2,
    gap: 4,
    flexWrap: 'nowrap',
  },
  techTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  techTagLandscape: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
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
  techTagTextLandscape: {
    fontSize: 9,
    marginLeft: 2,
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
  serverTagLandscape: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
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
  serverTagTextLandscape: {
    fontSize: 9,
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
  footerLandscape: {
    marginTop: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  streamButtonContentLandscape: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  streamButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
    marginVertical: 0,
    marginLeft: 4,
  },
  streamButtonLabelLandscape: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginVertical: 0,
    marginLeft: 4,
    marginRight: 4,
  },
  tvButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default ConsoleItem;

