import { mat4, vec3, quat } from 'gl-matrix'
import { WebGLResourceManager } from './rendering/resource-management';
import { VERTEX_STRIDE_ACTORS, VERTEX_STRIDE_PARTICLES, VERTEX_STRIDE_STATIC } from './rendering/mesh/mesh-constants';
import { makeParticleBuffer, ParticleDefs } from './rendering/particles';


var gl = null;
var frameWidth = -1;
var frameHeight = -1;

const VEC3_UP = vec3.fromValues(0,1,0);

//Buffered references for transforms
var matMVP = mat4.create();
var matVP = mat4.create();
var aRot = quat.create(); //actor rotation

const MAX_LIGHTS_PER_CALL = 4;
const MAX_SHADOW_LIGHTS = 4;
var lightPositions = new Float32Array(MAX_LIGHTS_PER_CALL * 3);
var lightColors = new Float32Array(MAX_LIGHTS_PER_CALL * 4);
var shadowIndices = new Int8Array(MAX_LIGHTS_PER_CALL);
var matLight = [mat4.create(),mat4.create(),mat4.create(),mat4.create()];
var matLightCoords = new Float32Array([
    0,0, 0.5,0.5,
    0,0.5 ,0.5,1,
    0.5,0.5, 1,1,
    0.5,0 ,1,0.5
]);

//The projection is the same for all lights (for now)
const matLightProj = mat4.create();
mat4.perspective(matLightProj, 140 * Math.PI / 180, 1, 0.1, 400);
const matLightView = mat4.create();


const MAX_TO_RENDER = 512;
var pvs = new Array(MAX_TO_RENDER);

//The size of the entire shadowmap atlas
const SHADOWMAP_SIZE = 512;

//PARTICLE SYSTEMs
const MAX_PARTICLES = 64;
const PARTICLE_EL_CNT = MAX_PARTICLES * 6;

var particleBuffers;

//Variables we will use
let i = 0;

export class Renderer{
    constructor(viewportCanvas){
        this.canvas = viewportCanvas;
        gl = viewportCanvas.getContext("webgl2");
        if(!gl){
            throw 'System does not support Webgl2';
        }

        this.resources = new WebGLResourceManager(gl);

        console.log('Initialized WebGL Renderer');
        console.log(`Max GL Texture size: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
    }

    init(){
        //Always enable attrib array 0
        this.resources.init();
        gl.enableVertexAttribArray(0);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);

        //Create shadow framebuffer
        this.shadowFBO = this.createDepthFBO(SHADOWMAP_SIZE);
        particleBuffers = makeParticleBuffer(gl, MAX_PARTICLES);
    }

    render(scene, camera, time, dT){
        //Rebuild the projection and viewport with every
        //frame, just in case of resize.
        //This causes a small performance hit but is always correct.
        const rect = this.canvas.getBoundingClientRect(),
              w    = rect.right - rect.left,
              h    = rect.bottom - rect.top,
              ratio = w/h;

        const shaders = this.resources.shaders;
        let shader;
        let arm;

        if(w !== frameWidth || h !== frameHeight){
            //this will resize the main frame buffer
            this.canvas.setAttribute('width', '' + w);
            this.canvas.setAttribute('height', '' + h);
            frameWidth = w;
            frameHeight = h;
        }
        //Recover if context is lost
        if(!gl){
            gl = canvas.getContext("webgl2");
        }

        ////////////////////////////////////////////////////////////
        // SHADOW PASS
        ////////////////////////////////////////////////////////////
        
        //First determine which shadow-casting lights to prioritize
        if(!!scene.localPlayer)
        {
            const px = scene.localPlayer.pos[0], py = scene.localPlayer.pos[2];

            scene.level.fixedLights.sort((a, b) => {
                a.si = -1; 
                b.si = -1;
                const distanceA = Math.pow(a.pos[0] - px, 2) + Math.pow(a.pos[2] - py, 2),
                    distanceB = Math.pow(b.pos[0] - px, 2) + Math.pow(b.pos[2] - py, 2);
    
                return distanceA - distanceB;
            });

            //Flag lights wiht shadowmap indices
            i = MAX_SHADOW_LIGHTS;
            while(i--){
                const l = scene.level.fixedLights[i];
                scene.level.fixedLights[i].si = i;
                           
                mat4.lookAt(matLightView, l.pos, [l.pos[0], 0, l.pos[2]], [0,0,1]);
                mat4.mul(matLight[i], matLightProj, matLightView);
            }
        }

        gl.enable(gl.SCISSOR_TEST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO[0]);
        gl.colorMask(false, false, false, false);
        //For each shadow casting light, draw shadowmap
        let li = MAX_SHADOW_LIGHTS;
        while(li--){
            {
                //constrain to specific part of atlas
                let j = li << 2;

                gl.viewport(SHADOWMAP_SIZE * matLightCoords[j], 
                    SHADOWMAP_SIZE * matLightCoords[j+1], 256, 256);

                gl.scissor(SHADOWMAP_SIZE * matLightCoords[j], 
                    SHADOWMAP_SIZE * matLightCoords[j+1], 256, 256);

                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
            
            shader = shaders[2];
            gl.useProgram(shader.program);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.actorsVBuffer.buffer);
            gl.enableVertexAttribArray(1);
            gl.enableVertexAttribArray(2);
            gl.disableVertexAttribArray(3);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_ACTORS, 0); //POS
            gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, VERTEX_STRIDE_ACTORS, 12); // VERTEX GROUPS (BONES)
            gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE_ACTORS, 16); // WEIGHTS

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.actorsIBuffer.buffer);

            //The only texture needed from here is the armature index
            gl.activeTexture(gl.TEXTURE2);

            //Render player shadows
            arm = this.resources.armatures.ARM_PLAYER;
            if(!!arm){
                gl.bindTexture(gl.TEXTURE_2D, arm);
                gl.uniform1i(shader.uniformLocations.boneTex, 2);
            }

            i = scene.players.length;
            while(i--){
                const p = scene.players[i];

                //Update position in shader
                mat4.fromRotationTranslation(matMVP, p.rRot, p.pos);
                mat4.multiply(matMVP, matLight[li], matMVP);
                gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matMVP);
                gl.uniform3fv(shader.uniformLocations.keyframes, p.anim.tween);

                this.drawMesh(this.resources.meshes[p.head]);
                this.drawMesh(this.resources.meshes[p.body]);

                let j = p.gear.length;
                while(j--){
                    if(!p.gear[j])
                        continue;

                    const a = this.resources.assets[p.gear[j]];

                    if(!a)
                        continue;

                    this.drawMesh(a.mesh);
                }
            }

            //Draw all enemies/npcs/etc.
            i = scene.actors.length;
            while(i--){
                const e = scene.actors[i];
                const a = this.resources.assets[e.type];
    
                if(!a){
                    continue;
                }
                
                mat4.fromRotationTranslation(matMVP, quat.setAxisAngle(aRot, VEC3_UP, e.angle), e.pos);
                mat4.multiply(matMVP, matLight[li], matMVP);
                gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matMVP);
                gl.uniform3fv(shader.uniformLocations.keyframes, e.anim.tween);
    
                this.updateShaderArmature(shader, a.arm);
                this.drawMesh(a.mesh);
            }
        }
        gl.disable(gl.SCISSOR_TEST);

        ///////////////////////////////////////////////////////////////
        // FORWARD PASS
        ///////////////////////////////////////////////////////////////
        gl.viewport(0, 0, w, h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.colorMask(true, true, true, true);

        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projMatrix = camera.projectToView(w, h);
        const viewMatrix = camera.viewMatrix;
        mat4.mul(matVP, projMatrix, viewMatrix);

        /////////////////////////////////////////////////////////////
        // SKINNED ACTORS - Players, monsters, etc.
        /////////////////////////////////////////////////////////////
        //Bind common state for all skinned characters
        shader = shaders[0];
        gl.useProgram(shader.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.actorsVBuffer.buffer);
        //gl.enableVertexAttribArray(1); - Previously enabled
        //gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_ACTORS, 0); //POS
        gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, VERTEX_STRIDE_ACTORS, 12); // VERTEX GROUPS (BONES)
        gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE_ACTORS, 16); // WEIGHTS
        gl.vertexAttribPointer(3, 2, gl.UNSIGNED_SHORT, true, VERTEX_STRIDE_ACTORS, 20); // UVs
        gl.vertexAttribPointer(4, 3, gl.BYTE, true, VERTEX_STRIDE_ACTORS, 24); // NORMALS

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.actorsIBuffer.buffer);

        //Bind lights and shadowmap
        this.updateShaderLights(shader, scene.level.fixedLights, scene.players[0].pos[0], scene.players[0].pos[2]);
        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(shader.uniformLocations.shadowTex, 3);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowFBO[1])
        this.updateShadowMatrices(shader);

        //Prepare diffuse tex index for all actors
        gl.uniform1i(shader.uniformLocations.diffuse, 0);
        gl.uniformMatrix4fv(shader.uniformLocations.matViewProj, false, matVP);

        //RENDER ALL PLAYERS - assume players are always visible
        this.updateShaderArmature(shader, this.resources.armatures.ARM_PLAYER);

        gl.activeTexture(gl.TEXTURE0);
        i = scene.players.length;
        while(i--){
            const p = scene.players[i];

            //Update position in shader
            mat4.fromRotationTranslation(matMVP, p.rRot, p.pos);
            gl.uniformMatrix4fv(shader.uniformLocations.matWorld, false, matMVP);

            gl.uniform3fv(shader.uniformLocations.keyframes, p.anim.tween);

            //Base skin for face/arms/etc.
            let mat = this.resources.materials[p.skin]
            if(!!mat)
                gl.bindTexture(gl.TEXTURE_2D, mat.diffuse);

            this.drawMesh(this.resources.meshes[p.head]);
            this.drawMesh(this.resources.meshes[p.body]);

            let j = p.gear.length;
            while(j--){
                if(!p.gear[j])
                    continue;

                const a = this.resources.assets[p.gear[j]];

                if(!a)
                    continue;
                
                gl.bindTexture(gl.TEXTURE_2D, a.mat.diffuse);
                this.drawMesh(a.mesh);
            }
        }

        //Render all visible enemies sorted by type (for material)
        let prevType = '';
        i = scene.actors.length;
        while(i--){
            const e = scene.actors[i];
            const a = this.resources.assets[e.type];

            if(!a)
                continue;

            mat4.fromRotationTranslation(matMVP, quat.setAxisAngle(aRot, VEC3_UP, e.angle), e.pos);
            gl.uniformMatrix4fv(shader.uniformLocations.matWorld, false, matMVP);
            gl.uniform3fv(shader.uniformLocations.keyframes, e.anim.tween);

            this.updateShaderArmature(shader, a.arm);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, a.mat.diffuse);
            this.drawMesh(a.mesh);
        }

        /////////////////////////////////////////////////////////////
        // STATIC GEOMETRY
        /////////////////////////////////////////////////////////////
        shader = shaders[1];
        gl.useProgram(shader.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.staticVBuffer);
        gl.disableVertexAttribArray(3);
        gl.disableVertexAttribArray(4);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_STATIC, 0); //POS
        gl.vertexAttribPointer(1, 2, gl.UNSIGNED_SHORT, true, VERTEX_STRIDE_STATIC, 12); // UVs
        gl.vertexAttribPointer(2, 3, gl.BYTE, true, VERTEX_STRIDE_STATIC, 16); // NORMALS

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.staticIBuffer);

        //Bind lights and shadowmap
        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(shader.uniformLocations.shadowTex, 3);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowFBO[1])

        //Draw all level tiles
        gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matVP);
        //For shadowmap
        this.updateShadowMatrices(shader);
    
        if(!!scene.level){
            //Set static geometry texture (atlas)
            const mat = this.resources.materials['dungeon1'];

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(shader.uniformLocations.diffuse, 0);
            gl.bindTexture(gl.TEXTURE_2D, mat.diffuse);
            
            if(!!scene.level.tiles){
                const m = this.resources.meshes['dungeon1'];

                let x = scene.level.w;
                while(x--){
                    let y = scene.level.h;
                    while(y--){
                        let i = x + y * scene.level.w;
                        const t = scene.level.tiles[i];
                        if(t < 0)
                            continue;

                        this.updateShaderLights(shader, scene.level.fixedLights, x << scene.level.spacing, y << scene.level.spacing);
                        gl.uniform2f(shader.uniformLocations.offset, x << scene.level.spacing, y << scene.level.spacing);
                        gl.drawElements(gl.TRIANGLES, m[t][0], gl.UNSIGNED_SHORT, m[t][1]);
                    }
                }
            }
        }

        //////////////////////////////////////////////////////////
        // PARTICLE EFFECTS
        //////////////////////////////////////////////////////////
        shader = shaders[3];
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(shader.program);
        gl.uniform1f(shader.uniformLocations.time, time);
        gl.uniform1f(shader.uniformLocations.ratio, ratio);

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(shader.uniformLocations.diffuse, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particleBuffers[0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffers[1]);
        gl.vertexAttribPointer(0, 2, gl.BYTE, false, VERTEX_STRIDE_PARTICLES, 0);           //POS
        gl.vertexAttribPointer(2, 1, gl.UNSIGNED_SHORT, false, VERTEX_STRIDE_PARTICLES, 2); // PARTICLE INDEX

        this.updateShaderParticleDef(shader, ParticleDefs.blood0);
        i = scene.effects.length;
        while(i--){
            const ps = scene.effects[i];
            if(time - ps.startTime >= ParticleDefs.blood0.lifetime){
                scene.effects.splice(i, 1);
                continue;
            }

            mat4.fromTranslation(matMVP, ps.pos)
            mat4.multiply(matMVP, matVP, matMVP)
            gl.uniform3fv(shader.uniformLocations.direction, ps.dir);
            gl.uniform1f(shader.uniformLocations.startTime, ps.startTime);
            gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matMVP)
    
            gl.drawElements(gl.TRIANGLES, PARTICLE_EL_CNT, gl.UNSIGNED_SHORT, 0)
        }

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    drawMesh(m){
        if(!m) return;
        let s = m.length; //s for submesh
        while(s--) gl.drawElements(gl.TRIANGLES, m[s][0], gl.UNSIGNED_SHORT, m[s][1]);
    }

    createDepthFBO(texSize){
        const tex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, texSize, texSize, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);

        return [fbo, tex]
    }

    updateShaderLights(shader, lights, x, y){
        let i = 0, j = 0, k = 0;
        lights = lights.slice()
        lights.sort((a, b) => {
            const distanceA = Math.pow(a.pos[0] - x, 2) + Math.pow(a.pos[2] - y, 2),
                distanceB = Math.pow(b.pos[0] - x, 2) + Math.pow(b.pos[2] - y, 2);

            return distanceA - distanceB;
        });
        while(k < MAX_LIGHTS_PER_CALL){
            const l = lights[k];
            lightPositions[i++] = l.pos[0];
            lightPositions[i++] = l.pos[1];
            lightPositions[i++] = l.pos[2];

            lightColors[j++] = l.col[0];
            lightColors[j++] = l.col[1];
            lightColors[j++] = l.col[2];
            lightColors[j++] = l.col[3];
            shadowIndices[k] = l.si;
            ++k;
        }

        gl.uniform3fv(shader.uniformLocations.lightPositions, lightPositions, 0, i);
        gl.uniform4fv(shader.uniformLocations.lightColors, lightColors, 0, j);
        gl.uniform1iv(shader.uniformLocations.shadowIndices, shadowIndices, 0, k);
    }

    updateShadowMatrices(shader){
        let i = MAX_SHADOW_LIGHTS;
        while(i--){
            gl.uniformMatrix4fv(gl.getUniformLocation(shader.program, `uMatLight[${i}]`), false, matLight[i]);
        }
        gl.uniform4fv(shader.uniformLocations.shadowCoords, matLightCoords);
    }

    updateShaderArmature(shader, arm){
        if(!!arm){
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, arm);
            gl.uniform1i(shader.uniformLocations.boneTex, 2);
        }
    }

    updateShaderParticleDef(shader, emitter){
        const ul = shader.uniformLocations
        gl.uniform1f(ul.emissionRate, emitter.emissionRate)
        gl.uniform1f(ul.gravity, emitter.gravity)
        gl.uniform1f(ul.minPower, emitter.minPower)
        gl.uniform1f(ul.maxPower, emitter.maxPower)
        gl.uniform1f(ul.spread, emitter.spread)
        gl.uniform1f(ul.startSize, emitter.startSize)
        gl.uniform1f(ul.endSize, emitter.endSize)
        gl.uniform1f(ul.minLifetime, emitter.minLifetime)
        gl.uniform1f(ul.maxLifetime, emitter.maxLifetime)

        const mat = this.resources.materials[emitter.mat];
        if(!!mat){
            gl.bindTexture(gl.TEXTURE_2D, mat.diffuse);
        }
    }
}