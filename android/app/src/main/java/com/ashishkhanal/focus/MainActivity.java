package com.ashishkhanal.focus;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DoNotDisturbPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
