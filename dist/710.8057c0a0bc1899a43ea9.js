"use strict";(self.webpackChunkbabylonjs_fluid_rendering=self.webpackChunkbabylonjs_fluid_rendering||[]).push([[710],{1710:(e,s,i)=>{i.r(s),i.d(s,{FluidSimulationDemoMeshSDF:()=>a});var t=i(6291),n=i(9820);class a extends n.FluidSimulationDemoBase{constructor(e){super(e),this._environmentFile="Parking",this._meshName=null,this._sceneRenderObserver=null,this._numParticles=7500,this.addCollisionPlane(new t.Vector3(0,1,0),.5,.3),this._addMesh("High heels")}async _addMesh(e,s=!1){switch(this._meshName=e,e){case"High heels":this.addCollisionMesh(new t.Vector3(.85,-.5,0),new t.Vector3(0,0,0),"high_heels.obj","high_heels.sdf",!1,.03);break;case"Dragon":this.addCollisionMesh(new t.Vector3(-.1,-.5,-2.4),new t.Vector3(0,-1,0),"Dragon_50k.obj","Dragon_50k.sdf",!0,3)}s&&(this._collisionObjects=await Promise.all(this._collisionObjectPromises))}async _run(){var e,s;const i=null!==(s=null===(e=this._scene.activeCameras)||void 0===e?void 0:e[0])&&void 0!==s?s:this._scene.activeCamera;i&&(i.alpha=2.62,i.beta=1.11,i.radius=8.4),this._fluidRenderObject.object.particleSize=.08,this._fluidSim.smoothingRadius=.04,this._fluidSim.densityReference=2e4,this._fluidSim.pressureConstant=4,this._fluidSim.viscosity=.005,this._fluidSim.maxVelocity=10,this._fluidSim.maxAcceleration=2e3,this._shapeCollisionRestitution=.99,this._particleGenerator.position.x=.2,this._particleGenerator.position.y=2.8,this._particleGenerator.position.z=-1.5,super._run()}dispose(){super.dispose(),this._scene.onBeforeRenderObservable.remove(this._sceneRenderObserver)}_makeGUIMainMenu(){const e={restart:()=>{this._generateParticles()},meshname:this._meshName},s=this._gui;s.add(e,"restart").name("Restart"),s.add(e,"meshname",["Dragon","High heels"]).name("Name").onChange((e=>{this.disposeCollisionObject(this._collisionObjects.length-1),this._addMesh(e,!0)}))}}}}]);
//# sourceMappingURL=710.8057c0a0bc1899a43ea9.js.map