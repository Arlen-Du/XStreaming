package com.easytier.jni;

public class EasyTierJNI {
    static {
        System.loadLibrary("easytier_android_jni");
    }

    public static native int setTunFd(String instanceName, int fd);

    public static native int parseConfig(String config);

    public static native int runNetworkInstance(String config);

    public static native int startConfigServerClient(
        String url,
        String hostname,
        String machineId,
        boolean secureMode,
        ConfigServerEventCallback callback
    );

    public static native int stopConfigServerClient();

    public static native boolean isConfigServerClientConnected();

    public static native int retainNetworkInstance(String[] instanceNames);

    public static native String listInstances(int maxLength);

    public static native String callJsonRpc(
        String serviceName,
        String methodName,
        String domainName,
        String payloadJson
    );

    public static native String getLastError();

    public static int stopAllInstances() {
        return retainNetworkInstance(null);
    }

    public static int retainSingleInstance(String instanceName) {
        return retainNetworkInstance(new String[]{instanceName});
    }
}
