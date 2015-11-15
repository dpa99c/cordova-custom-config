#!/usr/bin/env node

var logger = (function(){

    /**********************
     * Internal properties
     *********************/
    var logger, context;

    try{
        require('colors');
    }catch(e){}

    function prefixMsg(msg){
        return context.opts.plugin.id+": "+msg;
    }

    /************
     * Public API
     ************/
    logger = {
        init: function(ctx){
            context = ctx;
        },
        debug: function(msg){
            if(context.opts.verbose){
                msg = prefixMsg(msg);
                try{
                    console.log(msg.green);
                }catch(e){
                    console.log(msg);
                }
            }
        },
        log: function(msg){
            msg = prefixMsg(msg);
            try{
                console.log(msg.white);
            }catch(e){
                console.log(msg);
            }
        },
        info: function(msg){
            msg = prefixMsg(msg);
            try{
                console.log(msg.blue);
            }catch(e){
                console.info(msg);
            }
        },
        warn: function(msg){
            msg = prefixMsg(msg);
            try{
                console.log(msg.yellow);
            }catch(e){
                console.warn(msg);
            }
        },
        error: function(msg){
            msg = prefixMsg(msg);
            try{
                console.log(msg.red);
            }catch(e){
                console.error(msg);
            }
        }
    };
    return logger;
})();

module.exports = function(ctx){
    logger.init(ctx);
    return logger;
};