import * as BABYLON from "@babylonjs/core";
import { Hash } from "./hash";

export interface IFluidParticle {
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

    protected _particles: IFluidParticle[];
    protected _numMaxParticles: number;
    protected _positions: Float32Array;
    protected _velocities: Float32Array;
    protected _hash: Hash;

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

    public viscosity = 0.007;

    public gravity = new BABYLON.Vector3(0, -9.8, 0);

    public checkXZBounds = true;

    public currentNumParticles: number;

    private _computeConstants(): void {
        this._smoothingRadius2 = this._smoothingRadius * this._smoothingRadius;
        this._poly6Constant = 315 / (64 * Math.PI * Math.pow(this._smoothingRadius, 9));
        this._spikyConstant = -45 / (Math.PI * Math.pow(this._smoothingRadius, 6));
        this._viscConstant = 45 / (Math.PI * Math.pow(this._smoothingRadius, 6));
        this._hash = new Hash(this._smoothingRadius, this._numMaxParticles);
    }

    public get positions() {
        return this._positions;
    }

    public get velocities() {
        return this._velocities;
    }

    public get numParticles() {
        return this._numMaxParticles;
    }

    constructor(particles: IFluidParticle[], engine: BABYLON.Engine, positions?: Float32Array) {
        this._particles = particles;
        this._numMaxParticles = particles.length;
        this._positions = positions ?? new Float32Array(this._numMaxParticles * 3);
        this._velocities = new Float32Array(this._numMaxParticles * 3);
        this._hash = new Hash(this._smoothingRadius, this._numMaxParticles);

        this.currentNumParticles = this._numMaxParticles;
        this._smoothingRadius2 = 0;
        this._poly6Constant = 0;
        this._spikyConstant = 0;
        this._viscConstant = 0;

        for (let i = 0; i < this._numMaxParticles; ++i) {
            this._velocities[i * 3 + 0] = particles[i].velocityX;
            this._velocities[i * 3 + 1] = particles[i].velocityY;
            this._velocities[i * 3 + 2] = particles[i].velocityZ;
        }

        this._computeConstants();
    }

    public update(deltaTime: number): void {
        this._hash.create(this._positions, this.currentNumParticles);
        this._computeDensity();
        this._computeForces();
        this._updatePositions(deltaTime);
    }

    public dispose(): void {
        // nothing to do
    }

    protected _computeDensity(): void {
        for (let a = 0; a < this.currentNumParticles; ++a) {
            const pA = this._particles[a];
            const paX = this._positions[a * 3 + 0];
            const paY = this._positions[a * 3 + 1];
            const paZ = this._positions[a * 3 + 2];

            pA.density = 0;

            this._hash.query(this._positions, a, this._smoothingRadius);

            for (let ib = 0; ib < this._hash.querySize; ++ib) {
                const b = this._hash.queryIds[ib];
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
        for (let a = 0; a < this.currentNumParticles; ++a) {
            const pA = this._particles[a];
            const paX = this._positions[a * 3 + 0];
            const paY = this._positions[a * 3 + 1];
            const paZ = this._positions[a * 3 + 2];

            const vaX = this._velocities[a * 3 + 0];
            const vaY = this._velocities[a * 3 + 1];
            const vaZ = this._velocities[a * 3 + 2];

            let pressureAccelX = 0;
            let pressureAccelY = 0;
            let pressureAccelZ = 0;

            let viscosityAccelX = 0;
            let viscosityAccelY = 0;
            let viscosityAccelZ = 0;

            this._hash.query(this._positions, a, this._smoothingRadius);

            for (let ib = 0; ib < this._hash.querySize; ++ib) {
                const b = this._hash.queryIds[ib];
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

                    viscosityAccelX += fv * (this._velocities[b * 3 + 0] - vaX);
                    viscosityAccelY += fv * (this._velocities[b * 3 + 1] - vaY);
                    viscosityAccelZ += fv * (this._velocities[b * 3 + 2] - vaZ);
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
        const fz = 0.65;
        for (let a = 0; a < this.currentNumParticles; ++a) {
            const pA = this._particles[a];

            this._velocities[a * 3 + 0] += pA.accelX * deltaTime;
            this._velocities[a * 3 + 1] += pA.accelY * deltaTime;
            this._velocities[a * 3 + 2] += pA.accelZ * deltaTime;
            
            this._positions[a * 3 + 0] += deltaTime * this._velocities[a * 3 + 0];
            this._positions[a * 3 + 1] += deltaTime * this._velocities[a * 3 + 1];
            this._positions[a * 3 + 2] += deltaTime * this._velocities[a * 3 + 2];

            if (this._positions[a * 3 + 1] < -0.3) {
                this._positions[a * 3 + 1] += (-0.3 - this._positions[a * 3 + 1]) * (1 + elastic);
                this._velocities[a * 3 + 1] *= -elastic;
            }

            if (this.checkXZBounds && this._positions[a * 3 + 0] < -fx) {
                this._positions[a * 3 + 0] += (-fx - this._positions[a * 3 + 0]) * (1 + elastic);
                this._velocities[a * 3 + 0] *= -elastic;
            }
            if (this.checkXZBounds && this._positions[a * 3 + 0] > fx) {
                this._positions[a * 3 + 0] -= (this._positions[a * 3 + 0] - fx) * (1 + elastic);
                this._velocities[a * 3 + 0] *= -elastic;
            }

            if (this.checkXZBounds && this._positions[a * 3 + 2] < -fz) {
                this._positions[a * 3 + 2] += (-fz - this._positions[a * 3 + 2]) * (1 + elastic);
                this._velocities[a * 3 + 2] *= -elastic;
            }
            if (this.checkXZBounds && this._positions[a * 3 + 2] > fz) {
                this._positions[a * 3 + 2] -= (this._positions[a * 3 + 2] - fz) * (1 + elastic);
                this._velocities[a * 3 + 2] *= -elastic;
            }
        }
    }
}
