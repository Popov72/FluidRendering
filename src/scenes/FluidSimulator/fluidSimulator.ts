import * as BABYLON from "@babylonjs/core";

interface Particle {
    mass: number;
    density: number;
    pressure: number;
    accelX: number;
    accelY: number;
    accelZ: number;
    velocityX: number;
    velocityY: number;
    velocityZ: number;
}

export class FluidSimulator {

    protected _particles: Particle[];
    protected _numParticles: number;
    protected _positions: Float32Array;
    protected _vbPositions: BABYLON.VertexBuffer;

    private _smoothingRadius2: number;
    private _poly6Constant: number;
    private _spikyConstant: number;
    private _viscConstant: number;
    
    protected _smoothingRadius = 0.2;

    public get smoothingRadius() {
        return this._smoothingRadius;
    }

    public set smoothingRadius(radius: number) {
        this._smoothingRadius = radius;
        this._computeConstants();
    }

    public densityReference = 2000;

    public pressureConstant = 20;

    public viscosity = 0.02;

    public gravity = new BABYLON.Vector3(0, -9.8, 0);

    private _computeConstants(): void {
        this._smoothingRadius2 = this._smoothingRadius * this._smoothingRadius;
        this._poly6Constant = 315 / (64 * Math.PI * Math.pow(this._smoothingRadius, 9));
        this._spikyConstant = -45 / (Math.PI * Math.pow(this._smoothingRadius, 6));
        this._viscConstant = 45 / (Math.PI * Math.pow(this._smoothingRadius, 6));
    }

    public get positionVertexBuffer() {
        return this._vbPositions;
    }

    public get numParticles() {
        return this._numParticles;
    }

    constructor(numParticles: number, engine: BABYLON.Engine, positions?: Float32Array) {
        this._particles = [];
        this._numParticles = numParticles;
        this._positions = positions ?? new Float32Array(numParticles * 3);
        this._vbPositions = new BABYLON.VertexBuffer(engine, this._positions, BABYLON.VertexBuffer.PositionKind, true, false, 3, true);

        this._smoothingRadius2 = 0;
        this._poly6Constant = 0;
        this._spikyConstant = 0;
        this._viscConstant = 0;

        for (let i = 0; i < numParticles; ++i) {
            this._particles.push({
                density: 0,
                pressure: 0,
                accelX: 0,
                accelY: 0,
                accelZ: 0,
                velocityX: (Math.random() - 0.5) * 0.03,
                velocityY: (Math.random() - 0.5) * 0.03,
                velocityZ: (Math.random() - 1) * 3,
                mass: 1,
            });
        }

        this._computeConstants();
    }

    public update(deltaTime: number): void {
        this._computeDensity();
        this._computeForces();
        this._updatePositions(deltaTime);
        this._vbPositions.updateDirectly(this._positions, 0);
    }

    public dispose(): void {
        this._vbPositions.dispose();
    }

    protected _computeDensity(): void {
        for (let a = 0; a < this._particles.length; ++a) {
            const pA = this._particles[a];
            const paX = this._positions[a * 3 + 0];
            const paY = this._positions[a * 3 + 1];
            const paZ = this._positions[a * 3 + 2];

            pA.density = 0;

            for (let b = 0; b < this._particles.length; ++b) {
                const diffX = paX - this._positions[b * 3 + 0];
                const diffY = paY - this._positions[b * 3 + 1];
                const diffZ = paZ - this._positions[b * 3 + 2];
                const r2 = diffX * diffX + diffY * diffY + diffZ * diffZ;

                if (r2 < this._smoothingRadius2) {
                    const w = this._poly6Constant * Math.pow(this._smoothingRadius2 - r2, 3);
                    pA.density += w;
                }
            }

            pA.density = Math.max(this.densityReference, pA.density);
            pA.pressure = this.pressureConstant * (pA.density - this.densityReference);
        }
    }

    protected _computeForces(): void {
        // Pressurce-based force + viscosity-based force computation
        for (let a = 0; a < this._particles.length; ++a) {
            const pA = this._particles[a];
            const paX = this._positions[a * 3 + 0];
            const paY = this._positions[a * 3 + 1];
            const paZ = this._positions[a * 3 + 2];

            let pressureAccelX = 0;
            let pressureAccelY = 0;
            let pressureAccelZ = 0;

            let viscosityAccelX = 0;
            let viscosityAccelY = 0;
            let viscosityAccelZ = 0;

            for (let b = 0; b < this._particles.length; ++b) {

                let diffX = paX - this._positions[b * 3 + 0];
                let diffY = paY - this._positions[b * 3 + 1];
                let diffZ = paZ - this._positions[b * 3 + 2];
                const r2 = diffX * diffX + diffY * diffY + diffZ * diffZ;
                const r = Math.sqrt(r2);

                if (r > 0 && r2 < this._smoothingRadius2) {
                    const pB = this._particles[b];

                    diffX /= r;
                    diffY /= r;
                    diffZ /= r;

                    const w = this._spikyConstant * (this._smoothingRadius - r) * (this._smoothingRadius - r);
                    const massRatio = pB.mass / pA.mass;
                    const fp = w * ((pA.pressure + pB.pressure) / (2 * pA.density * pB.density)) * massRatio;

                    pressureAccelX -= fp * diffX;
                    pressureAccelY -= fp * diffY;
                    pressureAccelZ -= fp * diffZ;

                    const w2 = this._viscConstant * (this._smoothingRadius - r);
                    const fv = w2 * (1 / pB.density) * massRatio * this.viscosity;

                    viscosityAccelX += fv * (pB.velocityX - pA.velocityX);
                    viscosityAccelY += fv * (pB.velocityY - pA.velocityY);
                    viscosityAccelZ += fv * (pB.velocityZ - pA.velocityZ);
                }
            }

            pA.accelX = pressureAccelX + viscosityAccelX;
            pA.accelY = pressureAccelY + viscosityAccelY;
            pA.accelZ = pressureAccelZ + viscosityAccelZ;

            pA.accelX += this.gravity.x;
            pA.accelY += this.gravity.y;
            pA.accelZ += this.gravity.z;
        }
    }

    protected _updatePositions(deltaTime: number): void {
        const elastic = 0.4;
        const fx = 0.25;
        const fz = 0.5;
        for (let a = 0; a < this._particles.length; ++a) {
            const pA = this._particles[a];

            pA.velocityX += pA.accelX * deltaTime;
            pA.velocityY += pA.accelY * deltaTime;
            pA.velocityZ += pA.accelZ * deltaTime;
            
            this._positions[a * 3 + 0] += deltaTime * pA.velocityX;
            this._positions[a * 3 + 1] += deltaTime * pA.velocityY;
            this._positions[a * 3 + 2] += deltaTime * pA.velocityZ;

            if (this._positions[a * 3 + 1] < -0.3) {
                this._positions[a * 3 + 1] += (-0.3 - this._positions[a * 3 + 1]) * (1 + elastic);
                pA.velocityY *= -elastic;
            }

            if (this._positions[a * 3 + 0] < -fx) {
                this._positions[a * 3 + 0] += (-fx - this._positions[a * 3 + 0]) * (1 + elastic);
                pA.velocityX *= -elastic;
            }
            if (this._positions[a * 3 + 0] > fx) {
                this._positions[a * 3 + 0] -= (this._positions[a * 3 + 0] - fx) * (1 + elastic);
                pA.velocityX *= -elastic;
            }

            if (this._positions[a * 3 + 2] < -fz) {
                this._positions[a * 3 + 2] += (-fz - this._positions[a * 3 + 2]) * (1 + elastic);
                pA.velocityZ *= -elastic;
            }
            if (this._positions[a * 3 + 2] > fz) {
                this._positions[a * 3 + 2] -= (this._positions[a * 3 + 2] - fz) * (1 + elastic);
                pA.velocityZ *= -elastic;
            }
        }
    }
}
