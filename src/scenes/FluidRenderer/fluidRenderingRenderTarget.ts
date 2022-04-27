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
    protected _generateDepthBuffer: boolean;
    protected _samples: number;
    protected _postProcessRunningIndex: number;

    protected _rt: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _texture: BABYLON.Nullable<BABYLON.Texture>;
    protected _rtBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _textureBlurred: BABYLON.Nullable<BABYLON.Texture>;
    protected _blurPostProcesses: BABYLON.Nullable<BABYLON.PostProcess[]>;

    public enableBlur = true;

    public blurSizeDivisor = 1;

    public blurFilterSize = 7;

    private _blurNumIterations = 3;

    public get blurNumIterations() {
        return this._blurNumIterations;
    }

    public set blurNumIterations(numIterations: number) {
        if (this._blurNumIterations === numIterations) {
            return;
        }

        this._blurNumIterations = numIterations;
        if (this._blurPostProcesses !== null) {
            const blurX = this._blurPostProcesses[0];
            const blurY = this._blurPostProcesses[1];

            this._blurPostProcesses = [...Array(this._blurNumIterations * 2).keys()].map((elm) => elm & 1 ? blurY : blurX)
        }
    }

    public blurMaxFilterSize = 100;

    public blurDepthScale = 10;

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
        blurTextureType: number = BABYLON.Constants.TEXTURETYPE_FLOAT, blurTextureFormat: number = BABYLON.Constants.TEXTUREFORMAT_R, useStandardBlur = false, camera: BABYLON.Nullable<BABYLON.Camera> = null, generateDepthBuffer = true, samples = 1)
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
        this._generateDepthBuffer = generateDepthBuffer;
        this._samples = samples;
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
            generateDepthBuffer: this._generateDepthBuffer,
            generateStencilBuffer: false,
            samples: this._samples,
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
        const useBilinearFiltering = (textureType === BABYLON.Constants.TEXTURETYPE_FLOAT && engine.getCaps().textureFloatLinearFiltering) || (textureType === BABYLON.Constants.TEXTURETYPE_HALF_FLOAT && engine.getCaps().textureHalfFloatLinearFiltering);

        const rtBlur = this._engine.createRenderTargetTexture({ width: targetSize.x, height: targetSize.y }, {
            generateMipMaps: false,
            type: textureType,
            format: textureFormat,
            samplingMode: useBilinearFiltering ? BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE : BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samples: this._samples,
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
            kernelBlurXPostprocess.samples = this._samples;
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
            this._fixReusablePostProcess(kernelBlurXPostprocess);

            const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", "standardBlur", ["filterSize", "blurDir"],
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurYPostprocess.samples = this._samples;
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
            this._fixReusablePostProcess(kernelBlurYPostprocess);

            kernelBlurXPostprocess.autoClear = false;
            kernelBlurYPostprocess.autoClear = false;

            return [rtBlur, texture, [kernelBlurXPostprocess, kernelBlurYPostprocess]];
        } else {
            const uniforms: string[] = ["maxFilterSize", "blurDir", "projectedParticleConstant", "depthThreshold"];

            const kernelBlurXPostprocess = new BABYLON.PostProcess("BilateralBlurX", "bilateralBlur", uniforms,
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurXPostprocess.samples = this._samples;
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
            this._fixReusablePostProcess(kernelBlurXPostprocess);

            const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", "bilateralBlur", uniforms,
                null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                engine, true, null, textureType, undefined, undefined, undefined, textureFormat);
            kernelBlurYPostprocess.samples = this._samples;
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
            this._fixReusablePostProcess(kernelBlurYPostprocess);

            kernelBlurXPostprocess.autoClear = false;
            kernelBlurYPostprocess.autoClear = false;

            return [rtBlur, texture, [...Array(this._blurNumIterations * 2).keys()].map((elm) => elm & 1 ? kernelBlurYPostprocess : kernelBlurXPostprocess)];
        }
    }

    private _fixReusablePostProcess(pp: BABYLON.PostProcess) {
        if  (!pp.isReusable()) {
            return;
        }

        pp.onActivateObservable.add(() => {
            // undo what calling activate() does which will make sure we will retrieve the right texture when getting the input for the post process
            pp._currentRenderTextureInd = (pp._currentRenderTextureInd + 1) % 2;
        });
        pp.onApplyObservable.add(() => {
            // now we can advance to the next texture
            pp._currentRenderTextureInd = (pp._currentRenderTextureInd + 1) % 2;
        });
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
            this._blurPostProcesses[0].dispose();
            this._blurPostProcesses[1].dispose();
        }
        this._blurPostProcesses = null;
    }
}
