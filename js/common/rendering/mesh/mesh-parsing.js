import { VERTEX_STRIDE_ACTORS, VERTEX_WEIGHT_AFFECTORS } from "./mesh-constants";
import { BufferWrapper } from "../../util/array-buffer-wrapper";

/**
 * Parses meshes assets as actors with positions, uv coordinates and bone weights
 * @param {any} vertexPool pooled buffer that stores vertex data
 * @param {any} indexAdjustment pooled buffer that stores indices data
 * @param  {...any} meshes mesh asset(s)
 * @returns Object of lookups into pools for parsed mesh(es) keyed by name
 */
export function parseActorMeshes(vertexPool, indexPool, ...meshes){
    //The first step is to go through the data to see how much VRAM to allocate
    const stride = VERTEX_STRIDE_ACTORS;

    let vertexBufferSize = 0;
    let indexArrayLength = 0;

    for(let i = 0; i < meshes.length; ++i){
        const asset = meshes[i];
        const submeshes = asset.submeshes || [asset];

        for(let j = 0; j < submeshes.length; ++j){
           const submesh = submeshes[j]; 

           const nVertices = Math.floor(submesh.verts.length / 3);
           vertexBufferSize += nVertices * stride;
           indexArrayLength += submesh.indices.length;
        }
    }

    const vertexBuffer = new BufferWrapper(vertexBufferSize);
    const indexArray = new Uint16Array(indexArrayLength);

    //Adjust indices to fit with what's in the VBO so far
    //Adjust indicies by number of vertices in pool
    let indexAdjustment = vertexPool.cursor / VERTEX_STRIDE_ACTORS;
    let pooledIndexOffset = indexPool.cursor;
    let indexOffset = 0;

    //Now populate the buffers
    const meshInfoMap = {};

    for(let i = 0; i < meshes.length; ++i){
        const asset = meshes[i];
        const submeshes = asset.submeshes || [asset];

        const meshInfo = new Array(submeshes.length);

        for(let j = 0; j < submeshes.length; ++j){
            const submesh = submeshes[j];

            const nVertices = Math.floor(submesh.verts.length / 3);
            console.log(`Parsing ${asset.name}:${submesh.name} (${nVertices} verts -- POS/UV/WEIGHTS)...`);

            //BEGIN PER VERTEX DATA
            for(let k = 0; k < nVertices; ++k){
                //Position - the easiest
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

                //UV Texture coordinates
                if(!!submesh.uvs && !!submesh.uvs.length){
                    vertexBuffer.addFloatAsUint16(submesh.uvs[k * 2] || 0.0, submesh.uvs[k * 2 + 1] || 0.0);
                }else{
                    //Pad with zeroes
                    vertexBuffer.addUint16(0,0);
                }
                
            }
            //END PER VERTEX DATA

            //indices have to be translated to be as part of the entire VBO
            let k = submesh.indices.length;
            meshInfo[j] = [k, pooledIndexOffset + indexOffset * 2];

            while(k--) {
                indexArray[indexOffset++] = submesh.indices[k] + indexAdjustment;
            }
            indexAdjustment += nVertices;
        }

        meshInfoMap[asset.name] = meshInfo;
    }

    

    vertexPool.append(vertexBuffer.buffer);
    indexPool.append(indexArray);

    return meshInfoMap;
}

/**
 * Parses static meshes with positions, UV coords, Normals
 * @param {any} vertexBufferObject vertex buffer for static geometry
 * @param {any} indexBufferObject index buffer for static geometry
 * @param  {...any} meshes mesh asset(s)
 * @returns Object of lookups into pools for parsed mesh(es) keyed by name
 */
export function parseStaticMeshes(gl, vertexBufferObject, indexBufferObject, ...meshes){
    //The first step is to go through the data to see how much VRAM to allocate
    const stride = VERTEX_STRIDE_ACTORS;

    let vertexBufferSize = 0;
    let indexArrayLength = 0;

    for(let i = 0; i < meshes.length; ++i){
        const asset = meshes[i];
        const submeshes = asset.submeshes || [asset];

        for(let j = 0; j < submeshes.length; ++j){
           const submesh = submeshes[j]; 

           const nVertices = Math.floor(submesh.verts.length / 3);
           vertexBufferSize += nVertices * stride;
           indexArrayLength += submesh.indices.length;
        }
    }

    const vertexBuffer = new BufferWrapper(vertexBufferSize);
    const indexArray = new Uint16Array(indexArrayLength);

    //Adjust indices to fit with what's in the VBO so far
    let indexAdjustment = 0
    let indexOffset = 0;

    //Now populate the buffers
    const meshInfoMap = {};

    for(let i = 0; i < meshes.length; ++i){
        const asset = meshes[i];
        const submeshes = asset.submeshes || [asset];

        const meshInfo = new Array(submeshes.length);

        for(let j = 0; j < submeshes.length; ++j){
            const submesh = submeshes[j];

            const nVertices = Math.floor(submesh.verts.length / 3);
            console.log(`Parsing ${asset.name}:${submesh.name} (${nVertices} verts -- POS/UV)...`);

            //BEGIN PER VERTEX DATA
            for(let k = 0; k < nVertices; ++k){
                //Position - the easiest
                vertexBuffer.addFloat32(submesh.verts[k * 3], submesh.verts[k * 3 + 1], submesh.verts[k * 3 + 2]);

                //UV Texture coordinates
                if(!!submesh.uvs && !!submesh.uvs.length){
                    vertexBuffer.addFloatAsUint16(submesh.uvs[k * 2] || 0.0, submesh.uvs[k * 2 + 1] || 0.0);
                }else{
                    //Pad with zeroes
                    vertexBuffer.addUint16(0,0);
                }
                
            }
            //END PER VERTEX DATA

            //indices have to be translated to be as part of the entire VBO
            let k = submesh.indices.length;
            meshInfo[j] = [k, indexOffset * 2];

            while(k--) {
                indexArray[indexOffset++] = submesh.indices[k] + indexAdjustment;
            }
            indexAdjustment += nVertices;
        }

        meshInfoMap[asset.name] = meshInfo;
    }
  
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer.buffer, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

    return meshInfoMap;
}