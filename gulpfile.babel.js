import gulp from 'gulp';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';

gulp.task('default', function () {
  return gulp.src('src/planCalendar.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(uglify())
    .pipe(rename({
      basename: 'planCalendar',
      suffix: '.min',
      extname: '.js'
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});