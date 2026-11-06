const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('study',{call:(method,args)=>ipcRenderer.invoke('app:action',method,args),onEvent:callback=>{const handler=(_event,data)=>callback(data);ipcRenderer.on('agent:event',handler);return ()=>ipcRenderer.removeListener('agent:event',handler)}});
