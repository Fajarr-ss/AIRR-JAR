<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AIRR JAR</title>
<link rel="icon" href="https://i.imgur.com/2vQtZBn.png">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
body{background:#0a0a0a;color:#fff;padding:12px;padding-bottom:100px}
.top{display:flex;gap:8px;align-items:center;margin-bottom:12px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
.top button{background:#111;border:2px solid #fff;border-radius:10px;color:#fff;padding:8px 12px;font-weight:bold;cursor:pointer}
.top .logo{background:#000;border-radius:20px;padding:8px 18px;font-weight:bold}
.top .blue{border-color:#00d4ff;color:#00d4ff}
.top .green{border-color:#00ff66;color:#00ff66}
.banner{border:3px solid #fff;border-radius:18px;overflow:hidden;height:140px;margin-bottom:12px}
.banner img{width:100%;height:100%;object-fit:cover}
.card{background:#111;border:2px solid #fff;border-radius:18px;padding:14px;margin-bottom:12px}
.profile{display:flex;gap:12px;align-items:center}
.profile img{width:70px;height:70px;border-radius:10px;border:2px dashed #fff;object-fit:cover}
.badge{display:inline-block;background:#3a0000;color:#ff4d4d;border:1px solid #ff4d4d;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:bold;margin-top:4px}
.pill{border-radius:20px;padding:4px 14px;font-weight:bold}
.pill.blue{border:2px solid #00d4ff;color:#00d4ff}
.pill.green{border:2px solid #00ff66;color:#00ff66}
.edit{width:100%;background:#1c1c1c;border:1px solid #555;color:#fff;padding:12px;border-radius:12px;margin:14px 0;font-weight:bold}
.widgets{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
.widget{background:#000;border:1px solid #333;border-radius:10px;padding:8px;overflow:hidden}
.widget small{color:#999;font-size:11px;letter-spacing:1px}
.widget b{font-size:15px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gempa h1{color:#00d4ff;font-size:32px;margin-top:10px}
.gempa p{font-size:13px;color:#ddd;margin-top:6px;line-height:1.4}
.erupsi p{color:#ff6b6b;text-align:center;margin-top:30px;font-weight:bold;line-height:1.5}
.nav{position:fixed;bottom:12px;left:12px;right:12px;background:#111;border:2px solid #fff;border-radius:25px;display:flex;justify-content:space-around;padding:10px;z-index:99}
.nav div{text-align:center;font-size:12px;color:#999}
.nav .active{color:#7ee8fa}
.nav span{font-size:20px;display:block}
</style>
</head>
<body>

<div class="top">
  <button>☰</button><button>📱</button><button>🎨</button>
  <div class="logo">● AIRR ●</div>
  <button class="blue">ANIME<br>JAR</button>
  <button class="green">KOMIK<br>JAR</button>
</div>

<div class="banner"><img src="https://i.imgur.com/2vQtZBn.png" alt="Among Us"></div>

<div class="card">
  <div style="letter-spacing:3px;color:#aaa">PROFIL</div>
  <div class="profile" style="margin-top:8px">
    <img src="https://i.pravatar.cc/150?img=12" alt="profil">
    <div style="flex:1"><h2>jar</h2><span class="badge">IMPOSTOR</span></div>
    <span class="pill blue">CH</span><span class="pill green">GB</span>
  </div>
  <button class="edit" onclick="alert('Edit profil belum dibuat bro!')">Edit profil</button>
  <div class="widgets">
    <div class="widget"><small>BATERAI</small><br><b id="baterai">60%</b><br><small id="bateraiStat">Tidak me...</small></div>
    <div class="widget"><small>JAM</small><br><b id="jam">20:13</b><br><small>Lokal</small></div>
    <div class="widget"><small>CUACA</small><br><b>26°C</b><br><small>Cerah ber...</small></div>
    <div class="widget"><small>TANGGAL</small><br><b id="tanggal">5 Nov</b><br><small>Jakarta</small></div>
  </div>
</div>

<div class="grid2">
  <div class="card erupsi">
    <div style="display:flex;justify-content:space-between"><small style="letter-spacing:2px;color:#aaa">ERUPSI</small><span style="background:#00d4ff;color:#000;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:bold">GDACS</span></div>
    <p>Gagal memuat data<br>gunung api. Ketuk<br>untuk coba lagi.</p>
  </div>
  <div class="card gempa">
    <small style="letter-spacing:2px;color:#aaa">GEMPA</small>
    <h1 id="mag">M 3.4</h1>
    <p id="gempaInfo">Memuat data BMKG...</p>
  </div>
</div>

<div class="nav">
  <div class="active"><span>🏠</span>Utama</div>
  <div><span>🎮</span>Game</div>
  <div><span>👤</span>Profile</div>
  <div><span>&lt;/&gt;</span>Dev</div>
  <div><span>🔧</span>Tools</div>
</div>

<script>
setInterval(()=>{
  let d=new Date();
  document.getElementById('jam').innerText=d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
  document.getElementById('tanggal').innerText=d.getDate()+' '+d.toLocaleString('id-ID',{month:'short'});
},1000);
if(navigator.getBattery){
  navigator.getBattery().then(b=>{
    document.getElementById('baterai').innerText=Math.round(b.level*100)+'%';
    document.getElementById('bateraiStat').innerText=b.charging?'Mengisi daya':'Tidak mengisi';
  });
}
fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json')
.then(r=>r.json())
.then(data=>{
  let g=data.Infogempa.gempa[0];
  document.getElementById('mag').innerText='M '+g.Magnitude;
  document.getElementById('gempaInfo').innerHTML=g.Wilayah+'<br>Kedalaman '+g.Kedalaman+'<br>'+g.Tanggal+' · '+g.Jam;
}).catch(()=>{document.getElementById('gempaInfo').innerText='Gagal memuat data BMKG'});
</script>
</body>
</html>
