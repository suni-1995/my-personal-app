package com.suni.mypersonalapp;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
public class MainActivity extends Activity {
 private WebView webView;
 @Override public void onCreate(Bundle state){super.onCreate(state);webView=new WebView(this);webView.setWebViewClient(new WebViewClient());WebSettings s=webView.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);setContentView(webView);webView.loadUrl("file:///android_asset/web/index.html");}
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
}