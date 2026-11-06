const {Tray,Menu,nativeImage,Notification}=require('electron');
function installLifecycle({app,window,icon,onQuit,onStop,isBusy}){
 let quitting=false,tray;
 const show=()=>{if(window.isDestroyed())return;if(window.isMinimized())window.restore();window.show();window.focus()};
 const quit=()=>{quitting=true;app.quit()};
 try{tray=new Tray(nativeImage.createFromPath(icon).resize({width:20,height:20}));tray.setToolTip('UCatran · 后台运行');
 tray.setContextMenu(Menu.buildFromTemplate([{label:'打开 UCatran',click:show},{label:'停止当前任务',click:onStop},{type:'separator'},{label:'退出 UCatran',click:quit}]));tray.on('click',show);tray.on('double-click',show)}catch{}
 window.on('close',e=>{if(!quitting&&tray){e.preventDefault();window.hide();if(!notified&&Notification.isSupported()){notified=true;new Notification({title:'UCatran 已在托盘运行',body:'任务和提醒继续运行。点击托盘图标恢复，右键选择退出。'}).show()}}});
 let notified=false;
 app.on('activate',show);app.on('second-instance',show);
 app.on('before-quit',()=>{quitting=true;onQuit();tray?.destroy()});
 return {show,quit,notify:()=>{if(!window.isVisible()&&Notification.isSupported()){const n=new Notification({title:'UCatran · 任务已结束',body:'点击返回学习助手查看结果。'});n.on('click',show);n.show()}},hasTray:()=>!!tray};
}
module.exports={installLifecycle};
