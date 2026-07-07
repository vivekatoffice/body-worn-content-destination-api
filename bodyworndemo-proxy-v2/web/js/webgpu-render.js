// js/webgpu-render.js

async function initWebGPUVisuals() {
    if (!navigator.gpu) {
        console.warn("WebGPU is not supported or enabled in this browser.");
        return;
    }

    let canvas = document.getElementById('webgpu-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'webgpu-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none';
        document.body.insertBefore(canvas, document.body.firstChild);
        document.body.style.background = 'transparent';
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: format,
        alphaMode: 'opaque'
    });

    // 1. LOAD THE LOCAL IMAGE RESOURCE AS A BITMAP CONTAINER
    let imgBitmap;
    try {
        // Pointing to your local saved asset path
        const img = new Image();
        img.src = 'img/bodycam.png';
        await img.decode();
        imgBitmap = await createImageBitmap(img);
    } catch (err) {
        console.error("Failed to load local image asset. Defaulting to standard background node patterns.", err);
        return;
    }

    // 2. CREATE A WEBGPU TEXTURE AND COPY THE BITMAP PIXELS OVER
    const imageTexture = device.createTexture({
        size: [imgBitmap.width, imgBitmap.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    device.queue.copyExternalImageToTexture(
        { source: imgBitmap, flipY: true },
        { texture: imageTexture },
        [imgBitmap.width, imgBitmap.height]
    );

    const imageSampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
    });

    const uniformBufferSize = 32;
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const shaderModule = device.createShaderModule({
        label: 'Interactive Image Matrix Shaders',
        code: `
            struct Uniforms {
                time : f32,
                mouseX : f32,
                mouseY : f32,
                resX : f32,
                resY : f32,
            };
            @group(0) @binding(0) var<uniform> u : Uniforms;
            @group(0) @binding(1) var mySampler : sampler;
            @group(0) @binding(2) var myTexture : texture_2d<f32>;

            struct VertexOutput {
                @builtin(position) position : vec4f,
                @location(0) uv : vec2f,
            };

            @vertex
            fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                var pos = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );
                var output : VertexOutput;
                output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
                output.uv = pos[vertexIndex] * 0.5 + 0.5;
                return output;
            }

            fn hash(p : vec2f) -> f32 {
                var p3 = fract(vec3f(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            @fragment
            fn fragmentMain(@location(0) uv : vec2f) -> @location(0) vec4f {
                let pixelPos = uv * vec2f(u.resX, u.resY);
                
                // INCREASED: Larger grid cell scale = significantly less elements across the viewport
                let gridScale = 280.0; 
                let gridId = floor(pixelPos / gridScale);
                let gridFrag = fract(pixelPos / gridScale); 

                let n = hash(gridId);
                let speed = 0.4; // Slightly slower float speed for cleaner layout flow
                let offset = vec2f(
                    sin(u.time * speed + n * 6.28),
                    cos(u.time * speed + n * 6.28)
                ) * 0.12;

                let targetUV = gridFrag - offset;

                let mouseUV = vec2f(u.mouseX / u.resX, 1.0 - (u.mouseY / u.resY));
                let distToMouse = distance(uv, mouseUV);

                // UPDATED: Reduced padding boundaries (0.02 instead of 0.1) so the camera image scales up larger within its cell window
                let minPadding = 0.02;
                let maxPadding = 0.98;
                let sizeSpan = maxPadding - minPadding;

                let sampledCoords = (targetUV - minPadding) / sizeSpan;
                
                let sampledColor = textureSample(myTexture, mySampler, sampledCoords);

                // Inline math bounding box verification
                let insideBox = step(minPadding, targetUV.x) * step(targetUV.x, maxPadding) * 
                                step(minPadding, targetUV.y) * step(targetUV.y, maxPadding);

                var texColor = sampledColor * insideBox;

                let spaceBg = vec3f(0.04, 0.06, 0.11);
                
                // Light up items sitting near your mouse coordinate profile
                let visibilityForce = smoothstep(0.4, 0.05, distToMouse);
                
                // Render images cleanly with a comfortable opacity balance
                let finalColor = mix(spaceBg, texColor.rgb * (0.2 + visibilityForce * 0.8), texColor.a * 0.4);

                return vec4f(finalColor, 1.0);
            }
        `
    });

    const pipeline = device.createRenderPipeline({
        label: 'Interactive Image Grid Background Pipeline',
        layout: 'auto',
        vertex: { module: shaderModule, entryPoint: 'vertexMain' },
        fragment: {
            module: shaderModule,
            entryPoint: 'fragmentMain',
            targets: [{ format: format }],
        },
    });

    // 3. ATTACH THE SAMPLER AND IMAGE TEXTURE TO THE BIND GROUP FOR PIPELINE RECOGNITION
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: imageSampler },
            { binding: 2, resource: imageTexture.createView() }
        ]
    });

    const rawUniformData = new Float32Array(8);
    let currentMouseX = -9999.0;
    let currentMouseY = -9999.0;

    window.addEventListener('mousemove', (e) => {
        currentMouseX = e.clientX * devicePixelRatio;
        currentMouseY = e.clientY * devicePixelRatio;
    });

    window.addEventListener('mouseleave', () => {
        currentMouseX = -9999.0;
        currentMouseY = -9999.0;
    });

    function frame(currentTime) {
        rawUniformData[0] = currentTime / 1000.0;
        rawUniformData[1] = currentMouseX;
        rawUniformData[2] = currentMouseY;
        rawUniformData[3] = canvas.width;
        rawUniformData[4] = canvas.height;

        device.queue.writeBuffer(uniformBuffer, 0, rawUniformData.buffer);

        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(3);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWebGPUVisuals().catch(console.error));
} else {
    initWebGPUVisuals().catch(console.error);
}