import { Assets } from "../io/assets";
import { ShaderProgram } from "../../shaders/shader-program";
import { BufferWrapper } from "./buffers";
import { VertexShaders, FragmentShaders } from "../../shaders/glsl";
import { mat4 } from "gl-matrix";

//INFO ON VERTEX FORMATS:
//LEVEL VERTEX DATA - 20 Bytes
//Interleaved: 3 * 4 bytes for POSITION (12)
//             2 * 2 bytes, normalized for TEX COORDS (4) => 16
//             4 * 1 byte, signed byte for NORMAL (4) => 20 (3 bytes data, 1 byte padding)
//             4 * 1 byte, signed byte for TANGENT (4) => 24 (3 bytes data, 1 byte padding)

export const VERTEX_STRIDE_ACTORS = 20;
export const VERTEX_WEIGHT_AFFECTORS = 4;
//ACTOR VERTEX DATA - Stride 20 bytes
//INTERLEAVED: 3 * 4 bytes for POSITION (12)
//             Four Vertex Groups:
//             4 * (1 byte for vertex group index) => 16
//             4 * (1 bytes for vertex group weight) => 20


export class WebGLResourceManager{
    constructor(gl){
        this.gl = gl;

        Assets.subscribe(this);

        this.actorsVBuffer = gl.createBuffer();
        this.actorsIBuffer = gl.createBuffer();

        this.shaders = [];
        this.meshes = new Map();
        this.armatures = new Map();
    }

    init(){
        //Load basic shaders
        const gl = this.gl;
        //SKINNED CHARACTERS - like player characters, enemies
        this.shaders.push(new ShaderProgram(gl, VertexShaders.skinnedmesh, FragmentShaders.vertex_paint));
    }

    onAssetsDownloaded(assets){
        this.parseActors(assets);
        this.parseArmatures(assets);
    }

    parseActors(assets){
        const gl = this.gl;

        //The first step is to go through the data to see how much VRAM to allocate
        const actorAssets = assets.filter(a => a.type === 'MESH');
        const stride = VERTEX_STRIDE_ACTORS;

        let vertexBufferSize = 0;
        let indexArrayLength = 0;

        for(let i = 0; i < actorAssets.length; ++i){
            const asset = actorAssets[i];
            for(let j = 0; j < asset.submeshes.length; ++j){
               const submesh = asset.submeshes[j]; 

               const nVertices = Math.floor(submesh.verts.length / 3);
               vertexBufferSize += nVertices * stride;
               indexArrayLength += submesh.indices.length;
            }
        }

        const vertexBuffer = new BufferWrapper(vertexBufferSize);
        const indexArray = new Uint16Array(indexArrayLength);

        //Adjust indices to fit with what's in the VBO so far
        let indexAdjustment = 0;
        let indexOffset = 0;

        //Now populate the buffers
        for(let i = 0; i < actorAssets.length; ++i){
            const asset = actorAssets[i];
            const meshInfo = new Array(asset.submeshes.length);

            for(let j = 0; j < asset.submeshes.length; ++j){
                const submesh = asset.submeshes[j];

                const nVertices = Math.floor(submesh.verts.length / 3);
                console.log(`Parsing ${asset.name}:${submesh.name} (${nVertices} verts)...`);

                for(let k = 0; k < nVertices; ++k){
                    vertexBuffer.addFloat32(submesh.verts[k * 3], submesh.verts[k * 3 + 1], submesh.verts[k * 3 + 2]);

                    //Weights for skinning
                    if(!!submesh.weights[k]){
                        //Weights are organized: [ group, weight, group, weight, ... ]
                        const weights = submesh.weights[k];
                        let g = 0;
                        while(g < VERTEX_WEIGHT_AFFECTORS * 2){
                            vertexBuffer.addUint8(weights[g] || 0);
                            g += 2;
                        }

                        g = 1;
                        while(g < VERTEX_WEIGHT_AFFECTORS * 2){
                            vertexBuffer.addFloatAsUint8(weights[g] || 0);
                            g += 2;
                        }
                    }else{
                        //Pad with zeroes
                        let g = VERTEX_WEIGHT_AFFECTORS;
                        while(g--) vertexBuffer.addUint8(0, 0);
                    }
                }

                //indices have to be translated to be as part of the entire VBO
                let k = submesh.indices.length;
                meshInfo[j] = [k, indexOffset * 2];

                while(k--) {
                    indexArray[indexOffset++] = submesh.indices[k] + indexAdjustment;
                }

                console.log(indexAdjustment);
                indexAdjustment += nVertices;
            }

            this.meshes.set(asset.name, meshInfo);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.actorsVBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer.buffer, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.actorsIBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
    }

    parseArmatures(assets){
        const gl = this.gl;

        const armatureAssets = assets.filter(a => a.type === 'ARMATURE');
        for(let i = 0; i < armatureAssets.length; ++i){
            const armature = armatureAssets[i];
            console.log(`Parsing ${armature.name}: ${armature.bones.length} bone(s), ${armature.animations.length} animation(s)`);
            
            //Texture arrangement:
            //ROW = FRAME, ie. there are as many rows as there are frames of animation
            //--------------------------------------------------------
            // B1 Row 1 | B1 Row 2 | B1 Row 3 | B1 Row 4 | B2 Row 1 ....
            //--------------------------------------------------------
            // ie there is as many vec4 columns as there are bones * 4

            const width = armature.bones.length * 4;
            const height = armature.animations
                            .map(a => a.keyframes.length)
                            .reduce((p, c) => p + c, 0);

            const data = new Float32Array(armature.data);
            console.log(armature);

            console.log(`Length of animation data expected: ${width * height * 4} (floats). Data in file: ${armature.data.length} (floats). Matches: ${width * height * 4 === armature.data.length}`);
            console.log(`Creating RGBA Texture: ${width} x ${height}`);

            //Test matrix lookup
            // let t = mat4.create();            //Test matrix lookup
            // mat4.identity(t);
            // mat4.fromZRotation(t, 30);
            // console.log(t);
            // for(var x = 0; x < data.length; x += 16){
            //     data[x] = t[0]; data[x + 1] = t[1]; data[x + 2] = t[2]; data[x + 3] = t[3];
            //     data[x + 4] = t[4]; data[x + 5] = t[5]; data[x + 6] = t[6]; data[x + 7] = t[7];
            //     data[x + 8] = t[8]; data[x + 9] = t[9]; data[x + 10] = t[10]; data[x + 11] = t[11];
            //     data[x + 12] = t[12]; data[x + 13] = t[13]; data[x + 14] = t[14]; data[x + 15] = t[15];
            // }

            const dataTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, dataTexture);

            //Using 32Bit float format for now    
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0,
                gl.RGBA, gl.FLOAT, data);

            //No mipmaps or filtering for data texture, only read in vertex shader
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const armatureInfo = {
                name: armature.name,
                animations: armature.animations,
                bones: armature.bones,
                tex: dataTexture
            };

            //Do a little animation pre-processing
            let rowOffset = 0;
            armatureInfo.animations.forEach(anim => {
                anim.keyframes = anim.keyframes.map(kf => kf - 1);
                anim.maxFrame = anim.keyframes.reduce((p, c) => Math.max(p, c), 0);
                anim.rowOffset = rowOffset;
                rowOffset += anim.keyframes.length;
            });

            console.log(armatureInfo);

            this.armatures.set(armature.name.toUpperCase(), armatureInfo);

            console.log(`Created data texture for ${armature.name}`);
        }
    }
}