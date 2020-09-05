import { KeyedMutex } from "../util/concurrency";

/**
 * Maintains an atlas of textures with dynamic add/remove functionality
 * - internal format eg. gl.RGB or gl.RGBA
 */
export class TextureAtlas{
    constructor(gl, format, maxSize, bilinearFiltering, generateMipmaps){
        this.gl = gl;

        this.format = format || gl.RGB;
        this.maxSize = maxSize || gl.getParameter(gl.MAX_TEXTURE_SIZE);

        this.nodes = new Map();

        this.bilinearFiltering = bilinearFiltering;
        this.generateMipmaps = generateMipmaps;

        this.keyedMutex = new KeyedMutex();

        this.reallocate();
    }

    /**
     * Reallocates texture space in video RAM
     */
    reallocate(newSize){
        const gl = this.gl;

        if(!!this.tex){
            gl.deleteTexture(this.tex);
            console.log(`Cleared previous texture for atlas (${this.maxSize})`);
        }

        this.maxSize = newSize || this.maxSize;
        
        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
     
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        let magFilter, minFilter;
        if(!!this.bilinearFiltering){
            magFilter = gl.LINEAR;
            minFilter = !!this.generateMipmaps ? gl.LINEAR_MIPMAP_NEAREST : gl.LINEAR;
        }else{
            magFilter = gl.NEAREST;
            minFilter = gl.NEAREST;
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);					
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);   

        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.maxSize, this.maxSize, 0, this.format, gl.UNSIGNED_BYTE, null);
        gl.bindTexture(gl.TEXTURE_2D, null); 

        console.log(`Allocated texture atlas: ${this.maxSize}x${this.maxSize}`);
    }

    updateSubdata(src, x, y){
        const gl = this.gl;
        x = x || 0;
        y = y || 0;

        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, this.format, gl.UNSIGNED_BYTE, src);

        if(this.generateMipmaps){
            gl.generateMipmap(gl.TEXTURE_2D);
        }
           
        gl.bindTexture(gl.TEXTURE_2D, null); 
    }

    async addMaterial(mat){
        const diffuseRef = mat.textures.diffuse;

        const image = new Image();
        image.src = diffuseRef.src;
        console.log(`Downloading texture to atlas: ${diffuseRef.src}`);

        const texId = await Textures.loadTexture2DFromImage(gl, image, useBilinearFiltering, generateMipMaps, !!flipY);
        texIdMap.set(src, texId);

        texPtrs[k] = await Textures.load(this.gl, asset.textures[k].src, 
            !!asset.textures[k].bilinear, !!asset.textures[k].genmips, !!asset.textures[k].yflip);
    }

    async addFromUrl(src){
        const lock = await this.keyedMutex.acquire(src);
        try{
            if(this.nodes.has(src)){
                return nodes.get(src);
            }

            const image = new Image();
            image.src = src;
            console.log(`Downloading image for atlas: ${src}`);

            processTask = () => {
                let i = this.nodes.size;
                //i = x + y*w;
                let w = this.maxSize >> 8;
                
            }

            if(!!image.complete){
                processTask();
            }else{
                image.onload = processTask;
            }
        }
        finally{
            lock.release();
        }

        // const canvas = document.createElement('canvas'),
        //     ctx = canvas.getContext('2d');

        // canvas.setAttribute('width', '' + this.maxSize);
        // canvas.setAttribute('height', '' + this.maxSize);

        // ctx.fillStyle = '#FF0';
        // ctx.fillRect(0, 0, this.maxSize, this.maxSize);

        // this.updateSubdata(canvas);

        // canvas.remove();
    }
}