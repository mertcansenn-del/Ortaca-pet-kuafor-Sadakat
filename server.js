import express from 'express';
import pg from 'pg';
import crypto from 'node:crypto';
const {Pool}=pg;
const app=express(); app.disable('x-powered-by');app.set('trust proxy',1);
const PORT=process.env.PORT||3000;
const SECRET=process.env.SESSION_SECRET;
const PASSWORD=process.env.ADMIN_PASSWORD;
const DB=process.env.DATABASE_URL;
if(!SECRET||SECRET.length<32||!PASSWORD||PASSWORD.length<12||!DB){console.error('DATABASE_URL, SESSION_SECRET (32+ karakter), ADMIN_PASSWORD (12+ karakter) zorunludur');process.exit(1)}
const pool=new Pool({connectionString:DB,ssl:process.env.PGSSL==='disable'?false:{rejectUnauthorized:true}});
await pool.query(`CREATE TABLE IF NOT EXISTS cards(id TEXT PRIMARY KEY, customer TEXT NOT NULL, pet TEXT NOT NULL, visits INT NOT NULL DEFAULT 0 CHECK(visits BETWEEN 0 AND 3), created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS events(id BIGSERIAL PRIMARY KEY,card_id TEXT NOT NULL REFERENCES cards(id),action TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());`);
app.use(express.json({limit:'16kb'}));app.use(express.static('public'));
app.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');res.set('X-Frame-Options','DENY');next()});
const sign=v=>crypto.createHmac('sha256',SECRET).update(v).digest('hex');
const eq=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(v=>v.length===2));
function auth(req,res,next){const c=cookies(req).auth||'';const [exp,sig]=c.split('.');if(!exp||!sig||!/^\d+$/.test(exp)||Number(exp)<Date.now()||!eq(sign(exp),sig))return res.status(401).json({error:'Oturum açın'});next()}
function origin(req,res,next){if(['POST','PUT','DELETE'].includes(req.method)){const o=req.headers.origin;const host=`${req.protocol}://${req.get('host')}`;if(o!==host)return res.status(403).json({error:'Geçersiz kaynak'})}next()}
app.use('/api',origin);
let failures=new Map();
app.post('/api/login',(req,res)=>{const ip=req.ip;const t=Date.now();const f=failures.get(ip)||{n:0,until:0};if(f.until>t)return res.status(429).json({error:'Biraz sonra tekrar deneyin'});if(typeof req.body.password!=='string'||!eq(crypto.createHash('sha256').update(req.body.password).digest('hex'),crypto.createHash('sha256').update(PASSWORD).digest('hex'))){f.n++;if(f.n>=5){f.until=t+15*60_000;f.n=0}failures.set(ip,f);return res.status(401).json({error:'Şifre yanlış'})}failures.delete(ip);const exp=String(t+8*60*60_000);res.set('Set-Cookie',`auth=${exp}.${sign(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);res.json({ok:true})});
app.post('/api/logout',auth,(req,res)=>{res.set('Set-Cookie','auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');res.json({ok:true})});
app.get('/api/me',auth,(_,res)=>res.json({ok:true}));
app.get('/api/cards',auth,async(req,res,next)=>{try{const r=await pool.query('SELECT * FROM cards ORDER BY created_at DESC LIMIT 500');res.json(r.rows)}catch(e){next(e)}});
app.post('/api/cards',auth,async(req,res,next)=>{try{const customer=String(req.body.customer||'').trim().slice(0,70),pet=String(req.body.pet||'').trim().slice(0,70);if(!customer||!pet)return res.status(400).json({error:'Müşteri ve evcil hayvan adı gerekli'});const id=crypto.randomBytes(18).toString('base64url');await pool.query('INSERT INTO cards(id,customer,pet) VALUES($1,$2,$3)',[id,customer,pet]);res.status(201).json({id,url:`${req.protocol}://${req.get('host')}/?kart=${id}`})}catch(e){next(e)}});
app.get('/api/card/:id',async(req,res,next)=>{try{if(!/^[A-Za-z0-9_-]{24}$/.test(req.params.id))return res.status(404).json({error:'Kart bulunamadı'});const r=await pool.query('SELECT customer,pet,visits FROM cards WHERE id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Kart bulunamadı'});res.json(r.rows[0])}catch(e){next(e)}});
app.post('/api/cards/:id/action',auth,async(req,res,next)=>{const client=await pool.connect();try{const action=req.body.action;if(!['visit','redeem'].includes(action))return res.status(400).json({error:'Geçersiz işlem'});await client.query('BEGIN');const r=await client.query('SELECT visits FROM cards WHERE id=$1 FOR UPDATE',[req.params.id]);if(!r.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Kart bulunamadı'})}const v=r.rows[0].visits;if(action==='visit'&&v===3||action==='redeem'&&v!==3){await client.query('ROLLBACK');return res.status(409).json({error:action==='visit'?'Önce 4. ziyaret indirimini kullanın':'Ödül henüz kazanılmadı'})}const nv=action==='visit'?v+1:0;await client.query('UPDATE cards SET visits=$1 WHERE id=$2',[nv,req.params.id]);await client.query('INSERT INTO events(card_id,action) VALUES($1,$2)',[req.params.id,action]);await client.query('COMMIT');res.json({visits:nv})}catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Sunucu hatası'})});app.listen(PORT,()=>console.log('Sadakat sistemi çalışıyor:',PORT));
