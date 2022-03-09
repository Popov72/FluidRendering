import * as BABYLON from "@babylonjs/core";

import * as LiLGUI from 'lil-gui'; 
import { FluidRenderingDebug } from "./fluidRenderingTargetRenderer";

async function LoadDAT(): Promise<void> {
    var _ = await import("@babylonjs/core/Misc/tools")
    return _.Tools.LoadScriptAsync("https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.6.2/dat.gui.min.js");
}

export class FluidRendererGUI {
    private _gui: BABYLON.Nullable<LiLGUI.GUI>;
    private _visible: boolean;
    private _scene: BABYLON.Scene;
    private _onKeyObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.KeyboardInfo>>;
    private _targetRendererIndex: number;
    private _targetRenderersGUIElements: LiLGUI.Controller[];
    private _renderObjectIndex: number;
    private _renderObjectsGUIElements: LiLGUI.Controller[];

    public set visible(v: boolean) {
        if (v === this._visible) {
            return;
        }
        this._visible = v;
        if (this._gui) {
            this._gui.domElement.style.display = v ? "" : "none";
        }
    }

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._visible = true;
        this._onKeyObserver = null;
        this._targetRendererIndex = 0;
        this._targetRenderersGUIElements = [];
        this._renderObjectIndex = 0;
        this._renderObjectsGUIElements = [];
        this._gui = null;

        this.initialize();
    }

    public dispose() {
        const oldgui = document.getElementById("datGUI");
        if (oldgui !== null) {
            oldgui.remove();
            this._gui = null;
        }
        this._scene.onKeyboardObservable.remove(this._onKeyObserver);
        this._onKeyObserver = null;
    }

    private _setupKeyboard(): void {
        this._onKeyObserver = this._scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    //console.log("KEY DOWN: ", kbInfo.event.key);
                    break;
                case BABYLON.KeyboardEventTypes.KEYUP:
                    switch (kbInfo.event.key) {
                        case "F8": {
                            this.visible = !this._visible;
                            break;
                        }
                    }
                    //console.log("KEY UP: ", kbInfo.event.key, kbInfo.event.keyCode);
                    break;
            }
        });
    }

    public initialize(): void {
        this.dispose();
    
        this._gui = new LiLGUI.GUI();
        this._gui.domElement.style.marginTop = "60px";
        this._gui.domElement.id = "datGUI";

        this._setupKeyboard();

        this._makeMenuGeneral();
        this._makeMenuTargetRenderers();
        this._makeMenuRenderObjects()
    }

    private _addList(menu: LiLGUI.GUI, params: object, name: string, friendlyName: string, list: any[]): LiLGUI.Controller {
        return menu.add(params, name, list)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _addCheckbox(menu: LiLGUI.GUI, params: object, name: string, friendlyName: string): LiLGUI.Controller {
        return menu.add(params, name)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _addSlider(menu: LiLGUI.GUI, params: object, name: string, friendlyName: string, min: number, max: number, step: number): LiLGUI.Controller {
        return menu.add(params, name, min, max, step)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _addColor(menu: LiLGUI.GUI, params: object, name: string, friendlyName: string): LiLGUI.Controller {
        return menu.addColor(params, name)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _makeMenuGeneral(): void {
        if (!this._gui) {
            return;
        }

        const params = {
            enable: this._parameterRead("enable"),
        };
        
        const general = this._gui.addFolder("General");

        general.$title.style.fontWeight = "bold";

        this._addCheckbox(general, params, "enable", "Enable fluid renderer");

        general.open();
    }

    private _makeMenuTargetRenderers(): void {
        if (!this._gui || !(this._scene.fluidRenderer?.targetRenderers.length ?? 0)) {
            return;
        }

        const params = {
            targets_index: this._parameterRead("targets_index"),
            targets_generateDiffuseTexture: this._parameterRead("targets_generateDiffuseTexture"),
            targets_diffuseTextureInGammaSpace: this._parameterRead("targets_diffuseTextureInGammaSpace"),
            targets_fluidColor: this._parameterRead("targets_fluidColor"),
            targets_debug: this._parameterRead("targets_debug"),
            targets_debugFeature: this._parameterRead("targets_debugFeature"),
            targets_checkMaxLengthThreshold: this._parameterRead("targets_checkMaxLengthThreshold"),
            targets_maxLengthThreshold: this._parameterRead("targets_maxLengthThreshold"),
            targets_useMinZDiff: this._parameterRead("targets_useMinZDiff"),
            targets_checkNonBlurredDepth: this._parameterRead("targets_checkNonBlurredDepth"),
            targets_useLinearZ: this._parameterRead("targets_useLinearZ"),
            targets_enableBlur: this._parameterRead("targets_enableBlur"),
            targets_blurSizeDivisor: this._parameterRead("targets_blurSizeDivisor"),
            targets_blurKernel: this._parameterRead("targets_blurKernel"),
            targets_blurScale: this._parameterRead("targets_blurScale"),
            targets_blurDepthScale: this._parameterRead("targets_blurDepthScale"),
            targets_mapSize: this._parameterRead("targets_mapSize"),
        };
        
        const targetRenderers = this._gui.addFolder("Target renderers");
        targetRenderers.$title.style.fontWeight = "bold";

        const targetList: number[] = [];
        if (this._scene.fluidRenderer) {
            for (let i = 0; i < this._scene.fluidRenderer.targetRenderers.length; ++i) {
                targetList.push(i);
            }
        }


        this._addList(targetRenderers, params, "targets_index", "Index", targetList);
        this._targetRenderersGUIElements.push(this._addList(targetRenderers, params, "targets_mapSize", "Map size", [64, 128, 256, 512, 1024, 2048, 4096]));

        const menuColor = targetRenderers.addFolder("Color");
        menuColor.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(this._addCheckbox(menuColor, params, "targets_generateDiffuseTexture", "Generate diffuse texture"));
        this._targetRenderersGUIElements.push(this._addCheckbox(menuColor, params, "targets_diffuseTextureInGammaSpace", "Diffuse texture is in gamma space"));
        this._targetRenderersGUIElements.push(this._addColor(menuColor, params, "targets_fluidColor", "Fluid color"));

        const menuSilhouette = targetRenderers.addFolder("Edges");
        menuSilhouette.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(this._addCheckbox(menuSilhouette, params, "targets_checkMaxLengthThreshold", "Check max length threshold"));
        this._targetRenderersGUIElements.push(this._addSlider(menuSilhouette, params, "targets_maxLengthThreshold", "Max length threshold", 0, 1, 0.001));
        this._targetRenderersGUIElements.push(this._addCheckbox(menuSilhouette, params, "targets_useMinZDiff", "Use min Z-diff"));
        this._targetRenderersGUIElements.push(this._addCheckbox(menuSilhouette, params, "targets_checkNonBlurredDepth", "Check non-blurred depth"));
        this._targetRenderersGUIElements.push(this._addCheckbox(menuSilhouette, params, "targets_useLinearZ", "Use linear Z"));

        const menuBlur = targetRenderers.addFolder("Blur");
        menuBlur.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(this._addCheckbox(menuBlur, params, "targets_enableBlur", "Enable"));
        this._targetRenderersGUIElements.push(this._addSlider(menuBlur, params, "targets_blurSizeDivisor", "Size divisor", 1, 10, 1));
        this._targetRenderersGUIElements.push(this._addSlider(menuBlur, params, "targets_blurKernel", "Kernel", 0, 100, 1));
        this._targetRenderersGUIElements.push(this._addSlider(menuBlur, params, "targets_blurScale", "Scale", 0, 1, 0.001));
        this._targetRenderersGUIElements.push(this._addSlider(menuBlur, params, "targets_blurDepthScale", "Depth scale", 0, 50, 0.001));

        const menuDebug = targetRenderers.addFolder("Debug");
        menuDebug.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(this._addCheckbox(menuDebug, params, "targets_debug", "Enable"));
        this._targetRenderersGUIElements.push(this._addList(menuDebug, params, "targets_debugFeature", "Feature", Object.keys(FluidRenderingDebug).filter(k => isNaN(Number(k)))));

        targetRenderers.open();
    }

    private _makeMenuRenderObjects(): void {
        if (!this._gui || !(this._scene.fluidRenderer?.renderObjects.length ?? 0)) {
            return;
        }

        const params = {
            objects_index: this._parameterRead("objects_index"),
            objects_particleUseFixedSize: this._parameterRead("objects_particleUseFixedSize"),
            objects_particleSize: this._parameterRead("objects_particleSize") ?? 0.5,
            objects_particleThicknessAlpha: this._parameterRead("objects_particleThicknessAlpha"),
        };

        const renderObjects = this._gui.addFolder("Render objects");
        renderObjects.$title.style.fontWeight = "bold";

        const objectList: number[] = [];
        if (this._scene.fluidRenderer) {
            for (let i = 0; i < this._scene.fluidRenderer.renderObjects.length; ++i) {
                objectList.push(i);
            }
        }

        this._addList(renderObjects, params, "objects_index", "Index", objectList);
        this._renderObjectsGUIElements.push(this._addCheckbox(renderObjects, params, "objects_particleUseFixedSize", "Use fixed particle size"));
        this._renderObjectsGUIElements.push(this._addSlider(renderObjects, params, "objects_particleSize", "Particle size", 0, 2, 0.001));
        this._renderObjectsGUIElements.push(this._addSlider(renderObjects, params, "objects_particleThicknessAlpha", "Particle alpha", 0, 1, 0.001));
    }

    private _readValue(obj: any, name: string): any {
        const parts: string[] = name.split("_");

        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            obj = obj[parts[i]];

            if (obj instanceof BABYLON.Color3) {
                obj = obj.toHexString();
            }

            if (part === "debugFeature") {
                obj = FluidRenderingDebug[obj];
            }
        }

        return obj;
    }

    private _setValue(obj: any, name: string, value: any): void {
        const parts: string[] = name.split("_");

        for (let i = 0; i < parts.length - 1; ++i) {
            obj = obj[parts[i]];
        }

        obj[parts[parts.length - 1]] = value;
    }

    private _parameterRead(name: string): any {
        const fluidRenderer = this._scene.fluidRenderer;
        switch (name) {
            case "enable":
                return !!this._scene.fluidRenderer;
            case "objects_particleUseFixedSize":
                return fluidRenderer?.renderObjects[this._renderObjectIndex].object.particleSize !== null;
        }

        if (name.startsWith("targets_")) {
            name = name.substring(8);
            if (name === "index") {
                return this._targetRendererIndex;
            } else {
                return fluidRenderer ? this._readValue(fluidRenderer.targetRenderers[this._targetRendererIndex], name) : "";
            }
        }

        if (name.startsWith("objects_")) {
            name = name.substring(8);
            if (name === "index") {
                return this._renderObjectIndex;
            } else {
                return fluidRenderer ? this._readValue(fluidRenderer.renderObjects[this._renderObjectIndex].object, name) : "";
            }
        }
    }

    private _fillValues(listGUIElements: LiLGUI.Controller[], obj: any): void {
        for (let i = 0; i < listGUIElements.length; ++i) {
            const elem = listGUIElements[i];
            const property = elem.property.split("_")[1];
            (elem.object as any)[elem.property] = this._readValue(obj, property);
            elem.updateDisplay();
        }
    }

    private _parameterChanged(name: string, value: any): void {
        const fluidRenderer = this._scene.fluidRenderer;
        switch (name) {
            case "enable":
                if (!!value) {
                    this._scene.enableFluidRenderer();
                    this._targetRendererIndex = 0;
                    this.initialize();
                } else {
                    this._scene.disableFluidRenderer();
                    this._targetRendererIndex = 0;
                    this.initialize();
                }
                return;
            case "targets_fluidColor":
                if (fluidRenderer && fluidRenderer.targetRenderers.length > this._targetRendererIndex) {
                    fluidRenderer.targetRenderers[this._targetRendererIndex].fluidColor.copyFrom(BABYLON.Color3.FromHexString(value));
                }
                return;
            case "targets_debugFeature":
                const typedDebugFeature: keyof typeof FluidRenderingDebug = value;
                const val = FluidRenderingDebug[typedDebugFeature];
                if (fluidRenderer && fluidRenderer.targetRenderers.length > this._targetRendererIndex) {
                    fluidRenderer.targetRenderers[this._targetRendererIndex].debugFeature = val;
                }
                return;
            case "objects_particleUseFixedSize":
                if (fluidRenderer && fluidRenderer.renderObjects.length > this._renderObjectIndex) {
                    const particleSizeCtrl = this._renderObjectsGUIElements[1];
                    fluidRenderer.renderObjects[this._renderObjectIndex].object.particleSize = !!value ? (particleSizeCtrl.object as any).objects_particleSize : null;
                }
                return;
            case "objects_particleSize":
                if (fluidRenderer && fluidRenderer.renderObjects.length > this._renderObjectIndex) {
                    const particleUseFixedParticleSizeCtrl = this._renderObjectsGUIElements[0];
                    if (!(particleUseFixedParticleSizeCtrl.object as any).objects_particleUseFixedSize) {
                        return;
                    }
                }
        }

        if (name.startsWith("targets_")) {
            name = name.substring(8);
            if (name === "index") {
                this._targetRendererIndex = value || 0;
                if (fluidRenderer) {
                    this._fillValues(this._targetRenderersGUIElements, fluidRenderer.targetRenderers[this._targetRendererIndex]);
                }
            } else {
                if (fluidRenderer) {
                    this._setValue(fluidRenderer.targetRenderers[this._targetRendererIndex], name, value === false ? false : value === true ? true : parseFloat(value));
                }
            }
        }

        if (name.startsWith("objects_")) {
            name = name.substring(8);
            if (name === "index") {
                this._renderObjectIndex = value || 0;
                if (fluidRenderer) {
                    this._fillValues(this._renderObjectsGUIElements, fluidRenderer.renderObjects[this._renderObjectIndex].object);
                    const particleUseFixedParticleSizeCtrl = this._renderObjectsGUIElements[0];
                    (particleUseFixedParticleSizeCtrl.object as any).objects_particleUseFixedSize = fluidRenderer.renderObjects[this._renderObjectIndex].object.particleSize !== null;
                    particleUseFixedParticleSizeCtrl.updateDisplay();
                    if (fluidRenderer.renderObjects[this._renderObjectIndex].object.particleSize === null) {
                        const particleSizeCtrl = this._renderObjectsGUIElements[1];
                        (particleSizeCtrl.object as any).objects_particleSize = 0.5;
                        particleSizeCtrl.updateDisplay();
                    }
                }
            } else {
                if (fluidRenderer) {
                    this._setValue(fluidRenderer.renderObjects[this._renderObjectIndex].object, name, value === false ? false : value === true ? true : parseFloat(value));
                }
            }
        }
    }
}
