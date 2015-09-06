/**
 * Some preset configurations for feed and kill parameters for Gray-Scott algorithm.
 */
var grayScott = (function(module){

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
        return $.extend({}, PRESETS[i]);
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
