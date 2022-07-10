"use strict";(self.webpackChunkbabylonjs_fluid_rendering=self.webpackChunkbabylonjs_fluid_rendering||[]).push([[984,499],{7499:(e,t,i)=>{i.r(t),i.d(t,{FluidRenderingObject:()=>r});var s=i(6291);class r{constructor(e,t,i){this.vertexBuffers=t,this.indexBuffer=i,this.priority=0,this._particleSize=.1,this.onParticleSizeChanged=new s.Observable,this.particleThicknessAlpha=.05,this._useVelocity=!1,this._scene=e,this._engine=e.getEngine(),this._effectsAreDirty=!0,this._depthEffectWrapper=null,this._thicknessEffectWrapper=null}get particleSize(){return this._particleSize}set particleSize(e){e!==this._particleSize&&(this._particleSize=e,this.onParticleSizeChanged.notifyObservers(this))}get useInstancing(){return!this.indexBuffer}get useVelocity(){return this._useVelocity}set useVelocity(e){this._useVelocity!==e&&this._hasVelocity()&&(this._useVelocity=e,this._effectsAreDirty=!0)}_hasVelocity(){return!!this.vertexBuffers.velocity}getClassName(){return"FluidRenderingObject"}_createEffects(){const e=["view","projection","particleRadius","size"],t=["position","offset"],i=[];this._effectsAreDirty=!1,this.useVelocity&&(t.push("velocity"),i.push("#define FLUIDRENDERING_VELOCITY")),this._depthEffectWrapper=new s.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"fluidParticleDepth",fragmentShader:"fluidParticleDepth",attributeNames:t,uniformNames:e,samplerNames:[],defines:i}),e.push("particleAlpha"),this._thicknessEffectWrapper=new s.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"fluidParticleThickness",fragmentShader:"fluidParticleThickness",attributeNames:["position","offset"],uniformNames:e,samplerNames:[]})}isReady(){if(this._effectsAreDirty&&this._createEffects(),!this._depthEffectWrapper||!this._thicknessEffectWrapper)return!1;const e=this._depthEffectWrapper._drawWrapper.effect,t=this._thicknessEffectWrapper._drawWrapper.effect;return e.isReady()&&t.isReady()}numParticles(){return 0}renderDepthTexture(){const e=this.numParticles();if(!this._depthEffectWrapper||0===e)return;const t=this._depthEffectWrapper._drawWrapper,i=t.effect;this._engine.enableEffect(t),this._engine.bindBuffers(this.vertexBuffers,this.indexBuffer,i),i.setMatrix("view",this._scene.getViewMatrix()),i.setMatrix("projection",this._scene.getProjectionMatrix()),i.setFloat2("size",this._particleSize,this._particleSize),i.setFloat("particleRadius",this._particleSize/2),this.useInstancing?this._engine.drawArraysType(s.Constants.MATERIAL_TriangleStripDrawMode,0,4,e):this._engine.drawElementsType(s.Constants.MATERIAL_TriangleFillMode,0,e)}renderThicknessTexture(){const e=this.numParticles();if(!this._thicknessEffectWrapper||0===e)return;const t=this._thicknessEffectWrapper._drawWrapper,i=t.effect;this._engine.setAlphaMode(s.Constants.ALPHA_ONEONE),this._engine.setDepthWrite(!1),this._engine.enableEffect(t),this._engine.bindBuffers(this.vertexBuffers,this.indexBuffer,i),i.setMatrix("view",this._scene.getViewMatrix()),i.setMatrix("projection",this._scene.getProjectionMatrix()),i.setFloat("particleAlpha",this.particleThicknessAlpha),i.setFloat2("size",this._particleSize,this._particleSize),this.useInstancing?this._engine.drawArraysType(s.Constants.MATERIAL_TriangleStripDrawMode,0,4,e):this._engine.drawElementsType(s.Constants.MATERIAL_TriangleFillMode,0,e),this._engine.setDepthWrite(!0),this._engine.setAlphaMode(s.Constants.ALPHA_DISABLE)}renderDiffuseTexture(){}dispose(){var e,t;null===(e=this._depthEffectWrapper)||void 0===e||e.dispose(),null===(t=this._thicknessEffectWrapper)||void 0===t||t.dispose()}}},5984:(e,t,i)=>{i.r(t),i.d(t,{FluidRenderingObjectVertexBuffer:()=>n});var s=i(6291),r=i(7499);class n extends r.FluidRenderingObject{constructor(e,t,i){super(e,t,null),this._numParticles=i,this._disposeVBOffset=!1,this._diffuseEffectWrapper=null,t.offset||(t.offset=new s.VertexBuffer(this._engine,[0,0,1,0,0,1,1,1],"offset",!1,!1,2),this._disposeVBOffset=!0)}getClassName(){return"FluidRenderingObjectVertexBuffer"}_createEffects(){super._createEffects(),this._diffuseEffectWrapper=new s.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"fluidParticleDiffuse",fragmentShader:"fluidParticleDiffuse",attributeNames:["position","offset","color"],uniformNames:["view","projection","size"],samplerNames:[]})}isReady(){var e,t;return super.isReady()&&null!==(t=null===(e=this._diffuseEffectWrapper)||void 0===e?void 0:e.effect.isReady())&&void 0!==t&&t}numParticles(){return this._numParticles}setNumParticles(e){this._numParticles=e}renderDiffuseTexture(){const e=this.numParticles();if(!this._diffuseEffectWrapper||0===e)return;const t=this._diffuseEffectWrapper._drawWrapper,i=t.effect;this._engine.enableEffect(t),this._engine.bindBuffers(this.vertexBuffers,this.indexBuffer,i),i.setMatrix("view",this._scene.getViewMatrix()),i.setMatrix("projection",this._scene.getProjectionMatrix()),null!==this._particleSize&&i.setFloat2("size",this._particleSize,this._particleSize),this.useInstancing?this._engine.drawArraysType(s.Constants.MATERIAL_TriangleStripDrawMode,0,4,e):this._engine.drawElementsType(s.Constants.MATERIAL_TriangleFillMode,0,e)}dispose(){var e;super.dispose(),null===(e=this._diffuseEffectWrapper)||void 0===e||e.dispose(),this._disposeVBOffset&&this.vertexBuffers.offset.dispose()}}}}]);
//# sourceMappingURL=984.ffce164ab19c7085082f.js.map