import * as BABYLON from "@babylonjs/core";

export class FluidRenderingRenderTarget {
    protected _name: string;
    protected _scene: BABYLON.Scene;
    protected _camera: BABYLON.Nullable<BABYLON.Camera>;
    protected _engine: BABYLON.Engine;
    protected _width: number;
    protected _height: number;
    protected _blurTextureSizeX: number;
    protected _blurTextureSizeY: number;
    protected _textureType: number;
    protected _textureFormat: number;
    protected _blurTextureType: number;
    protected _blurTextureFormat: number;
    protected _useStandardBlur: boolean;
    protected _postProcessRunningIndex: number;

    protected _rt: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _texture: BABYLON.Nullable<BABYLON.Texture>;
    protected _rtBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _textureBlurred: BABYLON.Nullable<BABYLON.Texture>;
    protected _blurPostProcesses: BABYLON.Nullable<BABYLON.PostProcess[]>;

    public enableBlur = true;

    public blurSizeDivisor = 1;

    public blurFilterSize = 7;

    public blurMaxFilterSize = 100;

    public blurDepthScale = 10;

    public blurUseSeparateFilters = true;

    public particleSize = 0.02;

    public onDisposeObservable: BABYLON.Observable<FluidRenderingRenderTarget> = new BABYLON.Observable<FluidRenderingRenderTarget>();

    public get renderTarget() {
        return this._rt;
    }

    public get renderTargetBlur() {
        return this._rtBlur;
    }

    public get texture() {
        return this._texture;
    }

    public get textureBlur() {
        return this._textureBlurred;
    }

    constructor(name: string, scene: BABYLON.Scene, width: number, height: number, blurTextureSizeX: number, blurTextureSizeY: number,
        textureType: number = BABYLON.Constants.TEXTURETYPE_FLOAT, textureFormat: number = BABYLON.Constants.TEXTUREFORMAT_R,
        blurTextureType: number = BABYLON.Constants.TEXTURETYPE_FLOAT, blurTextureFormat: number = BABYLON.Constants.TEXTUREFORMAT_R, useStandardBlur = false, camera: BABYLON.Nullable<BABYLON.Camera> = null)
    {
        this._name = name;
        this._scene = scene;
        this._camera = camera;
        this._engine = scene.getEngine();
        this._width = width;
        this._height = height;
        this._blurTextureSizeX = blurTextureSizeX;
        this._blurTextureSizeY = blurTextureSizeY;
        this._textureType = textureType;
        this._textureFormat = textureFormat;
        this._blurTextureType = blurTextureType;
        this._blurTextureFormat = blurTextureFormat;
        this._useStandardBlur = useStandardBlur;
        this._postProcessRunningIndex = 0;
        this.enableBlur = blurTextureSizeX !== 0 && blurTextureSizeY !== 0;
    
        this._rt = null;
        this._texture = null;
        this._rtBlur = null;
        this._textureBlurred = null;
        this._blurPostProcesses = null;
    }

    public initialize(): void {
        this.dispose();

        this._createRenderTarget();

        if (this.enableBlur && this._texture) {
            const [rtBlur, textureBlurred, blurPostProcesses] = this._createBlurPostProcesses(this._texture, this._blurTextureType, this._blurTextureFormat, this.blurSizeDivisor, this._name, this._useStandardBlur);
            this._rtBlur = rtBlur;
            this._textureBlurred = textureBlurred;
            this._blurPostProcesses = blurPostProcesses;
        }
    }

    public applyBlurPostProcesses(): void {
        if (this.enableBlur && this._blurPostProcesses) {
            this._postProcessRunningIndex = 0;
            this._scene.postProcessManager.directRender(this._blurPostProcesses, this._rtBlur, true);
            this._engine.unBindFramebuffer(this._rtBlur!);
        }
    }

    protected _createRenderTarget(): void {
        this._rt = this._engine.createRenderTargetTexture({ width: this._width, height: this._height }, {
            generateMipMaps: false,
            type: this._textureType,
            format: this._textureFormat,
            samplingMode: BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            samples: 1,
        });

        const renderTexture = this._rt.texture!;

        this._texture = new BABYLON.Texture(null, this._scene);
        this._texture.name = "rtt" + this._name;
        this._texture._texture = renderTexture;
        this._texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this._texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this._texture.anisotropicFilteringLevel = 1;
    }

    protected _createBlurPostProcesses(textureBlurSource: BABYLON.ThinTexture, textureType: number, textureFormat: number, blurSizeDivisor: number, debugName: string, useStandardBlur = false): [BABYLON.RenderTargetWrapper, BABYLON.Texture, BABYLON.PostProcess[]] {
        const engine = this._scene.getEngine();
        const targetSize = new BABYLON.Vector2(Math.floor(this._blurTextureSizeX / blurSizeDivisor), Math.floor(this._blurTextureSizeY / blurSizeDivisor));
        const supportFloatLinearFiltering = engine.getCaps().textureFloatLinearFiltering;

        const rtBlur = this._engine.createRenderTargetTexture({ width: targetSize.x, height: targetSize.y }, {
            generateMipMaps: false,
            type: textureType,
            format: textureFormat,
            samplingMode: supportFloatLinearFiltering ? BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE : BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samples: 1,
        });

        const renderTexture = rtBlur.texture!;

        const texture = new BABYLON.Texture(null, this._scene);
        texture.name = "rttBlurred" + debugName;
        texture._texture = renderTexture;
        texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 1;

        if (useStandardBlur) {
            const kernelBlurXPostprocess = new BABYLON.PostProcess("BilateralBlurX", "standardBlur", ["filterSize", "blurDir"],
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            //kernelBlurXPostprocess.width = targetSize.x;
            //kernelBlurXPostprocess.height = targetSize.y;
            kernelBlurXPostprocess.externalTextureSamplerBinding = true;
            kernelBlurXPostprocess.onApplyObservable.add((effect) => {
                if (this._postProcessRunningIndex === 0) {
                    effect.setTexture("textureSampler", textureBlurSource);
                } else {
                    effect._bindTexture("textureSampler", kernelBlurXPostprocess.inputTexture.texture);
                }
                effect.setInt("filterSize", this.blurFilterSize);
                effect.setFloat2("blurDir", 1 / this._blurTextureSizeX, 0);
                this._postProcessRunningIndex++;
            });
            kernelBlurXPostprocess.onSizeChangedObservable.add(() => {
                kernelBlurXPostprocess._textures.forEach((rt) => {
                    rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                    rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                });
            });

            const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", "standardBlur", ["filterSize", "blurDir"],
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurYPostprocess.onApplyObservable.add((effect) => {
                effect.setInt("filterSize", this.blurFilterSize);
                effect.setFloat2("blurDir", 0, 1 / this._blurTextureSizeY);
                this._postProcessRunningIndex++;
            });
            kernelBlurYPostprocess.onSizeChangedObservable.add(() => {
                kernelBlurYPostprocess._textures.forEach((rt) => {
                    rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                    rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                });
            });

            kernelBlurXPostprocess.autoClear = false;
            kernelBlurYPostprocess.autoClear = false;

            return [rtBlur, texture, [kernelBlurXPostprocess, kernelBlurYPostprocess]];
        } else if (this.blurUseSeparateFilters) {
            const kernelBlurXPostprocess = new BABYLON.PostProcess("BilateralBlurX", "bilateralBlur", ["maxFilterSize", "blurDir", "projectedParticleConstant", "depthThreshold"],
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurXPostprocess.externalTextureSamplerBinding = true;
            kernelBlurXPostprocess.onApplyObservable.add((effect) => {
                if (this._postProcessRunningIndex === 0) {
                    effect.setTexture("textureSampler", textureBlurSource);
                } else {
                    effect._bindTexture("textureSampler", kernelBlurXPostprocess.inputTexture.texture);
                }
                effect.setInt("maxFilterSize", this.blurMaxFilterSize);
                effect.setFloat2("blurDir", 1 / this._blurTextureSizeX, 0);
                effect.setFloat("projectedParticleConstant", this._getProjectedParticleConstant());
                effect.setFloat("depthThreshold", this._getDepthThreshold());
                this._postProcessRunningIndex++;
            });
            kernelBlurXPostprocess.onSizeChangedObservable.add(() => {
                kernelBlurXPostprocess._textures.forEach((rt) => {
                    rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                    rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                });
            });

            const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", "bilateralBlur", ["maxFilterSize", "blurDir", "projectedParticleConstant", "depthThreshold"],
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurYPostprocess.onApplyObservable.add((effect) => {
                effect.setInt("maxFilterSize", this.blurMaxFilterSize);
                effect.setFloat2("blurDir", 0, 1 / this._blurTextureSizeY);
                effect.setFloat("projectedParticleConstant", this._getProjectedParticleConstant());
                effect.setFloat("depthThreshold", this._getDepthThreshold());
                this._postProcessRunningIndex++;
            });
            kernelBlurYPostprocess.onSizeChangedObservable.add(() => {
                kernelBlurYPostprocess._textures.forEach((rt) => {
                    rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                    rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                });
            });

            kernelBlurXPostprocess.autoClear = false;
            kernelBlurYPostprocess.autoClear = false;

            return [rtBlur, texture, [kernelBlurXPostprocess, kernelBlurYPostprocess, kernelBlurXPostprocess, kernelBlurYPostprocess, kernelBlurXPostprocess, kernelBlurYPostprocess]];
        } else {
            const kernelBlurPostprocess = new BABYLON.PostProcess("BilateralBlur", "bilateralBlur2", ["maxFilterSize", "blurDir", "projectedParticleConstant", "depthThreshold"],
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurPostprocess.externalTextureSamplerBinding = true;
            kernelBlurPostprocess.onApplyObservable.add((effect) => {
                if (this._postProcessRunningIndex === 0) {
                    effect.setTexture("textureSampler", textureBlurSource);
                } else {
                    effect._bindTexture("textureSampler", kernelBlurPostprocess.inputTexture.texture);
                }
                effect.setInt("maxFilterSize", this.blurMaxFilterSize);
                effect.setFloat2("blurDir", 1 / this._blurTextureSizeX, 1 / this._blurTextureSizeY);
                effect.setFloat("projectedParticleConstant", this._getProjectedParticleConstant());
                effect.setFloat("depthThreshold", this._getDepthThreshold());
                this._postProcessRunningIndex++;
            });
            kernelBlurPostprocess.onSizeChangedObservable.add(() => {
                kernelBlurPostprocess._textures.forEach((rt) => {
                    rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                    rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                });
            });

            kernelBlurPostprocess.autoClear = false;

            return [rtBlur, texture, [kernelBlurPostprocess, kernelBlurPostprocess, kernelBlurPostprocess]];
        }
    }

    private _getProjectedParticleConstant() {
        return this.blurFilterSize * (this.particleSize / 2) * 0.1 * (this._height / 2) / Math.tan((this._camera?.fov ?? 45 * Math.PI / 180) / 2);
    }

    private _getDepthThreshold() {
        return (this.particleSize / 2) * this.blurDepthScale;
    }

    public dispose(): void {
        if (this.onDisposeObservable.hasObservers()) {
            this.onDisposeObservable.notifyObservers(this);
        }

        this._rt?.dispose();
        this._rt = null;
        this._rtBlur?.dispose();
        this._rtBlur = null;
        if (this._blurPostProcesses) {
            this._blurPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurPostProcesses = null;
    }
}
