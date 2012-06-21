module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      all: ['grunt.js', 'appseeds.js']
    },
    jshint: {
      options: { browser: true }
    },
    qunit: {
      index: ['test/test.html']
    },
    min: {
      dist: {
        src: 'appseeds.js',
        dest: 'appseeds.min.js'
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint min qunit');

};