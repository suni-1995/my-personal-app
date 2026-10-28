package com.suni.mypersonalapp;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.media.MediaMetadataRetriever;
import android.webkit.*;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import org.json.*;
import java.io.*;
import java.util.UUID;

public class MainActivity extends Activity {
 private WebView webView;
 private ValueCallback<Uri[]> fileCallback;
 private static final int FILE_PICKER=305,NATIVE_PICKER=306;
 private static final String BASE="https://appassets.androidplatform.net/assets/";
 private String pickOwner,pickType,pickGroup;
 private int pickMax;
 private File mediaDir;
 private SharedPreferences prefs;

 private JSONArray readIndex(){
  try{return new JSONArray(prefs.getString("records","[]"));}
  catch(Exception e){return new JSONArray();}
 }
 private synchronized void writeIndex(JSONArray a){prefs.edit().putString("records",a.toString()).commit();}
 private void respond(String data){final String literal=JSONObject.quote(data);runOnUiThread(()->webView.evaluateJavascript("window.__myappsNativeMediaResult&&window.__myappsNativeMediaResult("+literal+")",null));}
 private String safeId(String id){return id!=null&&id.matches("[a-zA-Z0-9-]{1,80}")?id:null;}
 private class MediaBridge{
  @JavascriptInterface public String list(String owner){
   JSONArray list=new JSONArray(),all=readIndex();
   for(int i=0;i<all.length();i++){JSONObject item=all.optJSONObject(i);if(item!=null&&owner.equals(item.optString("owner")))list.put(item);}
   return list.toString();
  }
  @JavascriptInterface public void pick(String owner,String type,int max){
   if(owner==null||owner.length()>180||(!"image".equals(type)&&!"video".equals(type)))return;
   runOnUiThread(()->{
    pickOwner=owner;pickType=type;pickGroup=UUID.randomUUID().toString();pickMax=Math.max(1,Math.min(30,max));
    Intent intent=new Intent(Intent.ACTION_GET_CONTENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("image".equals(type)?"image/*":"video/*");
    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
    try{startActivityForResult(Intent.createChooser(intent,"갤러리 또는 파일 앱에서 선택"),NATIVE_PICKER);}catch(Exception e){respond(errorJson("파일 선택 창을 열 수 없습니다: "+e.getMessage()));}
   });
  }
  @JavascriptInterface public String update(String records){
   try{
    JSONArray changes=new JSONArray(records),all=readIndex();
    for(int i=0;i<changes.length();i++){
     JSONObject change=changes.optJSONObject(i);if(change==null)continue;
     String id=change.optString("id");
     for(int j=0;j<all.length();j++){JSONObject old=all.optJSONObject(j);
      if(old!=null&&id.equals(old.optString("id"))){
       for(String key:new String[]{"title","tags","note","order"})if(change.has(key))old.put(key,change.get(key));
      }
     }
    }
    writeIndex(all);return "ok";
   }catch(Exception e){return "error: "+e.getMessage();}
  }
  @JavascriptInterface public void delete(String id){
   if(safeId(id)==null)return;
   JSONArray all=readIndex(),keep=new JSONArray();
   for(int i=0;i<all.length();i++){JSONObject r=all.optJSONObject(i);
    if(r!=null&&!id.equals(r.optString("id")))keep.put(r);
   }
   writeIndex(keep);new File(mediaDir,id).delete();
  }
  @JavascriptInterface public void deleteOwner(String owner){
   JSONArray all=readIndex(),keep=new JSONArray();
   for(int i=0;i<all.length();i++){JSONObject r=all.optJSONObject(i);if(r==null)continue;
    if(owner.equals(r.optString("owner"))){String id=safeId(r.optString("id"));if(id!=null)new File(mediaDir,id).delete();}
    else keep.put(r);
   }
   writeIndex(keep);
  }
 }
 private String errorJson(String error){JSONObject j=new JSONObject();try{j.put("error",error);}catch(Exception ignored){}return j.toString();}
 private String displayName(Uri uri){
  try(Cursor cursor=getContentResolver().query(uri,null,null,null,null)){
   if(cursor!=null&&cursor.moveToFirst()){int idx=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(idx>=0)return cursor.getString(idx);}
  }catch(Exception ignored){}
  return "선택한 파일";
 }
 private long getDuration(Uri uri){
  MediaMetadataRetriever m=new MediaMetadataRetriever();
  try{m.setDataSource(this,uri);String duration=m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);return duration==null?-1:Long.parseLong(duration);}
  catch(Exception e){return -1;}
  finally{try{m.release();}catch(Exception ignored){}}
 }
 private void savePicked(Intent data){
  if(data==null){respond(errorJson("선택한 파일이 없습니다."));return;}
  java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
  if(data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}
  else if(data.getData()!=null)uris.add(data.getData());
  if(uris.isEmpty()){respond(errorJson("선택된 파일이 없습니다."));return;}
  if(uris.size()>pickMax){respond(errorJson("한 번에 "+pickMax+"개까지만 등록할 수 있습니다."));return;}
  JSONArray all=readIndex(),created=new JSONArray();
  java.util.ArrayList<File> written=new java.util.ArrayList<>();
  try{
   for(Uri uri:uris){
    String mime=getContentResolver().getType(uri);
    if(mime==null||!mime.startsWith(pickType+"/"))throw new IOException("파일 형식을 확인해 주세요.");
    long duration=0;
    if("video".equals(pickType)){duration=getDuration(uri);if(duration<0||duration>=10000)throw new IOException("영상은 10초 미만만 등록할 수 있습니다.");}
    String id=UUID.randomUUID().toString();File output=new File(mediaDir,id);
    long size=0;
    try(InputStream input=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(output)){
     if(input==null)throw new IOException("파일을 읽을 수 없습니다.");
     byte[] buffer=new byte[32768];int n;
     while((n=input.read(buffer))!=-1){size+=n;if(size>30L*1024*1024)throw new IOException("파일은 30MB 이하만 등록할 수 있습니다.");out.write(buffer,0,n);}
    }
    written.add(output);
    JSONObject rec=new JSONObject();
    String name=displayName(uri);
    rec.put("id",id);rec.put("owner",pickOwner);rec.put("group",pickGroup);
    rec.put("name",name);rec.put("title",name.replaceFirst("\\.[^.]+$",""));rec.put("type",pickType);rec.put("mime",mime);
    rec.put("duration",duration/1000.0);rec.put("order",System.currentTimeMillis()+created.length());
    rec.put("createdAt",System.currentTimeMillis());rec.put("tags","");rec.put("note","");
    rec.put("nativeUrl",BASE+"user-media/"+id);
    created.put(rec);
   }
   for(int i=0;i<created.length();i++)all.put(created.getJSONObject(i));
   writeIndex(all);JSONObject response=new JSONObject();response.put("records",created);respond(response.toString());
  }catch(Exception e){for(File f:written)f.delete();respond(errorJson("파일 저장 실패: "+e.getMessage()));}
 }
 @Override public void onCreate(Bundle state){
  super.onCreate(state);mediaDir=new File(getFilesDir(),"myapps-media");mediaDir.mkdirs();prefs=getSharedPreferences("myapps-native-media",MODE_PRIVATE);
  webView=new WebView(this);
  webView.getSettings().setJavaScriptEnabled(true);
  webView.getSettings().setDomStorageEnabled(true);
  webView.getSettings().setAllowFileAccess(false);
  webView.addJavascriptInterface(new MediaBridge(),"AndroidMedia");
  webView.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
    if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;
    try{startActivityForResult(params.createIntent(),FILE_PICKER);return true;}
    catch(Exception e){fileCallback=null;cb.onReceiveValue(null);return false;}
   }
  });
  webView.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    String url=request.getUrl().toString();
    if(!url.startsWith(BASE))return super.shouldInterceptRequest(view,request);
    String path=request.getUrl().getPath();
    if(path!=null&&path.startsWith("/assets/user-media/")){
     String id=safeId(path.substring("/assets/user-media/".length()));
     if(id==null)return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);
     File file=new File(mediaDir,id);if(!file.isFile())return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);
     JSONArray all=readIndex();String mime="application/octet-stream";
     for(int i=0;i<all.length();i++){JSONObject x=all.optJSONObject(i);if(x!=null&&id.equals(x.optString("id"))){mime=x.optString("mime",mime);break;}}
     try{return new WebResourceResponse(mime,null,new FileInputStream(file));}
     catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);}
    }
    String prefix="/assets/";
    if(path==null||!path.startsWith(prefix))return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);
    path=path.substring(prefix.length());if(path.contains(".."))return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);
    try{InputStream stream=getAssets().open("web/"+path);String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".html")?"text/html":"text/plain";return new WebResourceResponse(mime,"UTF-8",stream);}
    catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,null);}
   }
  });
  setContentView(webView);webView.loadUrl(BASE+"index.html");
 }
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==NATIVE_PICKER){if(resultCode==RESULT_OK)savePicked(data);else respond(errorJson("cancelled"));return;}
  if(requestCode==FILE_PICKER&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));fileCallback=null;}
 }
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
}
