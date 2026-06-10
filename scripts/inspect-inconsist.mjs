import XLSX from 'xlsx';
const wb = XLSX.readFile('C:/Users/juliano.correa/Desktop/REF/INCONSISTENCIAS PERLOG.xls');
console.log('Sheets:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'];
  console.log(`\n=== ${name} (${ref}) ===`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  console.log('Linhas:', rows.length);
  console.log('Primeiras 20 linhas:');
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    console.log(i, JSON.stringify(rows[i]));
  }
}
