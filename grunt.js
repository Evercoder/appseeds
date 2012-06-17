module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      all: ['grunt.js', '*.js']
    },
    jshint: {
      options: { browser: true }
    },
    qunit: {
      index: ['test.html']
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint qunit');

};