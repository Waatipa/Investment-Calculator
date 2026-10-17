import { useEffect, useRef } from "react";

/** Decorative only: no hit targets, financial data, or layout participation. */
export function SpaceBackground() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
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
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: !mobile.matches, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile.matches ? 1 : 1.5));
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.OrthographicCamera(0, 1, 1, 0, 0.1, 2000);
      camera.position.z = 1000;
      const blue = color("--space-blue"), cyan = color("--space-cyan"), starColor = color("--space-star"), gold = color("--gold");
      const planet = new T.Group();
      scene.add(planet);
      const sphere = new T.Mesh(new T.SphereGeometry(1, 40, 28), new T.MeshPhongMaterial({ color: blue, emissive: blue, emissiveIntensity: 0.16, shininess: 26, transparent: true, opacity: 0.72 }));
      planet.add(sphere);
      scene.add(new T.AmbientLight(cyan, 1.3));
      const light = new T.DirectionalLight(cyan, 3);
      light.position.set(-300, 600, 500); scene.add(light);
      // A soft Fresnel atmosphere, not an opaque overlay on the content.
      const atmosphere = new T.Mesh(new T.SphereGeometry(1.065, 40, 28), new T.ShaderMaterial({
        uniforms: { tint: { value: cyan } }, transparent: true, depthWrite: false,
        vertexShader: "varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }",
        fragmentShader: "uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){ float f=pow(1.-max(dot(normalize(n),normalize(v)),0.),3.); gl_FragColor=vec4(tint,f*.20); }",
      }));
      planet.add(atmosphere);
      const globe = new T.Group(); planet.add(globe);
      const surface: number[] = [];
      for (let lat = -70; lat < 78; lat += 4) for (let lon = -180; lon < 180; lon += 4) {
        const land = ((lon + 105) ** 2 / 1700 + (lat - 43) ** 2 / 900 < 1) || ((lon + 61) ** 2 / 350 + (lat + 15) ** 2 / 1000 < 1) || ((lon - 21) ** 2 / 500 + (lat - 1) ** 2 / 800 < 1) || ((lon - 75) ** 2 / 3400 + (lat - 48) ** 2 / 520 < 1) || ((lon - 135) ** 2 / 500 + (lat + 25) ** 2 / 180 < 1);
        if (!land) continue;
        const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
        surface.push(1.008 * Math.cos(a) * Math.sin(b), 1.008 * Math.sin(a), 1.008 * Math.cos(a) * Math.cos(b));
      }
      const geography = new T.BufferGeometry(); geography.setAttribute("position", new T.Float32BufferAttribute(surface, 3));
      globe.add(new T.Points(geography, new T.PointsMaterial({ color: cyan, size: 1.5, transparent: true, opacity: 0.38, sizeAttenuation: false })));
      const chart = [-0.78,-0.45,-0.61,-0.21,-0.27,0.13,0.03,0.43,0.34,0.67].map((y, i) => {
        const x = -0.8 + i * 0.17, v = y * 0.6;
        return new T.Vector3(x, v, Math.sqrt(Math.max(0.06, 1.025 - x*x - v*v)));
      });
      globe.add(new T.Line(new T.BufferGeometry().setFromPoints(chart), new T.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.4 })));
      const names = ["US", "EUROPE", "AFRICA", "MIDDLE EAST"];
      const orbits = names.map((name, i) => {
        const group = new T.Group();
        group.rotation.set(0.85 + i * 0.27, i * 0.5, -0.3 + i * 0.38);
        const radius = 1.28 + i * 0.2;
        const points = Array.from({ length: 129 }, (_, j) => new T.Vector3(Math.cos(j / 128 * Math.PI * 2) * radius, Math.sin(j / 128 * Math.PI * 2) * radius, 0));
        const material = new T.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.23, depthWrite: false });
        group.add(new T.Line(new T.BufferGeometry().setFromPoints(points), material));
        const orb = new T.Mesh(new T.SphereGeometry(0.023, 8, 6), new T.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 }));
        group.add(orb); planet.add(group);
        return { name, material, orb, radius };
      });
      let width = 1, height = 1, radius = 100, baseY = 0, targetX = 0, targetY = 0, hover = "";
      // Deterministic distribution; decorative stars never represent market values.
      const stars = [0,1,2].map(layer => {
        const coords = new Float32Array((mobile.matches ? 55 : 120) * 3);
        const geometry = new T.BufferGeometry(); geometry.setAttribute("position", new T.BufferAttribute(coords, 3));
        const material = new T.PointsMaterial({ color: starColor, size: 0.9 + layer * 0.45, transparent: true, opacity: 0.22 + layer * 0.12, sizeAttenuation: false, depthWrite: false });
        const points = new T.Points(geometry, material); scene.add(points);
        return { coords, geometry, material, points, layer };
      });
      const comet = new T.Group(); scene.add(comet);
      const tail = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-90,-25,0),new T.Vector3(-66,-21,0),new T.Vector3(-52,-9,0),new T.Vector3(-39,-13,0),new T.Vector3(-21,-3,0),new T.Vector3(0,0,0)]),new T.LineBasicMaterial({color:gold,transparent:true,opacity:0.3}));
      comet.add(tail, new T.Mesh(new T.SphereGeometry(2,8,6),new T.MeshBasicMaterial({color:gold})));
      function resize() {
        width = window.innerWidth; height = window.innerHeight;
        renderer.setSize(width, height); camera.right = width; camera.top = height; camera.updateProjectionMatrix();
        const intro = document.querySelector(".reference-intro")?.getBoundingClientRect();
        radius = mobile.matches ? 77 : Math.min(130, width * 0.105);
        baseY = (intro?.top ?? 240) + (mobile.matches ? 190 : 180) - window.scrollY;
        planet.scale.setScalar(radius);
        for (const star of stars) {
          for (let j = 0; j < star.coords.length; j += 3) { star.coords[j] = ((j * 0.618033 + star.layer * 0.271) % 1) * width; star.coords[j+1] = ((j * 0.414214 + star.layer * 0.137) % 1) * height; star.coords[j+2] = -350; }
          star.geometry.attributes.position.needsUpdate = true;
        }
        draw(0);
      }
      function draw(time: number) {
        const t = motion.matches ? 0 : time / 1000;
        planet.position.set(width * (mobile.matches ? 0.83 : 0.805) + targetX * 5, height - baseY + window.scrollY + targetY * 4, 0);
        planet.rotation.set(targetY * 0.025, targetX * 0.04, 0);
        globe.rotation.y = -0.4 + t * 0.035;
        for (let i = 0; i < orbits.length; i++) {
          const orbit = orbits[i], angle = t * (0.14 + i * 0.025) + i * 1.7;
          orbit.orb.position.set(Math.cos(angle) * orbit.radius, Math.sin(angle) * orbit.radius, 0);
          orbit.material.opacity = hover ? (hover === orbit.name ? 0.75 : 0.06) : 0.23;
        }
        for (const star of stars) { star.material.opacity = 0.22 + star.layer * 0.12 + Math.sin(t * 0.55 + star.layer * 2) * 0.08; star.points.position.y = Math.sin(t * 0.06 + star.layer) * 5; }
        const phase = (t % 28) / 4;
        comet.visible = !motion.matches && !mobile.matches && t > 0 && phase < 1;
        comet.position.set(width * (0.2 + phase * 0.7), height * (0.35 + phase * 0.25), -100);
        renderer.render(scene, camera);
      }
      let frame = 0, last = 0;
      function loop(time: number) {
        frame = requestAnimationFrame(loop);
        if (document.hidden || motion.matches || time - last < (mobile.matches ? 66 : 33)) return;
        last = time; draw(time);
      }
      function pointer(event: PointerEvent) {
        if (!mobile.matches && !motion.matches) { targetX = event.clientX / width * 2 - 1; targetY = event.clientY / height * 2 - 1; }
        const tab = event.target instanceof Element ? event.target.closest(".region-tabs a") : null;
        hover = tab?.textContent?.trim() ?? "";
        if (motion.matches) draw(0);
      }
      const redraw = () => draw(0);
      resize(); frame = requestAnimationFrame(loop);
      window.addEventListener("resize", resize); window.addEventListener("pointermove", pointer, { passive: true });
      window.addEventListener("scroll", redraw, { passive: true }); motion.addEventListener("change", redraw);
      cleanup = () => {
        cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", pointer); window.removeEventListener("scroll", redraw); motion.removeEventListener("change", redraw);
        scene.traverse(object => { if (object instanceof T.Mesh || object instanceof T.Line || object instanceof T.Points) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    });
    return () => { disposed = true; cleanup?.(); };
  }, []);
  return <div ref={host} className="homepage-space-background" aria-hidden="true" />;
}