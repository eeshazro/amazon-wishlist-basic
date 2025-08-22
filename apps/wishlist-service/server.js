import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3002;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/health', (req,res)=>res.json({ok:true, service:'wishlist-service'}));

// Helper: read user id from x-user-id header (set by gateway)
function userId(req){ return parseInt(req.headers['x-user-id']||'0',10); }

app.get('/wishlists/mine', async (req,res)=>{
  const uid = userId(req);
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist WHERE owner_id=$1 ORDER BY id', [uid]);
  res.json(rows);
});

app.get('/wishlists/byIds', async (req,res)=>{
  const ids = (req.query.ids||'').split(',').filter(Boolean).map(x=>parseInt(x,10));
  if(ids.length===0) return res.json([]);
  const { rows } = await pool.query(`SELECT * FROM "wishlist".wishlist WHERE id = ANY($1::int[])`, [ids]);
  res.json(rows);
});

app.get('/wishlists/:id', async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist WHERE id=$1',[req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'not found'});
  res.json(rows[0]);
});

app.get('/wishlists/:id/items', async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM "wishlist".wishlist_item WHERE wishlist_id=$1 ORDER BY priority ASC, id ASC',[req.params.id]);
  res.json(rows);
});

app.post('/wishlists', async (req,res)=>{
  const uid = userId(req);
  const { name, privacy='Private' } = req.body;
  const { rows } = await pool.query('INSERT INTO "wishlist".wishlist (name, owner_id, privacy) VALUES ($1,$2,$3) RETURNING *',[name, uid, privacy]);
  res.status(201).json(rows[0]);
});

app.post('/wishlists/:id/items', async (req,res)=>{
  const uid = userId(req);
  const { product_id, title, priority=0 } = req.body;
  try{
    const { rows } = await pool.query(`INSERT INTO "wishlist".wishlist_item
      (product_id, wishlist_id, title, priority, added_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [product_id, req.params.id, title, priority, uid]);
    res.status(201).json(rows[0]);
  }catch(e){ res.status(400).json({error:e.message}); }
});

app.delete('/wishlists/:id/items/:itemId', async (req,res)=>{
  await pool.query('DELETE FROM "wishlist".wishlist_item WHERE id=$1 AND wishlist_id=$2',[req.params.itemId, req.params.id]);
  res.status(204).end();
});

app.listen(PORT, ()=>console.log('wishlist-service on', PORT));