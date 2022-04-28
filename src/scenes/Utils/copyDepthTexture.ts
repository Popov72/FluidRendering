import * as BABYLON from "@babylonjs/core";

export class CopyDepthTexture {

    private _engine: BABYLON.Engine;
    private _width: number;
    private _height: number;
    private _indexBuffer: BABYLON.Nullable<BABYLON.DataBuffer>;
    private _vertexBuffers: { [key: string]: BABYLON.Nullable<BABYLON.VertexBuffer> } = {};
    private _depthRTWrapper: BABYLON.RenderTargetWrapper;
    private _copyEffectWrapper: BABYLON.EffectWrapper;

    public get depthRTWrapper() {
        return this._depthRTWrapper;
    }

    constructor(engine: BABYLON.Engine, width: number, height: number) {
        this._engine = engine;
        this._width = width;
        this._height = height;

        this._depthRTWrapper = this._engine.createRenderTargetTexture({ width, height }, {
            generateMipMaps: false,
            type: BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: BABYLON.Constants.TEXTUREFORMAT_R,
            samplingMode: BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            samples: 1,
            noColorTarget: true,
        });
        this._depthRTWrapper.createDepthStencilTexture(0, false, false, 1);

        this._copyEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: true,
            vertexShader: "passDepth",
            fragmentShader: "passDepth",
            attributeNames: ["position"],
            uniformNames: [],
            samplerNames: ["textureDepth"],
            shaderLanguage: engine.isWebGPU ? BABYLON.ShaderLanguage.WGSL : BABYLON.ShaderLanguage.GLSL,
        });

        // VBO
        const vertices = [];
        vertices.push(1, 1);
        vertices.push(-1, 1);
        vertices.push(-1, -1);
        vertices.push(1, -1);

        this._vertexBuffers[BABYLON.VertexBuffer.PositionKind] = new BABYLON.VertexBuffer(this._engine, vertices, BABYLON.VertexBuffer.PositionKind, false, false, 2);

        // Indices
        const indices = [];
        indices.push(0);
        indices.push(1);
        indices.push(2);

        indices.push(0);
        indices.push(2);
        indices.push(3);

        this._indexBuffer = this._engine.createIndexBuffer(indices);
    }

    public copy(source: BABYLON.InternalTexture): boolean {
        const effect = this._copyEffectWrapper.effect;

        if (!effect.isReady()) {
            return false;
        }

        this._engine.bindFramebuffer(this._depthRTWrapper!);

        this._engine.enableEffect(this._copyEffectWrapper._drawWrapper);

        const engineDepthFunc = this._engine.getDepthFunction();

        this._engine.setDepthBuffer(true);
        this._engine.setDepthWrite(true);
        this._engine.setDepthFunction(BABYLON.Constants.ALWAYS);
        this._engine.setColorWrite(false);

        this._engine.bindBuffers(this._vertexBuffers, this._indexBuffer, effect);

        effect._bindTexture("textureDepth", source);

        this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, 6);

        this._engine.setDepthFunction(engineDepthFunc!);
        this._engine.setColorWrite(true);

        this._engine.unBindFramebuffer(this._depthRTWrapper!);

        return true;
    }

    public dispose() {
        this._depthRTWrapper.dispose();

        this._vertexBuffers[BABYLON.VertexBuffer.PositionKind]?.dispose();
        this._vertexBuffers = {};

        if (this._indexBuffer) {
            this._engine._releaseBuffer(this._indexBuffer);
            this._indexBuffer = null;
        }
    }
}
