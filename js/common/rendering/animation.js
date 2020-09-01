const animationData = new Float32Array(3);

export class AnimationController{
    constructor(){
        this.anim = null;
        this.frame = 0;
    }

    set(anim){
        this.anim = anim;
        this.frame = 0;
    }

    //returns vec3 with frames to interpolate in [0] and [1] and interpolation amount in [2]
    loop(delta){
        //should technically never hit the last frame directly
        this.frame = (this.frame + delta) % this.anim.maxFrame;
        for(let i = this.anim.keyframes.length - 2; i >= 0; --i){
            const k0 = this.anim.keyframes[i];
            if(k0 < this.frame){
                const k1 = this.anim.keyframes[i + 1];
                animationData[0] = i + this.anim.rowOffset;
                animationData[1] = animationData[0] + 1;
                animationData[2] = (this.frame - k0) / (k1 - k0);
                return animationData;
            }
        }
    }
}