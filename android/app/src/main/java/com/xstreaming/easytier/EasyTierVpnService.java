package com.xstreaming.easytier;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import com.easytier.jni.ConfigServerEventCallback;
import com.easytier.jni.EasyTierJNI;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class EasyTierVpnService extends VpnService {
    private static final String TAG = "EasyTierVpnService";
    private static final int NOTIFICATION_ID = 22020;
    private static final String CHANNEL_ID = "easytier_vpn_channel";

    public static final String ACTION_START_CONFIG_SERVER = "com.xstreaming.easytier.START_CONFIG_SERVER";
    public static final String ACTION_START_VPN = "com.xstreaming.easytier.START_VPN";
    public static final String ACTION_STOP_RUNTIME = "com.xstreaming.easytier.STOP_RUNTIME";

    public static final String EXTRA_CONFIG_SERVER_URL = "config_server_url";
    public static final String EXTRA_HOSTNAME = "hostname";
    public static final String EXTRA_MACHINE_ID = "machine_id";
    public static final String EXTRA_SECURE_MODE = "secure_mode";

    public static final String EXTRA_INSTANCE_NAME = "instance_name";
    public static final String EXTRA_ADDRESSES = "addresses";
    public static final String EXTRA_ROUTES = "routes";
    public static final String EXTRA_MTU = "mtu";

    public static volatile boolean isRunning = false;
    public static volatile String currentVirtualIp = "";
    public static volatile String currentInstanceName = "";
    public static volatile String lastErrorMessage = "";

    public interface StatusListener {
        void onStatusChanged(boolean running, String virtualIp, String message);
    }

    private static StatusListener statusListener = null;

    public static void setStatusListener(StatusListener listener) {
        statusListener = listener;
    }

    private static void notifyStatus(boolean running, String virtualIp, String message) {
        isRunning = running;
        currentVirtualIp = virtualIp;
        if (statusListener != null) {
            statusListener.onStatusChanged(running, virtualIp, message);
        }
    }

    private ParcelFileDescriptor tunDescriptor = null;
    private int tunFd = -1;
    private String activeInstanceName = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.i(TAG, "onStartCommand action=" + action);

        if (ACTION_START_CONFIG_SERVER.equals(action)) {
            startConfigServer(intent);
            return START_STICKY;
        } else if (ACTION_START_VPN.equals(action)) {
            startDirectVpn(intent);
            return START_STICKY;
        } else if (ACTION_STOP_RUNTIME.equals(action)) {
            stopRuntime();
            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void startConfigServer(Intent intent) {
        String url = intent.getStringExtra(EXTRA_CONFIG_SERVER_URL);
        String hostname = intent.getStringExtra(EXTRA_HOSTNAME);
        String machineId = intent.getStringExtra(EXTRA_MACHINE_ID);
        boolean secureMode = intent.getBooleanExtra(EXTRA_SECURE_MODE, true);

        if (url == null || url.trim().isEmpty()) {
            Log.e(TAG, "startConfigServer: URL is empty");
            notifyStatus(false, "", "控制服务器地址为空");
            return;
        }

        startForeground(NOTIFICATION_ID, buildNotification("正在连接 EasyTier 控制台..."));
        notifyStatus(true, "", "正在连接控制台...");

        new Thread(() -> {
            try {
                int res = EasyTierJNI.startConfigServerClient(url, hostname, machineId, secureMode, new ConfigServerEventCallback() {
                    @Override
                    public void onEvent(String eventJson) {
                        Log.d(TAG, "Config server event: " + eventJson);
                        handleConfigServerEvent(eventJson);
                    }
                });
                Log.i(TAG, "startConfigServerClient result=" + res);
                if (res != 0) {
                    String err = EasyTierJNI.getLastError();
                    lastErrorMessage = err != null ? err : "连接错误代码 " + res;
                    Log.e(TAG, "startConfigServerClient failed: " + lastErrorMessage);
                    notifyStatus(false, "", lastErrorMessage);
                    stopSelf();
                }
            } catch (Throwable t) {
                Log.e(TAG, "Error starting config server", t);
                lastErrorMessage = t.getMessage();
                notifyStatus(false, "", lastErrorMessage);
                stopSelf();
            }
        }).start();
    }

    private void handleConfigServerEvent(String eventJson) {
        try {
            JSONObject obj = new JSONObject(eventJson);
            String event = obj.optString("event", obj.optString("type", obj.optString("action", "")));
            Log.i(TAG, "handleConfigServerEvent: " + event);

            if ("run_network_instance".equals(event)) {
                JSONObject payload = obj.optJSONObject("payload");
                if (payload == null) {
                    payload = obj;
                } else if (payload.has("payload") && payload.optJSONObject("payload") != null) {
                    payload = payload.optJSONObject("payload");
                }

                String instanceName = payload.optString("instance_name", payload.optString("instanceName", ""));
                if (instanceName.isEmpty()) {
                    instanceName = obj.optString("instance_name", obj.optString("instanceName", ""));
                }
                if (instanceName.isEmpty()) {
                    try {
                        String listStr = EasyTierJNI.listInstances(64);
                        if (listStr != null && !listStr.isEmpty()) {
                            JSONObject listObj = new JSONObject(listStr);
                            if (listObj.keys().hasNext()) {
                                instanceName = listObj.keys().next();
                            }
                        }
                    } catch (Throwable ignored) {}
                }
                if (instanceName.isEmpty()) {
                    instanceName = "default";
                }

                List<String> addresses = extractAddresses(payload);
                if (addresses.isEmpty() && payload.has("vpn_config")) {
                    addresses = extractAddresses(payload.optJSONObject("vpn_config"));
                }

                List<String> routes = new ArrayList<>();
                JSONArray routesJson = payload.optJSONArray("routes");
                if (routesJson != null) {
                    for (int i = 0; i < routesJson.length(); i++) {
                        Object r = routesJson.get(i);
                        if (r instanceof String) {
                            routes.add((String) r);
                        } else if (r instanceof JSONObject) {
                            JSONObject rObj = (JSONObject) r;
                            JSONArray proxyCidrs = rObj.optJSONArray("proxy_cidrs");
                            if (proxyCidrs != null) {
                                for (int j = 0; j < proxyCidrs.length(); j++) {
                                    routes.add(proxyCidrs.getString(j));
                                }
                            }
                        }
                    }
                }

                int mtu = payload.optInt("mtu", 1400);

                if (!addresses.isEmpty()) {
                    establishTunAndSetFd(instanceName, addresses, routes, mtu);
                } else {
                    pollNodeInfoForTun(instanceName, routes, mtu);
                }
            } else if ("delete_network_instance".equals(event)) {
                closeTun();
            }
        } catch (Throwable e) {
            Log.e(TAG, "Error handling config event", e);
        }
    }

    private List<String> extractAddresses(JSONObject json) {
        List<String> result = new ArrayList<>();
        if (json == null) return result;

        JSONArray arr = json.optJSONArray("addresses");
        if (arr == null) arr = json.optJSONArray("virtual_ipv4s");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                Object item = arr.opt(i);
                if (item instanceof String) {
                    result.add((String) item);
                } else if (item instanceof JSONObject) {
                    JSONObject itemObj = (JSONObject) item;
                    String addr = itemObj.optString("address", itemObj.optString("addr", ""));
                    int prefix = itemObj.optInt("prefix_len", itemObj.optInt("prefix", 24));
                    if (!addr.isEmpty()) {
                        result.add(addr + "/" + prefix);
                    }
                }
            }
        } else {
            String addr = json.optString("address", json.optString("ipv4", json.optString("virtual_ipv4", "")));
            if (!addr.isEmpty()) {
                result.add(addr.contains("/") ? addr : addr + "/24");
            }
        }
        return result;
    }

    private void pollNodeInfoForTun(String instanceName, List<String> fallbackRoutes, int mtu) {
        new Thread(() -> {
            String resolvedInstanceName = instanceName;
            for (int attempt = 0; attempt < 15; attempt++) {
                try {
                    Thread.sleep(1000);
                    if (resolvedInstanceName.isEmpty() || "default".equals(resolvedInstanceName)) {
                        String listStr = EasyTierJNI.listInstances(64);
                        if (listStr != null && !listStr.isEmpty()) {
                            JSONObject listObj = new JSONObject(listStr);
                            if (listObj.keys().hasNext()) {
                                resolvedInstanceName = listObj.keys().next();
                            }
                        }
                    }

                    JSONObject req = new JSONObject();
                    JSONObject sel = new JSONObject();
                    sel.put("name", resolvedInstanceName);
                    req.put("instance_selector", sel);
                    JSONObject instanceObj = new JSONObject();
                    instanceObj.put("instance", req);

                    String res = EasyTierJNI.callJsonRpc("api.instance.PeerManageRpcService", "show_node_info", null, instanceObj.toString());
                    Log.d(TAG, "show_node_info attempt " + attempt + " response: " + res);
                    if (res != null && !res.isEmpty()) {
                        JSONObject rpcRes = new JSONObject(res);
                        JSONObject myNodeInfo = rpcRes.optJSONObject("my_node_info");
                        if (myNodeInfo != null) {
                            List<String> addrs = extractAddresses(myNodeInfo);
                            if (!addrs.isEmpty()) {
                                establishTunAndSetFd(resolvedInstanceName, addrs, fallbackRoutes, mtu);
                                return;
                            }
                        }
                    }
                } catch (Throwable t) {
                    Log.w(TAG, "pollNodeInfo attempt " + attempt + " failed: " + t.getMessage());
                }
            }
        }).start();
    }

    private void startDirectVpn(Intent intent) {
        String instanceName = intent.getStringExtra(EXTRA_INSTANCE_NAME);
        ArrayList<String> addresses = intent.getStringArrayListExtra(EXTRA_ADDRESSES);
        ArrayList<String> routes = intent.getStringArrayListExtra(EXTRA_ROUTES);
        int mtu = intent.getIntExtra(EXTRA_MTU, 1400);

        if (instanceName == null || instanceName.isEmpty()) {
            instanceName = "default";
        }
        if (addresses == null || addresses.isEmpty()) {
            Log.e(TAG, "startDirectVpn: addresses is empty");
            notifyStatus(false, "", "VPN 地址为空");
            return;
        }

        startForeground(NOTIFICATION_ID, buildNotification("EasyTier 组网建立中..."));
        establishTunAndSetFd(instanceName, addresses, routes != null ? routes : new ArrayList<>(), mtu);
    }

    private synchronized void establishTunAndSetFd(String instanceName, List<String> addresses, List<String> routes, int mtu) {
        try {
            closeTun();

            Builder builder = new Builder();
            builder.setSession("EasyTier");
            builder.setBlocking(false);
            if (mtu > 0) {
                builder.setMtu(mtu);
            }

            String firstIp = "";
            for (String cidr : addresses) {
                String[] parts = cidr.trim().split("/");
                String ip = parts[0];
                int prefix = parts.length > 1 ? Integer.parseInt(parts[1]) : 24;
                builder.addAddress(ip, prefix);
                if (firstIp.isEmpty()) {
                    firstIp = ip;
                }
                builder.addRoute(getSubnetNetworkAddress(ip, prefix), prefix);
            }

            for (String routeCidr : routes) {
                try {
                    String[] parts = routeCidr.trim().split("/");
                    String ip = parts[0];
                    int prefix = parts.length > 1 ? Integer.parseInt(parts[1]) : 24;
                    builder.addRoute(getSubnetNetworkAddress(ip, prefix), prefix);
                } catch (Throwable ignore) {}
            }

            try {
                builder.addDisallowedApplication(getPackageName());
            } catch (PackageManager.NameNotFoundException ignored) {}

            ParcelFileDescriptor descriptor = builder.establish();
            if (descriptor == null) {
                throw new IllegalStateException("VpnService.Builder.establish() returned null");
            }

            tunDescriptor = descriptor;
            tunFd = descriptor.detachFd();
            tunDescriptor = null;
            activeInstanceName = instanceName;
            currentInstanceName = instanceName;
            currentVirtualIp = firstIp;

            int setFdRes = EasyTierJNI.setTunFd(instanceName, tunFd);
            Log.i(TAG, "setTunFd instance=" + instanceName + " fd=" + tunFd + " result=" + setFdRes);

            updateNotification("已连接: " + firstIp);
            notifyStatus(true, firstIp, "已连接");
        } catch (Throwable e) {
            Log.e(TAG, "Failed to establish TUN interface", e);
            lastErrorMessage = e.getMessage();
            notifyStatus(false, "", "虚拟网卡创建失败: " + e.getMessage());
            closeTun();
        }
    }

    private String getSubnetNetworkAddress(String ip, int prefixLength) {
        try {
            String[] parts = ip.split("\\.");
            if (parts.length != 4) return ip;
            long val = 0;
            for (String p : parts) {
                val = (val << 8) | Integer.parseInt(p);
            }
            long mask = prefixLength == 0 ? 0L : (0xffffffffL << (32 - prefixLength)) & 0xffffffffL;
            long net = val & mask;
            return ((net >> 24) & 0xff) + "." + ((net >> 16) & 0xff) + "." + ((net >> 8) & 0xff) + "." + (net & 0xff);
        } catch (Throwable e) {
            return ip;
        }
    }

    private synchronized void closeTun() {
        if (tunFd >= 0) {
            try {
                ParcelFileDescriptor.adoptFd(tunFd).close();
                Log.i(TAG, "Closed TUN fd: " + tunFd);
            } catch (IOException e) {
                Log.w(TAG, "Error closing TUN fd", e);
            }
            tunFd = -1;
        }
        if (tunDescriptor != null) {
            try {
                tunDescriptor.close();
            } catch (IOException ignored) {}
            tunDescriptor = null;
        }
        activeInstanceName = null;
    }

    public synchronized void stopRuntime() {
        Log.i(TAG, "stopRuntime called");
        try {
            EasyTierJNI.stopConfigServerClient();
        } catch (Throwable t) {
            Log.w(TAG, "Error stopping config server client", t);
        }

        try {
            EasyTierJNI.stopAllInstances();
        } catch (Throwable t) {
            Log.w(TAG, "Error stopping all instances", t);
        }

        closeTun();
        notifyStatus(false, "", "已断开");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "onDestroy");
        stopRuntime();
        super.onDestroy();
    }

    @Override
    public void onRevoke() {
        Log.i(TAG, "onRevoke called by system");
        stopRuntime();
        super.onRevoke();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "EasyTier VPN 服务",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("EasyTier 虚拟局域网运行状态");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String text) {
        Intent appIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (appIntent != null) {
            appIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        }
        PendingIntent pendingAppIntent = appIntent != null
            ? PendingIntent.getActivity(this, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
            : null;

        Intent stopIntent = new Intent(this, EasyTierVpnService.class);
        stopIntent.setAction(ACTION_STOP_RUNTIME);
        PendingIntent pendingStopIntent = PendingIntent.getService(
            this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        int appIcon = getApplicationInfo().icon;
        builder.setSmallIcon(appIcon)
            .setContentTitle("EasyTier 组网")
            .setContentText(text)
            .setOngoing(true);

        if (pendingAppIntent != null) {
            builder.setContentIntent(pendingAppIntent);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            Notification.Action stopAction = new Notification.Action.Builder(
                appIcon, "断开连接", pendingStopIntent
            ).build();
            builder.addAction(stopAction);
        } else {
            builder.addAction(appIcon, "断开连接", pendingStopIntent);
        }

        return builder.build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(text));
        }
    }
}
