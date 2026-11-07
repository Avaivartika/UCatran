const PETS=['kitty','cinnamoroll','usagi','chiikawa','hachiware','momonga','mymelody','pompompurin','goblin'];
const THEMES=['green','yellow','pink'];
const DEFAULTS={theme:'green',petEnabled:false,pet:'kitty'};
function normalizeAppearance(value={}){return {theme:THEMES.includes(value.theme)?value.theme:'green',petEnabled:value.petEnabled===true,pet:PETS.includes(value.pet)?value.pet:'kitty'}}
function updateAppearance(current,patch){if(patch.theme!==undefined&&!THEMES.includes(patch.theme))throw Error('未知主题');if(patch.pet!==undefined&&!PETS.includes(patch.pet))throw Error('未知桌宠');if(patch.petEnabled!==undefined&&typeof patch.petEnabled!=='boolean')throw Error('桌宠开关无效');return normalizeAppearance({...current,...patch})}
function clampPetPosition(position,area){return {x:Math.round(Math.max(area.x,Math.min(Number.isFinite(position?.x)?position.x:area.x+area.width-228,area.x+area.width-210))),y:Math.round(Math.max(area.y,Math.min(Number.isFinite(position?.y)?position.y:area.y+area.height-280,area.y+area.height-250)))}}
module.exports={PETS,DEFAULTS,normalizeAppearance,updateAppearance,clampPetPosition};
