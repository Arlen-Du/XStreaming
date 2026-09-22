import {NativeModules, Platform} from 'react-native';

const {EasyTierModule} = NativeModules;

export const isEasyTierSupported = (): boolean => {
  return Platform.OS === 'android' && Boolean(EasyTierModule);
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
