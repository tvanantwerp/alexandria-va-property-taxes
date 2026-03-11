import express from 'express';
import { join } from 'path';

const app = express();
const PORT = 3000;

app.use(express.static(join(__dirname, '../public')));

app.listen(PORT, () => {
  console.log(`Viewer running at http://localhost:${PORT}`);
  console.log('\nMake sure the tile server is running on port 3001');
  console.log('Start it with: yarn serve');
});
