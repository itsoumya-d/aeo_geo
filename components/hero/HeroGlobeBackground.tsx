import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

type HeroGlobeBackgroundProps = {
    className?: string;
};

const PLATFORM_BADGES = [
    { name: 'ChatGPT', className: 'left-[8%] top-[18%] md:left-[12%] md:top-[22%]' },
    { name: 'Gemini', className: 'right-[12%] top-[14%] md:right-[20%] md:top-[18%]' },
    { name: 'Claude', className: 'left-[18%] bottom-[20%] md:left-[26%] md:bottom-[22%]' },
];

const createSpherePoint = (radius: number) => {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
};

export const HeroGlobeBackground: React.FC<HeroGlobeBackgroundProps> = ({ className = '' }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const reduceMotion = useReducedMotion();

    React.useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;

        if (!canvas || !wrapper) {
            return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
        camera.position.set(0, 0, 7.2);

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);

        const root = new THREE.Group();
        root.position.set(1.35, 0.1, 0);
        scene.add(root);

        const ambient = new THREE.AmbientLight(0xaec9ff, 1.15);
        scene.add(ambient);

        const rim = new THREE.PointLight(0x5eead4, 1.8, 18, 2);
        rim.position.set(4.5, 2.6, 5.8);
        scene.add(rim);

        const fill = new THREE.PointLight(0x8b5cf6, 1.25, 18, 2);
        fill.position.set(-3.5, -2.2, 4.8);
        scene.add(fill);

        const core = new THREE.Mesh(
            new THREE.SphereGeometry(1.72, 48, 48),
            new THREE.MeshPhongMaterial({
                color: 0x0b1220,
                emissive: 0x13213a,
                emissiveIntensity: 0.42,
                shininess: 70,
                transparent: true,
                opacity: 0.9,
            })
        );
        root.add(core);

        const shell = new THREE.Mesh(
            new THREE.SphereGeometry(1.86, 40, 40),
            new THREE.MeshBasicMaterial({
                color: 0x4f8cff,
                wireframe: true,
                transparent: true,
                opacity: 0.15,
            })
        );
        root.add(shell);

        const halo = new THREE.Mesh(
            new THREE.SphereGeometry(2.18, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0x1d4ed8,
                transparent: true,
                opacity: 0.045,
                side: THREE.BackSide,
            })
        );
        root.add(halo);

        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.15,
        });

        const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.018, 16, 160), ringMaterial.clone());
        ringA.rotation.set(Math.PI * 0.58, Math.PI / 7, 0.2);
        root.add(ringA);

        const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.72, 0.014, 16, 160), ringMaterial.clone());
        ringB.rotation.set(Math.PI / 2.2, -Math.PI / 5, Math.PI / 10);
        root.add(ringB);

        const nodesGroup = new THREE.Group();
        root.add(nodesGroup);

        const nodeGeometry = new THREE.SphereGeometry(0.042, 12, 12);
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xb7f3ff });
        const nodeGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.16,
        });

        const nodePositions = Array.from({ length: 18 }, () => createSpherePoint(1.92));
        const nodes = nodePositions.map((position) => {
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.copy(position);

            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), nodeGlowMaterial);
            node.add(glow);

            nodesGroup.add(node);
            return node;
        });

        const connectionMaterial = new THREE.LineBasicMaterial({
            color: 0x6ee7f9,
            transparent: true,
            opacity: 0.28,
        });

        const connectionGroup = new THREE.Group();
        root.add(connectionGroup);

        for (let index = 0; index < nodePositions.length; index += 2) {
            const start = nodePositions[index];
            const end = nodePositions[(index + 5) % nodePositions.length];
            const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(2.8);
            const curve = new THREE.CatmullRomCurve3([start, mid, end]);
            const points = curve.getPoints(44);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const connection = new THREE.Line(geometry, connectionMaterial);
            connectionGroup.add(connection);
        }

        const starsCount = 140;
        const starPositions = new Float32Array(starsCount * 3);
        for (let index = 0; index < starsCount; index += 1) {
            const radius = 3.4 + Math.random() * 3.2;
            const point = createSpherePoint(radius);
            starPositions[index * 3] = point.x;
            starPositions[index * 3 + 1] = point.y;
            starPositions[index * 3 + 2] = point.z;
        }

        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

        const stars = new THREE.Points(
            starGeometry,
            new THREE.PointsMaterial({
                color: 0xdbeafe,
                size: 0.03,
                transparent: true,
                opacity: 0.85,
                sizeAttenuation: true,
            })
        );
        scene.add(stars);

        const resize = () => {
            const { clientWidth, clientHeight } = wrapper;
            if (!clientWidth || !clientHeight) {
                return;
            }

            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.setSize(clientWidth, clientHeight, false);
            camera.aspect = clientWidth / clientHeight;
            camera.position.z = clientWidth < 768 ? 8.5 : 7.2;
            camera.updateProjectionMatrix();
            root.position.x = clientWidth < 1024 ? 0.45 : 1.35;
        };

        resize();

        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(wrapper);

        let animationFrame = 0;
        let lastFrame = 0;
        const frameStep = reduceMotion ? 1000 / 20 : 1000 / 30;

        const animate = (time: number) => {
            animationFrame = window.requestAnimationFrame(animate);

            if (time - lastFrame < frameStep) {
                return;
            }

            lastFrame = time;
            const tick = time * 0.001;

            root.rotation.y = tick * 0.18;
            root.rotation.x = Math.sin(tick * 0.35) * 0.08;
            shell.rotation.y = -tick * 0.12;
            ringA.rotation.z = tick * 0.22;
            ringB.rotation.x = Math.PI / 2.2 + Math.sin(tick * 0.5) * 0.1;
            stars.rotation.y = tick * 0.035;

            nodes.forEach((node, index) => {
                const scale = 1 + Math.sin(tick * 1.7 + index * 0.45) * 0.18;
                node.scale.setScalar(scale);
            });

            renderer.render(scene, camera);
        };

        animate(0);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();

            renderer.dispose();
            nodeGeometry.dispose();
            nodeMaterial.dispose();
            nodeGlowMaterial.dispose();
            connectionMaterial.dispose();
            starGeometry.dispose();
            (stars.material as THREE.Material).dispose();
            (core.material as THREE.Material).dispose();
            (shell.material as THREE.Material).dispose();
            (halo.material as THREE.Material).dispose();
            (ringA.material as THREE.Material).dispose();
            (ringB.material as THREE.Material).dispose();
            core.geometry.dispose();
            shell.geometry.dispose();
            halo.geometry.dispose();
            ringA.geometry.dispose();
            ringB.geometry.dispose();
            connectionGroup.children.forEach((child: THREE.Object3D) => {
                const line = child as THREE.Line;
                line.geometry.dispose();
            });
        };
    }, [reduceMotion]);

    return (
        <div ref={wrapperRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-95" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(14,165,233,0.18),transparent_22%),radial-gradient(circle_at_75%_55%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.65)_42%,rgba(2,6,23,0.16)_72%,rgba(2,6,23,0.55)_100%)]" />
            <div className="absolute inset-y-0 right-0 w-[55%] bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.08),transparent_62%)]" />

            {PLATFORM_BADGES.map((badge, index) => (
                <motion.div
                    key={badge.name}
                    className={`absolute hidden rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 backdrop-blur md:block ${badge.className}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: [0, -4, 0] }}
                    transition={{
                        opacity: { duration: 0.5, delay: 0.2 + index * 0.12 },
                        y: { duration: 4.2 + index * 0.8, repeat: Infinity, ease: 'easeInOut' },
                    }}
                >
                    {badge.name}
                </motion.div>
            ))}
        </div>
    );
};
