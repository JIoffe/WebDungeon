import { Attributes, Uniforms } from './shader-program'

export const VertexShaders = {
    //Used to expand a line in screen space with uniform thickness
    thickline:
    `#version 300 es
    
    in vec4 ${Attributes.Pos};
    //in vec2 ${Attributes.Tex};
    uniform mat4 ${Uniforms.matMVP};
    //out vec2 texCoords;
    
    void main(){
        gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
        //texCoords = ${Attributes.Tex};
    }
    `,
    postransformtex:
    `#version 300 es
    
    in vec4 ${Attributes.Pos};
    uniform mat4 ${Uniforms.matMVP};
    
    void main(){
        gl_Position = ${Uniforms.matMVP} * ${Attributes.Pos};
    }
    `,

    skinnedmesh:
    `#version 300 es
    
    in vec4 ${Attributes.Pos};
    in vec4 ${Attributes.Groups};
    in vec4 ${Attributes.Weights};

    uniform mat4 ${Uniforms.matMVP};
    uniform sampler2D ${Uniforms.boneTex};
    uniform vec3 ${Uniforms.keyframes};

    out vec4 vColor;

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

        vColor = vec4(smoothstep(0., .5, ${Attributes.Pos}.z),0,0,1);

        //Finally apply the full transform
        gl_Position = ${Uniforms.matMVP} * mix(deform0, deform1, ${Uniforms.keyframes}.z);
    }
    `,
}

export const FragmentShaders = {
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