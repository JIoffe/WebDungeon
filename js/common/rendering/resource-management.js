import { ShaderProgram } from "../../shaders/shader-program";
import { VertexShaders, FragmentShaders } from "../../shaders/glsl";
import { Textures } from "../io/textures";
import { RestClient } from "../http/rest-client";
import { PooledBuffer } from "./pooled-buffer";
import { MessageBus } from "../messaging/message-bus";
import { MessageType } from "../messaging/message-type";
import { KeyedMutex } from "../util/concurrency";
import { parseActorMeshes, parseStaticMeshes } from "./mesh/mesh-parsing";
import { Animations } from "./animation";

const assetMutex = new KeyedMutex

export class WebGLResourceManager{
    constructor(gl){
        this.gl = gl;

        //For things that move around
        this.actorsVBuffer = new PooledBuffer(gl, gl.ARRAY_BUFFER);
        this.actorsIBuffer = new PooledBuffer(gl, gl.ELEMENT_ARRAY_BUFFER)

        //For statics like level geometry and decorations
        this.staticVBuffer = gl.createBuffer();
        this.staticIBuffer = gl.createBuffer();

        this.assets = {};
        
        this.shaders = [];
        this.meshes = {};
        this.materials = {};

        this.armatures = {};

        this.noiseTex = null;

        MessageBus.subscribe(MessageType.PLAYER_ADDED, data => this.onPlayerAdded(data))
        MessageBus.subscribe(MessageType.ASSET_DOWNLOADED, asset => this.onAssetLoaded(asset));
        MessageBus.subscribe(MessageType.ACTOR_ADDED, data => this.onActorAdded(data));
    }

    init(){
        //Load basic shaders
        const gl = this.gl;
        //SKINNED CHARACTERS - like player characters, enemies
        //this.shaders.push(new ShaderProgram(gl, VertexShaders.skinnedmesh, FragmentShaders.textured_lit));
        this.shaders.push(new ShaderProgram(gl, VertexShaders.skinnedmesh, FragmentShaders.textured_lit_pcf));

        //Static level tileset geometry
        //this.shaders.push(new ShaderProgram(gl, VertexShaders.staticlevel, FragmentShaders.textured_lit));
        this.shaders.push(new ShaderProgram(gl, VertexShaders.staticlevel, FragmentShaders.textured_lit_pcf));

        //Shadows - skinned
        this.shaders.push(new ShaderProgram(gl, VertexShaders.skinnedmesh_shadow, FragmentShaders.white));

        //Particle effects
        this.shaders.push(new ShaderProgram(gl, VertexShaders.particle, FragmentShaders.textured));

        this.noiseTex = Textures.makeSomeNoise(gl, 256);
    }

    onPlayerAdded(data){
        //Parse the player data to see if we want for anything
        data.gear.filter(slot => !!slot).forEach(slot => this.downloadAsset(`/assets/gear_defs/${slot}.json`));
    }

    onActorAdded(data){
        if(!data)
            return;

        data.filter((actor, i) => data.findIndex(a => a.type === actor.type) === i)
            .forEach(actor => this.downloadAsset(`/assets/actor_defs/${actor.type}.json`));
    }

    async downloadAsset(path){
        const asset = await RestClient.getJSON(path);
        await this.onAssetLoaded(asset);
        return asset;
    }

    async onAssetLoaded(asset){
        switch(asset.type){
            case 'ASSETDEF':
                await this.parseAssetDef(asset);
                break;
            case 'ARMATURE':
                await this.parseArmatures(asset);
                break;
            case 'MATERIAL':
                await this.parseMaterials(asset);
                break;
            case 'MESH':
            case 'SUBMESH':
                this.parseMeshes(asset);
                break;
            default:
                break;
        }
    }

    async parseMeshes(...meshes){
        let i = meshes.length;
        while(i--){
            const mesh = meshes[i];

            const submeshes = mesh.submeshes || [mesh];

            const hasUVs = !!submeshes.find(s => !!s.uvs && !!s.uvs.length);
            const hasWeights = !!submeshes.find(s => !!s.weights && !!s.weights.length && !!s.weights.find(w => !!w && !!w.length));

            let meshResult = {};
            if(hasUVs && hasWeights){
                meshResult = parseActorMeshes(this.actorsVBuffer, this.actorsIBuffer, mesh);
            }else{
                meshResult = parseStaticMeshes(this.gl, this.staticVBuffer, this.staticIBuffer, mesh);
            }

            this.meshes = {...this.meshes, ...meshResult};
        }
    }

    async parseAssetDef(def){
        const lock = await assetMutex.acquire(def.name);

        try{
            if(!!this.assets[def.name])
                return;

            const mesh = await this.downloadAsset(def.mesh);
            const mat = await this.downloadAsset(def.mat);

            this.assets[def.name] = {
                mat: this.materials[mat.name],
                mesh: this.meshes[mesh.name]
            };

            //Add armature if one is defined
            if(!!def.arm){
                const arm = await this.downloadAsset(def.arm);
                this.assets[def.name].arm = this.armatures[arm.name];
            }
        }
        finally{
            lock.release();
        }
    }

    async parseMaterials(...materials){
        materials = materials.filter(a => a.type === 'MATERIAL');

        let i = materials.length;
        while(i--){
            const asset = materials[i];
            console.log(`Processing material: ${asset.name}`);

            const texPtrs = {}
            const textureTypes = Object.keys(asset.textures);

            let j = textureTypes.length;
            while(j--) {
                const k = textureTypes[j];
                texPtrs[k] = await Textures.load(this.gl, asset.textures[k].src, 
                    !!asset.textures[k].bilinear, !!asset.textures[k].genmips, !!asset.textures[k].yflip);
            }
            this.materials[asset.name] = texPtrs;
        }
    }

    parseArmatures(...assets){
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
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

            //Using 32Bit float format for now    
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0,
                gl.RGBA, gl.FLOAT, data);

            //No mipmaps or filtering for data texture, only read in vertex shader with texel lookup
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            this.armatures[armature.name.toUpperCase()] = dataTexture;
            console.log(`Created data texture for ${armature.name}`);
        }
             
        Animations.parseArmatures(...armatureAssets);
    }
}