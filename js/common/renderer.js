import {mat4, vec3, quat, mat3} from 'gl-matrix'
import { ShaderProgram } from '../shaders/shader-program';
import { VertexShaders, FragmentShaders } from '../shaders/glsl';
import { BufferWrapper } from './rendering/buffers';
import { WebGLResourceManager, VERTEX_STRIDE_ACTORS } from './rendering/resource-management';
import { AnimationController } from './rendering/animation';

const NEAR_CLIP = 0.1;
const FAR_CLIP = 100;
const FOV = 60;

var gl = null;
//Buffered references for transforms
var matMVP = mat4.create();
var matVP = mat4.create();

//INFO ON VERTEX FORMATS:
//LEVEL VERTEX DATA - 24 Bytes
//Interleaved: 3 * 4 bytes for POSITION (12)
//             2 * 2 bytes, normalized for TEX COORDS (4) => 16
//             4 * 1 byte, signed byte for NORMAL (4) => 20 (3 bytes data, 1 byte padding)
//             4 * 1 byte, signed byte for TANGENT (4) => 24 (3 bytes data, 1 byte padding)


const testAnimationController = new AnimationController();

export class Renderer{
    constructor(viewportCanvas){
        this.canvas = viewportCanvas;
        gl = viewportCanvas.getContext("webgl2");
        if(!gl){
            throw 'System does not support Webgl2';
        }

        this.resources = new WebGLResourceManager(gl);

        console.log('Initialized WebGL Renderer');

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
        gl.useProgram(shader.program);
        gl.uniformMatrix4fv(shader.uniformLocations.matMVP, false, matVP);

        //Bind common state for all skinned characters
        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.actorsVBuffer);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE_ACTORS, 0); //POS
        gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, VERTEX_STRIDE_ACTORS, 12); // VERTEX GROUPS (BONES)
        gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE_ACTORS, 16); // WEIGHTS

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.resources.actorsIBuffer);

        //Now go through the actors and see what's going on
        //let mesh = this.resources.meshes.get('animtest');
        let mesh = this.resources.meshes.get('dugeon_player');
        if(!!mesh){
            //Bine bone texture if it exists
            if(!!this.resources.armatures.has('ARMATURE')){
                const a = this.resources.armatures.get('ARMATURE');
                if(!testAnimationController.anim){
                    testAnimationController.set(a.animations[4]);
                }

                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, a.tex);
                gl.uniform1i(shader.uniformLocations.boneTex, 2);

                const kf = testAnimationController.loop(dT * 0.02);
                gl.uniform3fv(shader.uniformLocations.keyframes, kf);
            }


            let i = mesh.length;
            while(i--) gl.drawElements(gl.TRIANGLES, mesh[i][0], gl.UNSIGNED_SHORT, mesh[i][1]);
        }
    }
}