import * as BABYLON from "@babylonjs/core";

export class ParticleGenerator {

    private _scene: BABYLON.Scene;
    private _observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    private _currNumParticles: number;
    private _numCrossSection: number;
    private _numParticles = 0;
    private _positions: Float32Array;
    private _velocities: Float32Array;
    private _loadFromFile: string | undefined;

    public particleRadius: number;

    public position: BABYLON.Vector3;

    public get currNumParticles() {
        return this._currNumParticles;
    }

    public get positions() {
        return this._positions;
    }

    public get velocities() {
        return this._velocities;
    }

    constructor(scene: BABYLON.Scene, loadFromFile?: string) {
        this._scene = scene;
        this._currNumParticles = 0;
        this._numCrossSection = 0;
        this._positions = new Float32Array();
        this._velocities = new Float32Array();
        this.particleRadius = 0;
        this._loadFromFile = loadFromFile;
        this.position = new BABYLON.Vector3(0, 0, 0);

        if (!this._loadFromFile) {
            this._observer = scene.onBeforeRenderObservable.add(() => {
                if (this._currNumParticles === 0) {
                    if (this._positions.length / 3 >= this._numCrossSection) {
                        this._currNumParticles = this._numCrossSection;
                    }
                } else if (this._currNumParticles < this._numParticles) {
                    const px1 = this._positions[this._currNumParticles * 3 + 0];
                    const py1 = this._positions[this._currNumParticles * 3 + 1];
                    const pz1 = this._positions[this._currNumParticles * 3 + 2];

                    const px2 = this._positions[(this._currNumParticles - this._numCrossSection) * 3 + 0];
                    const py2 = this._positions[(this._currNumParticles - this._numCrossSection) * 3 + 1];
                    const pz2 = this._positions[(this._currNumParticles - this._numCrossSection) * 3 + 2];

                    const dist = Math.sqrt((px1 - px2) * (px1 - px2) + (py1 - py2) * (py1 - py2) + (pz1 - pz2) * (pz1 - pz2));

                    if (dist > this.particleRadius * 2) {
                        this._currNumParticles += this._numCrossSection;
                    }
                }
            });
        } else {
            this._observer = null;
        }
    }

    public async generateParticles(numTotParticles: number, regenerateAll = true) {
        if (this._loadFromFile) {
            await this._generateParticlesFromFile(this._loadFromFile);
        } else {
            this._generateParticles(numTotParticles, regenerateAll);
        }
    }

    private async _generateParticlesFromFile(fileName: string) {
        const data = await (await fetch(`assets/particles/${fileName}.txt`)).text();

        const lines = data.replace("\r", "").split("\n");

        const particlePos = [];
        const particleVel = [];

        let numParticles = 0;

        for (let i = 1; i < lines.length; ++i) {
            const line = lines[i];
            const vals = line.split(",");
            if (line.charAt(0) === '"' || vals.length < 4) {
                continue;
            }
            particlePos.push(parseFloat(vals[1]) + this.position.x, parseFloat(vals[2]) +  + this.position.y, parseFloat(vals[3]) + this.position.z);
            particleVel.push(0, 0, 0);
            numParticles++;
        }

        const particleStartIndex = 0;

        this._numParticles = this._numCrossSection = numParticles;

        if (this._numParticles > this._positions.length / 3) {
            const newPositions = new Float32Array(this._numParticles * 3);
            const newVelocities = new Float32Array(this._numParticles * 3);

            newPositions.set(this._positions, 0);
            newVelocities.set(this._velocities, 0);

            this._positions = newPositions;
            this._velocities = newVelocities;
        }

        this._positions.set(particlePos, particleStartIndex * 3);
        this._velocities.set(particleVel, particleStartIndex * 3);

        this._currNumParticles = this._numParticles;
    }

    private _generateParticles(numTotParticles: number, regenerateAll = true): void {
        if (this._numParticles >= numTotParticles && !regenerateAll) {
            this._numParticles = numTotParticles;
            this._currNumParticles = Math.min(this._currNumParticles, this._numParticles);
            return ;
        }

        const dimX = 12, dimY = 12;

        const particlePos = [];
        const particleVel = [];

        const distance = this.particleRadius * 2;
        const jitter = distance * 0.1;
        const getJitter = () => Math.random() * jitter - jitter / 2;

        const particleStartIndex = regenerateAll ? 0 : this._currNumParticles;

        this._numParticles = particleStartIndex;

        while (this._numParticles <= numTotParticles - this._numCrossSection) {
            let yCoord = (dimY / 2) * distance;

            this._numCrossSection = 0;
            for (let y = 1; y < dimY - 1; ++y) {
                const angle = y * Math.PI / (dimY - 1);

                let x2 = Math.sin(angle) * dimX / 2 * distance;
                if (x2 < 0) { x2 = 0; }

                let xCoord = -x2;
                while (xCoord <= x2) {
                    const xc = xCoord === -x2 || xCoord + distance > x2 ? xCoord : xCoord + getJitter();
                    const yc = xCoord === -x2 || xCoord + distance > x2 ? yCoord : yCoord + getJitter();
                    const zCoord = xCoord === -x2 || xCoord + distance > x2 ? 0.49 : 0.49 + getJitter();
                    particlePos.push(xc + this.position.x, yc + this.position.y, zCoord + this.position.z);
                    particleVel.push(
                        (Math.random() - 0.5) * 0.03,
                        (Math.random() - 0.5) * 0.03,
                        (Math.random() - 1.0) * 0.03 - 1.5,
                    );
                    xCoord += distance;
                    this._numParticles++;
                    this._numCrossSection++;
                }

                yCoord += distance;
            }
        }

        if (this._numParticles > this._positions.length / 3) {
            const newPositions = new Float32Array(this._numParticles * 3);
            const newVelocities = new Float32Array(this._numParticles * 3);

            newPositions.set(this._positions, 0);
            newVelocities.set(this._velocities, 0);

            this._positions = newPositions;
            this._velocities = newVelocities;
        }

        this._positions.set(particlePos, particleStartIndex * 3);
        this._velocities.set(particleVel, particleStartIndex * 3);

        this._currNumParticles = particleStartIndex;
    }

    public dispose(): void {
        this._scene.onBeforeRenderObservable.remove(this._observer);
        this._observer = null;
    }
}
