"use strict";(self.webpackChunkbabylonjs_fluid_rendering=self.webpackChunkbabylonjs_fluid_rendering||[]).push([[101],{6101:(e,t,s)=>{s.r(t),s.d(t,{FluidSimulationDemoParticleCustomShape:()=>r});var i=s(6291),a=s(9820);class r extends a.FluidSimulationDemoBase{constructor(e){super(e,!0),this._initParticles=!0,this._started=!1,this._meshPCS=null,this._pcs=null}async _run(){var e,t,s;const a=null!==(t=null===(e=this._scene.activeCameras)||void 0===e?void 0:e[0])&&void 0!==t?t:this._scene.activeCamera;a&&(a.alpha=1.593-Math.PI/8,a.beta=1.3,a.radius=9.633,a.computeWorldMatrix(),a.setTarget(new i.Vector3(0,3,0)),a.beta=1.3,a.computeWorldMatrix()),await i.SceneLoader.AppendAsync("https://assets.babylonjs.com/meshes/Dude/","dude.babylon",this._scene),null===(s=this._scene.getCameraByName("Default camera"))||void 0===s||s.dispose(),this._scene.activeCameras&&this._scene.activeCameras.length>0?this._scene.activeCameras[0]=a:this._scene.activeCamera=a,this._pcs=new i.PointsCloudSystem("pcs",3,this._scene),this._scene.getMeshByName("him").getChildMeshes().forEach((e=>{e.setEnabled(!1),e.scaling.setAll(.1),e.rotation.y=Math.PI/8,e.material.disableLighting=!0,e.material.emissiveTexture=e.material.diffuseTexture,this._pcs.addSurfacePoints(e,5e3,i.PointColor.Color,0)})),this._meshPCS=await this._pcs.buildMeshAsync(),this._meshPCS.setEnabled(!1);const r=this._pcs.positions,n=r.slice(0),h=r.length/3;this._fluidRenderObject.object.vertexBuffers.position=new i.VertexBuffer(this._engine,r,i.VertexBuffer.PositionKind,!0,!1,3,!0),this._fluidRenderObject.object.vertexBuffers.color=new i.VertexBuffer(this._engine,this._pcs.colors,"color",!1,!1,4,!0),this._fluidRenderObject.object.setNumParticles(h),this._fluidRenderObject.object.particleSize=.15,this._fluidRenderObject.object.particleThicknessAlpha=.1,this._fluidRenderObject.targetRenderer.minimumThickness=0,this._fluidRenderObject.targetRenderer.blurDepthFilterSize=15,this._fluidRenderObject.targetRenderer.blurDepthNumIterations=8,this._fluidRenderObject.targetRenderer.blurDepthDepthScale=50,this._fluidRenderObject.targetRenderer.thicknessMapSize=1024,this._fluidRenderObject.targetRenderer.density=.63,this._fluidRenderObject.targetRenderer.generateDiffuseTexture=!0,this._fluidRenderObject.targetRenderer.fresnelClamp=.1;const d=[],c=[],l=[],o=()=>{const e=new i.Vector3(1e10,1e10,1e10),t=new i.Vector3(-1e10,-1e10,-1e10);for(let s=0;s<h;++s)e.x=Math.min(r[3*s+0],e.x),e.y=Math.min(r[3*s+1],e.y),e.z=Math.min(r[3*s+2],e.z),t.x=Math.max(r[3*s+0],t.x),t.y=Math.max(r[3*s+1],t.y),t.z=Math.max(r[3*s+2],t.z);d.length=0,c.length=0,l.length=0;for(let e=0;e<h;++e){const e=.005*Math.random(),t=.001*Math.random(),s=.005*Math.random();c.push((-.5+Math.random())*Math.random()*e),c.push(Math.random()*(Math.random()+1)*t),c.push((-.5+Math.random())*Math.random()*s),d.push(0,0,0),l.push(0)}this._initParticles=!1};this._sceneObserver=this._scene.onBeforeRenderObservable.add((()=>{if(this._started&&(this._initParticles&&(r.set(n),o(),this._fluidRenderObject.object.vertexBuffers.position.updateDirectly(r,0)),!this._paused)){for(let e=0;e<h;++e)!l[e]&&(c[3*e+1]+=-.00016350000000000002,d[3*e+0]+=c[3*e+0],d[3*e+1]+=c[3*e+1],d[3*e+2]+=c[3*e+2],r[3*e+0]+=d[3*e+0],r[3*e+1]+=d[3*e+1],r[3*e+2]+=d[3*e+2],r[3*e+1]<=-2&&(d[3*e+1]*=-(Math.random()/10+.4),r[3*e+1]+d[3*e+1]<-2&&(l[e]=1),r[3*e+1]=-2));this._started,this._fluidRenderObject.object.vertexBuffers.position.updateDirectly(r,0)}})),super._run()}dispose(){var e;super.dispose(),this._scene.getMeshByName("him").dispose(!1,!0),null===(e=this._pcs)||void 0===e||e.dispose()}_makeGUIMainMenu(){const e={paused:this._paused,start:()=>{this._initParticles=!0,this._started=!0}},t=this._gui;t.add(e,"start").name("Start"),t.add(e,"paused").name("Pause").onChange((e=>{this._paused=e}))}}}}]);
//# sourceMappingURL=101.b4b3bd2b8e46dc0378d0.js.map