import fs from 'fs';
import path from 'path';

const files = [
  'src/App.tsx',
  'src/components/Calendar.tsx',
  'src/components/Dashboard.tsx',
  'src/components/KanbanBoard.tsx'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/indigo-/g, 'orange-');
  content = content.replace(/blue-/g, 'orange-');
  content = content.replace(/#3b82f6/g, '#f97316'); // blue-500 to orange-500
  content = content.replace(/#10b981/g, '#10b981'); // emerald-500
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
