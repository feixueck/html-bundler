var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemap = require('gulp-sourcemaps');
var webpack = require('webpack-stream');
var changed = require('gulp-changed');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var path = require('path');
var is = require('is_js');
var currentPath = process.cwd();
var debug = require('gulp-debug');
var fs = require('fs');
var logger = require('../utils/logger');
var _ = require('lodash');
var gutil = require('gulp-util');

var handleJS = function(jsArr, conf, filename, env) {
    if (conf.bundle) {
        if (!fs.existsSync(path.join(currentPath, './webpack.config.js'))) {
            var webpackConfig = require('../webpack.config.default.js');
        }
        else {
            var webpackConfig = require(path.join(currentPath, './webpack.config'));
        }

        var generateWebpackConf = function(webpackConfig, filename, env) {
            var originConf = webpackConfig[env];
            if (!is.object(originConf)) {
                return
            }
            else {
                if (originConf.output) {
                    originConf.output = _.assign({}, originConf.output);
                    originConf.output.filename = filename + ".js";
                }
                else {
                    originConf.output = {filename: filename + ".js"};
                }
            }
            return originConf;
        }
    }
    else {
        var generateWebpackConf = function() {};
    }


    if (!conf.buildTarget.js && !conf.bundle && !conf.concat){
        var target = function(file){
            return path.dirname(path.join(conf.output, path.relative(conf.src, file.path)));
        }
    }
    else {
        var target = path.join(conf.output, conf.buildTarget.js);
    }
    var stream = gulp.src(jsArr)
        // .pipe(gulpif(env !== 'dest', changed(target, {extension: '.js'})))
        .pipe(gulpif(true, debug({title: 'JS file build:'})))
        .pipe(gulpif(conf.sourcemap, sourcemap.init()))

    if (conf.custom && conf.custom.css && conf.custom.css.length) {
        conf.custom.js.forEach(function (task) {
            stream = stream.pipe(task.func(task.opts));
        })
    }

    stream = stream.pipe(gulpif(conf.bundle, webpack(generateWebpackConf(webpackConfig, filename, env))))
        .on('error', function(err) {
            // 这样语法错误不会打断watcher和server
            gutil.log('WEBPACK ERROR', gutil.colors.red(err.message));
            this.emit('end');
        })
        .pipe(gulpif(conf.minify, uglify()))
        .pipe(gulpif(conf.concat, concat(filename + '.js')))
        .pipe(gulpif(conf.sourcemap, sourcemap.write()))
        .pipe(gulp.dest(target))
}

module.exports = handleJS;