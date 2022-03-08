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
        //this._makeMenuRenderObjects()
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
            targets_enableBlur: this._parameterRead("targets_enableBlur"),
            targets_blurSizeDivisor: this._parameterRead("targets_blurSizeDivisor"),
            targets_blurKernel: this._parameterRead("targets_blurKernel"),
            targets_blurScale: this._parameterRead("targets_blurScale"),
            targets_blurDepthScale: this._parameterRead("targets_blurDepthScale"),
            targets_mapSize: this._parameterRead("targets_mapSize"),
        };
        
        const targetRenderers = this._gui.addFolder("Target renderers");

        const targetList: number[] = [];
        if (this._scene.fluidRenderer) {
            for (let i = 0; i < this._scene.fluidRenderer.targetRenderers.length; ++i) {
                targetList.push(i);
            }
        }

        this._addList(targetRenderers, params, "targets_index", "Index", targetList);
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_generateDiffuseTexture", "Generate diffuse texture"));
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_diffuseTextureInGammaSpace", "Diffuse texture is in gamma space"));
        this._targetRenderersGUIElements.push(this._addColor(targetRenderers, params, "targets_fluidColor", "Fluid color"));
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_debug", "Debug"));
        this._targetRenderersGUIElements.push(this._addList(targetRenderers, params, "targets_debugFeature", "Debug feature", Object.keys(FluidRenderingDebug).filter(k => isNaN(Number(k)))));
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_checkMaxLengthThreshold", "Check max length threshold"));
        this._targetRenderersGUIElements.push(this._addSlider(targetRenderers, params, "targets_maxLengthThreshold", "Max length threshold", 0, 1, 0.001));
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_useMinZDiff", "Use min Z-diff"));
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_checkNonBlurredDepth", "Check non-blurred depth"));
        this._targetRenderersGUIElements.push(this._addCheckbox(targetRenderers, params, "targets_enableBlur", "enable blur"));
        this._targetRenderersGUIElements.push(this._addSlider(targetRenderers, params, "targets_blurSizeDivisor", "Blur size divisor", 1, 10, 1));
        this._targetRenderersGUIElements.push(this._addSlider(targetRenderers, params, "targets_blurKernel", "Blur kernel", 0, 100, 1));
        this._targetRenderersGUIElements.push(this._addSlider(targetRenderers, params, "targets_blurScale", "Blur scale", 0, 1, 0.001));
        this._targetRenderersGUIElements.push(this._addSlider(targetRenderers, params, "targets_blurDepthScale", "Blur depth scale", 0, 50, 0.001));
        this._targetRenderersGUIElements.push(this._addList(targetRenderers, params, "targets_mapSize", "Map size", [64, 128, 256, 512, 1024, 2048, 4096]));

        targetRenderers.open();
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
            return 0;//this._readValue(this._wavesSettings, name);
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
        }

        if (name.startsWith("targets_")) {
            const fluidRenderer = this._scene.fluidRenderer;
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
            //this._setValue(this._wavesSettings, name, value === false ? false : value === true ? true : parseFloat(value));
            //this._wavesGenerator!.initializeCascades();
        }
    }
}
