package com.suni.mypersonalapp;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import java.io.InputStream;
import java.io.IOException;
public class MainActivity extends Activity {
 private WebView webView;
 private static final String BASE="https://appassets.androidplatform.net/assets/";
 @Override public void onCreate(Bundle state){super.onCreate(state);webView=new WebView(this);
 webView.setWebChromeClient(new WebChromeClient());
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
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
}