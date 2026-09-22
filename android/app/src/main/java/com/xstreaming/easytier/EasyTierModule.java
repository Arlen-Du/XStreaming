package com.xstreaming.easytier;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.net.VpnService;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.easytier.jni.EasyTierJNI;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

public class EasyTierModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
    private static final String TAG = "EasyTierModule";
    private static final String MODULE_NAME = "EasyTierModule";
    private static final int VPN_REQUEST_CODE = 22025;
    private static final int EASYTIER_APP_REQUEST_CODE = 22026;
    private static final int RETURN_NOTIFICATION_ID = 22027;
    private static final String RETURN_CHANNEL_ID = "easytier_return_channel";
    private static final String PREF_NAME = "easytier_preferences";
    private static final String PREF_MACHINE_ID = "machine_id";

    private static final String[] EASYTIER_PACKAGES = new String[] {
        "net.easytier.pro",
        "net.easytier",
        "com.easytier",
        "com.easytier.app"
    };

    private final ReactApplicationContext reactContext;
    private Promise pendingVpnPromise = null;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == VPN_REQUEST_CODE) {
                if (pendingVpnPromise != null) {
                    if (resultCode == Activity.RESULT_OK) {
                        pendingVpnPromise.resolve(true);
                    } else {
                        pendingVpnPromise.resolve(false);
                    }
                    pendingVpnPromise = null;
                }
            } else if (requestCode == EASYTIER_APP_REQUEST_CODE) {
                cancelReturnNotification();
                try {
                    Activity current = getCurrentActivity();
                    if (current != null) {
                        Intent bringToFront = new Intent(current, current.getClass());
                        bringToFront.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                        current.startActivity(bringToFront);
                    }
                } catch (Throwable t) {
                    Log.w(TAG, "bringToFront error", t);
                }
            }
        }
    };

    public EasyTierModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(activityEventListener);
        reactContext.addLifecycleEventListener(this);

        EasyTierVpnService.setStatusListener((running, virtualIp, message) -> {
            WritableMap params = Arguments.createMap();
            params.putBoolean("running", running);
            params.putString("virtualIp", virtualIp != null ? virtualIp : "");
            params.putString("message", message != null ? message : "");
            emitEvent("EasyTierStatusChanged", params);
        });
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void emitEvent(String eventName, Object params) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }

    @ReactMethod
    public void prepareVpn(Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "Current activity is null");
                return;
            }

            Intent vpnIntent = VpnService.prepare(currentActivity);
            if (vpnIntent == null) {
                promise.resolve(true);
                return;
            }

            pendingVpnPromise = promise;
            currentActivity.startActivityForResult(vpnIntent, VPN_REQUEST_CODE);
        } catch (Throwable t) {
            Log.e(TAG, "prepareVpn error", t);
            promise.reject("PREPARE_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void startWithToken(String token, String configServer, Promise promise) {
        try {
            if (token == null || token.trim().isEmpty()) {
                promise.reject("INVALID_TOKEN", "令牌不能为空");
                return;
            }

            String trimmed = token.trim();
            boolean secureMode = true;

            if (trimmed.contains("--secure-mode=")) {
                int smIdx = trimmed.indexOf("--secure-mode=");
                String smVal = trimmed.substring(smIdx + 14).trim().split("\\s+")[0];
                secureMode = "true".equalsIgnoreCase(smVal);
            }

            if (trimmed.contains("--config-server")) {
                String[] parts = trimmed.split("--config-server[\\s=]+");
                if (parts.length > 1) {
                    trimmed = parts[1].trim().split("\\s+")[0].replaceAll("[\"']", "");
                }
            }

            String fullUrl;
            if (trimmed.contains("://")) {
                fullUrl = trimmed;
            } else {
                String server = configServer != null && !configServer.trim().isEmpty() 
                    ? configServer.trim() 
                    : "tcp://et-web.console.easytier.net:22020";
                server = server.replaceAll("/+$", "");
                fullUrl = server + "/" + Uri.encode(trimmed);
            }

            String machineId = getOrGenerateMachineId();
            String hostname = getDeviceHostname();

            Log.i(TAG, "Starting config server client: url=" + fullUrl + ", host=" + hostname + ", secureMode=" + secureMode);

            Intent intent = new Intent(reactContext, EasyTierVpnService.class);
            intent.setAction(EasyTierVpnService.ACTION_START_CONFIG_SERVER);
            intent.putExtra(EasyTierVpnService.EXTRA_CONFIG_SERVER_URL, fullUrl);
            intent.putExtra(EasyTierVpnService.EXTRA_HOSTNAME, hostname);
            intent.putExtra(EasyTierVpnService.EXTRA_MACHINE_ID, machineId);
            intent.putExtra(EasyTierVpnService.EXTRA_SECURE_MODE, secureMode);

            ContextCompat.startForegroundService(reactContext, intent);
            promise.resolve(true);
        } catch (Throwable t) {
            Log.e(TAG, "startWithToken error", t);
            promise.reject("START_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void startWithConfig(ReadableMap config, Promise promise) {
        try {
            String networkName = config.hasKey("networkName") ? config.getString("networkName") : "";
            String networkSecret = config.hasKey("networkSecret") ? config.getString("networkSecret") : "";
            String ipv4 = config.hasKey("ipv4") ? config.getString("ipv4") : "10.144.144.1";
            ReadableArray peersArray = config.hasKey("peers") ? config.getArray("peers") : null;

            StringBuilder toml = new StringBuilder();
            toml.append("instance_name = \"xstreaming\"\n");
            toml.append("dhcp = false\n");
            toml.append("ipv4 = \"").append(ipv4).append("/24\"\n");
            if (peersArray != null && peersArray.size() > 0) {
                toml.append("peers = [");
                for (int i = 0; i < peersArray.size(); i++) {
                    if (i > 0) toml.append(", ");
                    toml.append("\"").append(peersArray.getString(i)).append("\"");
                }
                toml.append("]\n");
            }
            toml.append("[network_identity]\n");
            toml.append("network_name = \"").append(networkName).append("\"\n");
            toml.append("network_secret = \"").append(networkSecret).append("\"\n");

            int runRes = EasyTierJNI.runNetworkInstance(toml.toString());
            if (runRes != 0) {
                String err = EasyTierJNI.getLastError();
                promise.reject("RUN_ERROR", err != null ? err : "启动实例失败: " + runRes);
                return;
            }

            Intent intent = new Intent(reactContext, EasyTierVpnService.class);
            intent.setAction(EasyTierVpnService.ACTION_START_VPN);
            intent.putExtra(EasyTierVpnService.EXTRA_INSTANCE_NAME, "xstreaming");
            ArrayList<String> addrs = new ArrayList<>();
            addrs.add(ipv4 + "/24");
            intent.putStringArrayListExtra(EasyTierVpnService.EXTRA_ADDRESSES, addrs);

            ContextCompat.startForegroundService(reactContext, intent);
            promise.resolve(true);
        } catch (Throwable t) {
            Log.e(TAG, "startWithConfig error", t);
            promise.reject("START_CONFIG_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void stopVpn(Promise promise) {
        try {
            Intent intent = new Intent(reactContext, EasyTierVpnService.class);
            intent.setAction(EasyTierVpnService.ACTION_STOP_RUNTIME);
            reactContext.startService(intent);
            promise.resolve(true);
        } catch (Throwable t) {
            Log.e(TAG, "stopVpn error", t);
            promise.reject("STOP_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void getStatus(Promise promise) {
        try {
            WritableMap map = Arguments.createMap();
            map.putBoolean("running", EasyTierVpnService.isRunning);
            map.putString("virtualIp", EasyTierVpnService.currentVirtualIp);
            map.putString("instanceName", EasyTierVpnService.currentInstanceName);
            map.putString("lastError", EasyTierVpnService.lastErrorMessage);
            map.putString("machineId", getOrGenerateMachineId());
            map.putString("hostname", getDeviceHostname());
            promise.resolve(map);
        } catch (Throwable t) {
            promise.reject("STATUS_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void getPeers(Promise promise) {
        new Thread(() -> {
            try {
                String instanceName = EasyTierVpnService.currentInstanceName;
                if (instanceName == null || instanceName.isEmpty()) {
                    instanceName = "default";
                }

                JSONObject req = new JSONObject();
                JSONObject sel = new JSONObject();
                sel.put("name", instanceName);
                req.put("instance_selector", sel);
                JSONObject instanceObj = new JSONObject();
                instanceObj.put("instance", req);

                String res = EasyTierJNI.callJsonRpc("api.instance.PeerManageRpcService", "list_peer", null, instanceObj.toString());
                WritableArray array = Arguments.createArray();

                if (res != null && !res.isEmpty()) {
                    JSONObject rpcRes = new JSONObject(res);
                    JSONArray peers = rpcRes.optJSONArray("peer_infos");
                    if (peers == null) {
                        peers = rpcRes.optJSONArray("peers");
                    }
                    if (peers != null) {
                        for (int i = 0; i < peers.length(); i++) {
                            JSONObject p = peers.getJSONObject(i);
                            WritableMap peerMap = Arguments.createMap();
                            peerMap.putString("hostname", p.optString("hostname", "Unknown"));
                            peerMap.putString("version", p.optString("version", ""));
                            
                            JSONArray vips = p.optJSONArray("virtual_ipv4s");
                            String vip = "";
                            if (vips != null && vips.length() > 0) {
                                vip = vips.getString(0);
                            } else {
                                vip = p.optString("ipv4", "");
                            }
                            peerMap.putString("ipv4", vip);
                            peerMap.putDouble("latency_ms", p.optDouble("latency_ms", 0.0));
                            peerMap.putDouble("cost", p.optDouble("cost", 0.0));
                            peerMap.putString("tunnel_type", p.optString("tunnel_type", "p2p"));
                            array.pushMap(peerMap);
                        }
                    }
                }
                promise.resolve(array);
            } catch (Throwable t) {
                Log.w(TAG, "getPeers error", t);
                promise.resolve(Arguments.createArray());
            }
        }).start();
    }

    @ReactMethod
    public void isEasyTierAppInstalled(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            for (String pkg : EASYTIER_PACKAGES) {
                try {
                    pm.getPackageInfo(pkg, 0);
                    promise.resolve(true);
                    return;
                } catch (PackageManager.NameNotFoundException ignored) {
                }
            }
            promise.resolve(false);
        } catch (Throwable t) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void launchEasyTierApp(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            Intent launchIntent = null;
            for (String pkg : EASYTIER_PACKAGES) {
                launchIntent = pm.getLaunchIntentForPackage(pkg);
                if (launchIntent != null) {
                    break;
                }
            }

            if (launchIntent != null) {
                showReturnNotification();
                Activity currentActivity = getCurrentActivity();
                if (currentActivity != null) {
                    try {
                        // Clear FLAG_ACTIVITY_NEW_TASK so EasyTier Pro joins XStreaming's back stack!
                        // When user presses Back in EasyTier Pro, Android directly returns to XStreaming!
                        launchIntent.setFlags(0);
                        currentActivity.startActivityForResult(launchIntent, EASYTIER_APP_REQUEST_CODE);
                    } catch (Throwable e) {
                        Log.w(TAG, "startActivityForResult failed, falling back to NEW_TASK", e);
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        currentActivity.startActivity(launchIntent);
                    }
                } else {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(launchIntent);
                }
                promise.resolve(true);
            } else {
                promise.reject("NOT_INSTALLED", "未检测到已安装的 EasyTier / EasyTier Pro 客户端应用");
            }
        } catch (Throwable t) {
            Log.e(TAG, "launchEasyTierApp error", t);
            promise.reject("LAUNCH_ERROR", t.getMessage(), t);
        }
    }

    private void showReturnNotification() {
        try {
            NotificationManager nm = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    RETURN_CHANNEL_ID,
                    "XStreaming 返回快捷通道",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("用于从外部应用快速切回 XStreaming");
                nm.createNotificationChannel(channel);
            }

            Intent appIntent = reactContext.getPackageManager().getLaunchIntentForPackage(reactContext.getPackageName());
            if (appIntent != null) {
                appIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            }
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(reactContext, 22027, appIntent, flags);

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(reactContext, RETURN_CHANNEL_ID);
            } else {
                builder = new Notification.Builder(reactContext);
            }

            builder.setSmallIcon(reactContext.getApplicationInfo().icon)
                .setContentTitle("XStreaming 正在后台等待")
                .setContentText("点击此处快速切回 XStreaming")
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setOngoing(false);

            nm.notify(RETURN_NOTIFICATION_ID, builder.build());
        } catch (Throwable t) {
            Log.w(TAG, "showReturnNotification error", t);
        }
    }

    private void cancelReturnNotification() {
        try {
            NotificationManager nm = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(RETURN_NOTIFICATION_ID);
            }
        } catch (Throwable t) {
            Log.w(TAG, "cancelReturnNotification error", t);
        }
    }

    @Override
    public void onHostResume() {
        cancelReturnNotification();
    }

    @Override
    public void onHostPause() {
    }

    @Override
    public void onHostDestroy() {
        cancelReturnNotification();
    }

    @ReactMethod
    public void getMachineId(Promise promise) {
        promise.resolve(getOrGenerateMachineId());
    }

    @ReactMethod
    public void getHostname(Promise promise) {
        promise.resolve(getDeviceHostname());
    }

    private String getOrGenerateMachineId() {
        SharedPreferences pref = reactContext.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String id = pref.getString(PREF_MACHINE_ID, null);
        if (id == null || id.isEmpty()) {
            id = UUID.randomUUID().toString();
            pref.edit().putString(PREF_MACHINE_ID, id).apply();
        }
        return id;
    }

    private String getDeviceHostname() {
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER.trim() : "";
        String model = Build.MODEL != null ? Build.MODEL.trim() : "";
        String raw = (manufacturer + "-" + model).trim();
        if (raw.isEmpty() || "-".equals(raw)) {
            raw = "logitech-g-cloud";
        }
        return raw.toLowerCase(Locale.US)
            .replaceAll("[^a-z0-9-]+", "-")
            .replaceAll("^-+|-+$", "");
    }
}
