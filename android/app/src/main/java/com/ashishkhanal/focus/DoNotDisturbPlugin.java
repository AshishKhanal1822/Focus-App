package com.ashishkhanal.focus;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.Manifest;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
    name = "DoNotDisturb",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class DoNotDisturbPlugin extends Plugin {

    @PluginMethod
    public void checkPolicyAccess(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            boolean isGranted = notificationManager.isNotificationPolicyAccessGranted();
            ret.put("granted", isGranted);
        } else {
            // Below API 23 (Android 6.0), permission is granted by default
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPolicyAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (!notificationManager.isNotificationPolicyAccessGranted()) {
                Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                if (getActivity() != null) {
                    getActivity().startActivity(intent);
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void setDND(PluginCall call) {
        Boolean enable = call.getBoolean("enable", false);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager.isNotificationPolicyAccessGranted()) {
                try {
                    if (enable) {
                        // Priority only interruption filter
                        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
                    } else {
                        // Allow all notifications
                        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);
                    }
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Failed to set Do Not Disturb: " + e.getMessage());
                }
            } else {
                call.reject("Notification policy access not granted. Call requestPolicyAccess first.");
            }
        } else {
            // No-op for devices below Android M (6.0)
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        }
    }
}
