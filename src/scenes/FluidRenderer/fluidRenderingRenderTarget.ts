import * as BABYLON from "@babylonjs/core";

export class FluidRenderingRenderTarget {
    protected _name: string;
    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;
    protected _width: number;
    protected _height: number;
    protected _blurTextureSize: number;
    protected _textureType: number;
    protected _textureFormat: number;
    protected _textureSamplingMode: number;
    protected _blurTextureType: number;
    protected _blurTextureFormat: number;
    protected _useStandardBlur: boolean;

    protected _rt: BABYLON.RenderTargetWrapper;
    protected _texture: BABYLON.ThinTexture;
    protected _rtBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _textureBlurred: BABYLON.ThinTexture;
    protected _blurPostProcesses: BABYLON.PostProcess[];

    public debug = true;

    public enableBlur = true;

    public blurSizeDivisor = 1;

    public blurKernel = 20;

    public blurScale = 0.1;

    public blurDepthScale = 50;

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

    constructor(name: string, scene: BABYLON.Scene, width: number, height: number, blurTextureSize: number,
        textureType: number = BABYLON.Constants.TEXTURETYPE_FLOAT, textureFormat: number = BABYLON.Constants.TEXTUREFORMAT_R, textureSamplingMode: number = BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        blurTextureType: number = BABYLON.Constants.TEXTURETYPE_FLOAT, blurTextureFormat: number = BABYLON.Constants.TEXTUREFORMAT_R, useStandardBlur = false)
    {
        this._name = name;
        this._scene = scene;
        this._engine = scene.getEngine();
        this._width = width;
        this._height = height;
        this._blurTextureSize = blurTextureSize;
        this._textureType = textureType;
        this._textureFormat = textureFormat;
        this._textureSamplingMode = textureSamplingMode;
        this._blurTextureType = blurTextureType;
        this._blurTextureFormat = blurTextureFormat;
        this._useStandardBlur = useStandardBlur;
    
        this._rt = null as any;
        this._texture = null as any;
        this._rtBlur = null as any;
        this._textureBlurred = null as any;
        this._blurPostProcesses = null as any;
    }

    public initialize(): void {
        this.dispose();

        this._createRenderTarget();

        if (this.enableBlur) {
            const [rtBlur, textureBlurred, blurPostProcesses] = this._createBlurPostProcesses(this._texture, this._blurTextureType, this._blurTextureFormat, this.blurSizeDivisor, this._name, this._useStandardBlur);
            this._rtBlur = rtBlur;
            this._textureBlurred = textureBlurred;
            this._blurPostProcesses = blurPostProcesses;
        }
    }

    public applyBlurPostProcesses(): void {
        if (this.enableBlur) {
            this._scene.postProcessManager.directRender(this._blurPostProcesses, this._rtBlur, true);
            this._engine.unBindFramebuffer(this._rtBlur!);
        }
    }

    protected _createRenderTarget(): void {
        this._rt = this._engine.createRenderTargetTexture({ width: this._width, height: this._height }, {
            generateMipMaps: false,
            type: this._textureType,
            format: this._textureFormat,
            samplingMode: this._textureSamplingMode,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            samples: 1,
        });
        //this._rtDepth.createDepthStencilTexture(0, false, false, 1, BABYLON.Constants.TEXTUREFORMAT_DEPTH32_FLOAT);
        //const renderTexture = this._rtDepth._depthStencilTexture;

        const renderTexture = this._rt.texture!;

        this._texture = new BABYLON.ThinTexture(renderTexture);

        this._texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this._texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        if (this.debug) {
            const texture = new BABYLON.Texture(null, this._scene);
            texture.name = "rtt" + this._name;
            texture._texture = renderTexture;
            texture._texture.incrementReferences();
            this.onDisposeObservable.add(() => {
                texture.dispose();
            });
        }
    }

    protected _createBlurPostProcesses(textureBlurSource: BABYLON.ThinTexture, textureType: number, textureFormat: number, blurSizeDivisor: number, debugName: string, useStandardBlur = false): [BABYLON.RenderTargetWrapper, BABYLON.ThinTexture, BABYLON.PostProcess[]] {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this._blurTextureSize / blurSizeDivisor);
        const supportFloatLinearFiltering = engine.getCaps().textureFloatLinearFiltering;

        const rtBlur = this._engine.createRenderTargetTexture(targetSize, {
            generateMipMaps: false,
            type: textureType,
            format: textureFormat,
            samplingMode: supportFloatLinearFiltering ? BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE : BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samples: 1,
        });

        let renderTexture = rtBlur.texture!;

        renderTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        renderTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        if (this.debug) {
            const texture = new BABYLON.Texture(null, this._scene);
            texture.name = "rttBlurred" + debugName;
            texture._texture = renderTexture;
            texture._texture.incrementReferences();
            this.onDisposeObservable.add(() => {
                texture.dispose();
            });
        }

        const kernelBlurXPostprocess = new BABYLON.PostProcess("BilateralBlurX", useStandardBlur ? "standardBlur" : "bilateralBlur", ["filterRadius", "blurScale", "blurDir", "blurDepthFalloff"],
            null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine, false, null, textureType, undefined, undefined, undefined, textureFormat);
        kernelBlurXPostprocess.width = targetSize;
        kernelBlurXPostprocess.height = targetSize;
        kernelBlurXPostprocess.externalTextureSamplerBinding = true;
        kernelBlurXPostprocess.onApplyObservable.add((effect) => {
            effect.setTexture("textureSampler", textureBlurSource);
            effect.setFloat("filterRadius", this.blurKernel >> 1);
            effect.setFloat2("blurDir", 1 / this._blurTextureSize, 0);
            effect.setFloat("blurScale", this.blurScale);
            effect.setFloat("blurDepthFalloff", this.blurDepthScale);
        });
        kernelBlurXPostprocess.onSizeChangedObservable.add(() => {
            kernelBlurXPostprocess._textures.forEach((rt) => {
                rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            });
        });

        const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", useStandardBlur ? "standardBlur" : "bilateralBlur", ["filterRadius", "blurScale", "blurDir", "blurDepthFalloff"],
            null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine, false, null, textureType, undefined, undefined, undefined, textureFormat);
        kernelBlurYPostprocess.onApplyObservable.add((effect) => {
            effect.setFloat("filterRadius", this.blurKernel >> 1);
            effect.setFloat2("blurDir", 0, 1 / this._blurTextureSize);
            effect.setFloat("blurScale", this.blurScale);
            effect.setFloat("blurDepthFalloff", this.blurDepthScale);
        });
        kernelBlurYPostprocess.onSizeChangedObservable.add(() => {
            kernelBlurYPostprocess._textures.forEach((rt) => {
                rt.texture!.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                rt.texture!.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            });
        });
        
        kernelBlurXPostprocess.autoClear = false;
        kernelBlurYPostprocess.autoClear = false;

        return [rtBlur, new BABYLON.ThinTexture(renderTexture), [kernelBlurXPostprocess, kernelBlurYPostprocess]];
    }

    public dispose(): void {
        if (this.onDisposeObservable.hasObservers()) {
            this.onDisposeObservable.notifyObservers(this);
        }

        this._rt?.dispose();
        this._rtBlur?.dispose();
        this._rtBlur = null;
        if (this._blurPostProcesses) {
            this._blurPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurPostProcesses = [];
    }
}
