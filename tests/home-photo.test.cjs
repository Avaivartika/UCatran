const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {photoData,photoPosition}=require('../desktop/home-photo.cjs');
test('home photos recognize raster content and validate persisted crop position',()=>{const photo=photoData(path.join(__dirname,'../renderer/assets/sunlit-lawn.png'));assert(photo.data.startsWith('data:image/png;base64,'));assert.throws(()=>photoData(__filename),/格式/);assert.equal(photoPosition(67.5),68);for(const invalid of [-1,101,NaN,'50',Infinity])assert.throws(()=>photoPosition(invalid))});
