import * as BABYLON from "@babylonjs/core";

import * as LiLGUI from "lil-gui";
import { FluidRenderingDebug } from "./fluidRenderingTargetRenderer";
/*
async function LoadDAT(): Promise<void> {
    const _ = await import("@babylonjs/core/Misc/tools")
    return _.Tools.LoadScriptAsync("https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.6.2/dat.gui.min.js");
}
*/
export class FluidRendererGUI {
    private _gui: BABYLON.Nullable<LiLGUI.GUI>;
    private _visible: boolean;
    private _scene: BABYLON.Scene;
    private _showGeneralMenu: boolean;
    private _onKeyObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.KeyboardInfo>
    >;
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

    constructor(scene: BABYLON.Scene, showGeneralMenu = true) {
        this._scene = scene;
        this._showGeneralMenu = showGeneralMenu;
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

        this._gui = new LiLGUI.GUI({ title: "Fluid Rendering" });
        this._gui.domElement.style.marginTop = "60px";
        this._gui.domElement.id = "datGUI";

        this._setupKeyboard();

        if (this._showGeneralMenu) {
            this._makeMenuGeneral();
        }
        this._makeMenuTargetRenderers();
        this._makeMenuRenderObjects();
    }

    private _addList(
        menu: LiLGUI.GUI,
        params: object,
        name: string,
        friendlyName: string,
        list: any[]
    ): LiLGUI.Controller {
        return menu
            .add(params, name, list)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _addCheckbox(
        menu: LiLGUI.GUI,
        params: object,
        name: string,
        friendlyName: string
    ): LiLGUI.Controller {
        return menu
            .add(params, name)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _addSlider(
        menu: LiLGUI.GUI,
        params: object,
        name: string,
        friendlyName: string,
        min: number,
        max: number,
        step: number
    ): LiLGUI.Controller {
        return menu
            .add(params, name, min, max, step)
            .name(friendlyName)
            .onChange((value: any) => {
                this._parameterChanged(name, value);
            });
    }

    private _addColor(
        menu: LiLGUI.GUI,
        params: object,
        name: string,
        friendlyName: string
    ): LiLGUI.Controller {
        return menu
            .addColor(params, name)
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
        if (
            !this._gui ||
            !(this._scene.fluidRenderer?.targetRenderers.length ?? 0)
        ) {
            return;
        }

        const params = {
            targets_index: this._parameterRead("targets_index"),
            targets_generateDiffuseTexture: this._parameterRead(
                "targets_generateDiffuseTexture"
            ),
            targets_fluidColor: this._parameterRead("targets_fluidColor"),
            targets_density: this._parameterRead("targets_density"),
            targets_refractionStrength: this._parameterRead(
                "targets_refractionStrength"
            ),
            targets_fresnelClamp: this._parameterRead("targets_fresnelClamp"),
            targets_specularPower: this._parameterRead("targets_specularPower"),
            targets_minimumThickness: this._parameterRead(
                "targets_minimumThickness"
            ),
            targets_debug: this._parameterRead("targets_debug"),
            targets_debugFeature: this._parameterRead("targets_debugFeature"),
            targets_enableBlurDepth: this._parameterRead(
                "targets_enableBlurDepth"
            ),
            targets_blurDepthSizeDivisor: this._parameterRead(
                "targets_blurDepthSizeDivisor"
            ),
            targets_blurDepthFilterSize: this._parameterRead(
                "targets_blurDepthFilterSize"
            ),
            targets_blurDepthNumIterations: this._parameterRead(
                "targets_blurDepthNumIterations"
            ),
            targets_blurDepthMaxFilterSize: this._parameterRead(
                "targets_blurDepthMaxFilterSize"
            ),
            targets_blurDepthDepthScale: this._parameterRead(
                "targets_blurDepthDepthScale"
            ),
            targets_enableBlurThickness: this._parameterRead(
                "targets_enableBlurThickness"
            ),
            targets_blurThicknessSizeDivisor: this._parameterRead(
                "targets_blurThicknessSizeDivisor"
            ),
            targets_blurThicknessFilterSize: this._parameterRead(
                "targets_blurThicknessFilterSize"
            ),
            targets_blurThicknessNumIterations: this._parameterRead(
                "targets_blurThicknessNumIterations"
            ),
            targets_depthMapSize: this._parameterRead("targets_depthMapSize"),
            targets_thicknessMapSize: this._parameterRead(
                "targets_thicknessMapSize"
            ),
            targets_diffuseMapSize: this._parameterRead(
                "targets_diffuseMapSize"
            ),
            targets_useVelocity: this._parameterRead("targets_useVelocity"),
            targets_useFixedThickness: this._parameterRead(
                "targets_useFixedThickness"
            ),
        };

        const targetRenderers = this._gui.addFolder("Target renderers");
        targetRenderers.$title.style.fontWeight = "bold";

        const targetList: number[] = [];
        if (this._scene.fluidRenderer) {
            for (
                let i = 0;
                i < this._scene.fluidRenderer.targetRenderers.length;
                ++i
            ) {
                targetList.push(i);
            }
        }

        this._addList(
            targetRenderers,
            params,
            "targets_index",
            "Index",
            targetList
        );
        this._targetRenderersGUIElements.push(
            this._addList(
                targetRenderers,
                params,
                "targets_depthMapSize",
                "Depth map size",
                ["Screen size", 256, 512, 1024, 2048, 4096]
            )
        );
        this._targetRenderersGUIElements.push(
            this._addList(
                targetRenderers,
                params,
                "targets_thicknessMapSize",
                "Thickness map size",
                ["Screen size", 64, 128, 256, 512, 1024, 2048]
            )
        );
        this._targetRenderersGUIElements.push(
            this._addList(
                targetRenderers,
                params,
                "targets_diffuseMapSize",
                "Diffuse map size",
                ["Screen size", 256, 512, 1024, 2048, 4096]
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                targetRenderers,
                params,
                "targets_minimumThickness",
                "Minimum thickness",
                0,
                3,
                0.001
            )
        );
        this._targetRenderersGUIElements.push(
            this._addCheckbox(
                targetRenderers,
                params,
                "targets_useFixedThickness",
                "Use fixed thickness"
            )
        );
        this._targetRenderersGUIElements.push(
            this._addCheckbox(
                targetRenderers,
                params,
                "targets_useVelocity",
                "Use velocity"
            )
        );

        const menuColor = targetRenderers.addFolder("Color");
        menuColor.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(
            this._addCheckbox(
                menuColor,
                params,
                "targets_generateDiffuseTexture",
                "Generate diffuse texture"
            )
        );
        this._targetRenderersGUIElements.push(
            this._addColor(
                menuColor,
                params,
                "targets_fluidColor",
                "Fluid color"
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuColor,
                params,
                "targets_density",
                "Density",
                0,
                20,
                0.01
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuColor,
                params,
                "targets_refractionStrength",
                "Refraction strength",
                0,
                0.3,
                0.005
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuColor,
                params,
                "targets_fresnelClamp",
                "Fresnel clamp",
                0,
                1.0,
                0.005
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuColor,
                params,
                "targets_specularPower",
                "Specular power",
                1,
                5000,
                5
            )
        );

        const menuBlurDepth = targetRenderers.addFolder("Blur Depth");
        menuBlurDepth.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(
            this._addCheckbox(
                menuBlurDepth,
                params,
                "targets_enableBlurDepth",
                "Enable"
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurDepth,
                params,
                "targets_blurDepthSizeDivisor",
                "Size divisor",
                1,
                10,
                1
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurDepth,
                params,
                "targets_blurDepthFilterSize",
                "Filter size",
                1,
                20,
                1
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurDepth,
                params,
                "targets_blurDepthNumIterations",
                "Num iterations",
                1,
                10,
                1
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurDepth,
                params,
                "targets_blurDepthMaxFilterSize",
                "Max filter size",
                1,
                100,
                1
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurDepth,
                params,
                "targets_blurDepthDepthScale",
                "Depth scale",
                0,
                100,
                0.01
            )
        );

        const menuBlurThickness = targetRenderers.addFolder("Blur Thickness");
        menuBlurThickness.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(
            this._addCheckbox(
                menuBlurThickness,
                params,
                "targets_enableBlurThickness",
                "Enable"
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurThickness,
                params,
                "targets_blurThicknessSizeDivisor",
                "Size divisor",
                1,
                10,
                1
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurThickness,
                params,
                "targets_blurThicknessFilterSize",
                "Filter size",
                1,
                20,
                1
            )
        );
        this._targetRenderersGUIElements.push(
            this._addSlider(
                menuBlurThickness,
                params,
                "targets_blurThicknessNumIterations",
                "Num iterations",
                1,
                10,
                1
            )
        );

        const menuDebug = targetRenderers.addFolder("Debug");
        menuDebug.$title.style.fontStyle = "italic";

        this._targetRenderersGUIElements.push(
            this._addCheckbox(menuDebug, params, "targets_debug", "Enable")
        );
        this._targetRenderersGUIElements.push(
            this._addList(
                menuDebug,
                params,
                "targets_debugFeature",
                "Feature",
                Object.keys(FluidRenderingDebug).filter((k) => isNaN(Number(k)))
            )
        );

        targetRenderers.open();
    }

    private _makeMenuRenderObjects(): void {
        if (
            !this._gui ||
            !(this._scene.fluidRenderer?.renderObjects.length ?? 0)
        ) {
            return;
        }

        const params = {
            objects_index: this._parameterRead("objects_index"),
            objects_particleSize: this._parameterRead("objects_particleSize"),
            objects_particleThicknessAlpha: this._parameterRead(
                "objects_particleThicknessAlpha"
            ),
        };

        const renderObjects = this._gui.addFolder("Render objects");
        renderObjects.$title.style.fontWeight = "bold";

        const objectList: number[] = [];
        if (this._scene.fluidRenderer) {
            for (
                let i = 0;
                i < this._scene.fluidRenderer.renderObjects.length;
                ++i
            ) {
                objectList.push(i);
            }
        }

        this._addList(
            renderObjects,
            params,
            "objects_index",
            "Index",
            objectList
        );
        this._renderObjectsGUIElements.push(
            this._addSlider(
                renderObjects,
                params,
                "objects_particleSize",
                "Particle size",
                0,
                2,
                0.001
            )
        );
        this._renderObjectsGUIElements.push(
            this._addSlider(
                renderObjects,
                params,
                "objects_particleThicknessAlpha",
                "Particle alpha",
                0,
                1,
                0.001
            )
        );
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

            if (part.endsWith("MapSize") && obj === null) {
                obj = "Screen size";
            }
        }

        return obj;
    }

    private _setValue(obj: any, name: string, value: any): void {
        const parts: string[] = name.split("_");

        for (let i = 0; i < parts.length - 1; ++i) {
            obj = obj[parts[i]];
            if (parts[i].endsWith("MapSize") && value === "Screen size") {
                value = null;
            }
        }

        if (
            parts[parts.length - 1].endsWith("MapSize") &&
            value === "Screen size"
        ) {
            value = null;
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
                return fluidRenderer
                    ? this._readValue(
                          fluidRenderer.targetRenderers[
                              this._targetRendererIndex
                          ],
                          name
                      )
                    : "";
            }
        }

        if (name.startsWith("objects_")) {
            name = name.substring(8);
            if (name === "index") {
                return this._renderObjectIndex;
            } else {
                return fluidRenderer
                    ? this._readValue(
                          fluidRenderer.renderObjects[this._renderObjectIndex]
                              .object,
                          name
                      )
                    : "";
            }
        }
    }

    private _fillValues(listGUIElements: LiLGUI.Controller[], obj: any): void {
        for (let i = 0; i < listGUIElements.length; ++i) {
            const elem = listGUIElements[i];
            const property = elem.property.split("_")[1];
            (elem.object as any)[elem.property] = this._readValue(
                obj,
                property
            );
            elem.updateDisplay();
        }
    }

    public syncGUI(): void {
        const fluidRenderer = this._scene.fluidRenderer;

        if (fluidRenderer) {
            this._fillValues(
                this._targetRenderersGUIElements,
                fluidRenderer.targetRenderers[this._targetRendererIndex]
            );
            this._fillValues(
                this._renderObjectsGUIElements,
                fluidRenderer.renderObjects[this._renderObjectIndex].object
            );
        }
    }

    private _parameterChanged(name: string, value: any): void {
        const fluidRenderer = this._scene.fluidRenderer;
        switch (name) {
            case "enable":
                if (value) {
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
                if (
                    fluidRenderer &&
                    fluidRenderer.targetRenderers.length >
                        this._targetRendererIndex
                ) {
                    fluidRenderer.targetRenderers[
                        this._targetRendererIndex
                    ].fluidColor.copyFrom(BABYLON.Color3.FromHexString(value));
                }
                return;
            case "targets_debugFeature": {
                const typedDebugFeature: keyof typeof FluidRenderingDebug =
                    value;
                const val = FluidRenderingDebug[typedDebugFeature];
                if (
                    fluidRenderer &&
                    fluidRenderer.targetRenderers.length >
                        this._targetRendererIndex
                ) {
                    fluidRenderer.targetRenderers[
                        this._targetRendererIndex
                    ].debugFeature = val;
                }
                return;
            }
        }

        if (name.startsWith("targets_")) {
            name = name.substring(8);
            if (name === "index") {
                this._targetRendererIndex = value || 0;
                if (fluidRenderer) {
                    this._fillValues(
                        this._targetRenderersGUIElements,
                        fluidRenderer.targetRenderers[this._targetRendererIndex]
                    );
                }
            } else {
                if (fluidRenderer) {
                    this._setValue(
                        fluidRenderer.targetRenderers[
                            this._targetRendererIndex
                        ],
                        name,
                        value === false
                            ? false
                            : value === true
                            ? true
                            : isNaN(value)
                            ? value
                            : parseFloat(value)
                    );
                }
            }
        }

        if (name.startsWith("objects_")) {
            name = name.substring(8);
            if (name === "index") {
                this._renderObjectIndex = value || 0;
                if (fluidRenderer) {
                    this._fillValues(
                        this._renderObjectsGUIElements,
                        fluidRenderer.renderObjects[this._renderObjectIndex]
                            .object
                    );
                }
            } else {
                if (fluidRenderer) {
                    this._setValue(
                        fluidRenderer.renderObjects[this._renderObjectIndex]
                            .object,
                        name,
                        value === false
                            ? false
                            : value === true
                            ? true
                            : isNaN(value)
                            ? value
                            : parseFloat(value)
                    );
                }
            }
        }
    }
}
