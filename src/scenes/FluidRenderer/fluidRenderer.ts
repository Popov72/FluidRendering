import * as BABYLON from "@babylonjs/core";

import { Scene } from "@babylonjs/core/scene";
import { FluidRenderingObject } from "./fluidRenderingObject";

import particleDepthVertex from "../../assets/particleDepth.vertex.glsl";
import particleDepthFragment from "../../assets/particleDepth.fragment.glsl";

import particleThicknessVertex from "../../assets/particleThickness.vertex.glsl";
import particleThicknessFragment from "../../assets/particleThickness.fragment.glsl";

import bilateralBlurFragment from "../../assets/bilateralBlur.fragment.glsl";
import standardBlurFragment from "../../assets/standardBlur.fragment.glsl";

import renderFluidFragment from "../../assets/renderFluid.fragment.glsl";
import { FluidRenderingObjectParticleSystem } from "./fluidRenderingObjectParticleSystem";

export class FluidRenderer {
    /** @hidden */
    public static _SceneComponentInitialization: (scene: Scene) => void = (_) => {
        throw `FluidRendererSceneComponent needs to be imported before as it contains a side-effect required by your code.`;        
    };

    private _scene: BABYLON.Scene;
    private _engine: BABYLON.Engine;
    private _onEngineResizeObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Engine>>;
    private _renderingObjects: Array<FluidRenderingObject>;

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._onEngineResizeObserver = null as any;
        this._renderingObjects = [];

        FluidRenderer._SceneComponentInitialization(this._scene);

        this.collectParticleSystems();
    }

    public addParticleSystem(ps: BABYLON.IParticleSystem): void {
        const renderingObject = new FluidRenderingObjectParticleSystem(this._scene, ps);

        this._renderingObjects.push(renderingObject);

        const loadModel = async () => {
            await BABYLON.SceneLoader.AppendAsync("https://assets.babylonjs.com/meshes/Dude/", "dude.babylon", this._scene);
        };

        //loadModel();

        //this._vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, pos, "position", true, false, undefined, true);

        renderingObject.initialize();

        //console.log(this._vertexBuffers["position"].getData(), this._vertexBuffers);

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(() => {
            this._initialize();
        });

        this._sortRenderingObjects();
    }

    private _sortRenderingObjects(): void {
        this._renderingObjects.sort((a: FluidRenderingObject, b: FluidRenderingObject) => {
            return a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0;
        });
    }

    public collectParticleSystems(): void {
        for (let i = 0; i < this._scene.particleSystems.length; ++i) {
            const ps = this._scene.particleSystems[i];
            const index = this._getParticleSystemIndex(ps);
            if (index === -1) {
                if (ps.renderAsFluid) {
                    this.addParticleSystem(ps);
                }
            } else if (!ps.renderAsFluid) {
                this._renderingObjects[index].dispose(true);
                this._renderingObjects.splice(index, 1);
            }
        }
    }

    private static _IsParticleSystemObject(obj: FluidRenderingObject): obj is FluidRenderingObjectParticleSystem {
        return !!(obj as FluidRenderingObjectParticleSystem).particleSystem;
    }
    
    private _getParticleSystemIndex(ps: BABYLON.IParticleSystem): number {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const obj = this._renderingObjects[i];
            if (FluidRenderer._IsParticleSystemObject(obj) && obj.particleSystem === ps) {
                return i;
            }
        }

        return -1;
    }

    private _initialize(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            this._renderingObjects[i].initialize();
        }
    }

    /** @hidden */
    public _render(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            this._renderingObjects[i].render();
        }
    }

    public dispose(): void {
        this._engine.onResizeObservable.remove(this._onEngineResizeObserver);
        this._onEngineResizeObserver = null;

        for (let i = 0; i < this._renderingObjects.length; ++i) {
            this._renderingObjects[i].dispose();
        }
    }
}

BABYLON.Effect.ShadersStore["fluidParticleDepthVertexShader"] = particleDepthVertex;
BABYLON.Effect.ShadersStore["fluidParticleDepthFragmentShader"] = particleDepthFragment;

BABYLON.Effect.ShadersStore["fluidParticleThicknessVertexShader"] = particleThicknessVertex;
BABYLON.Effect.ShadersStore["fluidParticleThicknessFragmentShader"] = particleThicknessFragment;

BABYLON.Effect.ShadersStore["bilateralBlurFragmentShader"] = bilateralBlurFragment;

BABYLON.Effect.ShadersStore["standardBlurFragmentShader"] = standardBlurFragment;

BABYLON.Effect.ShadersStore["renderFluidFragmentShader"] = renderFluidFragment;
