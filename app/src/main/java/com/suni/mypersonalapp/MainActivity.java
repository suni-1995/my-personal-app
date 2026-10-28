package com.suni.mypersonalapp;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.net.Uri;
import android.content.Intent;
import java.io.InputStream;
import java.io.IOException;
public class MainActivity extends Activity {
 private WebView webView;
 private ValueCallback<Uri[]> fileCallback;
 private static final int FILE_PICKER=305;
 private static final String BASE="https://appassets.androidplatform.net/assets/";
 @Override public void onCreate(Bundle state){super.onCreate(state);webView=new WebView(this);
 webView.setWebChromeClient(new WebChromeClient(){
  @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
   if(fileCallback!=null)fileCallback.onReceiveValue(null);
   fileCallback=callback;
   try{startActivityForResult(params.createIntent(),FILE_PICKER);return true;}
   catch(Exception e){fileCallback=null;callback.onReceiveValue(null);return false;}
  }
 });
 webView.setWebViewClient(new WebViewClient(){
  @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
   String url=request.getUrl().toString();
   if(!url.startsWith(BASE))return super.shouldInterceptRequest(view,request);
   String path=request.getUrl().getPath();
   String prefix="/assets/";
   if(path==null||!path.startsWith(prefix))return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);
   path=path.substring(prefix.length());
   if(path.contains(".."))return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);
   try{InputStream stream=getAssets().open("web/"+path);String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".html")?"text/html":"text/plain";return new WebResourceResponse(mime,"UTF-8",stream);}
   catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);}
  }
 });
 WebSettings s=webView.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);setContentView(webView);webView.loadUrl(BASE+"index.html");}
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==FILE_PICKER&&fileCallback!=null){
   Uri[] result=WebChromeClient.FileChooserParams.parseResult(resultCode,data);
   fileCallback.onReceiveValue(result);
   fileCallback=null;
  }
 }
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
}