import * as THREE from 'three';
import { AGENT_DEFS } from './agents.js';

/* The 3D campus from the workbench design. React owns the panel, rail and
   monitor; this module owns the scene and reports building clicks via
   cb.onPick(id). */
export function createCampus(canvas, cb){
cb=cb||{};
var PW=cb.panelWidth||480;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var S={focus:null,role:'manager'};
var raf=0;
var AGENTS=AGENT_DEFS.map(function(d){return Object.assign({},d,{active:false})});
var A={};AGENTS.forEach(function(a){A[a.id]=a;});
var tagEls={};
AGENTS.forEach(function(a){
  var t=document.createElement('button');t.className='tag';t.style.setProperty('--c',a.color);t.textContent=a.name;
  t.onclick=function(){if(cb.onPick)cb.onPick(a.id)};document.body.appendChild(t);tagEls[a.id]=t;
});

/* ---------- three.js scene ---------- */
var lite=false;
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight,false);
var scene=new THREE.Scene();scene.background=new THREE.Color(0x050a12);scene.fog=new THREE.FogExp2(0x050a12,.011);
var camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.5,400);
scene.add(new THREE.HemisphereLight(0x5f86b8,0x0a1220,.55));
var moon=new THREE.DirectionalLight(0x9db8e0,.55);moon.position.set(-30,50,20);scene.add(moon);

function glowTexture(){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d');var r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
var glowTex=glowTexture();
function winTex(cols,rows,lit){var c=document.createElement('canvas');c.width=cols*8;c.height=rows*8;var g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);
  for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){if(Math.random()<lit){g.fillStyle=Math.random()<.3?'#7a8a9a':'#ffffff';g.fillRect(x*8+2,y*8+2,4,4);}}
  var t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}

/* ground */
var ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x08111d,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
var grid=new THREE.GridHelper(200,100,0x17324f,0x0d2035);grid.position.y=.02;grid.material.transparent=true;grid.material.opacity=.55;scene.add(grid);

function wBox(g,w,h,d,x,y,z,side,roof){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[side,side,roof,roof,side,side]);m.position.set(x,y+h/2,z);g.add(m);return m;}
function cyl(g,rt,rb,h,x,y,z,mat,seg){var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||14),mat);m.position.set(x,y+h/2,z);g.add(m);return m;}
function basic(color,op){return new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false});}
var pickables=[];

var BUILD={
 router:function(b,g,side,roof){
   wBox(g,5,4,4,0,0,0,side,roof);wBox(g,7,.35,5.4,0,4,0,roof,roof);
   cyl(g,.9,1.05,9,3.9,0,-.6,side);
   b.beacon=new THREE.Mesh(new THREE.SphereGeometry(.55,12,12),basic(0x59d4ff,.95));b.beacon.position.set(3.9,9.6,-.6);g.add(b.beacon);
   var bar=new THREE.Mesh(new THREE.BoxGeometry(5,.16,.16),basic(0xffb03b,.9));bar.position.set(0,1.3,3.2);g.add(bar);b.bar=bar;
   [-2.5,2.5].forEach(function(x){cyl(g,.12,.12,1.5,x,0,3.2,roof,6);});
   var fan=new THREE.Mesh(new THREE.CircleGeometry(7.5,32,0,Math.PI/3),basic(0x59d4ff,.14));fan.material.side=THREE.DoubleSide;fan.rotation.x=-Math.PI/2;fan.position.y=.1;
   var fp=new THREE.Group();fp.add(fan);g.add(fp);b.fan=fp;
 },
 doc:function(b,g,side,roof){
   wBox(g,10,4.5,7,0,0,0,side,roof);wBox(g,6,2.2,4.5,-1,4.5,0,side,roof);
   var dish=new THREE.Mesh(new THREE.SphereGeometry(1.8,20,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x24466e,roughness:.5,metalness:.4,side:THREE.DoubleSide}));
   var dpv=new THREE.Group();dpv.position.set(2.2,8.2,0);dish.rotation.set(Math.PI*.82,0,.3);dpv.add(dish);g.add(dpv);b.dish=dpv;
   cyl(g,.1,.1,1.6,2.2,6.7,0,roof,6);
   b.scan=new THREE.Mesh(new THREE.PlaneGeometry(7,4.6),basic(0x7ee787,.22));b.scan.rotation.y=Math.PI/2;b.scan.position.set(0,2.4,0);b.scan.material.side=THREE.DoubleSide;g.add(b.scan);
 },
 code:function(b,g,side,roof){
   wBox(g,6,6,6,0,0,0,side,roof);
   var e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.2,6.2,6.2)),new THREE.LineBasicMaterial({color:0xb48cff,transparent:true,opacity:.6}));e.position.y=3;g.add(e);b.edges=e;
   wBox(g,6.4,.25,6.4,0,6,0,roof,roof);
   var sb=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),new THREE.MeshStandardMaterial({color:0x140f22,roughness:.8}));sb.position.set(-4.8,1.2,-3.6);g.add(sb);
   b.sbEdges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.5,2.5,2.5)),new THREE.LineBasicMaterial({color:0xff6b5e,transparent:true,opacity:.55}));b.sbEdges.position.copy(sb.position);g.add(b.sbEdges);
   var tg=new THREE.Group();tg.position.y=9.2;g.add(tg);
   var c1=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2,2.2,2.2)),new THREE.LineBasicMaterial({color:0xb48cff}));
   var c2=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1,1.1,1.1)),new THREE.LineBasicMaterial({color:0xe6d6ff}));
   tg.add(c1);tg.add(c2);b.tess=tg;b.tessOut=c1;b.tessIn=c2;
   var rn=90,rp=new Float32Array(rn*3);for(var ri=0;ri<rn;ri++){rp[ri*3]=(Math.random()-.5)*7.6;rp[ri*3+1]=Math.random()*9;rp[ri*3+2]=(Math.random()-.5)*7.6;}
   var rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
   b.rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0xcfb8ff,size:.17,transparent:true,opacity:.35,depthWrite:false}));g.add(b.rain);
 },
 kb:function(b,g,side,roof){
   wBox(g,6,5,6,0,0,0,side,roof);wBox(g,5,5,5,0,5,0,side,roof);wBox(g,4,5,4,0,10,0,side,roof);wBox(g,2.6,2.6,2.6,0,15,0,side,roof);
   cyl(g,.08,.08,3,0,17.6,0,roof,6);
   var rm=new THREE.MeshStandardMaterial({color:0x2a1f10,roughness:.8,emissive:new THREE.Color(0xffb03b),emissiveMap:winTex(6,5,.7),emissiveIntensity:.6});
   b.rMat=rm;wBox(g,3,4.5,5,-4.6,0,0,rm,roof);
   var hg=new THREE.Group();hg.position.y=22.2;g.add(hg);
   b.ico=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7,0)),new THREE.LineBasicMaterial({color:0xffd166}));
   b.oct=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(.9)),new THREE.LineBasicMaterial({color:0xfff0b8}));
   hg.add(b.ico);hg.add(b.oct);b.holo=hg;b.books=[];
   for(var bi=0;bi<5;bi++){var bk=new THREE.Mesh(new THREE.BoxGeometry(.9,.12,.65),basic(0xffd166,.85));hg.add(bk);b.books.push(bk);}
 },
 studio:function(b,g,side,roof){
   wBox(g,9,4,7,0,0,0,side,roof);
   var sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(3,0);sh.lineTo(3,2.4);sh.lineTo(0,0);
   var rm=new THREE.MeshStandardMaterial({color:0x1c3452,roughness:.8});
   for(var i=0;i<3;i++){var m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:7,bevelEnabled:false}),rm);m.position.set(-4.5+i*3,4,-3.5);g.add(m);}
   cyl(g,.55,.7,7,3.6,4,-2.4,roof,10);
   b.smoke=[];for(var si=0;si<12;si++){var sm=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x8ea2bd,transparent:true,opacity:0,depthWrite:false}));sm.userData.ph=si/12;g.add(sm);b.smoke.push(sm);}
   var t=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff8fab,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));t.scale.set(3,3,1);t.position.set(3.6,11.3,-2.4);g.add(t);
 },
ops:function(b,g,side,roof){
   wBox(g,12,3.6,6,0,0,0,side,roof);wBox(g,12.4,.3,6.4,0,3.6,0,roof,roof);
   [-5.4,5.4].forEach(function(x){cyl(g,.15,.15,5.4,x,0,3.4,roof,6);});
   var rail=new THREE.Mesh(new THREE.BoxGeometry(11,.18,.18),basic(0x8fb3ff,.8));rail.position.set(0,5.4,3.4);g.add(rail);
   b.jobs=[];for(var qi=0;qi<3;qi++){var jm=new THREE.Mesh(new THREE.BoxGeometry(1.4,.9,1.4),basic(0x8fb3ff,.75));jm.position.set(-4+qi*4,.5,4.4);g.add(jm);b.jobs.push(jm);}
 },
 lab:function(b,g,side,roof){
   wBox(g,7,3,7,0,0,0,side,roof);wBox(g,7.4,.3,7.4,0,3,0,roof,roof);
   b.bars=[];for(var i=0;i<5;i++){var bm=new THREE.Mesh(new THREE.BoxGeometry(.9,1,.9),basic(0x5eead4,.8));bm.position.set(-2.4+i*1.2,3.8,0);g.add(bm);b.bars.push(bm);}
   b.lring=new THREE.Mesh(new THREE.TorusGeometry(2.9,.06,6,48),basic(0x5eead4,.5));b.lring.rotation.x=Math.PI/2;b.lring.position.y=8.5;g.add(b.lring);
 },
 tower:function(b,g,side,roof){
   wBox(g,6,3,6,0,0,0,side,roof);wBox(g,2.6,13,2.6,0,3,0,side,roof);wBox(g,5,2.4,5,0,16,0,side,roof);
   cyl(g,.12,.12,5,0,18.4,0,roof,6);
   b.beam=new THREE.Group();b.beam.position.y=19.4;var bm=new THREE.Mesh(new THREE.BoxGeometry(18,.14,.14),basic(0xffb03b,.7));b.beam.add(bm);
   var bs=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffb03b,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));bs.scale.set(2.5,2.5,1);bs.position.x=9;b.beam.add(bs);
   var bs2=bs.clone();bs2.position.x=-9;b.beam.add(bs2);g.add(b.beam);
   b.rings=[];[[4.6,.06,0,0x59d4ff],[5.4,.05,1.1,0xffb03b],[6.2,.04,-.9,0xffffff]].forEach(function(r,i){var t=new THREE.Mesh(new THREE.TorusGeometry(r[0],r[1],6,64),basic(r[3],.5));t.position.y=17.2;t.rotation.set(r[2],0,i*.6);g.add(t);b.rings.push(t);});
   var cn=70,cp=new Float32Array(cn*3);for(var ci=0;ci<cn;ci++){var an=Math.random()*6.28,rr=1.7+Math.random()*.9;cp[ci*3]=Math.cos(an)*rr;cp[ci*3+1]=3+Math.random()*16;cp[ci*3+2]=Math.sin(an)*rr;}
   var cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.BufferAttribute(cp,3));
   b.column=new THREE.Points(cg,new THREE.PointsMaterial({color:0xffd08a,size:.2,transparent:true,opacity:.5,depthWrite:false}));g.add(b.column);
 }
};

function makeBuilding(a){
  var g=new THREE.Group();g.position.set(a.pos[0],0,a.pos[1]);scene.add(g);
  var tint=new THREE.Color(a.color);
  var side=new THREE.MeshStandardMaterial({color:0x13233a,roughness:.75,metalness:.25,emissive:tint,emissiveMap:winTex(a.cols,a.rows,a.lit),emissiveIntensity:.6});
  var roof=new THREE.MeshStandardMaterial({color:0x0e1b2e,roughness:.9});
  var b={a:a,g:g,side:side,glow:0,flash:0,hover:0};a.b=b;
  BUILD[a.id](b,g,side,roof);
  g.traverse(function(o){if(o.isMesh){o.userData.id=a.id;pickables.push(o);}});
  var ring=new THREE.Mesh(new THREE.RingGeometry(a.ring,a.ring+.3,64),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.35,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);b.ring=ring;
  var halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:a.color,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false}));
  halo.scale.set(a.halo,a.halo,1);halo.position.y=a.ty*1.2;g.add(halo);b.halo=halo;
  var col=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,70,8,1,true),basic(a.color,0));col.position.y=35;g.add(col);b.col=col;
}
AGENTS.forEach(makeBuilding);

/* roads from each building to the tower */
var HUB=new THREE.Vector3(0,.6,0);
function doorOf(a){var v=new THREE.Vector3(a.pos[0],.6,a.pos[1]);var l=v.length();if(l<1)return new THREE.Vector3(0,.6,3.8);return v.multiplyScalar(Math.max(0,(l-a.ring*.75))/l);}
AGENTS.forEach(function(a){a.door=doorOf(a);
  if(a.id==='tower')return;
  var d=a.door,dx=-d.x,dz=-d.z,len=Math.sqrt(dx*dx+dz*dz);
  var grp=new THREE.Group();var m=new THREE.Mesh(new THREE.PlaneGeometry(len,.45),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.22}));m.rotation.x=-Math.PI/2;grp.add(m);
  grp.position.set(d.x/2,.03,d.z/2);grp.rotation.y=-Math.atan2(dz,dx);scene.add(grp);
});

/* refinery atmosphere: storage tanks and a flare stack */
var tankMat=new THREE.MeshStandardMaterial({color:0x101d30,roughness:.8,metalness:.3});
[[-30,-26],[-24,-30],[-36,-20],[-28,-16]].forEach(function(p,i){
  var t=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,5+i%2*2,20),tankMat);t.position.set(p[0],(5+i%2*2)/2,p[1]);scene.add(t);
  var r=new THREE.Mesh(new THREE.TorusGeometry(3.4,.08,6,24),basic(0x59d4ff,.35));r.rotation.x=Math.PI/2;r.position.set(p[0],5+i%2*2,p[1]);scene.add(r);
});
var flareBase=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,20,8),tankMat);flareBase.position.set(30,10,-28);scene.add(flareBase);
var flame=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffa030,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));flame.scale.set(4,5,1);flame.position.set(30,21.5,-28);scene.add(flame);

/* floating dust */
var dg=new THREE.BufferGeometry(),dp=[];for(var i=0;i<380;i++)dp.push((Math.random()-.5)*110,Math.random()*34+1,(Math.random()-.5)*110);
dg.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));
var dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0x59d4ff,size:.14,transparent:true,opacity:.5,depthWrite:false}));scene.add(dust);

/* ---------- extra animated elements ---------- */
var stars=(function(){var n=520,p=new Float32Array(n*3);for(var i=0;i<n;i++){var u=Math.random()*Math.PI*2,v=Math.random()*1.35+.08,r=170+Math.random()*30;p[i*3]=Math.cos(u)*Math.cos(v)*r;p[i*3+1]=Math.sin(v)*r*.8+10;p[i*3+2]=Math.sin(u)*Math.cos(v)*r;}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  var pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xb8cdee,size:1.6,sizeAttenuation:false,transparent:true,opacity:.8,fog:false,depthWrite:false}));scene.add(pts);return pts;})();

var trucks=[];
AGENTS.forEach(function(a){if(a.id==='tower')return;
  var d=a.door,dir=new THREE.Vector3(d.x,0,d.z).normalize();
  var st=new THREE.Vector3(d.x,.35,d.z),en=dir.clone().multiplyScalar(4.4);en.y=.35;
  var base=-Math.atan2(-d.z,-d.x);
  for(var k=0;k<3;k++){
    var m=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,.55),new THREE.MeshBasicMaterial({color:a.color}));
    var gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:a.color,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));gl.scale.set(2.2,2.2,1);m.add(gl);
    scene.add(m);trucks.push({m:m,st:st,en:en,t:k/3,dir:k%2?-1:1,base:base,a:a});
  }
});

var drones=[];
for(var di=0;di<3;di++){var dg2=new THREE.Group();
  dg2.add(new THREE.Mesh(new THREE.OctahedronGeometry(.5),new THREE.MeshBasicMaterial({color:0x9db8e0})));
  var dl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:di===1?0xff6b5e:0x59d4ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));dl.scale.set(2,2,1);dg2.add(dl);
  scene.add(dg2);drones.push({g:dg2,l:dl,rx:28+di*4,rz:20+di*3,y:15+di*3,sp:.22+.07*di,ph:di*2.1});}

var shocks=[],items=[],pingT=2.5,spawnT=.4;
function shock(a,big){
  var m=new THREE.Mesh(new THREE.RingGeometry(.94,1,72),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.7,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(a.pos[0],.08,a.pos[1]);scene.add(m);
  shocks.push({m:m,t:0,r0:a.ring,r1:a.ring+(big?18:11)});
}
function launch(id){
  var a=A[id],s=A.studio;
  var from=new THREE.Vector3(a.pos[0],a.ty*2.2,a.pos[1]),to=new THREE.Vector3(s.pos[0],7,s.pos[1]);
  var mid=from.clone().add(to).multiplyScalar(.5);mid.y=30;
  var m;
  if(id==='doc')m=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.2),new THREE.MeshBasicMaterial({color:0xe8f7ea,side:THREE.DoubleSide,transparent:true}));
  else{m=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:a.color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(1.7,1.7,1);}
  m.position.copy(from);scene.add(m);
  items.push({m:m,from:from,mid:mid,to:to,t:0,dur:2.2+Math.random()*.6,spin:Math.random()*4+2,id:id});
}

/* light pulses along the roads */
var pulses=[];
function pulseRoute(pts,color){
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));
  s.scale.set(2.4,2.4,1);s.renderOrder=10;scene.add(s);
  var lens=[],tot=0;for(var i=0;i<pts.length-1;i++){var l=pts[i].distanceTo(pts[i+1]);lens.push(l);tot+=l;}
  pulses.push({s:s,pts:pts,lens:lens,tot:tot,t:0,dur:1.6});
}
function pulseBetween(ida,idb){var a=A[ida],b=A[idb];var pts=[a.door.clone()];if(ida!=='tower'&&idb!=='tower')pts.push(HUB.clone());pts.push(b.door.clone());
  pulseRoute(pts,new THREE.Color(a.color));setTimeout(function(){b.b.flash=1;if(!reduce)shock(b,false)},1500);}
function pulseFrom(id){if(id!=='tower')pulseBetween(id,'tower');}
function flashSandbox(){var b=A.code.b;b.sbFlash=1;}

/* ---------- camera ---------- */
var cam={theta:.6,phi:.95,r:96,tx:0,ty:3,tz:0,sx:0,sy:0};
var home={theta:.6,phi:1.0,r:76,tx:0,ty:3,tz:0,sx:0,sy:0};
var anim=null,lastInput=performance.now()+2500;
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function flyTo(v,dur){
  var from={theta:cam.theta,phi:cam.phi,r:cam.r,tx:cam.tx,ty:cam.ty,tz:cam.tz,sx:cam.sx,sy:cam.sy};
  var d=Math.atan2(Math.sin(v.theta-from.theta),Math.cos(v.theta-from.theta));
  anim={from:from,to:{theta:from.theta+d,phi:v.phi,r:v.r,tx:v.tx,ty:v.ty,tz:v.tz,sx:v.sx,sy:v.sy},t0:performance.now(),dur:reduce?1:(dur||1500)};
}
function shifts(){if(innerWidth<=820)return [0,innerHeight*.29];var w=Math.min(PW,innerWidth-24);return [(w+12)/2,0];}
function viewFor(a){var sh=shifts();return {theta:a.theta!=null?a.theta:Math.atan2(a.pos[0],a.pos[1]),phi:a.phi||1.12,r:a.dist,tx:a.pos[0],ty:a.ty,tz:a.pos[1],sx:sh[0],sy:sh[1]};}
function onResize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(S.focus){var v=viewFor(A[S.focus]);cam.sx=v.sx;cam.sy=v.sy;}}
addEventListener('resize',onResize);

/* ---------- input ---------- */
var ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),ptrs={},downAt=null,pinch=0,hoverId=null,moveQ=false;
function pick(x,y){mouse.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(mouse,camera);var h=ray.intersectObjects(pickables,false);return h.length?h[0].object.userData.id:null;}
canvas.addEventListener('pointerdown',function(e){canvas.setPointerCapture(e.pointerId);ptrs[e.pointerId]={x:e.clientX,y:e.clientY};downAt={x:e.clientX,y:e.clientY,t:performance.now()};lastInput=performance.now();
  var k=Object.keys(ptrs);if(k.length===2){var p=ptrs[k[0]],q=ptrs[k[1]];pinch=Math.hypot(p.x-q.x,p.y-q.y);}});
canvas.addEventListener('pointermove',function(e){
  var p=ptrs[e.pointerId];
  if(p){
    var k=Object.keys(ptrs);
    if(k.length===2){var a=ptrs[k[0]],b=ptrs[k[1]];p.x=e.clientX;p.y=e.clientY;var d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch){cam.r=Math.min(95,Math.max(9,cam.r*pinch/d));}pinch=d;anim=null;}
    else{anim=null;cam.theta-=(e.clientX-p.x)*.005;cam.phi=Math.min(1.45,Math.max(.35,cam.phi-(e.clientY-p.y)*.004));p.x=e.clientX;p.y=e.clientY;}
    lastInput=performance.now();return;
  }
  if(!moveQ){moveQ=true;var x=e.clientX,y=e.clientY;requestAnimationFrame(function(){moveQ=false;hoverId=pick(x,y);canvas.style.cursor=hoverId?'pointer':'grab';});}
});
function up(e){
  var moved=downAt?Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y):99;
  if(downAt&&moved<6&&performance.now()-downAt.t<600&&Object.keys(ptrs).length===1){var id=pick(e.clientX,e.clientY);if(id&&cb.onPick)cb.onPick(id);}
  delete ptrs[e.pointerId];pinch=0;downAt=null;
}
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId];pinch=0;});
canvas.addEventListener('wheel',function(e){e.preventDefault();anim=null;cam.r=Math.min(95,Math.max(9,cam.r*(1+e.deltaY*.001)));lastInput=performance.now();},{passive:false});

/* ---------- render loop ---------- */
var last=performance.now(),frameN=0,tmpV=new THREE.Vector3(),clock=0;
function frame(now){
  var dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;frameN++;
  if(anim){var k=Math.min(1,(now-anim.t0)/anim.dur),e=ease(k);
    ['theta','phi','r','tx','ty','tz','sx','sy'].forEach(function(key){cam[key]=anim.from[key]+(anim.to[key]-anim.from[key])*e;});
    if(k>=1)anim=null;}
  else if(!S.focus&&!reduce&&now-lastInput>4000){cam.theta+=dt*.05;}
  var sp=Math.sin(cam.phi),th=cam.theta+((S.focus&&!anim&&!reduce)?Math.sin(clock*.35)*.04:0);
  camera.position.set(cam.tx+cam.r*sp*Math.sin(th),cam.ty+cam.r*Math.cos(cam.phi),cam.tz+cam.r*sp*Math.cos(th));
  camera.lookAt(cam.tx,cam.ty,cam.tz);
  if(Math.abs(cam.sx)>.5||Math.abs(cam.sy)>.5)camera.setViewOffset(innerWidth,innerHeight,cam.sx,cam.sy,innerWidth,innerHeight);else camera.clearViewOffset();
  camera.updateMatrixWorld();

  AGENTS.forEach(function(a){
    var b=a.b;b.glow+=((a.active?1:0)-b.glow)*Math.min(1,dt*6);b.flash=Math.max(0,b.flash-dt*.9);
    b.hover+=(((hoverId===a.id)?1:0)-b.hover)*Math.min(1,dt*8);
    var g=Math.max(b.glow,b.flash);
    b.side.emissiveIntensity=.55+1.1*g+.35*b.hover;
    b.halo.material.opacity=.12+.5*g+.15*b.hover;
    b.ring.material.opacity=.3+.5*g+.2*b.hover;
    if(b.scan){b.scan.visible=b.glow>.05;b.scan.position.x=Math.sin(clock*1.6)*4.7;}
    if(b.edges)b.edges.material.opacity=.45+.5*g;
    if(b.sbFlash!=null){b.sbFlash=Math.max(0,b.sbFlash-dt*.8);b.sbEdges.material.opacity=.45+.55*(Math.sin(clock*24)>0?b.sbFlash:0);}
    if(b.beacon)b.beacon.material.opacity=.5+.5*Math.abs(Math.sin(clock*2));
    if(b.beam)b.beam.rotation.y=clock*.9;
    if(b.rMat)b.rMat.emissiveIntensity=S.role==='engineer'?.06:.6+.5*b.hover;
  });
  AGENTS.forEach(function(a,idx){
    var b=a.b,g=Math.max(b.glow,b.flash);
    var ti=reduce?9:(clock-.4-idx*.35)/1.1,s=Math.max(0,Math.min(1,ti)),es=1+2.7*Math.pow(s-1,3)+1.7*Math.pow(s-1,2);
    b.g.scale.y=Math.max(.001,es);b.built=ti>.95;
    if(ti>=1&&!b.landed){b.landed=true;if(!reduce)shock(a,false);}
    if(b.bar)b.bar.position.y=1.3+1.9*g;
    if(b.jobs)b.jobs.forEach(function(j,i){j.position.x=-4.5+((clock*(.5+g*2.5)+i*3.2)%9);});
    if(b.bars)b.bars.forEach(function(bm,i){var h=1+2.2*Math.abs(Math.sin(clock*(.6+g*2)+i*1.3));bm.scale.y=h;bm.position.y=3.3+h/2;});
    if(b.lring)b.lring.position.y=8.5+Math.sin(clock*1.4)*.3;
    if(b.fan){b.fan.rotation.y=-clock*(1.2+g*3);b.fan.children[0].material.opacity=.12+.25*g;}
    if(b.dish)b.dish.rotation.y=clock*(.5+g*2.5);
    if(b.tess){b.tessOut.rotation.x=clock*(.6+g*2);b.tessOut.rotation.y=clock*(.8+g*2);b.tessIn.rotation.x=-clock*(1.1+g*3);b.tessIn.rotation.z=clock*(.9+g*3);b.tess.position.y=9.2+Math.sin(clock*1.6)*.35;}
    if(b.rain){var pa=b.rain.geometry.attributes.position,arr=pa.array;for(var k=1;k<arr.length;k+=3){arr[k]-=dt*(1.5+g*7);if(arr[k]<0)arr[k]=9;}pa.needsUpdate=true;b.rain.material.opacity=.3+.6*g;}
    if(b.holo){b.holo.position.y=22.2+Math.sin(clock*1.3)*.5;b.ico.rotation.y=clock*(.5+g*2);b.ico.rotation.x=clock*.3;b.oct.rotation.y=-clock*(.9+g*2.5);b.oct.rotation.z=clock*.5;
      b.books.forEach(function(bk,i){var an=clock*(.8+g*1.6)+i*Math.PI*2/5;bk.position.set(Math.cos(an)*3.1,Math.sin(clock*1.5+i)*.7,Math.sin(an)*3.1);bk.rotation.set(0,-an,Math.sin(clock*2+i)*.5);});}
    if(b.smoke)b.smoke.forEach(function(sm){var ph=(clock*(.2+g*.25)+sm.userData.ph)%1;sm.position.set(3.6+ph*2.5,11+ph*9,-2.4+ph*1.5);var sc=1.2+ph*5;sm.scale.set(sc,sc,1);sm.material.opacity=(1-ph)*(.14+.3*g)*Math.min(1,ph*8);});
    if(b.rings)b.rings.forEach(function(r,i){r.rotation.y=clock*(.6+i*.3+g*1.5)*(i%2?-1:1);r.material.opacity=.4+.4*g;});
    if(b.column){var ca=b.column.geometry.attributes.position,ar=ca.array;for(var k2=1;k2<ar.length;k2+=3){ar[k2]+=dt*(1.2+g*6);if(ar[k2]>19)ar[k2]=3;}ca.needsUpdate=true;b.column.material.opacity=.45+.5*g;}
    if(b.col){b.col.material.opacity=.5*g;var w=1+Math.sin(clock*8)*.15*g;b.col.scale.set(w,1,w);}
  });
  trucks.forEach(function(t){var g=Math.max(t.a.b.glow,t.a.b.flash);t.t=(t.t+dt*(.05+.3*g))%1;var f=t.dir>0?t.t:1-t.t;
    t.m.position.lerpVectors(t.st,t.en,f);t.m.rotation.y=t.base+(t.dir>0?0:Math.PI);t.m.visible=!!t.a.b.built;});
  drones.forEach(function(d,i){var an=clock*d.sp+d.ph;d.g.position.set(Math.cos(an)*d.rx,d.y+Math.sin(clock*1.3+i)*.8,Math.sin(an)*d.rz);d.g.rotation.y=-an;d.l.material.opacity=.5+.5*Math.abs(Math.sin(clock*6+i*2));});
  stars.rotation.y+=dt*.002;
  pingT-=dt;if(pingT<=0&&!reduce&&A.tower.b.built){pingT=3.8;shock(A.tower,true);}
  spawnT-=dt;if(spawnT<=0){spawnT=.42;if(!reduce)['doc','kb','code'].forEach(function(id){if(A[id].active)launch(id);});}
  for(var q=shocks.length-1;q>=0;q--){var sh=shocks[q];sh.t+=dt/1.5;
    if(sh.t>=1){scene.remove(sh.m);sh.m.geometry.dispose();sh.m.material.dispose();shocks.splice(q,1);continue;}
    var e2=1-Math.pow(1-sh.t,3),rr=sh.r0+(sh.r1-sh.r0)*e2;sh.m.scale.set(rr,rr,1);sh.m.material.opacity=.7*(1-sh.t);}
  for(var w2=items.length-1;w2>=0;w2--){var it=items[w2];it.t+=dt/it.dur;
    if(it.t>=1){scene.remove(it.m);if(it.m.geometry)it.m.geometry.dispose();A.studio.b.flash=Math.max(A.studio.b.flash,.45);items.splice(w2,1);continue;}
    var u=1-it.t;it.m.position.set(u*u*it.from.x+2*u*it.t*it.mid.x+it.t*it.t*it.to.x,u*u*it.from.y+2*u*it.t*it.mid.y+it.t*it.t*it.to.y,u*u*it.from.z+2*u*it.t*it.mid.z+it.t*it.t*it.to.z);
    if(it.id==='doc'){it.m.rotation.x+=dt*it.spin;it.m.rotation.y+=dt*it.spin*.7;}
    it.m.material.opacity=Math.min(1,it.t*8)*Math.min(1,(1-it.t)*6);}
  for(var i=pulses.length-1;i>=0;i--){var p=pulses[i];p.t+=dt/p.dur;
    if(p.t>=1){scene.remove(p.s);pulses.splice(i,1);continue;}
    var dist=p.t*p.tot,seg=0;while(seg<p.lens.length-1&&dist>p.lens[seg]){dist-=p.lens[seg];seg++;}
    var f=p.lens[seg]?dist/p.lens[seg]:0;p.s.position.lerpVectors(p.pts[seg],p.pts[seg+1],Math.min(1,f));p.s.material.opacity=Math.sin(Math.PI*p.t)*1.1;}
  flame.scale.set(3.6+Math.sin(clock*13)*.5,4.6+Math.sin(clock*9)*.8,1);flame.material.opacity=.7+Math.sin(clock*17)*.2;
  if(!lite)dust.rotation.y+=dt*.004;

  /* labels */
  AGENTS.forEach(function(a){var el=tagEls[a.id];
    var lv=!!a.active;if(a._lv!==lv){a._lv=lv;el.classList.toggle('live',lv);}
    if(S.focus||!a.b.built){el.style.opacity=0;el.style.pointerEvents='none';return;}
    tmpV.set(a.pos[0],a.ty*2.1+(a.id==='tower'?3:2.5),a.pos[1]).project(camera);
    if(tmpV.z>1){el.style.opacity=0;el.style.pointerEvents='none';return;}
    el.style.opacity=1;el.style.pointerEvents='auto';
    el.style.transform='translate('+((tmpV.x*.5+.5)*innerWidth)+'px,'+((-tmpV.y*.5+.5)*innerHeight)+'px) translate(-50%,-100%)';});

  renderer.render(scene,camera);raf=requestAnimationFrame(frame);
}
camera.position.set(0,60,80);
requestAnimationFrame(function(t){last=t;flyTo(home,reduce?1:3200);frame(t);});

return {
  focus:function(id){var a=A[id];if(!a)return;S.focus=id;flyTo(viewFor(a));if(!reduce&&a.b)shock(a,true);},
  home:function(){S.focus=null;flyTo(home);},
  setActive:function(id,on){var a=A[id];if(!a)return;a.active=on;if(on&&a.b&&!reduce)shock(a,false);},
  ping:function(id){var a=A[id];if(a&&!reduce)shock(a,true);},
  pulseFrom:function(id){if(A[id])pulseFrom(id);},
  pulseBetween:function(x,y){if(A[x]&&A[y])pulseBetween(x,y);},
  flashSandbox:flashSandbox,
  setLite:function(v){lite=v;renderer.setPixelRatio(lite?1:Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight,false);dust.visible=!lite;stars.visible=!lite;drones.forEach(function(d){d.g.visible=!lite});},
  destroy:function(){cancelAnimationFrame(raf);removeEventListener('resize',onResize);AGENTS.forEach(function(a){var t=tagEls[a.id];if(t&&t.parentNode)t.parentNode.removeChild(t);});renderer.dispose();}
};
}
