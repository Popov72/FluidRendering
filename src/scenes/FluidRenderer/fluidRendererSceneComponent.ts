import * as BABYLON from "@babylonjs/core";

import { FluidRenderer } from "./fluidRenderer";

const NAME_FLUIDRENDERER = "FluidRenderer";
const STEP_GATHERACTIVECAMERARENDERTARGET_FLUIDRENDERER = 1;
const STEP_AFTERCAMERADRAW_FLUIDRENDERER = 5;

declare module "@babylonjs/core/abstractScene" {
    export interface AbstractScene {
        /** @hidden (Backing field) */
        _fluidRenderer: BABYLON.Nullable<FluidRenderer>;

        /**
         * Gets or Sets the fluid renderer associated to the scene.
         */
        fluidRenderer: BABYLON.Nullable<FluidRenderer>;

        /**
         * Enables the fluid renderer and associates it with the scene
         * @returns the FluidRenderer
         */
        enableFluidRenderer(): BABYLON.Nullable<FluidRenderer>;

        /**
         * Disables the fluid renderer associated with the scene
         */
        disableFluidRenderer(): void;
    }
}

Object.defineProperty(BABYLON.Scene.prototype, "fluidRenderer", {
    get: function (this: BABYLON.Scene) {
        return this._fluidRenderer;
    },
    set: function (this: BABYLON.Scene, value: BABYLON.Nullable<FluidRenderer>) {
        this._fluidRenderer = value;
    },
    enumerable: true,
    configurable: true
});

BABYLON.Scene.prototype.enableFluidRenderer = function (): BABYLON.Nullable<FluidRenderer> {
    if (this._fluidRenderer) {
        return this._fluidRenderer;
    }

    this._fluidRenderer = new FluidRenderer(this);

    return this._fluidRenderer;
};

BABYLON.Scene.prototype.disableFluidRenderer = function (): void {
    this._fluidRenderer?.dispose();
    this._fluidRenderer = null;
};

/**
 * Defines the Geometry Buffer scene component responsible to manage a G-Buffer useful
 * in several rendering techniques.
 */
export class FluidRendererSceneComponent implements BABYLON.ISceneComponent {
    /**
     * The component name helpful to identify the component in the list of scene components.
     */
    public readonly name = NAME_FLUIDRENDERER;

    /**
     * The scene the component belongs to.
     */
    public scene: BABYLON.Scene;

    /**
     * Creates a new instance of the component for the given scene
     * @param scene Defines the scene to register the component in
     */
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }

    /**
     * Registers the component in a given scene
     */
    public register(): void {
        this.scene._gatherActiveCameraRenderTargetsStage.registerStep(STEP_GATHERACTIVECAMERARENDERTARGET_FLUIDRENDERER, this, this._gatherActiveCameraRenderTargets);
        this.scene._afterCameraDrawStage.registerStep(STEP_AFTERCAMERADRAW_FLUIDRENDERER, this, this._afterCameraDraw);
    }

    private _gatherActiveCameraRenderTargets(/*renderTargets: BABYLON.SmartArrayNoDuplicate<BABYLON.RenderTargetTexture>*/): void {
        this.scene.fluidRenderer?._prepareRendering();
    }

    private _afterCameraDraw(/*camera: BABYLON.Camera*/) {
        this.scene.fluidRenderer?._render();
    }

    /**
     * Rebuilds the elements related to this component in case of
     * context lost for instance.
     */
    public rebuild(): void {
        if (this.scene._fluidRenderer) {
            // Release resources first
            this.scene.disableFluidRenderer();

            // Re-enable
            this.scene.enableFluidRenderer();
        }
    }

    /**
     * Disposes the component and the associated resources
     */
    public dispose(): void {
        this.scene.disableFluidRenderer();
    }

}

FluidRenderer._SceneComponentInitialization = (scene: BABYLON.Scene) => {
    let component = scene._getComponent(NAME_FLUIDRENDERER) as FluidRendererSceneComponent;
    if (!component) {
        component = new FluidRendererSceneComponent(scene);
        scene._addComponent(component);
    }
};
