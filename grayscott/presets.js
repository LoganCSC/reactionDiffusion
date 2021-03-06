/**
 * Some preset configurations for feed and kill parameters for Gray-Scott algorithm.
 */
var grayScott = (function(module){

    /** number of sub-steps per frame.  If larger, then more computation per frame  */
    var DEFAULT_NUM_STEPS_PER_FRAME = 10;

    var DEFAULT_DU = 0.2;
    var DEFAULT_DV = 0.1;

    var PRESETS = [
        {   name: "Default",
            feed: 0.037,
            kill: 0.06
        },
        {   name: "Solitons",
            feed: 0.03,
            kill: 0.062
        },
        {   name: "Pulsating solitons",
            feed: 0.025,
            kill: 0.06
        },
        {   name: "Worms",
            feed: 0.078,
            kill: 0.061
        },
        {   name: "Mazes",
            feed: 0.029,
            kill: 0.057
        },
        {   name: "Holes",
            feed: 0.039,
            kill: 0.058
        },
        {   name: "Chaos",
            feed: 0.026,
            kill: 0.051
        },
        {   name: "Chaos and holes",
            feed: 0.034,
            kill: 0.056
        },
        {   name: "Moving spots",
            feed: 0.014,
            kill: 0.054
        },
        {   name: "Spots and loops",
            feed: 0.018,
            kill: 0.051
        },
        {   name: "Waves",
            feed: 0.014,
            kill: 0.045
        },
        {   name: "The U-Skate World",
            feed: 0.062,
            kill: 0.06093
        }
    ];


    module.getDefaultPreset = function() {
        return grayScott.getPreset(0);
    }

    module.getPreset = function(i) {
        var p = $.extend({}, PRESETS[i]);
        p.numStepsPerFrame = DEFAULT_NUM_STEPS_PER_FRAME;
        p.DU = DEFAULT_DU;
        p.DV = DEFAULT_DV;
        return p;
    }

    module.getPresetNames = function() {
        var names = [];
        $.each(PRESETS, function(i, preset) {
            names.push(preset.name);
        });
        return names;
    }

    return module;

})(grayScott || {});
