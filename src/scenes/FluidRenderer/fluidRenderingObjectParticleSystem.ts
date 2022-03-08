import * as BABYLON from "@babylonjs/core";

import { FluidRenderingObject } from "./fluidRenderingObject";

export class FluidRenderingObjectParticleSystem extends FluidRenderingObject {

    private _particleSystem: BABYLON.ParticleSystem;
    private _renderCallback: () => number;
    private _blendMode: number;
    private _onBeforeDrawParticleObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Nullable<BABYLON.Effect>>>;

    public get particleSystem() {
        return this._particleSystem;
    }

    public getClassName(): string {
        return "FluidRenderingObjectParticleSystem";
    }

    constructor(scene: BABYLON.Scene, ps: BABYLON.ParticleSystem) {
        super(scene, (ps as any)._vertexBuffers, (ps as any)._indexBuffer);

        this._particleSystem = ps;

        this._renderCallback = ps.render.bind(ps);
        this._blendMode = ps.blendMode;

        ps.render = () => 0;
        ps.blendMode = -1;

        this._onBeforeDrawParticleObserver = ps.onBeforeDrawParticlesObservable.add(() => {
            this._engine.setAlphaMode(BABYLON.Constants.ALPHA_COMBINE);
        });
    }

    public isReady(): boolean {
        return super.isReady() && this._particleSystem.isReady();
    }

    public numParticles(): number {
        return this._particleSystem.getActiveCount();
    }

    public renderDiffuseTexture(): void {
        this._renderCallback();
    }

    public dispose() {
        super.dispose();

        this._particleSystem.onBeforeDrawParticlesObservable.remove(this._onBeforeDrawParticleObserver);
        this._onBeforeDrawParticleObserver = null;
        this._particleSystem.render = this._renderCallback;
        this._particleSystem.blendMode = this._blendMode;
    }
}
