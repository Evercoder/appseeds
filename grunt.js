module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-docco');

  // Project configuration.
  grunt.initConfig({
    lint: {
      grunt: 'grunt.js', 
      seeds: 'appseeds.js', 
      plugins: ['plugins/backbone-seeds/backbone.seeds.js']
    },
    jshint: {
      options: { browser: true }
    },
    qunit: {
      index: ['test/test.html']
    },
    min: {
      seeds: {
        src: 'appseeds.js',
        dest: 'appseeds.min.js'
      },
      backbone: {
        src: 'plugins/backbone-seeds/backbone.seeds.js',
        dest: 'plugins/backbone-seeds/backbone.seeds.min.js'
      }
    },
    docco: {
      seeds: 'appseeds.js', 
      plugins: ['plugins/backbone-seeds/backbone.seeds.js']
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint min qunit docco');

};