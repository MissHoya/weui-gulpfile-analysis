
var path = require('path');
var fs = require('fs');
//yargs是node处理命令行参数的解决方案
var yargs = require('yargs').argv;
var gulp = require('gulp');
var less = require('gulp-less');
var header = require('gulp-header');
var tap = require('gulp-tap');
var nano = require('gulp-cssnano');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var pkg = require('./package.json');

var option = {base: 'src'};
var dist = __dirname + '/dist';

//编译style文件到生产环境
gulp.task('build:style', function (){
    var banner = [
        '/*!',
        ' * WeUI v<%= pkg.version %> (<%= pkg.homepage %>)',
        ' * Copyright <%= new Date().getFullYear() %> Tencent, Inc.',
        ' * Licensed under the <%= pkg.license %> license',
        ' */',
        ''].join('\n');
        //按路径读取less文件
    gulp.src('src/style/weui.less', option)
        //编译映射初始化
        .pipe(sourcemaps.init())
        //将less文件编译成css,并绑定发生error事停止流传输
        .pipe(less().on('error', function (e) {
            console.error(e.message);
            //触发end事件,以停止流的传送
            this.emit('end');
        }))
        //对css代码进行编译
        .pipe(postcss([autoprefixer]))
        //对编译之后的css文件添加头部注释
        .pipe(header(banner, { pkg : pkg } ))
        .pipe(sourcemaps.write())
        //文件以dist路径输出
        .pipe(gulp.dest(dist))
        //手动触发重载,!!不懂加stream:true的意思
        .pipe(browserSync.reload({stream: true}))
        //gulp-nano压缩css文件，但是nano会默认更改所有z-index，所以要禁止
        .pipe(nano({
            zindex: false
        }))
        //为压缩之后的css文件重命名
        .pipe(rename(function (path) {
            path.basename += '.min';
        }))
        //按路径输出
        .pipe(gulp.dest(dist));
});

gulp.task('build:example:assets', function (){
    //按地址找到指定资源文件
    gulp.src('src/example/**/*.?(png|jpg|gif|js)', option)
        //将找到的文件按dist地址输出
        .pipe(gulp.dest(dist))
        //手动触发浏览器重载
        .pipe(browserSync.reload({stream: true}));
});

gulp.task('build:example:style', function (){
    //找到example的less文件
    gulp.src('src/example/example.less', option)
        //将less文件编译成css文件，并没有使用sourcemap进行映射,解释同[build:style]
        .pipe(less().on('error', function (e){
            console.error(e.message);
            this.emit('end');
        }))
        .pipe(postcss([autoprefixer]))
        .pipe(nano({
            zindex: false
        }))
        .pipe(gulp.dest(dist))
        .pipe(browserSync.reload({stream: true}));
});

gulp.task('build:example:html', function (){
    gulp.src('src/example/index.html', option)
        //gulp-tap见wiki
        //获取到index.html文件
        .pipe(tap(function (file){
            //返回路径中代表文件夹的部分
            var dir = path.dirname(file.path);
            //将文件内容转成字符串
            var contents = file.contents.toString();

            contents = contents.replace(/<link\s+rel="import"\s+href="(.*)">/gi, function (match, $1){
                //链接路径，组成import文件的路径
                var filename = path.join(dir, $1);
                //basename返回路径最后一部分，过滤掉.html，即返回文件名
                var id = path.basename(filename, '.html');
                //同步读取文件,返回字符串，文本编码默认为utf-8
                var content = fs.readFileSync(filename, 'utf-8');
                //替换字符串
                return '<script type="text/html" id="tpl_'+ id +'">\n'+ content +'\n</script>';
            });
            //生成buffer实例，作用？
            file.contents = new Buffer(contents);
        }))
        //输出
        .pipe(gulp.dest(dist))
        .pipe(browserSync.reload({stream: true}));
});

//执行依赖
gulp.task('build:example', ['build:example:assets', 'build:example:style', 'build:example:html']);

//执行依赖于build:style、build:example
gulp.task('release', ['build:style', 'build:example']);

//监听文件
gulp.task('watch', ['release'], function () {
    gulp.watch('src/style/**/*', ['build:style']);
    gulp.watch('src/example/example.less', ['build:example:style']);
    gulp.watch('src/example/**/*.?(png|jpg|gif|js)', ['build:example:assets']);
    gulp.watch('src/**/*.html', ['build:example:html']);
});

//
gulp.task('server', function () {
    yargs.p = yargs.p || 8080;
    browserSync.init({
        server: {
            baseDir: "./dist"
        },
        ui: {
            port: yargs.p + 1,
            weinre: {
                port: yargs.p + 2
            }
        },
        port: yargs.p,
        startPath: '/example'
    });
});

// 参数说明
//  -w: 实时监听
//  -s: 启动服务器
//  -p: 服务器启动端口，默认8080
//默认执行依赖于release, 先执行relase
gulp.task('default', ['release'], function () {
    // 如果命令行输入gulp -s执行
    if (yargs.s) {
        gulp.start('server');
    }
    // 如果命令行输入gulp -w执行
    if (yargs.w) {
        gulp.start('watch');
    }
});