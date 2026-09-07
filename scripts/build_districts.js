import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = 'C:/Users/ejbsi/.gemini/antigravity-ide/brain/6af52b07-f0c8-42ec-9442-c18dab2baaad/.system_generated/steps/44/content.md';
const html = fs.readFileSync(htmlPath, 'utf8');

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/^([a-z])/, (m, p1) => p1.toUpperCase());
}

const trBlocks = html.split(/<TR>/i);
const rawRecords = [];

for (const tr of trBlocks) {
  const tdMatches = tr.match(/<TD[^>]*>(?:<FONT[^>]*>)?([\s\S]*?)(?:<\/FONT>)?\s*<\/TD>/gi);
  if (tdMatches && tdMatches.length >= 4) {
    const cleanTexts = tdMatches.map(td => td.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '));
    if (/^\d+$/.test(cleanTexts[0]) && cleanTexts[1] && cleanTexts[2] && cleanTexts[3]) {
      const dist = cleanTexts[1];
      const prov = cleanTexts[2].replace(/\(PROV\.CONST\.\)/gi, '').trim();
      let dep = cleanTexts[3].trim();
      if (cleanTexts[2].includes('PROV.CONST.') || prov === 'CALLAO') {
        dep = 'CALLAO';
      }

      const dName = toTitleCase(dist);
      const pName = toTitleCase(prov);
      const depName = toTitleCase(dep);

      rawRecords.push({
        id: parseInt(cleanTexts[0], 10),
        distrito: dName,
        provincia: pName,
        departamento: depName,
        label: `${dName}, ${pName} (${depName})`
      });
    }
  }
}

// Coordenadas precisas para distritos clave de Lima, Callao y principales provincias
const COORDS = {
  'Santiago De Surco': { lat: -12.137, lng: -76.985 },
  'Surco': { lat: -12.137, lng: -76.985 },
  'San Borja': { lat: -12.108, lng: -77.001 },
  'Miraflores': { lat: -12.122, lng: -77.030 },
  'San Isidro': { lat: -12.098, lng: -77.035 },
  'Surquillo': { lat: -12.112, lng: -77.017 },
  'Barranco': { lat: -12.148, lng: -77.021 },
  'La Molina': { lat: -12.083, lng: -76.946 },
  'Magdalena Del Mar': { lat: -12.091, lng: -77.069 },
  'Jesús María': { lat: -12.074, lng: -77.049 },
  'Lince': { lat: -12.083, lng: -77.034 },
  'Pueblo Libre': { lat: -12.073, lng: -77.063 },
  'San Miguel': { lat: -12.076, lng: -77.086 },
  'Chorrillos': { lat: -12.176, lng: -77.018 },
  'Lima': { lat: -12.046, lng: -77.042 },
  'Breña': { lat: -12.058, lng: -77.050 },
  'Carabayllo': { lat: -11.898, lng: -77.034 },
  'Comas': { lat: -11.933, lng: -77.058 },
  'El Agustino': { lat: -12.047, lng: -77.001 },
  'Independencia': { lat: -11.991, lng: -77.050 },
  'Los Olivos': { lat: -11.992, lng: -77.070 },
  'Lurigancho': { lat: -11.976, lng: -76.702 },
  'Chosica': { lat: -11.938, lng: -76.698 },
  'Lurín': { lat: -12.274, lng: -76.871 },
  'Pachacámac': { lat: -12.230, lng: -76.866 },
  'Pucusana': { lat: -12.483, lng: -76.797 },
  'Puente Piedra': { lat: -11.867, lng: -77.075 },
  'Punta Hermosa': { lat: -12.333, lng: -76.824 },
  'Punta Negra': { lat: -12.366, lng: -76.799 },
  'Rímac': { lat: -12.031, lng: -77.027 },
  'San Bartolo': { lat: -12.388, lng: -76.779 },
  'San Juan De Lurigancho': { lat: -11.979, lng: -76.999 },
  'San Juan De Miraflores': { lat: -12.162, lng: -76.969 },
  'San Luis': { lat: -12.076, lng: -76.997 },
  'San Martín De Porres': { lat: -11.999, lng: -77.085 },
  'Santa Anita': { lat: -12.045, lng: -76.971 },
  'Santa María Del Mar': { lat: -12.404, lng: -76.777 },
  'Santa Rosa': { lat: -11.805, lng: -77.164 },
  'Villa El Salvador': { lat: -12.213, lng: -76.938 },
  'Villa María Del Triunfo': { lat: -12.158, lng: -76.929 },
  'Ate': { lat: -12.025, lng: -76.918 },
  'Bellavista': { lat: -12.060, lng: -77.130 },
  'Callao': { lat: -12.056, lng: -77.118 },
  'Carmen De La Legua Reynoso': { lat: -12.042, lng: -77.088 },
  'La Perla': { lat: -12.067, lng: -77.117 },
  'La Punta': { lat: -12.072, lng: -77.163 },
  'Ventanilla': { lat: -11.879, lng: -77.126 },
  'Mi Perú': { lat: -11.850, lng: -77.120 },
  'Arequipa': { lat: -16.409, lng: -71.537 },
  'Cusco': { lat: -13.531, lng: -71.967 },
  'Trujillo': { lat: -8.111, lng: -79.028 },
  'Chiclayo': { lat: -6.771, lng: -79.840 },
  'Piura': { lat: -5.194, lng: -80.632 },
  'Huancayo': { lat: -12.065, lng: -75.204 },
  'Ica': { lat: -14.067, lng: -75.728 },
  'Tacna': { lat: -18.014, lng: -70.252 },
  'Cajamarca': { lat: -7.163, lng: -78.512 },
  'Pucallpa': { lat: -8.379, lng: -74.553 },
  'Iquitos': { lat: -3.749, lng: -73.253 }
};

const enrichedRecords = rawRecords.map(r => {
  const coord = COORDS[r.distrito] || null;
  return {
    ...r,
    lat: coord ? coord.lat : null,
    lng: coord ? coord.lng : null
  };
});

const outDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'peru_districts.json'),
  JSON.stringify(enrichedRecords, null, 2),
  'utf8'
);

console.log('✅ Generated src/data/peru_districts.json with', enrichedRecords.length, 'districts from INEI!');
