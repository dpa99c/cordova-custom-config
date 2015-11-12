#!/usr/bin/env node

var logger = (function(){

    /**********************
     * Internal properties
     *********************/
    var logger, context;

    /************
     * Public API
     ************/
    logger = {
        init: function(ctx){
            context = ctx;
        },
        debug: function(msg){
            if(context.opts.verbose){
                console.log(context.opts.plugin.id+": "+msg);
            }
        },
        log: function(msg){
            console.log(context.opts.plugin.id+": "+msg);
        },
        warn: function(msg){
            console.warn(context.opts.plugin.id+": "+msg);
        },
        error: function(msg){
            console.error(context.opts.plugin.id+": "+msg);
        }
    };
    return logger;
})();

module.exports = function(ctx){
    logger.init(ctx);
    return logger;
};