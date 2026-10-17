package com.suni.mypersonalapp;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView label = new TextView(this);
        label.setText("GitHub Actions APK build test\nSUNI personal app development environment");
        label.setTextSize(22);
        label.setGravity(Gravity.CENTER);
        label.setPadding(24, 24, 24, 24);
        setContentView(label);
    }
}
