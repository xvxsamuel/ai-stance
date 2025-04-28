let bodySegmentation;
let video;
let segmentation;
let circlesInside = [];
let circlesOutside = [];
let aiMode = false;
let squareProgress = 0;
let silhouetteExpansion = 0;
let startupTimer = 0;

// Throttle circle spawning
let spawnThrottle = 0;
const spawnDelayFrames = 3;

// Console log setup
const logContainer = document.getElementById("console-log-container");
const robotImage = document.getElementById("robot-image");

// Console message function
function addConsoleMessage(text) {
  const newMessage = document.createElement("p");
  newMessage.innerText = `> ${text}`;
  newMessage.classList.add("console-message");
  logContainer.append(newMessage);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Initial console message
addConsoleMessage("Displaying your creativity...");

// p5.js setup
let options = {
  maskType: "person"
};

function preload() {
  bodySegmentation = ml5.bodySegmentation("SelfieSegmentation", options);
}

function setup() {
  canvas = createCanvas(640, 480);
  canvas.parent("video-container");
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  bodySegmentation.detectStart(video, gotResults);
  
  document.getElementById("ai-button").addEventListener("click", () => {
    if (aiMode) {
      addConsoleMessage("I'm afraid I can't do that.");
    } else {
      document.getElementById("ai-button").innerText = "Deactivate AI Friend"
      aiMode = true;
      silhouetteExpansion = 0;
      squareProgress = 0;
      addConsoleMessage("Unleashing your creative potential!");
    }
  });
}

function draw() {
  //background(0); 🈴
  // Startup delay to show button
  if (startupTimer < 600) {
    startupTimer += 1;
    if (startupTimer === 180) {
      addConsoleMessage("Move around! Show off your creativity!");
    }
    if (startupTimer === 420) {
      addConsoleMessage("Want me to help? I can make it better!");
      document.getElementById("ai-button").style.display = "block";
    }
  }

  if (segmentation) {
    let maskImg = segmentation.mask;
    maskImg.loadPixels();
    
    // Update silhouette expansion in AI mode
    if (aiMode) {
      if (silhouetteExpansion < 100) {
        silhouetteExpansion += 0.35;
        if (silhouetteExpansion > 10 && silhouetteExpansion < 10.35) {
          addConsoleMessage("AI expanding your creative boundaries.");
        }
        if (silhouetteExpansion > 50 && silhouetteExpansion < 50.35) {
          addConsoleMessage("AI is realizing your creative potential...");
        }
        if (silhouetteExpansion > 90 && silhouetteExpansion < 90.35) {
          addConsoleMessage("AI detected irregularities in your creativity.");
        }
      } else if (squareProgress < 1) {
        squareProgress += 0.005;
        squareProgress = Math.min(squareProgress, 1);  // Clamp just in case it would ruin the square transition
        
        if (Math.abs(squareProgress - 0.04) < 0.001) {
          robotImage.src = "robot_angry.png";
          addConsoleMessage("AI optimization in progress: standardizing creativity.");
        }
        
        if (squareProgress === 1) {
          addConsoleMessage("AI has optimized your creativity successfully.");
          robotImage.src = "robot_happy.png";
        }
      }
    }

    let validPointsInside = [];
    let validPointsOutside = [];
    
    // Create color transition mask for gradual expansion from center
    let colorTransitionMask = createImage(width, height);
    if (aiMode) {
      colorTransitionMask = createCenterExpandMask(maskImg, silhouetteExpansion);
      colorTransitionMask.loadPixels();
    }

    // Get valid points inside and outside silhouette
    let effectiveMask = maskImg;
    let sampleStep = 3;
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        let index = (y * width + x) * 4;
        if (index < effectiveMask.pixels.length && effectiveMask.pixels[index + 3] > 0) {
          validPointsInside.push({ x, y });
        } else {
          validPointsOutside.push({ x, y });
        }
      }
    }

    // Throttled spawning
    if (spawnThrottle === 0) {
      let batchSize = 400;
      for (let i = 0; i < batchSize; i++) {
        if (validPointsInside.length > 0) {
          let point = random(validPointsInside);
          
          let isColorful = false;
          if (aiMode) {
            // Check if point is in the colorful transition area
            let index = (int(point.y) * width + int(point.x)) * 4;
            isColorful = index < colorTransitionMask.pixels.length && 
                          colorTransitionMask.pixels[index + 3] > 0;
          }
          
          circlesInside.push(createCircle(point.x, point.y, isColorful));
        }

        if (validPointsOutside.length > 0) {
          let point = random(validPointsOutside);
          circlesOutside.push(createCircle(point.x, point.y, true));
        }
      }
    }

    // Increment frame-based spawn delay
    spawnThrottle = (spawnThrottle + 1) % spawnDelayFrames;
    
    let maxCircles = 500;
    if (circlesInside.length > maxCircles) circlesInside.splice(0, circlesInside.length - maxCircles);
    if (circlesOutside.length > maxCircles) circlesOutside.splice(0, circlesOutside.length - maxCircles);

    drawCircles(circlesInside, validPointsInside, maskImg);
    drawCircles(circlesOutside, validPointsOutside, maskImg);
  }
}

// Function to create a mask that expands from center within the silhouette
function createCenterExpandMask(originalMask, expansionAmount) {
  let expandedMask = createImage(width, height);
  expandedMask.loadPixels();
  
  let centerX = width / 2;
  let centerY = height / 2;
  let maxDistance = dist(0, 0, width/2, height/2); // maximum distance from center
  let expansionRadius = map(expansionAmount, 0, 100, 0, maxDistance);
  
  originalMask.loadPixels();
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let index = (y * width + x) * 4;
      
      // Only process points inside the original silhouette
      if (originalMask.pixels[index + 3] > 0) {
        let distFromCenter = dist(x, y, centerX, centerY);
        
        // If point is within the expanding radius from center
        if (distFromCenter < expansionRadius) {
          expandedMask.pixels[index] = 255;
          expandedMask.pixels[index + 1] = 255;
          expandedMask.pixels[index + 2] = 255;
          expandedMask.pixels[index + 3] = 255;
        } else {
          expandedMask.pixels[index] = 0;
          expandedMask.pixels[index + 1] = 0;
          expandedMask.pixels[index + 2] = 0;
          expandedMask.pixels[index + 3] = 0;
        }
      } else {
        // Outside the silhouette
        expandedMask.pixels[index] = 0;
        expandedMask.pixels[index + 1] = 0;
        expandedMask.pixels[index + 2] = 0;
        expandedMask.pixels[index + 3] = 0;
      }
    }
  }
  
  expandedMask.updatePixels();
  return expandedMask;
}

// Expand silhouette
function expandSilhouette(originalMask, expansionAmount) {
  let expandedMask = createImage(width, height);
  expandedMask.loadPixels();
  // Expansion variables
  let maxRadius = 150;
  let expandRadius = map(expansionAmount, 0, 100, 0, maxRadius);
  let step = 3;
  // Find original silhouette points and boundary points
  let silhouettePoints = [];
  let boundaryPoints = [];
  originalMask.loadPixels();
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let index = (y * width + x) * 4;
      // If point is inside original silhouette
      if (index < originalMask.pixels.length && originalMask.pixels[index + 3] > 0) {
        silhouettePoints.push({x, y});
        // Copy original silhouette to expanded mask
        expandedMask.pixels[index] = 255;
        expandedMask.pixels[index + 1] = 255;
        expandedMask.pixels[index + 2] = 255;
        expandedMask.pixels[index + 3] = 255;
        // Check if this point is near the boundary
        let isBoundary = false;
        for (let ny = -step; ny <= step; ny += step) {
          for (let nx = -step; nx <= step; nx += step) {
            if (nx === 0 && ny === 0) continue;
            let newX = x + nx;
            let newY = y + ny;
            if (newX < 0 || newX >= width || newY < 0 || newY >= height) continue;
            let neighborIdx = (newY * width + newX) * 4;
            if (neighborIdx < originalMask.pixels.length && originalMask.pixels[neighborIdx + 3] === 0) {
              isBoundary = true;
              break;
            }
          }
          if (isBoundary) break;
        }
        if (isBoundary) {
          boundaryPoints.push({x, y});
        }
      }
    }
  }

  // Expansion based on boundary points and controlled by expansion amount
  for (let boundaryPoint of boundaryPoints) {
    for (let y = max(0, boundaryPoint.y - expandRadius); y < min(height, boundaryPoint.y + expandRadius); y += step) {
      for (let x = max(0, boundaryPoint.x - expandRadius); x < min(width, boundaryPoint.x + expandRadius); x += step) {
        let d = dist(boundaryPoint.x, boundaryPoint.y, x, y);
        // Probability of expansion based on distance and overall expansion amount
        let distanceFactor = map(d, 0, expandRadius, 1, 0);
        let probabilityOfExpansion = distanceFactor * (expansionAmount / 100);
        if (d <= expandRadius && random(1) < probabilityOfExpansion) {
          let idx = (y * width + x) * 4;
          if (idx < expandedMask.pixels.length) {
            // Check if this point is not already in the original silhouette
            if (originalMask.pixels[idx + 3] === 0) {
              expandedMask.pixels[idx] = 255;
              expandedMask.pixels[idx + 1] = 255;
              expandedMask.pixels[idx + 2] = 255;
              expandedMask.pixels[idx + 3] = 255;
            }
          }
        }
      }
    }
  }
  expandedMask.updatePixels();
  return expandedMask;
}

// Circle parameters
function createCircle(x, y, isColorful) {
  let baseColor;
  if (isColorful) {
    let colorOptions = [
      [255, random(30, 255), random(30, 255)],
      [random(30, 255), 255, random(30, 255)],
      [random(30, 255), random(30, 255), 255],
      [255, 255, random(100, 255)]
    ];
    baseColor = random(colorOptions);
  } else {
    baseColor = [random(100, 150), random(100, 150), random(100, 150)];
  }

  return {
    x: x,
    y: y,
    size: random(10, 20),
    color: [...baseColor, 230],
    angle: random(TWO_PI),
    speed: random(10, 15),
    rotationSpeed: random(-0.01, 0.01),
    noiseX: random(1000),
    noiseY: random(1000),
    lifespan: 600
  };
}

// Circle logic and square transition
function drawCircles(circles) {
  for (let i = circles.length - 1; i >= 0; i--) {
    let c = circles[i];
    c.angle += c.rotationSpeed;
    let noiseFactorX = (noise(c.noiseX) - 0.5) * 2;
    let noiseFactorY = (noise(c.noiseY) - 0.5) * 2;
    c.x += noiseFactorX * c.speed;
    c.y += noiseFactorY * c.speed;
    c.noiseX += 0.003;
    c.noiseY += 0.003;
    c.lifespan -= 0.5;
    c.color[3] = map(c.lifespan, 0, 600, 0, 230);

    push();
    translate(c.x, c.y);
    rotate(c.angle);
    noStroke();

    if (aiMode && squareProgress >= 1) {
      // Fully desaturated squares for the whole screen
      let gray = (c.color[0] + c.color[1] + c.color[2]) / 3;
      fill(gray, gray, gray, c.color[3]);
      rectMode(CENTER);
      rect(0, 0, c.size, c.size);
    } else if (aiMode && squareProgress > 0) {
      // Transition phase
      let gray = (c.color[0] + c.color[1] + c.color[2]) / 3;
      let transitionColor = [
        lerp(c.color[0], gray, squareProgress),
        lerp(c.color[1], gray, squareProgress),
        lerp(c.color[2], gray, squareProgress),
        c.color[3]
      ];
      fill(transitionColor);
      
      let circleOpacity = 1 - squareProgress;
      let squareOpacity = squareProgress;
      
      // Draw fading circle
      fill(transitionColor[0], transitionColor[1], transitionColor[2], transitionColor[3] * circleOpacity);
      ellipse(0, 0, c.size);
      
      // Draw emerging squares
      fill(transitionColor[0], transitionColor[1], transitionColor[2], transitionColor[3] * squareOpacity);
      rectMode(CENTER);
      rect(0, 0, c.size, c.size);
    } else {
      // Default colorful circles
      fill(c.color);
      ellipse(0, 0, c.size);
    }

    pop();

    if (c.lifespan <= 0) {
      circles.splice(i, 1);
    }
  }
}

function gotResults(result) {
  segmentation = result;
}
