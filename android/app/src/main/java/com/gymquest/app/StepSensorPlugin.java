package com.gymquest.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Reads Android's hardware step counter (TYPE_STEP_COUNTER).
 * The chip counts in the background and filters non-walking motion (e.g. vehicles);
 * it returns total steps since the last reboot. JS turns that into daily steps.
 */
@CapacitorPlugin(name = "StepSensor", permissions = {
    @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
})
public class StepSensorPlugin extends Plugin {
    private Sensor sensor() {
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        return sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    private boolean granted() {
        return Build.VERSION.SDK_INT < 29 || getPermissionState("activity") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", sensor() != null);
        r.put("granted", granted());
        call.resolve(r);
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (granted()) { status(call); return; }
        requestPermissionForAlias("activity", call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) { status(call); }

    @PluginMethod
    public void read(PluginCall call) {
        Sensor s = sensor();
        if (s == null) { call.reject("No step sensor"); return; }
        if (!granted()) { call.reject("Permission denied"); return; }
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        final boolean[] done = { false };
        final Handler h = new Handler(Looper.getMainLooper());
        SensorEventListener l = new SensorEventListener() {
            public void onSensorChanged(SensorEvent e) {
                if (done[0]) return; done[0] = true; sm.unregisterListener(this);
                JSObject r = new JSObject(); r.put("total", (long) e.values[0]); r.put("ts", System.currentTimeMillis()); call.resolve(r);
            }
            public void onAccuracyChanged(Sensor x, int a) {}
        };
        sm.registerListener(l, s, SensorManager.SENSOR_DELAY_NORMAL);
        h.postDelayed(() -> { if (!done[0]) { done[0] = true; sm.unregisterListener(l); call.reject("Timeout"); } }, 4000);
    }
}
