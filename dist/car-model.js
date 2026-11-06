import * as THREE from './vendor/three.module.js';

// Original Lumen coupe: low enclosed cockpit, continuous body and single rear wing.
// The exported API keeps the existing renderer integration intact.
export function createClassicCar(color='#5fc6d5') {
  const car=new THREE.Group();
  const body=new THREE.MeshStandardMaterial({color,metalness:.6,roughness:.3});
  const dark=new THREE.MeshStandardMaterial({color:'#142635',metalness:.35,roughness:.45});
  const tyre=new THREE.MeshStandardMaterial({color:'#111820',roughness:.95});
  const rim=new THREE.MeshStandardMaterial({color:'#c6e6eb',metalness:.8,roughness:.25});
  const glass=new THREE.MeshStandardMaterial({color:'#143b54',metalness:.45,roughness:.13});
  const light=new THREE.MeshStandardMaterial({color:'#c5ffff',emissive:'#7aeaff',emissiveIntensity:1});
  const tail=new THREE.MeshStandardMaterial({color:'#ff4d67',emissive:'#ff203c',emissiveIntensity:.8});
  const mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;car.add(m);return m;};
  const box=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  car.userData={wheels:[],flames:[],bodyMaterial:body,color};
  box(3.5,.48,6.2,dark,0,.65,0);
  // Two stacked bevelled capsule-like hulls use fresh coordinates, no reference texture.
  const hull=new THREE.Shape();hull.moveTo(-1.7,-2.6);hull.lineTo(-1.4,-3.2);hull.lineTo(1.4,-3.2);hull.lineTo(1.7,-2.6);hull.lineTo(1.65,2.65);hull.lineTo(.9,3.3);hull.lineTo(-.9,3.3);hull.lineTo(-1.65,2.65);hull.closePath();
  const bodyMesh=mesh(new THREE.ExtrudeGeometry(hull,{depth:.62,bevelEnabled:true,bevelSize:.15,bevelThickness:.15,bevelSegments:2}),body,0,1.55,0);bodyMesh.rotation.x=Math.PI/2;
  const canopy=mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),glass,0,1.55,-.25);canopy.scale.set(1.18,1.0,1.63);
  box(.18,.12,3.0,body,0,2.41,-.25);
  for(const side of [-1,1]){
    box(.12,.11,4.75,light,side*1.72,1.37,.1);
    box(.72,.12,.12,light,side*.93,1.31,3.2);
    box(.9,.12,.12,tail,side*.8,1.33,-3.25);
    box(.15,.6,.18,dark,side*1.2,1.94,-2.45);
    for(const z of [-1.95,1.95]){
      const wheel=new THREE.Group();wheel.position.set(side*1.8,.7,z);wheel.userData.front=z>0;
      const rubber=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,.47,24),tyre);rubber.rotation.z=Math.PI/2;rubber.castShadow=true;wheel.add(rubber);
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.49,8),rim);disc.rotation.z=Math.PI/2;wheel.add(disc);
      car.add(wheel);car.userData.wheels.push(wheel);
    }
    const jet=mesh(new THREE.ConeGeometry(.22,2.5,12),new THREE.MeshBasicMaterial({color:'#70f0ff',transparent:true,opacity:.8,depthWrite:false}),side*.88,.8,-4.25);jet.rotation.x=-Math.PI/2;jet.visible=false;car.userData.flames.push(jet);
    const exhaust=mesh(new THREE.CylinderGeometry(.29,.29,.3,16),dark,side*.88,.8,-3.2);exhaust.rotation.x=Math.PI/2;
  }
  box(3.8,.13,.68,body,0,2.3,-2.5);
  box(.9,.04,1.7,dark,0,1.76,2.15);
  const driver=new THREE.Group();driver.visible=false;car.userData.driver=driver;car.add(driver);
  return car;
}
