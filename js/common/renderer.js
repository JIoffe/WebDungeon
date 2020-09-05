import {mat4, vec3, quat, mat3} from 'gl-matrix'
import { WebGLResourceManager } from './rendering/resource-management';
import { VERTEX_STRIDE_ACTORS } from './rendering/mesh/mesh-constants';

const NEAR_CLIP = 0.1;
const FAR_CLIP = 100;
const FOV = 60;

var gl = null;
//Buffered references for transforms
var matMVP = mat4.create();
var matVP = mat4.create();

const MAX_TO_RENDER = 512;
var pvs = new Array(MAX_TO_RENDER);

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
        // gl.enable(gl.CULL_FACE);
        // gl.cullFace(gl.BACK);
    }

    render(scene, camera, time, dT){
        //Rebuild the projection and viewport with every
        //frame, just in case of resize.
        //This causes a small performance hit but is always correct.
        const rect = this.canvas.getBoundingClientRect(),
              w    = rect.right - rect.left,
              h    = rect.bottom - rect.top;

        this.canvas.setAttribute('width', '' + w);
        this.canvas.setAttribute('height', '' + h);

        //Recover if context is lost
        if(!gl){
            gl = canvas.getContext("webgl2");
        }

        //Forward pass - cover it all
        const shaders = this.resources.shaders;
        gl.viewport(0, 0, w, h);

        gl.clearColor(0.3, 0.3, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projMatrix = camera.projectToView(w, h);
        const viewMatrix = camera.viewMatrix;
        mat4.mul(matVP, projMatrix, viewMatrix);

        let shader = shaders[0];


        /////////////////////////////////////////////////////////////
        // SKINNED ACTORS - Players, monsters, etc.
        /////////////////////////////////////////////////////////////
        //Bind common state for all skinned characters
        gl.useProgram(shader.program);
        gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matVP);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.actorsVBuffer.buffer);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_ACTORS, 0); //POS
        gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, VERTEX_STRIDE_ACTORS, 12); // VERTEX GROUPS (BONES)
        gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE_ACTORS, 16); // WEIGHTS
        gl.vertexAttribPointer(3, 2, gl.UNSIGNED_SHORT, true, VERTEX_STRIDE_ACTORS, 20); // UVs

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.actorsIBuffer.buffer);

        //RENDER ALL PLAYERS - assume players are always visible
        let arm = this.resources.armatures.ARM_PLAYER;
        if(!!arm){
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, arm);
            gl.uniform1i(shader.uniformLocations.boneTex, 2);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(shader.uniformLocations.diffuse, 0);

        i = scene.players.length;
        while(i--){
            const p = scene.players[i];
            const kf = p.anim.loop(dT * 0.02);
            gl.uniform3fv(shader.uniformLocations.keyframes, kf);

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

        // gl.activeTexture(gl.TEXTURE0);
        // //gl.bindTexture(gl.TEXTURE_2D, mat.diffuse);
        // gl.bindTexture(gl.TEXTURE_2D, this.resources.playerTexAtlas.tex)
        // gl.uniform1i(shader.uniformLocations.diffuse, 0);

        // let mat = this.resources.materials.get('mail_torso0');
        // if(!!mat){
            // gl.activeTexture(gl.TEXTURE0);
            // //gl.bindTexture(gl.TEXTURE_2D, mat.diffuse);
            // gl.bindTexture(gl.TEXTURE_2D, playerTexAtlas.tex)
            // gl.uniform1i(shader.uniformLocations.diffuse, gl.TEXTURE0);
        // }

        //Now go through the actors and see what's going on
        //let mesh = this.resources.meshes.get('animtest');
        // let mesh = this.resources.meshes.get('dungeon_player');
        // if(!!mesh){
        //     //Bine bone texture if it exists
        //     if(!!this.resources.armatures.has('ARMATURE')){
        //         const a = this.resources.armatures.get('ARM_PLAYER');
        //         if(!testAnimationController.anim){
        //             testAnimationController.set(a.animations[4]);
        //         }

        //         gl.activeTexture(gl.TEXTURE2);
        //         gl.bindTexture(gl.TEXTURE_2D, a.tex);
        //         gl.uniform1i(shader.uniformLocations.boneTex, 2);

        //         const kf = testAnimationController.loop(dT * 0.02);
        //         gl.uniform3fv(shader.uniformLocations.keyframes, kf);
        //     }


        //     let i = mesh.length;
        //     while(i--) gl.drawElements(gl.TRIANGLES, mesh[i][0], gl.UNSIGNED_SHORT, mesh[i][1]);
        // }
    }

    drawMesh(m){
        let s = m.length; //s for submesh
        while(s--) gl.drawElements(gl.TRIANGLES, m[s][0], gl.UNSIGNED_SHORT, m[s][1]);
    }
}