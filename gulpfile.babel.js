import gulp from 'gulp';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';

gulp.task('build_es6', () => {
  return gulp
    .src('src/planCalendar.es6.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(uglify())
    .pipe(
      rename({
        basename: 'planCalendar',
        suffix: '.min',
        extname: '.js'
      })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build_jquery', () => {
  return gulp
    .src('src/planCalendar.jq.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(uglify())
    .pipe(
      rename({
        basename: 'planCalendar',
        suffix: '.jq.min',
        extname: '.js'
      })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});
