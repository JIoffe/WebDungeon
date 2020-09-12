import { Attributes, Uniforms } from './shader-program'

export const VertexShaders = {
    staticlevel:
    `#version 300 es
    
    in vec4 ${Attributes.Pos};
    in vec2 ${Attributes.Tex};

    uniform vec2 ${Uniforms.offset};
    uniform mat4 ${Uniforms.matMVP};

    out vec3 vPosWorld;
    out vec2 vTexCoords;
    
    void main(){
        vec4 pos = ${Attributes.Pos} + vec4(${Uniforms.offset}.x, 0, ${Uniforms.offset}.y, 0);
        gl_Position = ${Uniforms.matMVP} * pos;

        //pass through tex coords
        vTexCoords = ${Attributes.Tex};
        vPosWorld = pos.xyz;
    }
    `,

    skinnedmesh:
    `#version 300 es
    
    in vec4 ${Attributes.Pos};
    in vec4 ${Attributes.Groups};
    in vec4 ${Attributes.Weights};
    in vec2 ${Attributes.Tex};

    uniform mat4 ${Uniforms.matViewProj};
    uniform mat4 ${Uniforms.matWorld};
    uniform sampler2D ${Uniforms.boneTex};
    uniform vec3 ${Uniforms.keyframes};

    out vec2 vTexCoords;
    out vec3 vPosWorld;

    //Texture arrangement:
    //ROW = FRAME, ie. there are as many rows as there are frames of animation
    //--------------------------------------------------------
    // B1 Row 1 | B1 Row 2 | B1 Row 3 | B1 Row 4 | B2 Row 1 ....
    //--------------------------------------------------------

    void main(){
        //Apply mesh deform in local space
        vec4 weights = normalize(${Attributes.Weights});

        vec4 deform0;
        vec4 deform1;

        //First Keyframe
        int row = int(${Uniforms.keyframes}.x);
        mat4 m;
        for(int i = 0; i < 4; ++i){
            int boneX = int(${Attributes.Groups}[i]) << 2;

            m[0] = texelFetch(${Uniforms.boneTex}, ivec2(boneX, row), 0);
            m[1] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+1, row), 0);
            m[2] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+2, row), 0);
            m[3] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+3, row), 0);

            deform0 += (m * ${Attributes.Pos}) * weights[i];
        }

        //Second Keyframe
        row = int(${Uniforms.keyframes}.y);
        for(int i = 0; i < 4; ++i){
            int boneX = int(${Attributes.Groups}[i]) << 2;

            m[0] = texelFetch(${Uniforms.boneTex}, ivec2(boneX, row), 0);
            m[1] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+1, row), 0);
            m[2] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+2, row), 0);
            m[3] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+3, row), 0);

            deform1 += (m * ${Attributes.Pos}) * weights[i];
        }

        //Finally apply the full transform
        vec4 pos = ${Uniforms.matWorld} * mix(deform0, deform1, ${Uniforms.keyframes}.z);
        gl_Position = ${Uniforms.matViewProj} * pos;

        //pass through tex coords
        vTexCoords = ${Attributes.Tex};
        vPosWorld = pos.xyz / pos.w;
    }
    `,

    skinnedmesh_shadow:
    `#version 300 es
    
    in vec4 ${Attributes.Pos};
    in vec4 ${Attributes.Groups};
    in vec4 ${Attributes.Weights};

    uniform mat4 ${Uniforms.matMVP};
    uniform sampler2D ${Uniforms.boneTex};
    uniform vec3 ${Uniforms.keyframes};

    //Texture arrangement:
    //ROW = FRAME, ie. there are as many rows as there are frames of animation
    //--------------------------------------------------------
    // B1 Row 1 | B1 Row 2 | B1 Row 3 | B1 Row 4 | B2 Row 1 ....
    //--------------------------------------------------------

    void main(){
        //Apply mesh deform in local space
        vec4 weights = normalize(${Attributes.Weights});

        vec4 deform0;
        vec4 deform1;

        //First Keyframe
        int row = int(${Uniforms.keyframes}.x);
        mat4 m;
        for(int i = 0; i < 4; ++i){
            int boneX = int(${Attributes.Groups}[i]) << 2;

            m[0] = texelFetch(${Uniforms.boneTex}, ivec2(boneX, row), 0);
            m[1] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+1, row), 0);
            m[2] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+2, row), 0);
            m[3] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+3, row), 0);

            deform0 += (m * ${Attributes.Pos}) * weights[i];
        }

        //Second Keyframe
        row = int(${Uniforms.keyframes}.y);
        for(int i = 0; i < 4; ++i){
            int boneX = int(${Attributes.Groups}[i]) << 2;

            m[0] = texelFetch(${Uniforms.boneTex}, ivec2(boneX, row), 0);
            m[1] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+1, row), 0);
            m[2] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+2, row), 0);
            m[3] = texelFetch(${Uniforms.boneTex}, ivec2(boneX+3, row), 0);

            deform1 += (m * ${Attributes.Pos}) * weights[i];
        }

        //Finally apply the full transform
        gl_Position = ${Uniforms.matMVP} * mix(deform0, deform1, ${Uniforms.keyframes}.z);
    }
    `,
}

export const FragmentShaders = {
    white:
    `#version 300 es
    precision mediump float;
    
    out vec4 color;
    
    void main() {
        color = vec4(1,1,1,1);
    }
    `,

    solidcolor_unlit:
    `#version 300 es
    precision mediump float;
    
    uniform float4 ${Uniforms.color};
    out vec4 color;
    
    void main() {
        color = ${Uniforms.color};
    }
    `,

    textured:
    `#version 300 es
    precision mediump float;
    
    uniform sampler2D ${Uniforms.diffuse};
    //in vec2 texCoords;
    out vec4 color;
    
    void main() {
        //color = texture(${Uniforms.diffuse}, texCoords);
        color = vec4(1,1,1,1);
    }
    `,

    textured_lit:
    `#version 300 es
    precision mediump float;
    
    uniform mat4 ${Uniforms.matLight};
    uniform sampler2D ${Uniforms.diffuse};
    uniform sampler2D ${Uniforms.shadowTex};

    in vec2 vTexCoords;
    in vec3 vPosWorld;

    out vec4 color;

    const vec3 vLightPos = vec3(180, 20, 90);
    
    void main() {
        float lighting = 1. - clamp(distance(vPosWorld, vLightPos) / 80., 0., 1.);
        color = texture(${Uniforms.diffuse}, vTexCoords);
        vec4 posInLight = ${Uniforms.matLight} * vec4(vPosWorld, 1.);
        vec3 projectedCoords = (posInLight.xyz / posInLight.w * 0.5) + vec3(.5,.5,.5);

        if(projectedCoords.x >= 0. && projectedCoords.y >= 0. && projectedCoords.x <= 1.0 && projectedCoords.y <= 1.0){
            float shadowDepth = texture(${Uniforms.shadowTex}, projectedCoords.xy).r;

            if(shadowDepth < (projectedCoords.z - 0.00008)){
                lighting = 0.;
            }
        }

        color.rgb *= lighting;

        // float shadowDepth = texture(${Uniforms.shadowTex}, shadowLookup).r;
        // float sampledDepth = posInLight.z / posInLight.w;

        // color.r = mod(sampledDepth, 0.3) / 0.3;
        // color.g = 0.;
        // color.b = 0.;

        // if(posInLight.z < 0.0)
        //     color.rgb *= 0.;
    }
    `,

    vertex_paint:
    `#version 300 es
    precision mediump float;
    
    in vec4 vColor;
    out vec4 color;
    
    void main() {
        //color = texture(${Uniforms.diffuse}, texCoords);
        color = vColor;
    }
    `,
}