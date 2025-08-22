import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/health', (req,res)=>res.json({ok:true, service:'user-service'}));

// Dev login: body { user: 'alice' | 'bob' | 'carol' | 'dave' }
app.post('/auth/login', async (req,res)=>{
  try {
    const username = (req.body.user||'').toLowerCase();
    const { rows } = await pool.query('SELECT * FROM "user".user ORDER BY id ASC');
    const map = { alice: rows[0], bob: rows[1], carol: rows[2], dave: rows[3] };
    const u = map[username];
    if(!u) return res.status(400).json({error:'unknown user'});
    const token = jwt.sign({ sub: u.id, name: u.public_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ accessToken: token });
  } catch (e) { res.status(500).json({error:e.message}); }
});

// /me requires Authorization: Bearer <token>
app.get('/me', async (req,res)=>{
  try {
    const auth = req.headers.authorization||'';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if(!token) return res.status(401).json({error:'missing token'});
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT id, public_name, icon_url, created_at FROM "user".user WHERE id=$1',[payload.sub]);
    if(!rows[0]) return res.status(404).json({error:'not found'});
    res.json(rows[0]);
  } catch (e) { res.status(401).json({error:'invalid token'}); }
});

// Public profile
app.get('/users/:id', async (req,res)=>{
  const { rows } = await pool.query('SELECT id, public_name, icon_url, created_at FROM "user".user WHERE id=$1',[req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
});

// User directory for name/icon lookups
app.get('/users', async (req, res) => {
  try {
    const idsParam = (req.query.ids || '').trim();
    if (!idsParam) return res.json([]);
    const ids = idsParam.split(',').map(s => parseInt(s, 10)).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    const { rows } = await pool.query(
      'SELECT id, public_name, icon_url FROM "user".user WHERE id = ANY($1::int[])',
      [ids]
    );
    res.json(rows);
  } catch (err) {
    console.error('USER_SVC /users error', err);
    res.status(500).json({ error: 'failed to fetch users' });
  }
});

app.listen(PORT, ()=>console.log('user-service on', PORT));