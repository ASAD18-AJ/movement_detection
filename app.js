let prevFrameData = null;
const movementThreshold = 1000; // Adjust based on sensitivity
const analysisInterval = 1500; // 1.5 seconds in milliseconds

async function setupCamera() {
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise(resolve => video.onloadedmetadata = resolve);
}

function calculateFrameDifference(currentFrameData) {
    if (!prevFrameData) return 0;

    let difference = 0;

    for (let i = 0; i < currentFrameData.data.length; i += 4) {
        const rDiff = Math.abs(currentFrameData.data[i] - prevFrameData[i]);
        const gDiff = Math.abs(currentFrameData.data[i + 1] - prevFrameData[i + 1]);
        const bDiff = Math.abs(currentFrameData.data[i + 2] - prevFrameData[i + 2]);
        difference += rDiff + gDiff + bDiff;
    }

    return difference;
}

function drawTextureAndEdges(frame, canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const video = document.getElementById('video');

    // Draw the video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image data from the canvas
    const currentFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (prevFrameData) {
        const diff = calculateFrameDifference(currentFrameData);

        // Print if the image is live or static
        if (diff > movementThreshold) {
            console.log('Image is live');
        } else {
            console.log('Image is static or just a picture');
        }
    }

    // Store the current frame data for comparison in the next iteration
    prevFrameData = new Uint8ClampedArray(currentFrameData.data);

    // Convert to cv.Mat for texture and edge detection
    const srcMat = cv.matFromImageData(currentFrameData);

    // Convert to grayscale
    const grayMat = new cv.Mat();
    cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);

    // Apply GaussianBlur
    const blurredMat = new cv.Mat();
    cv.GaussianBlur(grayMat, blurredMat, new cv.Size(5, 5), 0);

    // Detect edges using Canny
    const edgesMat = new cv.Mat();
    cv.Canny(blurredMat, edgesMat, 100, 200);

    // Prepare edgesMat to be drawn on canvas
    const edgesCanvasMat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC1);
    cv.cvtColor(edgesMat, edgesCanvasMat, cv.COLOR_GRAY2RGBA);
    
    // Convert the edgesCanvasMat to ImageData
    const edgesData = new ImageData(new Uint8ClampedArray(edgesCanvasMat.data), edgesCanvasMat.cols, edgesCanvasMat.rows);
    
    // Draw edges on canvas
    ctx.putImageData(edgesData, 0, 0);

    // Clean up
    srcMat.delete();
    grayMat.delete();
    blurredMat.delete();
    edgesMat.delete();
    edgesCanvasMat.delete();
}

function analyzeFrame(canvas) {
    const video = document.getElementById('video');
    drawTextureAndEdges(video, canvas);

    // Set a timeout to call analyzeFrame again after the interval
    setTimeout(() => analyzeFrame(canvas), analysisInterval);
}

async function main() {
    await setupCamera();

    const canvas = document.getElementById('canvas');

    // Start analyzing frames with a delay
    analyzeFrame(canvas);
}

main();
