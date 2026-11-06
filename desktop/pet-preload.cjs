const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pet',{call:(method,args)=>ipcRenderer.invoke('pet:action',method,args),onState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('pet:state',listener);return ()=>ipcRenderer.removeListener('pet:state',listener)}});
