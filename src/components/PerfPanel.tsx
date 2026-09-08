import React from 'react';
import {StyleSheet, View, NativeModules} from 'react-native';
import {Text} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {getSettings} from '../store/settingStore';
import {getXcloudRegionFlag} from '../common/settings/xcloud';

const {BatteryModule} = NativeModules;

type Props = {
  performance: any;
  streamType?: string;
};

const PerfPanel: React.FC<Props> = ({performance = {}, streamType}) => {
  const {t} = useTranslation();
  const settings = getSettings();
  const [battery, setBattery] = React.useState(100);
  const batteryInterval = React.useRef<any>(null);

  const isHorizon = settings.performance_style;
  const xcloudRegionFlag =
    streamType === 'cloud' ? getXcloudRegionFlag(settings.force_region_ip) : '';
  const rttLabel = `${t('RTT')}${
    xcloudRegionFlag ? `(${xcloudRegionFlag})` : ''
  }`;

  React.useEffect(() => {
    const getBattery = () => {
      BatteryModule.getBatteryLevel()
        .then((level: any) => {
          if (level) {
            setBattery(Number(level));
          } else {
            setBattery(-1);
          }
        })
        .catch((e: any) => {
          console.log(e);
        });
    };
    getBattery();

    // Catch battery every 2 mins
    batteryInterval.current = setInterval(getBattery, 2 * 60 * 1000);

    return () => {
      batteryInterval.current && clearInterval(batteryInterval.current);
    };
  }, []);

  let resolutionText = '';
  if (performance.resolution) {
    resolutionText = performance.resolution;
    if (settings.resolution === 1081) {
      if (settings.fsr) {
        resolutionText = `${resolutionText} HQ+FSR`;
      } else {
        resolutionText = `${resolutionText} HQ`;
      }
    } else {
      if (settings.fsr) {
        resolutionText = `${resolutionText} FSR`;
      }
    }
  }

  // Helper colors for metrics
  const getRttColor = (rttVal?: string | number) => {
    const num = parseFloat(String(rttVal || ''));
    if (isNaN(num)) return '#94A3B8';
    if (num <= 30) return '#10B981'; // Green
    if (num <= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getFpsColor = (fpsVal?: string | number) => {
    const num = parseFloat(String(fpsVal || ''));
    if (isNaN(num)) return '#94A3B8';
    if (num >= 58) return '#10B981'; // Green
    if (num >= 48) return '#38BDF8'; // Cyan
    return '#EF4444'; // Red
  };

  const getLossColor = (lossVal?: string | number) => {
    const num = parseFloat(String(lossVal || ''));
    if (!isNaN(num) && num > 0) return '#EF4444'; // Red
    return '#94A3B8';
  };

  const renderMetric = (
    label: string,
    value: string | number,
    color?: string,
    isLast?: boolean,
  ) => {
    return (
      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, {color: color || '#F8FAFC'}]}>
          {value || '-'}
        </Text>
        {isHorizon && !isLast && <Text style={styles.separatorDot}>•</Text>}
      </View>
    );
  };

  return (
    <View
      pointerEvents="none"
      style={[
        isHorizon ? styles.containerH : styles.containerV,
        {opacity: settings.performance_opacity || 0.7},
      ]}>
      <View style={isHorizon ? styles.wrapperH : styles.wrapperV}>
        {resolutionText ? (
          <View style={styles.resBadge}>
            <Text style={styles.resText}>{resolutionText}</Text>
          </View>
        ) : null}

        {renderMetric(rttLabel, performance.rtt, getRttColor(performance.rtt))}
        {renderMetric(t('JIT'), performance.jit, '#94A3B8')}
        {renderMetric(t('FPS'), performance.fps, getFpsColor(performance.fps))}
        {renderMetric(t('FD'), performance.fl, getLossColor(performance.fl))}
        {renderMetric(t('PL'), performance.pl, getLossColor(performance.pl))}
        {renderMetric(t('Bitrate'), performance.br, '#38BDF8')}
        {renderMetric(t('DT'), performance.decode, '#94A3B8', battery <= -1)}

        {battery > -1 && (
          <View style={styles.batteryBadge}>
            <Text
              style={[
                styles.batteryText,
                {color: battery < 20 ? '#EF4444' : '#10B981'},
              ]}>
              {battery < 20 ? '🪫' : '🔋'} {battery}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerH: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  wrapperH: {
    backgroundColor: 'rgba(11, 15, 25, 0.82)',
    borderColor: 'rgba(110, 235, 131, 0.28)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  containerV: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 99,
  },
  wrapperV: {
    backgroundColor: 'rgba(11, 15, 25, 0.84)',
    borderColor: 'rgba(110, 235, 131, 0.28)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    elevation: 6,
  },
  resBadge: {
    backgroundColor: 'rgba(16, 124, 16, 0.22)',
    borderColor: 'rgba(110, 235, 131, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: 8,
  },
  resText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86EFAC',
    letterSpacing: 0.3,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(148, 163, 184, 0.85)',
    marginRight: 3,
  },
  metricValue: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  separatorDot: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.22)',
    marginHorizontal: 6,
  },
  batteryBadge: {
    marginLeft: 4,
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default PerfPanel;

