const gulp = require('gulp');

const run = require('run-sequence');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const tsProject = ts.createProject('tsconfig.json');

const wrap = require('gulp-wrap');
const declare = require('gulp-declare');
const handlebars = require('gulp-handlebars');
const defineModule = require('gulp-define-module');

// styles
const cleanCSS = require('gulp-clean-css');

// other
const concat = require('gulp-concat');
const rimraf = require('gulp-rimraf');
const notify = require('gulp-notify');

gulp.task('build', function () {

    const tsResult = tsProject
        .src()
        .pipe(sourcemaps.init())
        .pipe(tsProject());

    return tsResult.js
        .pipe(sourcemaps.write({
            // Return relative source map root directories per file.
            sourceRoot: function (file) {
                return file.cwd + '/src';
            }
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-configs', function () {
    const task = gulp.src('src/config/**.json')
        .pipe(gulp.dest('dist/config'));

    return gulp.src('src/config/certs/**/*.*')
        .pipe(gulp.dest('dist/config/certs'));
});

gulp.task('clean', function () {
    return gulp.src('dist')
        .pipe(rimraf());
});

gulp.task('watch', ['build', 'copy-configs'], function () {
    gulp.watch('src/**/*.ts', ['build']);
});

gulp.task('default', function (callback) {
    return run(/*'clean', */'build', 'copy-configs', callback);
});