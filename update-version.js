import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

const phpFile = fs.readFileSync('plugin-build/recolorimage/recolorimage.php', 'utf8');
const updatedPhpFile = phpFile.replace(/%%VERSION%%/g, version);

fs.writeFileSync('plugin-build/recolorimage/recolorimage.php', updatedPhpFile);
