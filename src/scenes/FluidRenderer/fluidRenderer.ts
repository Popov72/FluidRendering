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
import { FluidRenderingOutput } from "./fluidRenderingOutput";

export class FluidRenderer {
    /** @hidden */
    public static _SceneComponentInitialization: (scene: Scene) => void = (_) => {
        throw `FluidRendererSceneComponent needs to be imported before as it contains a side-effect required by your code.`;        
    };

    private _scene: BABYLON.Scene;
    private _engine: BABYLON.Engine;
    private _onEngineResizeObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Engine>>;
    private _renderingObjects: Array<{ object: FluidRenderingObject, output: FluidRenderingOutput }>;

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._onEngineResizeObserver = null as any;
        this._renderingObjects = [];

        FluidRenderer._SceneComponentInitialization(this._scene);

        this.collectParticleSystems();
    }

    public getRenderingObjectParticleSystem(ps: BABYLON.IParticleSystem): BABYLON.Nullable<FluidRenderingObjectParticleSystem> {
        const index = this._getParticleSystemIndex(ps);
        return index !== -1 ? this._renderingObjects[index].object as FluidRenderingObjectParticleSystem : null;
    }

    public addParticleSystem(ps: BABYLON.IParticleSystem): void {
        const renderingObject = new FluidRenderingObjectParticleSystem(this._scene, ps);
        const output = new FluidRenderingOutput(this._scene);

        renderingObject.generateDiffuseTexture = true;
        renderingObject._output = output;
        output.generateDiffuseTexture = true;

        this._renderingObjects.push({ object: renderingObject, output });

        /*const loadModel = async () => {
            await BABYLON.SceneLoader.AppendAsync("https://assets.babylonjs.com/meshes/Dude/", "dude.babylon", this._scene);
        };*/

        //loadModel();

        //this._vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, pos, "position", true, false, undefined, true);

        output.initialize();

        //console.log(this._vertexBuffers["position"].getData(), this._vertexBuffers);

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(() => {
            this._initialize();
        });

        this._sortRenderingObjects();
    }

    private _sortRenderingObjects(): void {
        this._renderingObjects.sort((a, b) => {
            return a.object.priority < b.object.priority ? -1 : a.object.priority > b.object.priority ? 1 : 0;
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
                const renderingObject = this._renderingObjects[index];
                renderingObject.object.dispose();
                renderingObject.output.dispose();
                this._renderingObjects.splice(index, 1);
            }
        }
    }

    private static _IsParticleSystemObject(obj: FluidRenderingObject): obj is FluidRenderingObjectParticleSystem {
        return !!(obj as FluidRenderingObjectParticleSystem).particleSystem;
    }
    
    private _getParticleSystemIndex(ps: BABYLON.IParticleSystem): number {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const obj = this._renderingObjects[i].object;
            if (FluidRenderer._IsParticleSystemObject(obj) && obj.particleSystem === ps) {
                return i;
            }
        }

        return -1;
    }

    private _initialize(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            this._renderingObjects[i].output.initialize();
        }
    }

    /** @hidden */
    public _render(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const renderingObject = this._renderingObjects[i];
            renderingObject.output.render(renderingObject.object);
        }
    }

    public dispose(): void {
        this._engine.onResizeObservable.remove(this._onEngineResizeObserver);
        this._onEngineResizeObserver = null;

        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const renderingObject = this._renderingObjects[i];
            renderingObject.object.dispose();
            renderingObject.output.dispose();
        }

        this._renderingObjects = [];
    }
}

BABYLON.Effect.ShadersStore["fluidParticleDepthVertexShader"] = particleDepthVertex;
BABYLON.Effect.ShadersStore["fluidParticleDepthFragmentShader"] = particleDepthFragment;

BABYLON.Effect.ShadersStore["fluidParticleThicknessVertexShader"] = particleThicknessVertex;
BABYLON.Effect.ShadersStore["fluidParticleThicknessFragmentShader"] = particleThicknessFragment;

BABYLON.Effect.ShadersStore["bilateralBlurFragmentShader"] = bilateralBlurFragment;

BABYLON.Effect.ShadersStore["standardBlurFragmentShader"] = standardBlurFragment;

BABYLON.Effect.ShadersStore["renderFluidFragmentShader"] = renderFluidFragment;
