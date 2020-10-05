class AnimationController{
    constructor(animations){
        this.animations = animations;
        this.frame = 0;
        this.speed = 1.;
        this.isPlaying = false;

        this.tween = new Float32Array(3);
    }

    /**
     * Switches animation tracks for this controller
     * @param {string} trackName 
     */
    set(trackName, speed){
        this.anim = this.animations[trackName];
        this.frame = 0;
        this.isPlaying = true;
        if(!!speed)
            this.speed = speed
    }

    /**
     * returns vec3 with frames to interpolate in [0] and [1] and interpolation amount in [2]
     * @param {number} delta delta time in MS
     */
    loop(delta){
        //should technically never hit the last frame directly
        this.frame = (this.frame + delta * this.speed) % this.anim.maxFrame;
        for(let i = this.anim.keyframes.length - 2; i >= 0; --i){
            const k0 = this.anim.keyframes[i];
            if(k0 <= this.frame){
                const k1 = this.anim.keyframes[i + 1];
                this.tween[0] = i + this.anim.rowOffset;
                this.tween[1] = this.tween[0] + 1;
                this.tween[2] = (this.frame - k0) / (k1 - k0);
                return this.tween;
            }
        }
    }

    /**
     * returns vec3 with frames to interpolate in [0] and [1] and interpolation amount in [2]
     * --Will stop at end of animation
     * @param {number} delta delta time in MS
     */
    play(delta){
        if(!this.isPlaying)
            return this.tween;
        
        this.frame += delta * this.speed;
        if(this.frame >= this.anim.maxFrame){
            this.isPlaying = false;
            this.frame = this.anim.maxFrame           
            this.tween[0] = this.anim.keyframes.length - 1 + this.anim.rowOffset
            this.tween[1] = this.tween[0];
            this.tween[2] = 0;
            return this.tween;
        }

        for(let i = this.anim.keyframes.length - 2; i >= 0; --i){
            const k0 = this.anim.keyframes[i];
            if(k0 <= this.frame){
                const k1 = this.anim.keyframes[i + 1];
                this.tween[0] = i + this.anim.rowOffset;
                this.tween[1] = this.tween[0] + 1;
                this.tween[2] = (this.frame - k0) / (k1 - k0);
                return this.tween;
            }
        }        
    }
}

class AnimationSingleton{
    constructor(){
        this.animations = {}
    }

    onAssetLoaded(asset){
        switch(asset.type){
            case 'ARMATURE':
                this.parseArmatures(asset);
                break;
            default:
                break;
        }
    }

    parseArmatures(...assets){
        assets.filter(a => a.type === 'ARMATURE')
            .forEach(armature => {
                const animations = {};
                let rowOffset = 0;
                armature.animations.forEach(anim => {
                    animations[anim.name] = {
                        keyframes: anim.keyframes.map(kf => kf - 1),
                        maxFrame: anim.keyframes.reduce((p, c) => Math.max(p, c - 1), 0),
                        rowOffset: rowOffset
                    }

                    rowOffset += anim.keyframes.length;
                });

                this.animations[armature.name] = animations;
                
                console.log(`Parsed animation controller data for ${armature.name}: ${armature.animations.length} animation(s)`);
            });
    }

    getInstance(animationName){
        return new AnimationController(this.animations[animationName]);
    }

    refreshInstance(ac, animationName){
        ac.animations = this.animations[animationName];
    }
}

export const Animations = new AnimationSingleton();