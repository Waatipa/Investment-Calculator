import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { PLANET_REGIONS, planetRegion, PLANET_SPIN, COMPANY_ORBIT_SPEED } from "@/lib/planet-regions";

/** Decorative only; navigation selects identities, never pointer movement. */
export function SpaceBackground() {
  const path = useRouterState({ select: state => state.location.pathname });
  const selected = planetRegion(path);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element || !selected) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("three").then(T => {
      if (disposed) return;
      const mobile = window.matchMedia("(max-width: 767px)");
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const palette = getComputedStyle(element);
      const swatch = document.createElement("canvas").getContext("2d");
      if (!swatch) return;
      function color(token: string) {
        if (!swatch) return new T.Color();
        swatch.clearRect(0, 0, 1, 1);
        swatch.fillStyle = palette.getPropertyValue(token).trim();
        swatch.fillRect(0, 0, 1, 1);
        const [r, g, b] = swatch.getImageData(0, 0, 1, 1).data;
        return new T.Color(`rgb(${r},${g},${b})`);
      }
      const blue = color("--space-blue"), lit = color("--space-lit"), cyan = color("--space-cyan");
      const green = color("--space-green"), gold = color("--space-gold"), starColor = color("--space-star");
      const textures: InstanceType<typeof T.Texture>[] = [];
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile.matches ? 1 : 1.5));
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.OrthographicCamera(0, 1, 1, 0, 0.1, 2000);
      camera.position.z = 1000;
      const planet = new T.Group(); scene.add(planet);
      const globe = new T.Group(); planet.add(globe);
      const vertexShader = `varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}`;
      globe.add(new T.Mesh(new T.SphereGeometry(1, 64, 40), new T.ShaderMaterial({
        uniforms: { dark: { value: blue }, lit: { value: lit }, rim: { value: cyan } }, vertexShader,
        fragmentShader: `uniform vec3 dark; uniform vec3 lit; uniform vec3 rim; varying vec3 n; varying vec3 v; void main(){vec3 N=normalize(n); float light=pow(max(dot(N,normalize(vec3(-.55,.65,1.))),0.),3.); float f=pow(1.-max(dot(N,normalize(v)),0.),4.); gl_FragColor=vec4(mix(dark*.38,lit,light)+rim*f*.28,1.);}`,
      })));
      planet.add(new T.Mesh(new T.SphereGeometry(1.065, 64, 40), new T.ShaderMaterial({
        uniforms: { tint: { value: cyan } }, transparent: true, depthWrite: false, vertexShader,
        fragmentShader: `uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){float f=pow(1.-max(dot(normalize(n),normalize(v)),0.),3.); gl_FragColor=vec4(tint,f*.4);}`,
      })));
      function glow(tint: InstanceType<typeof T.Color>, scale: number) {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return new T.Group();
        const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
        gradient.addColorStop(0, tint.getStyle()); gradient.addColorStop(.16, tint.getStyle()); gradient.addColorStop(1,"transparent");
        ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64);
        const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.push(texture);
        const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending }));
        sprite.scale.set(scale,scale,1); return sprite;
      }
      const halo = glow(cyan, 2.8); halo.position.z = -1.1; planet.add(halo);
      // Sparse spherical meridians/latitudes, matching the reference's glass globe.
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 8;
        const points = Array.from({length:129}, (_,j) => { const b=j/128*Math.PI*2; return new T.Vector3(Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)).multiplyScalar(1.006); });
        globe.add(new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({color:cyan,transparent:true,opacity:.13})));
      }
      for (const y of [-.65,-.3,.1,.5]) {
        const r = Math.sqrt(1-y*y)*1.006;
        const points = Array.from({length:129},(_,j)=>new T.Vector3(Math.cos(j/128*Math.PI*2)*r,y,Math.sin(j/128*Math.PI*2)*r));
        globe.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:cyan,transparent:true,opacity:.12})));
      }
      // This decorative trace is not a price series.
      const trace = [-.16,-.1,-.04,-.12,-.09,-.06,.01,.06,-.05,-.07,-.02,.04,-.03,.01,-.12,-.1,-.17,-.05];
      const chart = trace.map((y,i)=> {const x=-.65+i*.095;return new T.Vector3(x,y,Math.sqrt(Math.max(.01,1.025-x*x-y*y)));});
      globe.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(chart),100,.009,4,false),new T.MeshBasicMaterial({color:green})));
      const dots = Array.from({length:55},(_,i)=>{const y=Math.sin(i*3.7)*.9,a=i*2.399,r=Math.sqrt(1-y*y)*1.013;return new T.Vector3(Math.sin(a)*r,y,Math.cos(a)*r);});
      globe.add(new T.Points(new T.BufferGeometry().setFromPoints(dots),new T.PointsMaterial({color:gold,size:1.8,sizeAttenuation:false,transparent:true,opacity:.7})));
      function label(text: string, tint: InstanceType<typeof T.Color>, region = false) {
        const canvas = document.createElement("canvas"); canvas.width=256; canvas.height=64;
        const ctx=canvas.getContext("2d");
        if (!ctx) return new T.Group();
        ctx.font=`${region ? 500 : 700} 26px Arial`; const w=Math.min(248,ctx.measureText(text).width+28);
        ctx.fillStyle=color("--background").getStyle(); ctx.strokeStyle=tint.getStyle(); ctx.lineWidth=2;
        ctx.beginPath();ctx.roundRect((256-w)/2,8,w,46,22);ctx.fill();ctx.stroke();
        ctx.fillStyle=starColor.getStyle();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,128,32);
        const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
        const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(region?1.03:.75,region?.258:.188,1);return sprite;
      }
      const orbits = PLANET_REGIONS.map((region,i)=> {
        const group=new T.Group(); planet.add(group);
        // Tilted circles project into the reference's tall, intersecting ellipses.
        group.rotation.set(.15, [.57,.94,.38,1.42][i] ?? 0, [-.32,-.48,.06,-.4][i] ?? 0);
        const r=[1.48,1.72,2.08,2.35][i] ?? 1.5;
        const tint=color(region.token), active=region.name===selected.name;
        const points=Array.from({length:193},(_,j)=>new T.Vector3(Math.cos(j/192*Math.PI*2)*r,Math.sin(j/192*Math.PI*2)*r,0));
        group.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:tint,transparent:true,opacity:active?.9:.35})));
        if(active) group.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),192,.006,4,false),new T.MeshBasicMaterial({color:tint,transparent:true,opacity:.65})));
        const satellites=Array.from({length:active?4:3},(_,j)=>{
          const orb=new T.Group();group.add(orb);
          orb.add(new T.Mesh(new T.SphereGeometry(active?.027:.018,12,8),new T.MeshBasicMaterial({color:tint})));
          orb.add(glow(tint,active?.22:.14));
          if(active){const badge=label(region.companies[j] ?? "",cyan);badge.position.set(.21,.11,.08);orb.add(badge);}
          return orb;
        });
        const title=label(region.name,tint,true);title.visible=active;planet.add(title);
        return {group,r,satellites,title,active};
      });
      const coords=new Float32Array((mobile.matches?110:300)*3);
      const starGeometry=new T.BufferGeometry();starGeometry.setAttribute("position",new T.BufferAttribute(coords,3));
      scene.add(new T.Points(starGeometry,new T.PointsMaterial({color:starColor,size:1,sizeAttenuation:false,transparent:true,opacity:.4})));
      let width=1,height=1,radius=100,baseY=0,elapsed=0;
      const baseRot=orbits.map(o=>o.group.rotation.clone());
      function draw() {
        planet.position.set(width*(mobile.matches?.80:.805),height-baseY+window.scrollY,0);
        // Tumble on several axes so the spin reads as natural, not purely horizontal.
        globe.rotation.set(Math.sin(elapsed*.23)*.45+elapsed*PLANET_SPIN*.35,-.4+elapsed*PLANET_SPIN,Math.cos(elapsed*.17)*.3);
        for(const [i,orbit] of orbits.entries()) {
          const b=baseRot[i];
          // Each orbit precesses with its own rhythm.
          if(b) orbit.group.rotation.set(b.x+Math.sin(elapsed*(.31+i*.07)+i)*.35,b.y+elapsed*(.12+i*.05)*(i%2?-1:1),b.z+Math.cos(elapsed*(.27+i*.06)+i*2)*.3);
          for(const [j,orb] of orbit.satellites.entries()) {
            const a=elapsed*(COMPANY_ORBIT_SPEED+i*.06)+j/ orbit.satellites.length*Math.PI*2+i*.6;
            orb.position.set(Math.cos(a)*orbit.r,Math.sin(a)*orbit.r,0);
            for(const child of orb.children) if(child instanceof T.Sprite) child.quaternion.copy(orbit.group.quaternion).invert();
          }
          orbit.title.position.set(0,-1.22,1.6);
        }
        // Drift stars across the whole page with varied speeds.
        for(let j=0;j<coords.length;j+=3){const s=12+((j*.37)%1)*40;coords[j]=(((j*.618033)%1)*width+elapsed*s)%width;coords[j+1]=(((j*.414214)%1)*height+elapsed*s*.35)%height;}
        const sa=starGeometry.getAttribute("position");if(sa)sa.needsUpdate=true;
        if (host.current) host.current.dataset["rotation"]=elapsed.toFixed(2);
        renderer.render(scene,camera);
      }
      function resize() {
        width=window.innerWidth;height=window.innerHeight;renderer.setSize(width,height);camera.right=width;camera.top=height;camera.updateProjectionMatrix();
        const intro=document.querySelector(".reference-intro")?.getBoundingClientRect();
        radius=path === "/" || path === "/markets" ? (mobile.matches?76:Math.min(110,width*.09)) : (mobile.matches?58:53);
        baseY=(intro?.top??240)+window.scrollY+(path === "/" || path === "/markets" ? (mobile.matches?190:185) : (mobile.matches?105:75));planet.scale.setScalar(radius);
        for(let j=0;j<coords.length;j+=3){coords[j]=((j*.618033)%1)*width;coords[j+1]=((j*.414214)%1)*height;coords[j+2]=-350;}
        const attr=starGeometry.getAttribute("position");if(attr)attr.needsUpdate=true;draw();
      }
      let frame=0,last=0;
      function loop(time:number) {
        frame=requestAnimationFrame(loop);
        if(document.hidden){last=time;return;}
        const dt=last?Math.min((time-last)/1000,.05):0;last=time;elapsed+=dt;draw();
      }
      const changed=()=>{cancelAnimationFrame(frame);last=0;if(motion.matches){elapsed=0;draw();}else frame=requestAnimationFrame(loop);};
      resize(); if(!motion.matches)frame=requestAnimationFrame(loop);
      window.addEventListener("resize",resize);window.addEventListener("scroll",draw,{passive:true});motion.addEventListener("change",changed);
      cleanup=()=> {
        cancelAnimationFrame(frame);window.removeEventListener("resize",resize);window.removeEventListener("scroll",draw);motion.removeEventListener("change",changed);
        scene.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line||object instanceof T.Points||object instanceof T.Sprite){if("geometry" in object)object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
        textures.forEach(texture=>texture.dispose());renderer.dispose();renderer.domElement.remove();
      };
    });
    return ()=>{disposed=true;cleanup?.();};
  },[selected,path]);
  return selected ? <div ref={host} className="homepage-space-background" data-region={selected.name} data-companies={selected.companies.join(",")} aria-hidden="true" /> : null;
}
