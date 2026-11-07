let homePhotoCache=null;
async function loadHomePhoto(){if(homePhotoCache)return homePhotoCache;homePhotoCache=api('homePhoto').catch(()=>null);return homePhotoCache}
async function applyHomePhoto(hero){
 const photo=await loadHomePhoto();if(!hero.isConnected)return;
 if(!photo?.data){hero.classList.remove('custom-home-photo');return}
 hero.classList.add('custom-home-photo');let img=hero.querySelector('.home-photo-image');if(!img){img=el('img','home-photo-image');img.alt='';hero.prepend(img)}img.src=photo.data;img.style.objectPosition=`50% ${photo.position??50}%`;
}
function homePhotoSettings(){
 const section=el('section','home-photo-settings');section.append(el('h3','','主页照片'));
 const preview=el('div','home-photo-preview'),label=el('small','muted',state.homePhoto?.name||'当前使用默认主页照片'),actions=el('div','row');preview.setAttribute('aria-label','主页照片预览');
 const choose=btn('上传主页照片',async()=>{const photo=await api('selectHomePhoto');if(!photo)return;state.homePhoto={name:photo.name,position:photo.position};homePhotoCache=Promise.resolve(photo);await draw();notice('主页照片已保存到本机')},'small');
 const reset=btn('恢复默认照片',async()=>{await api('resetHomePhoto');state.homePhoto=null;homePhotoCache=Promise.resolve(null);await draw();notice('已恢复默认主页照片')},'ghost small');actions.append(choose,reset);
 const positionLabel=el('label','home-photo-position'),position=el('input');position.type='range';position.min='0';position.max='100';position.value=String(state.homePhoto?.position??50);position.setAttribute('aria-label','主页照片显示位置');positionLabel.append(el('span','','显示位置'),position);
 position.oninput=()=>{const img=preview.querySelector('img');if(img)img.style.objectPosition=`50% ${position.value}%`};position.onchange=async()=>{try{state.homePhoto=await api('positionHomePhoto',{position:Number(position.value)});const photo=await loadHomePhoto();if(photo)photo.position=state.homePhoto.position;notice()}catch(e){notice(e.message)}};
 section.append(preview,label,actions,positionLabel,el('p','hint','PNG、JPEG、WebP · 最大 20 MB · 仅保存在本机'));
 async function draw(){preview.replaceChildren();const photo=state.homePhoto?await loadHomePhoto():null;if(photo?.data){const img=el('img');img.src=photo.data;img.alt='当前主页照片';img.style.objectPosition=`50% ${photo.position??50}%`;preview.append(img)}label.textContent=state.homePhoto?.name||'当前使用默认主页照片';position.disabled=!photo;reset.disabled=!state.homePhoto;position.value=String(photo?.position??50)}
 draw();return section;
}
