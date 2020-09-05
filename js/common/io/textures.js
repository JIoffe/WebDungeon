import { KeyedMutex } from "../util/concurrency";

const texIdMap = new Map();
const texIdMutex = new KeyedMutex;

export class Textures{
    static clearCache(){
        texIdMap.clear();
    }

    static reserveDepthTexture(gl){
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
     
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);     

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 1, 1, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

        return texture;
    }

    static reserveRenderTargetTexture(gl){
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
     
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);     
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        return texture;
    }
    
    static async load(gl, src, useBilinearFiltering, generateMipMaps, flipY){
        const lock = await texIdMutex.acquire(src);
        try{
            if(texIdMap.has(src)){
                return texIdMap.get(src);
            }

            const image = new Image();
            image.src = src;
            console.log(`Downloading texture: ${src}`);

            const texId = await Textures.loadTexture2DFromImage(gl, image, useBilinearFiltering, generateMipMaps, !!flipY);
            texIdMap.set(src, texId);

            return texId;
        }
        finally{
            lock.release();
        }
    }

    static loadTexture2DFromImage(gl, image, useBilinearFiltering, generateMipMaps, flipY = true){
        return new Promise((resolve, reject) => {
            const processTask = () => {
                const tex = gl.createTexture();
    
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
                let magFilter, minFilter;
                if(!!useBilinearFiltering){
                    magFilter = gl.LINEAR;
                    minFilter = !!generateMipMaps ? gl.LINEAR_MIPMAP_NEAREST : gl.LINEAR;
                }else{
                    magFilter = gl.NEAREST;
                    minFilter = gl.NEAREST;
                }
    
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);					
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    
                if(generateMipMaps)
                    gl.generateMipmap(gl.TEXTURE_2D);
                
                gl.bindTexture(gl.TEXTURE_2D, null);     
                resolve(tex);
            };
    
            if(!!image.complete){
                processTask();
            }else{
                image.onload = processTask;
            }

            image.onerror = () => reject();
        });
    }

    static async loadCubemap(gl, ...texPaths){
        const src = texPaths[0];
        const lock = await texIdMutex.acquire(src);
        try{
            if(texIdMap.has(src)){
                return texIdMap.get(src);
            }

            const image = new Image();
            image.src = src;
            console.log(`Downloading cubemap: ${src}`);

            const texId = await Textures.loadCubemapFromImages(gl, ...texPaths);
            texIdMap.set(src, texId);

            return texId;
        }
        finally{
            lock.release();
        }
    }

    static loadCubemapFromImages(gl, ...texPaths){
        //assumes texpaths in the following order:
        //+X,-X,+Y,-Y,+Z,-Z
        return new Promise((resolve, reject) => {
            const texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
            let faceTargets = [gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
                gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];

            let imgPromises = texPaths
                .map((path, i) => new Promise((resolve, reject) => {
                    let img = new Image();
                    img.onload = () => {
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                        
                        gl.texImage2D(faceTargets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);   
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                        resolve();
                    }
                    img.src = path;
                }));
    
            Promise.all(imgPromises).then(() => resolve(texture));
        })
    }
}