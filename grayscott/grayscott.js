/*
 * A solver of the Gray-Scott model of reaction diffusion.
 *
 * ©2012 pmneila.
 * p.mneila at upm.es
 * modified by Barry Becker
 */
var grayScott = (function(module){

    var canvas;  // HTML5 Canvas element
    var canvasQ;
    var canvasWidth;
    var canvasHeight;

    var mMouseX, mMouseY;
    var mMouseDown = false;

    var mRenderer;
    var mScene;
    var mCamera;
    var mUniforms;
    var mColors;
    var mColorsNeedUpdate = true;
    var mLastTime = 0;

    var mTexture1, mTexture2;
    var mGSMaterial, mScreenMaterial;
    var mScreenQuad;

    var mToggled = false;
    var mMinusOnes = new THREE.Vector2(-1, -1);
    var preset; // parameter configuration

    var startTime;
    var numFrames = 0;

    /** initialization of grayScott module */
    module.init = function() {
        preset = module.getDefaultPreset();
        initControls();
        createFullScreenBinding();

        canvasQ = $('#myCanvas');
        canvas = canvasQ.get(0);

        canvas.onmousedown = onMouseDown;
        canvas.onmouseup = onMouseUp;
        canvas.onmousemove = onMouseMove;

        mRenderer = new THREE.WebGLRenderer({canvas: canvas, preserveDrawingBuffer: true});

        mScene = new THREE.Scene();
        mCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
        mCamera.position.z = 100;
        mScene.add(mCamera);

        mUniforms = {
            screenWidth: {type: "f", value: undefined},
            screenHeight: {type: "f", value: undefined},
            tSource: {type: "t", value: undefined},
            delta: {type: "f", value: 1.0},
            feed: {type: "f", value: preset.feed},
            kill: {type: "f", value: preset.kill},
            brush: {type: "v2", value: new THREE.Vector2(-10, -10)},
            color1: {type: "v4", value: new THREE.Vector4(0, 0, 0.0, 0)},
            color2: {type: "v4", value: new THREE.Vector4(0, 1, 0, 0.2)},
            color3: {type: "v4", value: new THREE.Vector4(1, 1, 0, 0.21)},
            color4: {type: "v4", value: new THREE.Vector4(1, 0, 0, 0.4)},
            color5: {type: "v4", value: new THREE.Vector4(1, 1, 1, 0.6)}
        };
        mColors = [mUniforms.color1, mUniforms.color2, mUniforms.color3, mUniforms.color4, mUniforms.color5];
        $("#gradient").gradient("setUpdateCallback", onUpdatedColor);

        mGSMaterial = new THREE.ShaderMaterial({
                uniforms: mUniforms,
                vertexShader: document.getElementById('standardVertexShader').textContent,
                fragmentShader: document.getElementById('gsFragmentShader').textContent,
            });
        mScreenMaterial = new THREE.ShaderMaterial({
                    uniforms: mUniforms,
                    vertexShader: document.getElementById('standardVertexShader').textContent,
                    fragmentShader: document.getElementById('screenFragmentShader').textContent,
                });

        var plane = new THREE.PlaneGeometry(1.0, 1.0);
        mScreenQuad = new THREE.Mesh(plane, mScreenMaterial);
        mScene.add(mScreenQuad);

        mColorsNeedUpdate = true;

        resize(canvas.clientWidth, canvas.clientHeight);

        render(0);
        mUniforms.brush.value = new THREE.Vector2(0.5, 0.5);
        mLastTime = new Date().getTime();
        startTime = mLastTime;
        measureFPS();
        requestAnimationFrame(render);
    }

    module.loadPreset = function(idx) {
        preset = grayScott.getPreset(idx);
        worldToForm();
    }

    /**
     * Resize canvas to fullscreen, scroll to upper left
     * corner and try to enable fullscreen mode and vice-versa
     */
    module.fullscreen = function() {

        var canv = $('#myCanvas');
        var elem = canv.get(0);

        if (isFullscreen()) {
            // end fullscreen
            if (elem.cancelFullscreen) {
                elem.cancelFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }
        else {
            // save current dimensions as old
            window.oldCanvSize = {
                width : canv.width(),
                height: canv.height()
            };

            // adjust canvas to screen size
            resize(screen.width, screen.height);

            // scroll to upper left corner
            $('html, body').scrollTop(canv.offset().top);
            $('html, body').scrollLeft(canv.offset().left);

            // request fullscreen in different flavours
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        }
    }

    /**
     * Sample and show the frames per second every 3 seconds or so.
     */
    var measureFPS = function() {
        setInterval(function () {
            var currentTime = new Date().getTime();
            var numSeconds = (currentTime - startTime) / 1000.0;
            var fps = numFrames / numSeconds;
            $("#fps").text("FPS: " + fps.toFixed(1));
            startTime = currentTime;
            numFrames = 0;
        }, 2000);
    }

    var resize = function(width, height) {
        // Set the new shape of canvas.
        canvasQ.width(width);
        canvasQ.height(height);

        // Get the real size of canvas.
        canvasWidth = canvasQ.width();
        canvasHeight = canvasQ.height();

        mRenderer.setSize(canvasWidth, canvasHeight);

        // TODO: Possible memory leak?
        mTexture1 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
                            {minFilter: THREE.LinearFilter,
                             magFilter: THREE.LinearFilter,
                             format: THREE.RGBFormat,
                             type: THREE.FloatType});
        mTexture2 = new THREE.WebGLRenderTarget(canvasWidth/2, canvasHeight/2,
                            {minFilter: THREE.LinearFilter,
                             magFilter: THREE.LinearFilter,
                             format: THREE.RGBFormat,
                             type: THREE.FloatType});
        mTexture1.wrapS = THREE.RepeatWrapping;
        mTexture1.wrapT = THREE.RepeatWrapping;
        mTexture2.wrapS = THREE.RepeatWrapping;
        mTexture2.wrapT = THREE.RepeatWrapping;

        mUniforms.screenWidth.value = canvasWidth/2;
        mUniforms.screenHeight.value = canvasHeight/2;
    }

    /** passed to requestAnimationFrame to do the rendering */
    var render = function(time) {
        var dt = (time - mLastTime) / 20.0;
        if(dt > 0.8 || dt<=0)
            dt = 0.8;
        mLastTime = time;

        mScreenQuad.material = mGSMaterial;
        mUniforms.delta.value = dt;
        mUniforms.feed.value = preset.feed;
        mUniforms.kill.value = preset.kill;

        for (var i = 0; i < preset.numStepsPerFrame; ++i) {
            if (!mToggled) {
                mUniforms.tSource.value = mTexture1;
                mRenderer.render(mScene, mCamera, mTexture2, true);
                mUniforms.tSource.value = mTexture2;
            }
            else {
                mUniforms.tSource.value = mTexture2;
                mRenderer.render(mScene, mCamera, mTexture1, true);
                mUniforms.tSource.value = mTexture1;
            }

            mToggled = !mToggled;
            mUniforms.brush.value = mMinusOnes;
        }

        if (mColorsNeedUpdate)  {
            updateUniformsColors();
        }

        mScreenQuad.material = mScreenMaterial;
        mRenderer.render(mScene, mCamera);
        numFrames++;

        requestAnimationFrame(render);
    }

    var updateUniformsColors = function() {
        var values = $("#gradient").gradient("getValuesRGBS");
        for (var i=0; i<values.length; i++) {
            var v = values[i];
            mColors[i].value = new THREE.Vector4(v[0], v[1], v[2], v[3]);
        }

        mColorsNeedUpdate = false;
    }

    var onUpdatedColor = function() {
        mColorsNeedUpdate = true;
        updateShareString();
    }

    var onMouseMove = function(e) {
        var ev = e ? e : window.event;

        mMouseX = ev.pageX - canvasQ.offset().left; // these offsets work with
        mMouseY = ev.pageY - canvasQ.offset().top; //  scrolled documents too

        if(mMouseDown)  {
            mUniforms.brush.value = new THREE.Vector2(mMouseX/canvasWidth, 1-mMouseY/canvasHeight);
        }
    }

    var onMouseDown = function(e) {
        var ev = e ? e : window.event;
        mMouseDown = true;

        mUniforms.brush.value = new THREE.Vector2(mMouseX/canvasWidth, 1-mMouseY/canvasHeight);
    }

    var onMouseUp = function(e) {
        mMouseDown = false;
    }

    var clean = function() {
        mUniforms.brush.value = new THREE.Vector2(-10, -10);
    }

    var snapshot = function() {
        var dataURL = canvas.toDataURL("image/png");
        window.open(dataURL, "name-"+Math.random());
    }

    var isFullscreen = function() {
        return document.mozFullScreenElement ||
            document.webkitCurrentFullScreenElement ||
            document.fullscreenElement;
    }

    var createFullScreenBinding = function() {
        $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(ev) {
            // restore old canvas size
            if (!isFullscreen()) {
                resize(window.oldCanvSize.width, window.oldCanvSize.height);
            }
        });
    }

    var worldToForm = function() {
        $("#sld_replenishment").slider("value", preset.feed);
        $("#sld_diminishment").slider("value", preset.kill);
        $("#sld_numStepsPerFrame").slider("value", preset.numStepsPerFrame);
    }

    var initControls = function() {
        initPresetDropDown();
        $("#sld_replenishment").slider({
            value: preset.feed, min: 0, max:0.1, step:0.001,
            change: function(event, ui) {$("#replenishment").html(ui.value); preset.feed = ui.value; updateShareString();},
            slide: function(event, ui) {$("#replenishment").html(ui.value); preset.feed = ui.value; updateShareString();}
        });
        $("#sld_replenishment").slider("value", preset.feed);

        $("#sld_diminishment").slider({
            value: preset.kill, min: 0, max:0.073, step:0.001,
            change: function(event, ui) {$("#diminishment").html(ui.value); preset.kill = ui.value; updateShareString();},
            slide: function(event, ui) {$("#diminishment").html(ui.value); preset.kill = ui.value; updateShareString();}
        });
        $("#sld_diminishment").slider("value", preset.kill);

        $("#sld_numStepsPerFrame").slider({
            value: preset.numStepsPerFrame, min: 1, max:500, step:1,
            change: function(event, ui) {$("#numStepsPerFrame").html(ui.value); preset.numStepsPerFrame = ui.value; updateShareString();},
            slide: function(event, ui) {$("#numStepsPerFrame").html(ui.value); preset.numStepsPerFrame = ui.value; updateShareString();}
        });
        $("#sld_numStepsPerFrame").slider("value", preset.numStepsPerFrame);

        $('#share').keypress(function (e) {
            if (e.which == 13) {
                parseShareString();
                return false;
            }
        });

        $("#btn_clear").button({
            icons : {primary : "ui-icon-document"},
            text : false
        });
        $("#btn_snapshot").button({
            icons : {primary : "ui-icon-image"},
            text : false
        });
        $("#btn_fullscreen").button({
            icons : {primary : "ui-icon-arrow-4-diag"},
            text : false
        });

        $("#notworking").click(function(){
            $("#requirement_dialog").dialog("open");
        });
        $("#requirement_dialog").dialog({
            autoOpen: false
        });
    }

    var initPresetDropDown = function() {
        var presetCombo = $("#presetDropdown");
        presetCombo.on("change", function() {
            grayScott.loadPreset(this.selectedIndex);
        });

        $.each(grayScott.getPresetNames(), function(i, name) {
            presetCombo.append("<option value='" + i + "'>" + name + "</option>");
        });
    }

    var alertInvalidShareString = function() {
        $("#share").val("Invalid string!");
        setTimeout(updateShareString, 1000);
    }

    var parseShareString = function() {
        var str = $("#share").val();
        var fields = str.split(",");

        if(fields.length != 12) {
            alertInvalidShareString();
            return;
        }

        var newFeed = parseFloat(fields[0]);
        var newKill = parseFloat(fields[1]);

        if(isNaN(newFeed) || isNaN(newKill)) {
            alertInvalidShareString();
            return;
        }

        var newValues = [];
        for (var i=0; i<5; i++) {
            var v = [parseFloat(fields[2+2*i]), fields[2+2*i+1]];

            if (isNaN(v[0])) {
                alertInvalidShareString();
                return;
            }

            // Check if the string is a valid color.
            if (! /^#[0-9A-F]{6}$/i.test(v[1])) {
                alertInvalidShareString();
                return;
            }

            newValues.push(v);
        }

        $("#gradient").gradient("setValues", newValues);
        preset.feed = newFeed;
        preset.kill = newKill;
        worldToForm();
    }

    var updateShareString = function() {
        var str = "".concat(preset.feed, ",", preset.kill);

        var values = $("#gradient").gradient("getValues");
        for(var i=0; i<values.length; i++) {
            var v = values[i];
            str += "".concat(",", v[0], ",", v[1]);
        }
        $("#share").val(str);
    }

    return module;

})(grayScott || {});
