import {storage} from './mmkv';

const STORE_KEY = 'easytier.settings';

export type EasyTierConfig = {
  mode: 'token' | 'config';
  token: string;
  configServer: string;
  networkName: string;
  networkSecret: string;
  ipv4: string;
  peers: string;
};

const DEFAULT_CONFIG: EasyTierConfig = {
  mode: 'token',
  token: '',
  configServer: 'tcp://et-web.console.easytier.net:22020',
  networkName: 'default',
  networkSecret: '',
  ipv4: '10.144.144.1',
  peers: 'tcp://public.easytier.top:11010',
};

export const getEasyTierConfig = (): EasyTierConfig => {
  try {
    const raw = storage.getString(STORE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return {...DEFAULT_CONFIG, ...JSON.parse(raw)};
  } catch (e) {
    return DEFAULT_CONFIG;
  }
};

export const saveEasyTierConfig = (config: Partial<EasyTierConfig>): EasyTierConfig => {
  const current = getEasyTierConfig();
  const updated = {...current, ...config};
  storage.set(STORE_KEY, JSON.stringify(updated));
  return updated;
};
