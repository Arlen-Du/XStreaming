import React from 'react';
import {
  StyleSheet,
  ScrollView,
  Alert,
  View,
  NativeModules,
  ToastAndroid,
} from 'react-native';
import {Text, useTheme, Card, Icon} from 'react-native-paper';
import Spinner from '../components/Spinner';
import {getSettings, resetSettings} from '../store/settingStore';
import SettingItem from '../components/SettingItem';
import {useSelector} from 'react-redux';
import RNRestart from 'react-native-restart';
import CookieManager from '@react-native-cookies/cookies';
import {useTranslation} from 'react-i18next';
import {debugFactory} from '../utils/debug';
import {clearStreamToken} from '../store/streamTokenStore';
import {clearWebToken} from '../store/webTokenStore';
import {clearXcloudData} from '../store/xcloudStore';
import {clearConsolesData} from '../store/consolesStore';
import {clearServerData} from '../store/serverStore';

import bases from '../common/settings/bases';
import display from '../common/settings/display';
import gamepad from '../common/settings/gamepad';
import vgamepad from '../common/settings/vgamepad';
import audio from '../common/settings/audio';
import xcloud from '../common/settings/xcloud';
import xhome from '../common/settings/xhome';
import sensor from '../common/settings/sensor';
import server from '../common/settings/server';
import others from '../common/settings/others';

import pkg from '../../package.json';

const {UsbRumbleManager} = NativeModules;

const log = debugFactory('SettingsScreen');

function SettingsScreen({navigation}) {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const authentication = useSelector((state: any) => state.authentication);

  const currentLanguage = i18n.language;
  const titleTextStyle = React.useMemo(
    () => [styles.titleText, {color: theme.colors.primary}],
    [theme.colors.primary],
  );

  const [loading, setLoading] = React.useState(false);

  const sisuToken = authentication._tokenStore.getSisuToken();
  const userToken = authentication._tokenStore.getUserToken();

  let isAuthed = false;
  let user = '';

  if (sisuToken && sisuToken.data && sisuToken.data.AuthorizationToken) {
    isAuthed = true;

    if (sisuToken.data.AuthorizationToken.DisplayClaims) {
      try {
        user = sisuToken.data.AuthorizationToken.DisplayClaims.xui[0].mgt;
      } catch (e) {}
    }
  }

  if (userToken && userToken.data && userToken.data.access_token) {
    isAuthed = true;
  }

  React.useEffect(() => {
    log.info('settings page show');
  }, [navigation]);

  const handleItemPress = async id => {
    if (id === 'logout') {
      Alert.alert(t('Warning'), t('Do you want to logout?'), [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Confirm'),
          style: 'default',
          onPress: () => {
            setLoading(true);
            clearStreamToken();
            clearWebToken();
            clearXcloudData();
            clearConsolesData();
            clearServerData();
            authentication._tokenStore.clear();
            CookieManager.clearAll();
            setTimeout(() => {
              RNRestart.restart();
            }, 1000);
          },
        },
      ]);
    } else if (id === 'maping') {
      const settings = getSettings();
      const hasValidUsbDevice = await UsbRumbleManager.getHasValidUsbDevice();
      const isUsbMode = settings.bind_usb_device && hasValidUsbDevice;
      if (isUsbMode) {
        Alert.alert(
          t(
            'After replacing the Android controller driver, controller button mapping is temporarily not supported',
          ),
        );
        return;
      }
      if (settings.gamepad_kernal === 'Web') {
        navigation.navigate('GameMap');
      } else {
        navigation.navigate('NativeGameMap');
      }
    } else if (id === 'debug') {
      navigation.navigate('Debug');
    } else {
      navigation.navigate('SettingDetail', {
        id,
      });
    }
  };

  const handleClearCache = () => {
    clearXcloudData();
    clearConsolesData();
    clearServerData();
    resetSettings();
    ToastAndroid.show(t('Success'), ToastAndroid.SHORT);
    setTimeout(() => {
      RNRestart.restart();
    }, 1000);
  };

  const renderSectionCard = (
    icon: string,
    iconColor: string,
    title: string,
    children: React.ReactNode,
  ) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconHalo,
            {backgroundColor: `${iconColor}18`, borderColor: `${iconColor}35`},
          ]}>
          <Icon source={icon} size={18} color={iconColor} />
        </View>
        <Text
          variant="titleMedium"
          style={[
            styles.sectionTitle,
            theme.dark ? styles.sectionTitleDark : styles.sectionTitleLight,
          ]}>
          {title}
        </Text>
      </View>

      <Card
        mode="contained"
        style={[
          styles.islandCard,
          theme.dark ? styles.islandCardDark : styles.islandCardLight,
        ]}>
        {children}
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <Spinner loading={loading} text={t('Loading...')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}>
        {/* User Status Card */}
        {isAuthed && user ? (
          <View
            style={[
              styles.userCard,
              theme.dark ? styles.islandCardDark : styles.islandCardLight,
            ]}>
            <View style={styles.userRow}>
              <View style={styles.userAvatarWrapper}>
                <Icon source="microsoft-xbox" size={24} color="#107C10" />
              </View>
              <View style={styles.userInfo}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.userName,
                    theme.dark ? styles.textDark : styles.textLight,
                  ]}>
                  {user}
                </Text>
                <View style={styles.onlinePill}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>{t('Success')}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Bases Settings */}
        {renderSectionCard(
          'cog',
          '#107C10',
          t('BasesSettings'),
          bases.map((meta, idx) => (
            <SettingItem
              key={meta.name || idx}
              title={meta.title}
              description={meta.description}
              showDivider={idx < bases.length - 1}
              onPress={() => handleItemPress(meta.name)}
            />
          )),
        )}

        {/* Display Settings */}
        {renderSectionCard(
          'monitor',
          '#0284C7',
          t('DisplaySettings'),
          <>
            {display.map((meta, idx) => (
              <SettingItem
                key={meta.name || idx}
                title={meta.title}
                description={meta.description}
                showDivider={true}
                onPress={() => handleItemPress(meta.name)}
              />
            ))}
            <SettingItem
              title={t('Display')}
              description={t(
                'Set parameters such as screen clarity and saturation',
              )}
              showDivider={false}
              onPress={() => {
                const currentSettings = getSettings();
                if (
                  currentSettings.render_engine === 'native' ||
                  currentSettings.render_engine === 'nano'
                ) {
                  Alert.alert(
                    t('Display settings is not working in native render engine.'),
                  );
                  return;
                }
                navigation.navigate('Display');
              }}
            />
          </>,
        )}

        {/* Gamepad Settings */}
        {renderSectionCard(
          'gamepad-variant',
          '#8B5CF6',
          t('GamepadSettings'),
          <>
            {gamepad.map((meta, idx) => (
              <SettingItem
                key={meta.name || idx}
                title={meta.title}
                description={meta.description}
                showDivider={true}
                onPress={() => handleItemPress(meta.name)}
              />
            ))}
            <SettingItem
              title={t('GamepadTestTitle')}
              description={t('GamepadTestDescription')}
              showDivider={false}
              onPress={() => {
                navigation.navigate('GamepadTest');
              }}
            />
          </>,
        )}

        {/* Virtual Gamepad Settings */}
        {renderSectionCard(
          'tune-variant',
          '#06B6D4',
          t('vGamepadSettings'),
          <>
            {vgamepad.map((meta, idx) => (
              <SettingItem
                key={meta.name || idx}
                title={meta.title}
                description={meta.description}
                showDivider={true}
                onPress={() => handleItemPress(meta.name)}
              />
            ))}
            <SettingItem
              title={t('Customize virtual buttons')}
              description={t('Customize buttons of virtual gamepad')}
              showDivider={true}
              onPress={() => {
                navigation.navigate('VirtualGamepadSettings');
              }}
            />
            <SettingItem
              title={t('Auto toggle hold buttons')}
              description={t('Select what buttons become toggle holdable')}
              showDivider={true}
              onPress={() => {
                navigation.navigate('HoldButtons');
              }}
            />
            <SettingItem
              title={t('Virtual macro settings')}
              description={t('Enable macro button and edit its action sequence')}
              showDivider={false}
              onPress={() => {
                navigation.navigate('VirtualMacroSettings');
              }}
            />
          </>,
        )}

        {/* Audio Settings */}
        {renderSectionCard(
          'volume-high',
          '#F59E0B',
          t('AudioSettings'),
          audio.map((meta, idx) => (
            <SettingItem
              key={meta.name || idx}
              title={meta.title}
              description={meta.description}
              showDivider={idx < audio.length - 1}
              onPress={() => handleItemPress(meta.name)}
            />
          )),
        )}

        {/* Cloud Gaming Settings */}
        {renderSectionCard(
          'cloud',
          '#EAB308',
          t('XcloudSettings'),
          xcloud.map((meta, idx) => (
            <SettingItem
              key={meta.name || idx}
              title={meta.title}
              description={meta.description}
              showDivider={idx < xcloud.length - 1}
              onPress={() => handleItemPress(meta.name)}
            />
          )),
        )}

        {/* Console / XHome Settings */}
        {renderSectionCard(
          'home-variant',
          '#10B981',
          t('XchomeSettings'),
          xhome.map((meta, idx) => (
            <SettingItem
              key={meta.name || idx}
              title={meta.title}
              description={meta.description}
              showDivider={idx < xhome.length - 1}
              onPress={() => handleItemPress(meta.name)}
            />
          )),
        )}

        {/* Sensor Settings */}
        {renderSectionCard(
          'axis-arrow',
          '#EC4899',
          t('SensorSettings'),
          sensor.map((meta, idx) => (
            <SettingItem
              key={meta.name || idx}
              title={meta.title}
              description={meta.description}
              showDivider={idx < sensor.length - 1}
              onPress={() => handleItemPress(meta.name)}
            />
          )),
        )}

        {/* DualSense Trigger Settings */}
        {renderSectionCard(
          'controller-classic',
          '#3B82F6',
          t('DualSense'),
          <>
            <SettingItem
              title={t('DualSense_adaptive_trigger_left')}
              description={`${t('DualSense_adaptive_trigger_left_desc')}`}
              showDivider={true}
              onPress={() =>
                navigation.navigate({
                  name: 'Ds5',
                  params: {
                    type: 'left',
                  },
                })
              }
            />
            <SettingItem
              title={t('DualSense_adaptive_trigger_right')}
              description={`${t('DualSense_adaptive_trigger_right_desc')}`}
              showDivider={false}
              onPress={() =>
                navigation.navigate({
                  name: 'Ds5',
                  params: {
                    type: 'right',
                  },
                })
              }
            />
          </>,
        )}

        {/* TURN Server Settings */}
        {renderSectionCard(
          'server-network',
          '#14B8A6',
          t('TurnServerSettings'),
          <>
            {server.map((meta, idx) => (
              <SettingItem
                key={meta.name || idx}
                title={meta.title}
                description={meta.description}
                showDivider={true}
                onPress={() => handleItemPress(meta.name)}
              />
            ))}
            <SettingItem
              title={t('TURN server')}
              description={t('Custom TURN server')}
              showDivider={false}
              onPress={() => navigation.navigate('Server')}
            />
          </>,
        )}

        {/* General & Community Settings */}
        {renderSectionCard(
          'dots-horizontal-circle',
          '#64748B',
          t('Others'),
          <>
            {others.map((meta, idx) => (
              <SettingItem
                key={meta.name || idx}
                title={meta.title}
                description={meta.description}
                showDivider={true}
                onPress={() => handleItemPress(meta.name)}
              />
            ))}

            <SettingItem
              title={t('ConfigTransfer')}
              description={t('ConfigTransferDescription')}
              showDivider={true}
              onPress={() => navigation.navigate('Transfer')}
            />

            <SettingItem
              title={t('Device testing')}
              description={t('Testing current device and controller')}
              showDivider={true}
              onPress={() => navigation.navigate('DeviceInfos')}
            />

            <SettingItem
              title={t('About')}
              description={`${t('About XStreaming')}`}
              showDivider={true}
              onPress={() => {
                if (currentLanguage === 'zh' || currentLanguage === 'zht') {
                  navigation.navigate('AboutZh');
                } else {
                  navigation.navigate('About');
                }
              }}
            />

            {(currentLanguage === 'zh' || currentLanguage === 'zht') && (
              <SettingItem
                title={'支持及交流'}
                description={'支持开发或交流使用心得'}
                showDivider={true}
                onPress={() => navigation.navigate('Feedback')}
              />
            )}

            {__DEV__ && (
              <SettingItem
                title={'DEBUG'}
                description={'Enter debug'}
                showDivider={true}
                onPress={() => handleItemPress('debug')}
              />
            )}

            <SettingItem
              title={t('HistoryTitle')}
              description={`${t('HistoryDesc')}`}
              showDivider={true}
              onPress={() => navigation.navigate('History')}
            />

            <SettingItem
              title={t('Thanks')}
              showDivider={false}
              onPress={() => navigation.navigate('Thanks')}
            />
          </>,
        )}

        {/* Account & Maintenance (Danger Zone) */}
        {renderSectionCard(
          'shield-alert-outline',
          '#EF4444',
          t('Profile'),
          <>
            <SettingItem
              title={t('Clear Cache')}
              description={t('Clear XStreaming Cache Data(Keep login data)')}
              leftIcon="trash-can-outline"
              leftIconColor="#F59E0B"
              showDivider={isAuthed}
              onPress={() => handleClearCache()}
            />

            {isAuthed ? (
              <SettingItem
                title={t('Logout')}
                description={user ? `${t('Current user')}: ${user}` : ''}
                leftIcon="logout"
                leftIconColor="#EF4444"
                isDestructive={true}
                showDivider={false}
                onPress={() => handleItemPress('logout')}
              />
            ) : null}
          </>,
        )}

        {/* App Version Footer */}
        <View style={styles.version}>
          <View
            style={[
              styles.versionBadge,
              theme.dark ? styles.versionBadgeDark : styles.versionBadgeLight,
            ]}>
            <Text
              style={[
                styles.versionText,
                theme.dark ? styles.textDark : styles.textLight,
              ]}>
              XStreaming v{pkg.version}
            </Text>
          </View>
          <Text
            style={[
              styles.copyrightText,
              theme.dark ? styles.textMutedDark : styles.textMutedLight,
            ]}>
            © 2024-{new Date().getFullYear()} Geocld · Open Source
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  userCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 124, 16, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 124, 16, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '800',
    fontSize: 16,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  onlineText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionIconHalo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  sectionTitleLight: {
    color: '#0F172A',
  },
  sectionTitleDark: {
    color: '#F8FAFC',
  },
  islandCard: {
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
  islandCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(226, 232, 240, 0.85)',
  },
  islandCardDark: {
    backgroundColor: 'rgba(18, 22, 34, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowOpacity: 0.35,
  },
  version: {
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  versionBadgeLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(203, 213, 225, 0.7)',
  },
  versionBadgeDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  versionText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  copyrightText: {
    fontSize: 11,
  },
  textLight: {
    color: '#0F172A',
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedLight: {
    color: '#64748B',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});

export default SettingsScreen;

