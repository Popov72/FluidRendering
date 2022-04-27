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

    private _useTrueRenderingForDiffuseTexture = true;

    public get useTrueRenderingForDiffuseTexture() {
        return this._useTrueRenderingForDiffuseTexture;
    }

    public set useTrueRenderingForDiffuseTexture(use: boolean) {
        if (this._useTrueRenderingForDiffuseTexture === use) {
            return;
        }

        this._useTrueRenderingForDiffuseTexture = use;

        if (use) {
            this._particleSystem.blendMode = this._blendMode;
            this._particleSystem.onBeforeDrawParticlesObservable.remove(this._onBeforeDrawParticleObserver);
            this._onBeforeDrawParticleObserver = null;
        } else {
            this._particleSystem.blendMode = -1;
            this._onBeforeDrawParticleObserver = this._particleSystem.onBeforeDrawParticlesObservable.add(() => {
                this._engine.setAlphaMode(BABYLON.Constants.ALPHA_COMBINE);
            });
        }
    }

    constructor(scene: BABYLON.Scene, ps: BABYLON.ParticleSystem) {
        super(scene, ps.vertexBuffers as { [key: string]: BABYLON.VertexBuffer }, ps.indexBuffer);

        this._particleSystem = ps;

        this._renderCallback = ps.render.bind(ps);
        this._blendMode = ps.blendMode;
        this._onBeforeDrawParticleObserver = null;

        ps.render = () => 0;

        this.particleSize = (ps.minSize + ps.maxSize) / 2;

        this.useTrueRenderingForDiffuseTexture = false;
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
