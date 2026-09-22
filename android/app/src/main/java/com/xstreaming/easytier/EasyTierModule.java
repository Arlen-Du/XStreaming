package com.xstreaming.easytier;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class EasyTierModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
    private static final String TAG = "EasyTierModule";
    private static final String MODULE_NAME = "EasyTierModule";
    private static final int EASYTIER_APP_REQUEST_CODE = 22026;
    private static final int RETURN_NOTIFICATION_ID = 22027;
    private static final String RETURN_CHANNEL_ID = "easytier_return_channel";

    private static final String[] EASYTIER_PACKAGES = new String[] {
        "net.easytier.pro",
        "net.easytier",
        "com.easytier",
        "com.easytier.app"
    };

    private final ReactApplicationContext reactContext;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == EASYTIER_APP_REQUEST_CODE) {
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
    }

    @Override
    public String getName() {
        return MODULE_NAME;
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
                        // Clear FLAG_ACTIVITY_NEW_TASK so EasyTier Pro joins XStreaming's back stack
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
}
