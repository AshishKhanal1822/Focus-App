// src/utils/dnd.js
// Javascript wrapper for custom native Android DoNotDisturb plugin

import { registerPlugin, Capacitor } from '@capacitor/core';

// Register the custom DoNotDisturb plugin
const DoNotDisturb = registerPlugin('DoNotDisturb');

const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const dnd = {
    /**
     * Check if DND notification policy access is granted.
     * Always returns true for non-Android platforms.
     */
    async hasDndPermission() {
        if (!isAndroidNative) {
            return true;
        }
        try {
            const result = await DoNotDisturb.checkPolicyAccess();
            return !!result.granted;
        } catch (err) {
            console.error('[DND JS] Error checking DND policy access:', err);
            return false;
        }
    },

    /**
     * Request DND notification policy access.
     * Redirects the user to the system settings page on Android.
     */
    async requestDndPermission() {
        if (!isAndroidNative) {
            return;
        }
        try {
            await DoNotDisturb.requestPolicyAccess();
        } catch (err) {
            console.error('[DND JS] Error requesting DND policy access:', err);
        }
    },

    /**
     * Enable Do Not Disturb (Priority Only mode).
     * Safe to call on all platforms.
     */
    async enableDnd() {
        if (!isAndroidNative) {
            console.log('[DND Web Mock] DND Enabled (Mock)');
            return true;
        }
        try {
            const result = await DoNotDisturb.setDND({ enable: true });
            console.log('[DND Native] DND Enabled:', result);
            return true;
        } catch (err) {
            console.error('[DND Native] Failed to enable DND:', err);
            return false;
        }
    },

    /**
     * Disable Do Not Disturb (Allow all notifications).
     * Safe to call on all platforms.
     */
    async disableDnd() {
        if (!isAndroidNative) {
            console.log('[DND Web Mock] DND Disabled (Mock)');
            return true;
        }
        try {
            const result = await DoNotDisturb.setDND({ enable: false });
            console.log('[DND Native] DND Disabled:', result);
            return true;
        } catch (err) {
            console.error('[DND Native] Failed to disable DND:', err);
            return false;
        }
    },

    /**
     * Check and request notification permissions.
     * Handles both native Android platform via Capacitor and Web platform.
     */
    async checkAndRequestNotificationPermission() {
        if (!isAndroidNative) {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
            }
            return;
        }
        try {
            const permissions = await DoNotDisturb.checkPermissions();
            if (permissions.notifications !== 'granted') {
                await DoNotDisturb.requestPermissions({ permissions: ['notifications'] });
            }
        } catch (err) {
            console.error('[DND JS] Error requesting notification permissions:', err);
        }
    },

    /**
     * Check and request camera permissions.
     * Handles both native Android platform and Web.
     * Returns true if granted or non-native, false if denied.
     */
    async checkAndRequestCameraPermission() {
        if (!isAndroidNative) {
            return true;
        }
        try {
            const permissions = await DoNotDisturb.checkPermissions();
            if (permissions.camera !== 'granted') {
                const res = await DoNotDisturb.requestPermissions({ permissions: ['camera'] });
                return res.camera === 'granted';
            }
            return true;
        } catch (err) {
            console.error('[DND JS] Error requesting camera permissions:', err);
            return false;
        }
    }
};
