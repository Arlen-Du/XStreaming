import {NativeModules, DeviceEventEmitter, Platform} from 'react-native';

const {EasyTierModule} = NativeModules;

export type EasyTierStatus = {
  running: boolean;
  virtualIp: string;
  instanceName?: string;
  lastError?: string;
  message?: string;
  machineId?: string;
  hostname?: string;
};

export type EasyTierPeer = {
  hostname: string;
  version: string;
  ipv4: string;
  latency_ms: number;
  cost: number;
  tunnel_type: string;
};

export const isEasyTierSupported = (): boolean => {
  return Platform.OS === 'android' && Boolean(EasyTierModule);
};

export const prepareVpn = async (): Promise<boolean> => {
  if (!isEasyTierSupported()) return false;
  try {
    return await EasyTierModule.prepareVpn();
  } catch (e) {
    console.warn('EasyTier prepareVpn failed:', e);
    return false;
  }
};

export const startEasyTierWithToken = async (
  token: string,
  configServer: string,
): Promise<boolean> => {
  if (!isEasyTierSupported()) return false;
  return await EasyTierModule.startWithToken(token, configServer);
};

export const startEasyTierWithConfig = async (config: {
  networkName: string;
  networkSecret: string;
  ipv4: string;
  peers: string[];
}): Promise<boolean> => {
  if (!isEasyTierSupported()) return false;
  return await EasyTierModule.startWithConfig(config);
};

export const stopEasyTier = async (): Promise<boolean> => {
  if (!isEasyTierSupported()) return false;
  try {
    return await EasyTierModule.stopVpn();
  } catch (e) {
    console.warn('EasyTier stopVpn failed:', e);
    return false;
  }
};

export const getEasyTierStatus = async (): Promise<EasyTierStatus> => {
  if (!isEasyTierSupported()) {
    return {running: false, virtualIp: '', message: '不支持此平台'};
  }
  try {
    return await EasyTierModule.getStatus();
  } catch (e) {
    return {running: false, virtualIp: '', message: String(e)};
  }
};

export const getEasyTierPeers = async (): Promise<EasyTierPeer[]> => {
  if (!isEasyTierSupported()) return [];
  try {
    return await EasyTierModule.getPeers();
  } catch (e) {
    return [];
  }
};

export const addEasyTierStatusListener = (
  listener: (status: {running: boolean; virtualIp: string; message: string}) => void,
): (() => void) => {
  const subscription = DeviceEventEmitter.addListener('EasyTierStatusChanged', listener);
  return () => {
    subscription.remove();
  };
};

export const isEasyTierAppInstalled = async (): Promise<boolean> => {
  if (!isEasyTierSupported()) return false;
  try {
    return await EasyTierModule.isEasyTierAppInstalled();
  } catch (e) {
    return false;
  }
};

export const launchEasyTierApp = async (): Promise<boolean> => {
  if (!isEasyTierSupported()) return false;
  try {
    return await EasyTierModule.launchEasyTierApp();
  } catch (e) {
    console.warn('launchEasyTierApp failed:', e);
    throw e;
  }
};

