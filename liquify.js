(function() {
  
  var canvas,
      c,
      
      image,
      image_src,
      
      //constants
      MOUSE_UPDATE_DELAY = 30,
      BRUSH_SIZE = 30,
      SMUDGE_SIZE = 4, // SMUDGE_SIZE <= BRUSH_SIZE
      LIQUIFY_CONTRAST = 0.9, // 0 to 1
      
      timer,
      canUpdate = true,
      oldMouseX = 0,
      oldMouseY = 0;
  
  //  configurator / setup
  function build() {
    canvas = canvas || document.getElementById('canvas');
    image = image || document.getElementById('image');
    
    image.onload = resetCanvas;
  }
  
  function resetCanvas() {
    // get image size once it has loaded, and init canvas afterward (dynamic canvas size)
    canvas.height = image.offsetHeight || canvas.height;
    canvas.width = image.offsetWidth || canvas.width;

    c = canvas.getContext('2d');
    
    c.drawImage(image, 0, 0);
  }
  
  //  brush functions
  function updateCoords(e) {
    var coord_x,
        coord_y;
    if(e.touches && e.touches.length == 1){ // Only deal with one finger
      var touch = e.touches[0]; // Get the information for finger #1
      coord_x = touch.pageX;
      coord_y = touch.pageY;
    } else {  // mouse
      coord_x = e.clientX;
      coord_y = e.clientY;
    }
    if (canUpdate) {
      var box = this.getBoundingClientRect(),
          cx = parseInt(coord_x - box.left),
          cy = parseInt(coord_y - box.top);
    
      
      // make sure we are within bounding box
      if (e.target.id == 'canvas') {
        liquify(cx, cy); 
      }
    
      canUpdate = false;
      
      timer = window.setTimeout(function() {
        canUpdate = true;
      }, MOUSE_UPDATE_DELAY);
    }
    
  }

  function applyContrast(o, n) {
    return ~~((1-LIQUIFY_CONTRAST) * o + LIQUIFY_CONTRAST * n);
  }

  // skew pixels based on the velocity of the mouse (dx, dy)    
  function liquify(x, y) {
    // velocity
    var dx = x - oldMouseX,
        dy = y - oldMouseY;
        
    // for next time
    oldMouseX = x;
    oldMouseY = y;
    
    // build brush box around mouse pointer
    x = x - parseInt(BRUSH_SIZE/2);
    y = y - parseInt(BRUSH_SIZE/2);

    // check bounding with a defined brush dimension
    if (x < 0 ||
        y < 0 ||
        (x + BRUSH_SIZE) >= canvas.width ||
        (y + BRUSH_SIZE) >= canvas.height) {
          return;
        }
    
    var bitmap = c.getImageData(x, y, BRUSH_SIZE, BRUSH_SIZE);
   
    // note - each pixel is 4 bytes in byte array bitmap.data
   
    // bound dx, dy within brush size
    dx = (dx > 0) ? ~~Math.min(bitmap.width/2, dx) : ~~Math.max(-bitmap.width/2, dx);
    dy = (dy > 0) ? ~~Math.min(bitmap.height/2, dy) : ~~Math.max(-bitmap.height/2, dy);

    var buffer = c.createImageData(bitmap.width, bitmap.height),
        d = bitmap.data,
        _d = buffer.data,
        bit = 0;  // running bitmap index on buffer
        
      for(var row = 0; row < bitmap.height; row++) {
        for(var col = 0; col < bitmap.width; col++) {

          // distance from center gives intensity of smear
          var xd = bitmap.width/2 - col,
              yd = bitmap.height/2 - row,
              dist = Math.sqrt(xd*xd + yd*yd),
          
              x_liquify = (bitmap.width-dist)/bitmap.width,
              y_liquify = (bitmap.height-dist)/bitmap.height,
          
          // make intensity fall off cubic (x^3)
              skewX = (dist > SMUDGE_SIZE/2) ? -dx * x_liquify*x_liquify*x_liquify : -dx,
              skewY = (dist > SMUDGE_SIZE/2) ? -dy * y_liquify*y_liquify*y_liquify : -dy;
          
              fromX = col + skewX,
              fromY = row + skewY;
          
          if (fromX < 0 || fromX > bitmap.width) {
            fromX = col;
          }
          
          if (fromY < 0 || fromY > bitmap.height) {
            fromY = row;
          }
          
          // origin bitmap index on bitmap
          var o_bit = ~~fromX * 4 +  ~~fromY * bitmap.width * 4;
          
          
          // exact copy equation - o_bit to bit:
          //o_bit = col *  4 +  row * bitmap.width * 4;
          
          // not quite sure why this occasionally is undefined
          if (d[o_bit] === undefined) {
            o_bit = bit;
          }
          
          _d[bit]     = applyContrast(d[bit], d[o_bit]);         // r
          _d[bit + 1] = applyContrast(d[bit + 1], d[o_bit + 1]); // g
          _d[bit + 2] = applyContrast(d[bit + 2], d[o_bit + 2]); // b
          _d[bit + 3] = applyContrast(d[bit + 3], d[o_bit + 3]); // a
             
          bit += 4;
        }
      }

    try {
      c.putImageData(buffer, x, y);  
    } catch(e) {
    }
    
  }
  
  
  build();
  
  // wire events...
  
  // canvas & mouse
  canvas.onmousedown = function(e) {
    canvas.onmousemove = updateCoords;
    window.clearTimeout(timer);
    canUpdate = true;
    return false; /* dont allow highlight cursor */
  };
  
  canvas.onmouseup = function() {
    canvas.onmousemove = null;
  };
  
  // touch
  canvas.ontouchstart = function(e) {
    canvas.ontouchmove = updateCoords;
    window.clearTimeout(timer);
    canUpdate = true;
    return false;
  };
  
  canvas.ontouchend = function() {
    canvas.ontouchmove = null;
  };    

  // configurator
  /*
   TODO: Replace with file input to upload images - same-origin security problem w/image data
  image_src = document.getElementById('image-src'); 
  document.getElementById('load-image').onclick = function() {
    image.src = image_src.value;
  };
  */
  document.getElementById('reset').onclick = resetCanvas;
  
})();
