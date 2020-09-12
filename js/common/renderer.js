import {mat4, vec3, quat, mat3} from 'gl-matrix'
import { WebGLResourceManager } from './rendering/resource-management';
import { VERTEX_STRIDE_ACTORS, VERTEX_STRIDE_STATIC } from './rendering/mesh/mesh-constants';
import { Textures } from './io/textures';

const NEAR_CLIP = 0.1;
const FAR_CLIP = 100;
const FOV = 60;

var gl = null;
//Buffered references for transforms
var matMVP = mat4.create();
var matVP = mat4.create();
var matV = mat4.create();

var matLight = mat4.create();

const MAX_TO_RENDER = 512;
var pvs = new Array(MAX_TO_RENDER);

const SHADOWMAP_SIZE = 512;

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
    }

    render(scene, camera, time, dT){
        //Rebuild the projection and viewport with every
        //frame, just in case of resize.
        //This causes a small performance hit but is always correct.
        const rect = this.canvas.getBoundingClientRect(),
              w    = rect.right - rect.left,
              h    = rect.bottom - rect.top;

        const shaders = this.resources.shaders;
        let shader;
        let arm;

        this.canvas.setAttribute('width', '' + w);
        this.canvas.setAttribute('height', '' + h);

        //Recover if context is lost
        if(!gl){
            gl = canvas.getContext("webgl2");
        }

        ////////////////////////////////////////////////////////////
        // SHADOW PASS
        ////////////////////////////////////////////////////////////
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO[0]);
        gl.viewport(0, 0, SHADOWMAP_SIZE, SHADOWMAP_SIZE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        shader = shaders[2];
        gl.useProgram(shader.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.actorsVBuffer.buffer);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_ACTORS, 0); //POS
        gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, VERTEX_STRIDE_ACTORS, 12); // VERTEX GROUPS (BONES)
        gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE_ACTORS, 16); // WEIGHTS

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.actorsIBuffer.buffer);

        //Render player shadows
        arm = this.resources.armatures.ARM_PLAYER;
        if(!!arm){
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, arm);
            gl.uniform1i(shader.uniformLocations.boneTex, 2);
        }

        const matLightProj = mat4.create();
        const matLightView = mat4.create();
        mat4.perspective(matLightProj, 1.5707963267948966, 1, 0.1, 500);
        mat4.lookAt(matLightView, [180, 20, 90], [180, 0, 60], [0,1,0]);
        mat4.mul(matLight, matLightProj, matLightView);

        i = scene.players.length;
        while(i--){
            const p = scene.players[i];

            //Update position in shader
            mat4.fromRotationTranslation(matMVP, p.rRot, p.pos);
            mat4.multiply(matMVP, matLight, matMVP);
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

        ///////////////////////////////////////////////////////////////
        // FORWARD PASS
        ///////////////////////////////////////////////////////////////
        gl.viewport(0, 0, w, h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.3, 0.3, 1.0, 1.0);
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
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_ACTORS, 0); //POS
        gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, VERTEX_STRIDE_ACTORS, 12); // VERTEX GROUPS (BONES)
        gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE_ACTORS, 16); // WEIGHTS
        gl.vertexAttribPointer(3, 2, gl.UNSIGNED_SHORT, true, VERTEX_STRIDE_ACTORS, 20); // UVs

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.actorsIBuffer.buffer);

        //Bind shadowmap
        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(shader.uniformLocations.shadowTex, 3);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowFBO[1])
        gl.uniformMatrix4fv(shader.uniformLocations.matLight, false, matLight);

        //RENDER ALL PLAYERS - assume players are always visible
        arm = this.resources.armatures.ARM_PLAYER;
        if(!!arm){
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, arm);
            gl.uniform1i(shader.uniformLocations.boneTex, 2);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(shader.uniformLocations.diffuse, 0);
        gl.uniformMatrix4fv(shader.uniformLocations.matViewProj, false, matVP);

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


        /////////////////////////////////////////////////////////////
        // STATIC GEOMETRY
        /////////////////////////////////////////////////////////////
        shader = shaders[1];
        gl.useProgram(shader.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.staticVBuffer);
        gl.disableVertexAttribArray(2);
        gl.disableVertexAttribArray(3);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_STATIC, 0); //POS
        gl.vertexAttribPointer(1, 2, gl.UNSIGNED_SHORT, true, VERTEX_STRIDE_STATIC, 12); // UVs

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.staticIBuffer);

        //Bind shadowmap
        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(shader.uniformLocations.shadowTex, 3);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowFBO[1])
        
        //Draw all level tiles
        gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matVP);
        gl.uniformMatrix4fv(shader.uniformLocations.matLight, false, matLight);
    
        if(!!scene.level){
            //Set static geometry texture (atlas)
            const mat = this.resources.materials['test_level'];

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(shader.uniformLocations.diffuse, 0);
            gl.bindTexture(gl.TEXTURE_2D, mat.diffuse);
            
            if(!!scene.level.tiles){
                const m = this.resources.meshes['test_level'];

                let x = scene.level.w;
                while(x--){
                    let y = scene.level.h;
                    while(y--){
                        let i = x + y * scene.level.w;
                        const t = scene.level.tiles[i];

                        gl.uniform2f(shader.uniformLocations.offset, x * scene.level.spacing, y * scene.level.spacing);
                        gl.drawElements(gl.TRIANGLES, m[t][0], gl.UNSIGNED_SHORT, m[t][1]);
                    }
                }
            }
        }
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
}