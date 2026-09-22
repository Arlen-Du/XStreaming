import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ToastAndroid,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {Button, TextInput, Text, Card, useTheme, SegmentedButtons, Chip} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  getEasyTierConfig,
  saveEasyTierConfig,
  EasyTierConfig,
} from '../store/easyTierStore';
import {
  prepareVpn,
  startEasyTierWithToken,
  startEasyTierWithConfig,
  stopEasyTier,
  getEasyTierStatus,
  getEasyTierPeers,
  addEasyTierStatusListener,
  isEasyTierAppInstalled,
  launchEasyTierApp,
  EasyTierPeer,
} from '../utils/easyTierBridge';
import {useGamepadNavigation} from '../utils/useGamepadNavigation';

export default function EasyTierScreen({navigation}: any) {
  const {t} = useTranslation();
  const theme = useTheme();

  const [config, setConfig] = useState<EasyTierConfig>(getEasyTierConfig());
  const [running, setRunning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [virtualIp, setVirtualIp] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [machineId, setMachineId] = useState('');
  const [hostname, setHostname] = useState('');
  const [peers, setPeers] = useState<EasyTierPeer[]>([]);

  const pollTimerRef = useRef<any>(null);

  useGamepadNavigation({
    onBack: () => {
      navigation?.goBack();
    },
  });

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getEasyTierStatus();
      setRunning(status.running);
      if (status.virtualIp) {
        setVirtualIp(status.virtualIp);
      }
      if (status.machineId) {
        setMachineId(status.machineId);
      }
      if (status.hostname) {
        setHostname(status.hostname);
      }
      if (status.running) {
        setConnecting(false);
        const peerList = await getEasyTierPeers();
        setPeers(peerList);
      } else {
        setPeers([]);
      }
    } catch (e) {
      console.warn('refreshStatus error:', e);
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    const unsubscribe = addEasyTierStatusListener(ev => {
      setRunning(ev.running);
      if (ev.virtualIp) {
        setVirtualIp(ev.virtualIp);
      }
      if (ev.message) {
        setStatusMessage(ev.message);
      }
      if (ev.running) {
        setConnecting(false);
      }
    });

    pollTimerRef.current = setInterval(() => {
      refreshStatus();
    }, 4000);

    return () => {
      unsubscribe();
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [refreshStatus]);

  const handleModeChange = (val: string) => {
    const updated = saveEasyTierConfig({mode: val as 'token' | 'config'});
    setConfig(updated);
  };

  const updateConfigField = (field: keyof EasyTierConfig, val: string) => {
    const updated = {...config, [field]: val};
    setConfig(updated);
    saveEasyTierConfig(updated);
  };

  const handlePasteToken = async () => {
    const text = await Clipboard.getString();
    if (text) {
      const trimmed = text.trim();
      let extractedUrl = trimmed;
      if (trimmed.includes('--config-server')) {
        const parts = trimmed.split(/--config-server[\s=]+/);
        if (parts.length > 1) {
          extractedUrl = parts[1].trim().split(/\s+/)[0].replace(/["']/g, '');
        }
      }

      if (extractedUrl.includes('://')) {
        const lastSlash = extractedUrl.lastIndexOf('/');
        if (lastSlash > extractedUrl.indexOf('://') + 2) {
          const server = extractedUrl.substring(0, lastSlash);
          const tok = extractedUrl.substring(lastSlash + 1);
          const updated = {...config, configServer: server, token: tok};
          setConfig(updated);
          saveEasyTierConfig(updated);
          ToastAndroid.show(t('Pasted') || '已解析并自动填入服务器与令牌', ToastAndroid.SHORT);
          return;
        }
      }

      updateConfigField('token', extractedUrl);
      ToastAndroid.show(t('Pasted') || '已粘贴', ToastAndroid.SHORT);
    }
  };

  const handleToggleConnect = async () => {
    if (running) {
      // Disconnect
      setConnecting(true);
      await stopEasyTier();
      setRunning(false);
      setConnecting(false);
      setVirtualIp('');
      setStatusMessage('已断开');
      ToastAndroid.show(t('EasyTier Disconnected') || 'EasyTier 已断开', ToastAndroid.SHORT);
    } else {
      // Connect
      setConnecting(true);
      setStatusMessage('正在准备 VPN 权限...');
      const vpnGranted = await prepareVpn();
      if (!vpnGranted) {
        setConnecting(false);
        setStatusMessage('VPN 授权被拒绝');
        ToastAndroid.show(t('VPN Permission Denied') || 'VPN 授权未通过', ToastAndroid.LONG);
        return;
      }

      saveEasyTierConfig(config);

      if (config.mode === 'token') {
        if (!config.token || !config.token.trim()) {
          setConnecting(false);
          ToastAndroid.show(t('Please enter token') || '请输入设备令牌', ToastAndroid.SHORT);
          return;
        }
        setStatusMessage('正在连接 EasyTier 控制服务器...');
        try {
          await startEasyTierWithToken(config.token.trim(), config.configServer.trim());
          ToastAndroid.show(t('Connecting...') || '正在建立连接...', ToastAndroid.SHORT);
        } catch (e: any) {
          setConnecting(false);
          setStatusMessage(e.message || '连接失败');
          ToastAndroid.show(e.message || '连接失败', ToastAndroid.LONG);
        }
      } else {
        // Config mode
        setStatusMessage('正在启动 EasyTier 网络实例...');
        try {
          const peerList = config.peers
            ? config.peers.split('\n').map(p => p.trim()).filter(Boolean)
            : [];
          await startEasyTierWithConfig({
            networkName: config.networkName.trim() || 'default',
            networkSecret: config.networkSecret.trim(),
            ipv4: config.ipv4.trim() || '10.144.144.1',
            peers: peerList,
          });
          ToastAndroid.show(t('Connecting...') || '正在建立连接...', ToastAndroid.SHORT);
        } catch (e: any) {
          setConnecting(false);
          setStatusMessage(e.message || '启动失败');
          ToastAndroid.show(e.message || '启动失败', ToastAndroid.LONG);
        }
      }
    }
  };

  const handleOpenEasyTierApp = async () => {
    try {
      await launchEasyTierApp();
    } catch (e: any) {
      ToastAndroid.show(
        e?.message || t('EasyTier Pro is not installed') || '未检测到已安装的 EasyTier Pro 应用',
        ToastAndroid.LONG,
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <Card style={[styles.card, {backgroundColor: theme.colors.elevation.level1}]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <View style={styles.statusTitleRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: running
                        ? '#4CAF50'
                        : connecting
                        ? '#FFC107'
                        : '#F44336',
                    },
                  ]}
                />
                <Text variant="titleMedium" style={styles.statusTitle}>
                  {running
                    ? t('EasyTier Connected') || 'EasyTier 已连接'
                    : connecting
                    ? t('EasyTier Connecting') || '正在连接...'
                    : t('EasyTier Disconnected') || 'EasyTier 未连接'}
                </Text>
              </View>

              {running && (
                <Chip icon="check-circle" style={styles.chipActive}>
                  Online
                </Chip>
              )}
            </View>

            {running && virtualIp ? (
              <View style={styles.ipContainer}>
                <Text style={styles.ipLabel}>虚拟局域网 IP (Virtual IP):</Text>
                <Text variant="headlineSmall" style={[styles.ipValue, {color: theme.colors.primary}]}>
                  {virtualIp}
                </Text>
              </View>
            ) : null}

            {statusMessage ? (
              <Text style={styles.statusSubtext}>{statusMessage}</Text>
            ) : null}

            {hostname ? (
              <Text style={styles.deviceMeta}>
                设备名: {hostname} {machineId ? `(${machineId.slice(0, 8)}...)` : ''}
              </Text>
            ) : null}

            <Button
              mode={running ? 'contained-tonal' : 'contained'}
              buttonColor={running ? theme.colors.errorContainer : theme.colors.primary}
              textColor={running ? theme.colors.onErrorContainer : theme.colors.onPrimary}
              style={styles.actionBtn}
              loading={connecting}
              disabled={connecting}
              onPress={handleToggleConnect}>
              {running
                ? t('Disconnect EasyTier') || '断开 EasyTier 连接'
                : connecting
                ? t('Connecting') || '连接中...'
                : t('Connect EasyTier') || '手动连接 EasyTier'}
            </Button>

            <Button
              mode="outlined"
              icon="open-in-new"
              textColor={theme.colors.primary}
              style={styles.openAppBtn}
              onPress={handleOpenEasyTierApp}>
              {t('Open EasyTier Pro App') || '打开外部 EasyTier Pro'}
            </Button>
          </Card.Content>
        </Card>

        {/* Mode Selector */}
        <View style={styles.modeSection}>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t('Connection Mode') || '连接方式'}
          </Text>
          <SegmentedButtons
            value={config.mode}
            onValueChange={handleModeChange}
            buttons={[
              {
                value: 'token',
                label: 'EasyTier Pro 令牌模式',
              },
              {
                value: 'config',
                label: '自定义网络配置',
              },
            ]}
            style={styles.segmentedBtn}
          />
        </View>

        {/* Token Mode Form */}
        {config.mode === 'token' ? (
          <Card style={[styles.card, {backgroundColor: theme.colors.elevation.level1}]}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.formSectionTitle}>
                EasyTier Pro 设备令牌设置
              </Text>
              <Text style={styles.tipsText}>
                提示：可直接粘贴您在 EasyTier Pro 掌机端或控制台中的设备连接令牌。
              </Text>

              <View style={styles.tokenInputRow}>
                <TextInput
                  label="设备令牌 (Device Token)"
                  value={config.token}
                  onChangeText={val => updateConfigField('token', val)}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.tokenInput}
                  placeholder="粘贴 EasyTier Pro 设备令牌..."
                />
              </View>

              <Button
                mode="outlined"
                icon="content-paste"
                onPress={handlePasteToken}
                style={styles.pasteBtn}>
                {t('Paste Token') || '从剪贴板粘贴令牌'}
              </Button>

              <TextInput
                label="控制台地址 (Config Server URL)"
                value={config.configServer}
                onChangeText={val => updateConfigField('configServer', val)}
                mode="outlined"
                style={styles.inputField}
                placeholder="tcp://et-web.console.easytier.net:22020"
              />
            </Card.Content>
          </Card>
        ) : (
          /* Custom Mode Form */
          <Card style={[styles.card, {backgroundColor: theme.colors.elevation.level1}]}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.formSectionTitle}>
                自建 EasyTier 网络参数
              </Text>

              <TextInput
                label="网络名称 (Network Name)"
                value={config.networkName}
                onChangeText={val => updateConfigField('networkName', val)}
                mode="outlined"
                style={styles.inputField}
              />

              <TextInput
                label="网络密码 (Network Secret)"
                value={config.networkSecret}
                onChangeText={val => updateConfigField('networkSecret', val)}
                secureTextEntry
                mode="outlined"
                style={styles.inputField}
              />

              <TextInput
                label="虚拟 IPv4 地址 (Virtual IPv4)"
                value={config.ipv4}
                onChangeText={val => updateConfigField('ipv4', val)}
                mode="outlined"
                style={styles.inputField}
                placeholder="例如 10.144.144.99"
              />

              <TextInput
                label="公共/对端节点 (Peers)"
                value={config.peers}
                onChangeText={val => updateConfigField('peers', val)}
                multiline
                numberOfLines={2}
                mode="outlined"
                style={styles.inputField}
                placeholder="tcp://public.easytier.top:11010"
              />
            </Card.Content>
          </Card>
        )}

        {/* Connected Peer List */}
        {running && (
          <Card style={[styles.card, {backgroundColor: theme.colors.elevation.level1}]}>
            <Card.Content>
              <View style={styles.peersHeader}>
                <Text variant="titleMedium">
                  {t('Peer Nodes') || '在线对端节点'} ({peers.length})
                </Text>
                <TouchableOpacity onPress={refreshStatus}>
                  <Text style={{color: theme.colors.primary, fontSize: 13}}>刷新节点</Text>
                </TouchableOpacity>
              </View>

              {peers.length === 0 ? (
                <Text style={styles.emptyPeers}>正在发现局域网其他对端节点...</Text>
              ) : (
                peers.map((peer, idx) => (
                  <View key={idx} style={styles.peerItem}>
                    <View style={styles.peerLeft}>
                      <Text style={styles.peerHost}>{peer.hostname || '未知主机'}</Text>
                      <Text style={styles.peerIp}>{peer.ipv4}</Text>
                    </View>
                    <View style={styles.peerRight}>
                      <Text style={styles.peerLatency}>
                        {peer.latency_ms > 0 ? `${peer.latency_ms.toFixed(1)} ms` : '直连'}
                      </Text>
                      <Text style={styles.peerType}>{peer.tunnel_type || 'p2p'}</Text>
                    </View>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusTitle: {
    fontWeight: 'bold',
  },
  chipActive: {
    height: 28,
  },
  ipContainer: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  ipLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  ipValue: {
    fontWeight: 'bold',
  },
  statusSubtext: {
    fontSize: 13,
    opacity: 0.8,
    marginTop: 4,
  },
  deviceMeta: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 6,
  },
  actionBtn: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 4,
  },
  openAppBtn: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  modeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  segmentedBtn: {
    marginBottom: 4,
  },
  formSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 12,
  },
  tokenInputRow: {
    marginBottom: 8,
  },
  tokenInput: {
    fontSize: 13,
  },
  pasteBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  inputField: {
    marginTop: 10,
  },
  peersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyPeers: {
    fontSize: 13,
    opacity: 0.6,
    paddingVertical: 8,
  },
  peerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  peerLeft: {
    flex: 1,
  },
  peerHost: {
    fontWeight: '600',
    fontSize: 14,
  },
  peerIp: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  peerRight: {
    alignItems: 'flex-end',
  },
  peerLatency: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#4CAF50',
  },
  peerType: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
});
